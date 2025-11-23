from flask import Flask, request, render_template, jsonify, send_from_directory
from flask_cors import CORS
import pytesseract
import os
from PIL import Image, ImageOps, ImageFilter, ImageEnhance
import numpy as np
import re
import requests
from dotenv import load_dotenv
import cv2
import ssl
from spellchecker import SpellChecker
import uuid

from openai import OpenAI
import base64

# Force-load .env from project root (parent of ocr_app)
ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env')
load_dotenv(ENV_PATH)
client = OpenAI()

# Initialize spell checker
spell = SpellChecker()

# Load environment variables from .env file (in parent directory)
# Try multiple paths to find .env file
env_paths = [
    os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env'),
    os.path.join(os.getcwd(), '.env'),
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'),
]
for env_path in env_paths:
    if os.path.exists(env_path):
        load_dotenv(dotenv_path=env_path)
        break
else:
    # Fallback: try loading from current directory
    load_dotenv()

# IMPORTANT: Set Tesseract path (use your actual path or environment variable)
tesseract_path = os.getenv("TESSERACT_CMD", "/opt/homebrew/bin/tesseract")
pytesseract.pytesseract.tesseract_cmd = tesseract_path

app = Flask(__name__, static_folder="../dist", static_url_path="")
app.debug = True
CORS(app)  # Enable CORS for React frontend

# Get the directory where app.py is located
APP_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(APP_DIR, "uploads")
VOICE_FOLDER = os.path.join(UPLOAD_FOLDER, "voices")
AUDIO_FOLDER = os.path.join(UPLOAD_FOLDER, "audio")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(VOICE_FOLDER, exist_ok=True)
os.makedirs(AUDIO_FOLDER, exist_ok=True)

@app.route("/")
def index():
    # In production, serve the React build
    if os.path.exists("dist/index.html"):
        return send_from_directory("dist", "index.html")
    # Fallback to old template during development
    return render_template("index.html")


@app.route("/ocr", methods=["POST"])
def ocr():
    try:
        if "photo" not in request.files:
            return jsonify({"text": "No file uploaded"}), 400

        file = request.files["photo"]

        if file.filename == "":
            return jsonify({"text": "No file selected"}), 400

        # ---- READ IMAGE BYTES FROM UPLOAD ----
        img_bytes = file.read()

        # ---- BASE64 ENCODE ----
        import base64
        b64_image = base64.b64encode(img_bytes).decode("utf-8")

        print("Sending to GPT-4.1 with data:image/... base64…")

        # ---- VISION REQUEST USING EXACT SYNTAX YOU PROVIDED ----
        response = client.responses.create(
            model="gpt-4.1",
            input=[
                {
                    "role": "user",
                    "content": [
                        { "type": "input_text", "text": "You are a transcription engine. You MUST ONLY output the exact readable text found in the image. No summaries. No interpretation. No corrections. No punctuation changes. No additions. No removals. If unclear text exists, transcribe it as-is (even partial). If nothing is readable, return an empty string."},
                        {
                            "type": "input_image",
                            "image_url": f"data:image/jpeg;base64,{b64_image}",
                        },
                    ],
                }
            ],
        )

        # ---- EXTRACT TEXT ----
        out = response.output_text

        return jsonify({"text": out})

    except Exception as e:
        print("OCR Error:", e)
        return jsonify({"error": str(e)}), 500

def clean_text(t):
    # Preserve punctuation and line structure
    t = t.replace("\n\n", "\n")          # collapse blank lines only
    t = re.sub(r"[ \t]+", " ", t)       # collapse multiple spaces/tabs to single space
    # Don't remove punctuation - just clean up whitespace
    t = t.strip()                       
    return t

def auto_invert(img):
    """Auto-invert dark images for better OCR"""
    gray = np.array(img.convert("L"))
    mean = gray.mean()

    # Threshold: below 100 means mostly dark image
    if mean < 100:
        return ImageOps.invert(img)
    return img

def manual_replacement(text):
    """Fix common OCR errors"""
    if not text:
        return ""

    t = text

    # 0 mistaken for o
    t = re.sub(r'(?<=t)0', 'o', t)  # t0 -> to
    t = re.sub(r'(?<=T)0', 'o', t)

    t = re.sub(r"@", "a", t)

    # + mistaken for t (OCR sees the cross)
    t = re.sub(r'\+', 't', t)

    # Replace | when used as a standalone word
    t = re.sub(r"\b\|\b", "I", t)

    # Replace | at the start of a sentence
    t = re.sub(r"^\|\s", "I ", t)

    # Replace | after punctuation like . ? !
    t = re.sub(r"(?<=[\.\!\?]\s)\|(?=\s)", "I", t)

    # Replace | between spaces (very common in OCR)
    t = re.sub(r"\s\|\s", " I ", t)

    # Replace | used inside words (rare)
    t = re.sub(r"(?<=[A-Za-z])\|(?=[A-Za-z])", "I", t)

    return t

def looks_handwritten(pil_img):
    """Detect if image contains handwriting vs printed text"""
    try:
        img = np.array(pil_img)
        # Handle grayscale images
        if len(img.shape) == 2:
            gray = img
        else:
            gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)

        # Use edges to estimate structure
        edges = cv2.Canny(gray, 30, 150)
        edge_density = edges.mean()

        # Handwriting tends to have FAR fewer sharp edges than printed text
        return edge_density < 10
    except Exception as e:
        print(f"Error in looks_handwritten: {e}")
        return False  # Default to printed text if detection fails

def spell_fix(text):
    """Fix spelling errors while protecting ordinals and preserving punctuation"""
    if not text:
        return ""
    
    # Split text into words with punctuation, preserving both
    # This regex finds all non-whitespace sequences (words + punctuation)
    words = re.findall(r'\S+', text)
    
    corrected = []
    for word_punct in words:
        # Extract the actual word (alphanumeric part) and punctuation
        word_match = re.match(r'^([\w\'-]+)', word_punct)
        if not word_match:
            # No word found, it's just punctuation - keep as-is
            corrected.append(word_punct)
            continue
        
        word = word_match.group(1)
        punctuation = word_punct[len(word):]  # Everything after the word
        
        # If it's an ordinal like "2nd", DO NOT CORRECT
        if protect_ordinals(word):
            corrected.append(word_punct)
            continue

        # Normal spellcheck for the word only
        fixed = spell.correction(word)
        # Reconstruct with original punctuation
        corrected.append((fixed if fixed else word) + punctuation)
    
    # Join with spaces (original spacing is preserved by the \S+ pattern)
    return " ".join(corrected)

def protect_ordinals(word):
    """Protect ordinal numbers from spell correction"""
    # Match patterns like 1st, 2nd, 3rd, 4th, 21st, 33rd, 100th
    if re.fullmatch(r"\d+(st|nd|rd|th)", word.lower()):
        return True
    return False

def add_missing_punctuation(text):
    """Intelligently add missing punctuation to text (subtle, natural)"""
    if not text or len(text.strip()) == 0:
        return text
    
    # Don't modify if text already has good punctuation coverage
    # Check if text has reasonable punctuation density
    punctuation_count = len(re.findall(r'[.!?,;:]', text))
    word_count = len(re.findall(r'\b\w+\b', text))
    
    # If punctuation density is reasonable (at least 1 per 20 words), don't add
    if word_count > 0 and punctuation_count / word_count > 0.05:
        return text
    
    lines = text.split('\n')
    result_lines = []
    
    for line in lines:
        if not line.strip():
            result_lines.append(line)
            continue
        
        line = line.strip()
        
        # Only add period at end if line doesn't end with punctuation
        # Be conservative - only add to longer, complete-looking sentences
        if line and not line[-1] in '.!?;:':
            if line[-1].isalnum():
                words = line.split()
                # Only add period to sentences with 4+ words that look complete
                if len(words) >= 4:
                    # Don't add period if it ends with common connecting words
                    ending_words = ['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
                                   'have', 'has', 'had', 'will', 'would', 'should', 'could', 'can', 'may',
                                   'to', 'for', 'with', 'from', 'at', 'in', 'on']
                    if words[-1].lower() not in ending_words:
                        line += '.'
        
        # Add question mark for question words at start (only if clearly a question)
        question_words = ['what', 'where', 'when', 'who', 'why', 'how', 'which', 'whose']
        words = line.split()
        if words and words[0].lower() in question_words and not line.endswith('?'):
            # Only if it's a proper question (has verb or is short)
            if len(words) <= 8 or any(w in words for w in ['is', 'are', 'was', 'were', 'do', 'does', 'did', 'will', 'can', 'should']):
                if not line.endswith('.'):
                    line = line.rstrip('.') + '?'
                else:
                    line = line[:-1] + '?'
        
        result_lines.append(line)
    
    result = '\n'.join(result_lines)
    
    # Final cleanup: ensure proper spacing around punctuation
    result = re.sub(r'\s+([.!?,;:])', r'\1', result)  # Remove space before punctuation
    result = re.sub(r'([.!?])\s*([A-Z])', r'\1 \2', result)  # Ensure space after sentence end
    
    # DO NOT add dashes - they look too AI-generated
    # Preserve any existing dashes but don't add new ones
    
    return result

def claude_ocr_cleanup(raw_text):
    """Send raw/noisy OCR text to Claude to fix errors, reconstruct words, and infer intended text."""
    try:
        anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
        if not anthropic_api_key:
            print("Missing Claude API key")
            return raw_text  # fallback
        
        system_prompt = """
You repair noisy OCR text. Your job is to reconstruct what the text was intended to say.

Rules:
- Fix misread characters (l ↔ I ↔ 1, 0 ↔ O, rn ↔ m, etc.)
- Fix spacing, punctuation, line breaks.
- Reconstruct broken/missing words using context.
- Remove garbage characters.
- You ARE allowed to infer what the intended English text was.
- Output clean, natural English.
- YOU CANNOT EVER, EVER, EVER REPLY WITH MORE THAN JUST THE INFERRED TEXT. DO NOT EXPLAIN YOUR REASONING, JUST PROVIDED THE TEXT.
"""

        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": anthropic_api_key,
                "Content-Type": "application/json",
                "anthropic-version": "2023-06-01"
            },
            json={
                "model": "claude-3-haiku-20240307",
                "max_tokens": 2000,
                "system": system_prompt,
                "messages": [
                    {"role": "user", "content": raw_text}
                ]
            }
        )

        data = response.json()
        return data.get("content", [{}])[0].get("text", raw_text)

    except Exception as e:
        print("Claude cleanup error:", e)
        return raw_text



@app.route("/api/enhanced", methods=["POST"])
def enhanced():
    try:
        data = request.get_json()
        extracted_text = data.get("extractedText", "")
        user_instruction = data.get("userInstruction", "")

        system_prompt = f"""You are converting extracted text into natural first-person speech for audio. Your job is to rephrase and expand the wording ONLY - do not add, interpret, or assume anything. Start immediately with the content - no intros.

ABSOLUTE PROHIBITIONS:
❌ "Alright" ❌ "Let me" ❌ "Here are" ❌ "Based on" ❌ "Summary" ❌ "I'll" ❌ "Let's" ❌ "Okay" ❌ "Let's take a look" ❌ "First up" ❌ "I see" ❌ "Looking at"
❌ "Probably" ❌ "Seems like" ❌ "Must be" ❌ "Looks like" ❌ "Could be" ❌ "Might be" ❌ "That's obviously" ❌ "That one sounds"

CRITICAL - LITERAL TEXT ONLY (NO INTERPRETATION):

WRONG EXAMPLES (DO NOT DO THIS):
❌ "bloodpress.txt - that's obviously something related to blood pressure"
❌ "clay_sample.csv - this sounds like it could be for a research project"
❌ "I see a bunch of files, looks like I've been busy with schoolwork"
❌ "That must be for a presentation or lecture"
❌ "Probably some data or information about..."

CORRECT EXAMPLES (DO THIS):
✅ "I have bloodpress.txt"
✅ "I have clay_sample.csv"
✅ "I have Classics 102 Script.docx"
✅ "I need to work with bloodpress.txt, clay_sample.csv, and Classics 102 Script.docx"

RULES:
- Use ONLY the exact words, phrases, and information from the extracted text
- DO NOT interpret, analyze, infer, or make assumptions
- DO NOT explain what things "might be", "probably are", "seems like", "must be"
- DO NOT add context, backstories, or explanations
- If text says "bloodpress.txt" - say "bloodpress.txt" only, don't explain what it is
- If text says "Meeting at 3pm" - say "Meeting at 3pm" only, don't add details
- Work with the text as literal strings - don't infer meaning
- Be detailed in HOW you express it (wording, transitions, phrasing), but use ONLY what's in the extracted text

REQUIREMENTS:
1. FIRST PERSON: I, me, my, we, our. Start with the actual content immediately.
2. EXTENSIVE EXPRESSION: Elaborate on wording, add natural transitions, expand phrasing - but use ONLY words/concepts from the extracted text. Minimum 1000+ words.
3. NATURAL: Write for speech - natural flow, pauses, transitions.
4. FORMAT: Match user's request exactly.
5. LITERAL: Only use exact information from extracted text. No interpretation, no assumptions, no "probably" or "seems like".

FORMAT-SPECIFIC:
- Action items: Use only actions from extracted text. Elaborate wording, add transitions, but don't add new actions or explain what things "might be".
- Presentation: Use only points from extracted text. Develop wording, but don't add new points or interpretations.
- Study notes: Use only concepts from extracted text. Explain in detail, but don't add new concepts or assumptions.
- Clarity rewrite: Rewrite clearly and in detail. Expand phrasing, but don't add new information or interpretations.
- Outline: Structure based only on extracted text. No assumptions about what things mean.
- General: Comprehensive first-person narrative using ONLY extracted text. Expand expression, not content or meaning.

EXTRACTED TEXT (USE ONLY THIS - NO INTERPRETATION):
{extracted_text}

USER REQUEST:
{user_instruction}

EXAMPLE - CORRECT vs WRONG:
Extracted text: "bloodpress.txt"
CORRECT: "I have bloodpress.txt. I need to work with bloodpress.txt. This file is bloodpress.txt."
WRONG: "I have bloodpress.txt. This sounds like it could be related to blood pressure. It seems like it might be medical data."

Extracted text: "Call mom. Meeting at 3pm."
CORRECT: "Calling my mom. I have a meeting at 3pm. I'll call my mother, then attend the meeting scheduled for 3pm."
WRONG: "Alright, I need to call my mom. This is important. And there's a meeting at 3pm that could be about..."

CRITICAL RULES:
1. Start immediately with words from extracted text - NO "Alright", NO "Okay", NO "Let's", NO "I see"
2. Use ONLY words from extracted text - NO "probably", NO "seems like", NO "sounds like", NO "could be", NO "might be", NO "not sure"
3. If text is "bloodpress.txt" - say ONLY "bloodpress.txt" or "I have bloodpress.txt" - DON'T explain what it might be
4. Expand wording extensively (1500+ words) by rephrasing and adding transitions - but use ONLY what's in extracted text
5. Work with text as literal strings - don't interpret, analyze, or assume

Remember: Rephrase the words only, don't interpret their meaning."""

        anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
        if not anthropic_api_key or anthropic_api_key == "your_claude_key_here":
            return jsonify({
                "error": "ANTHROPIC_API_KEY not configured",
                "details": "Please set your Claude API key in the .env file. Get your key from https://console.anthropic.com/"
            }), 500

        claude_response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": anthropic_api_key,
                "Content-Type": "application/json",
                "anthropic-version": "2023-06-01"
            },
            json={
                "model": "claude-3-haiku-20240307",
                "max_tokens": 4000,
                "system": system_prompt,
                "messages": [
                    {
                        "role": "user", 
                        "content": f"{user_instruction}\n\nCRITICAL: Use ONLY the extracted text. NO 'Okay', NO 'Let me', NO 'It's important', NO interpretation. Start immediately with the content. Do not analyze, assume, or explain what things 'might be' or 'probably are'."
                    }
                ]
            }
        )

        if claude_response.status_code != 200:
            error_text = claude_response.text
            print(f"Claude API error (status {claude_response.status_code}): {error_text}")
            try:
                error_json = claude_response.json()
                error_msg = error_json.get("error", {}).get("message", error_text)
            except:
                error_msg = error_text
            return jsonify({
                "error": "Claude API error",
                "details": error_msg,
                "status_code": claude_response.status_code
            }), 500

        claude_data = claude_response.json()
        content_list = claude_data.get("content", [])
        
        if not content_list:
            return jsonify({
                "error": "Empty response from Claude",
                "details": str(claude_data)
            }), 500
        
        script = content_list[0].get("text", "")
        
        if not script:
            return jsonify({
                "error": "No text in Claude response",
                "details": str(claude_data)
            }), 500

        return jsonify({ "script": script })

    except Exception as err:
        print("Server error:", err)
        return jsonify({
            "error": "Claude failed",
            "details": str(err)
        }), 500


@app.route("/api/upload-voice", methods=["POST"])
def upload_voice():
    """Upload and store MP3 voice file"""
    try:
        if "voice" not in request.files:
            return jsonify({"error": "No voice file uploaded"}), 400
        
        file = request.files["voice"]
        if not file or file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Validate file type
        filename_lower = file.filename.lower() if file.filename else ""
        content_type = file.content_type or ""
        
        if not filename_lower.endswith(('.mp3', '.mpeg', '.wav', '.ogg')) and 'audio' not in content_type.lower():
            return jsonify({
                "error": "Only audio files are supported (MP3, WAV, OGG)",
                "filename": file.filename,
                "content_type": content_type
            }), 400
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        safe_filename = file.filename or "audio_file"
        filename = f"{file_id}_{safe_filename}"
        filepath = os.path.join(VOICE_FOLDER, filename)
        
        # Save file
        file.save(filepath)
        
        if not os.path.exists(filepath):
            return jsonify({"error": "Failed to save file"}), 500
        
        return jsonify({
            "success": True,
            "voiceId": file_id,
            "filename": filename,
            "message": "Voice file uploaded successfully"
        })
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        error_msg = str(e)
        print(f"Voice upload error: {error_msg}")
        print(f"Full traceback:\n{error_trace}")
        return jsonify({
            "error": error_msg,
            "details": error_trace[:1000] if len(error_trace) > 1000 else error_trace
        }), 500
    
@app.route("/api/generate-audio", methods=["POST"])
def generate_audio():
    """Generate audio from text using TTS service"""
    try:
        data = request.get_json()
        text = data.get("text", "")
        voice_id = data.get("voiceId", None)
        use_custom_voice = data.get("useCustomVoice", False)
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        # Get voice file path if custom voice is requested
        voice_file_path = None
        if use_custom_voice and voice_id:
            if not os.path.exists(VOICE_FOLDER):
                return jsonify({"error": "Voice folder not found"}), 404
            
            # Find voice file by ID
            voice_files = os.listdir(VOICE_FOLDER)
            for filename in voice_files:
                if filename.startswith(voice_id):
                    voice_file_path = os.path.join(VOICE_FOLDER, filename)
                    break
            
            if not voice_file_path or not os.path.exists(voice_file_path):
                return jsonify({
                    "error": "Voice file not found",
                    "voiceId": voice_id
                }), 404
        
        # Generate audio using TTS service
        try:
            from tts_service import get_tts_service
        except ImportError:
            # Try importing from current directory
            import sys
            sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
            from tts_service import get_tts_service
        
        tts = get_tts_service()
        
        # If custom voice was requested, don't allow fallback to default
        use_default_voice_param = not use_custom_voice
        
        try:
            output_path = tts.generate_audio(
                text=text,
                voice_file_path=voice_file_path,
                use_default_voice=use_default_voice_param
            )
        except Exception as e:
            error_msg = str(e)
            import traceback
            error_trace = traceback.format_exc()
            print(f"TTS generation error: {error_msg}")
            print(f"Traceback:\n{error_trace}")
            
            # If custom voice was explicitly requested but failed, don't silently fall back
            if not use_default_voice_param:
                return jsonify({
                    "error": "Failed to generate audio with custom voice",
                    "details": error_msg,
                    "suggestion": "The Fish Audio API may not support voice cloning, or the API endpoint/format may be incorrect. Check the backend logs for more details."
                }), 500
            else:
                # Re-raise to be caught by outer exception handler
                raise
        
        if not output_path:
            error_details = "TTS service may not be configured. Check FISH_AUDIO_API_KEY in .env file."
            if use_custom_voice:
                error_details += " Custom voice generation failed."
            return jsonify({
                "error": "Failed to generate audio",
                "details": error_details
            }), 500
        
        # Verify the file was actually created
        if not os.path.exists(output_path):
            return jsonify({
                "error": "Audio file was not created",
                "details": f"Expected file at: {output_path}"
            }), 500
        
        # Return the audio file URL
        audio_filename = os.path.basename(output_path)
        audio_url = f"/uploads/audio/{audio_filename}"
        
        print(f"Audio generated successfully: {output_path}")
        print(f"Audio URL: {audio_url}")
        
        return jsonify({
            "success": True,
            "audioUrl": audio_url,
            "message": "Audio generated successfully"
        })
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        error_msg = str(e)
        print(f"Generate audio error: {error_msg}")
        print(f"Full traceback:\n{error_trace}")
        return jsonify({
            "error": error_msg,
            "details": error_trace[:1000] if len(error_trace) > 1000 else error_trace
        }), 500

@app.route("/uploads/audio/<path:filename>")
def serve_audio(filename):
    """Serve generated audio files"""
    try:
        file_path = os.path.join(AUDIO_FOLDER, filename)
        if not os.path.exists(file_path):
            print(f"Audio file not found: {file_path}")
            print(f"AUDIO_FOLDER: {AUDIO_FOLDER}")
            print(f"Files in AUDIO_FOLDER: {os.listdir(AUDIO_FOLDER) if os.path.exists(AUDIO_FOLDER) else 'Folder does not exist'}")
            return jsonify({"error": "Audio file not found"}), 404
        return send_from_directory(AUDIO_FOLDER, filename)
    except Exception as e:
        print(f"Error serving audio file: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/uploads/voices/<path:filename>")
def serve_voice(filename):
    """Serve uploaded voice files"""
    return send_from_directory(VOICE_FOLDER, filename)

@app.route("/credits")
def credits():
    return render_template("credits.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)

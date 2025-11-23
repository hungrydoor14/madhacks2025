from flask import Flask, request, render_template, jsonify, send_from_directory
from flask_cors import CORS
import os
from PIL import Image, ImageOps, ImageFilter, ImageEnhance
import numpy as np
import re
import requests
from dotenv import load_dotenv

from openai import OpenAI
import base64

# Force-load .env from project root (parent of ocr_app)
ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env')
load_dotenv(ENV_PATH)
client = OpenAI()

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

app = Flask(__name__, static_folder="../dist", static_url_path="")
app.debug = True
CORS(app)  # Enable CORS for React frontend

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

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
                        { "type": "input_text", "text": "Transcribe every readable word in this image. DO NOT ADD ANYTHING ELSE, AND RESPOND ONLY WITH THE READABLE SENTENCE OR SENTENCES." },
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


@app.route("/credits")
def credits():
    return render_template("credits.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)

from flask import Flask, request, render_template, jsonify
import pytesseract
import os
from PIL import Image, ImageOps, ImageFilter, ImageEnhance
import numpy as np
from tts_service import TTSService
import re
import cv2

import ssl
ssl._create_default_https_context = ssl._create_unverified_context

import easyocr
easy_reader = easyocr.Reader(['en'])

from spellchecker import SpellChecker
spell = SpellChecker()

# IMPORTANT: Set Tesseract path (use your actual path)
pytesseract.pytesseract.tesseract_cmd = "/opt/homebrew/bin/tesseract"

app = Flask(__name__)
app.debug = True

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/")
def index():
    return render_template("index.html")

from flask import send_from_directory

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory('uploads', filename)


@app.route("/ocr", methods=["POST"])
def ocr():
    if "photo" not in request.files:
        return jsonify({"text": "No file uploaded"}), 400

    file = request.files["photo"]
    image = Image.open(file)

    # Fix rotation
    image = ImageOps.exif_transpose(image)

    # Resize large images
    MAX_SIZE = 1500
    if max(image.size) > MAX_SIZE:
        image.thumbnail((MAX_SIZE, MAX_SIZE))

    # ---- HANDWRITING OR PRINTED? ----
    if looks_handwritten(image):
        # Use EasyOCR for handwriting
        text = run_easyocr(image)
        cleaned_text = clean_text(text)
        cleaned_text = spell_fix(cleaned_text)
        return jsonify({"text": cleaned_text})

    # ---- PRINTED TEXT (TESSERACT PATH) ----
    image = image.convert("L")
    image = auto_invert(image)

    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(2.0)

    image = image.filter(ImageFilter.SHARPEN)

    text = pytesseract.image_to_string(image)

    cleaned_text = manual_replacement(clean_text(text))
    cleaned_text = spell_fix(cleaned_text)

    return jsonify({"text": cleaned_text})


def clean_text(t):
    t = t.replace("\n\n", "\n")          # collapse blank lines
    t = re.sub(r"[ \t]+", " ", t)       # collapse spaces
    t = t.strip()                       
    return t

def auto_invert(img):
    gray = np.array(img.convert("L"))
    mean = gray.mean()

    # Threshold: below 100 means mostly dark image
    if mean < 100:
        return ImageOps.invert(img)
    return img    

def manual_replacement(text):
    if not text:
        return ""

    t = text

    # 0 mistaken for o
    t = re.sub(r'(?<=t)0', 'o', t)  # t0 -> to
    t = re.sub(r'(?<=T)0', 'o', t)

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
    img = np.array(pil_img)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Use edges to estimate structure
    edges = cv2.Canny(gray, 30, 150)
    edge_density = edges.mean()

    # Handwriting tends to have FAR fewer sharp edges than printed text
    return edge_density < 5

def run_easyocr(pil_img):
    img = np.array(pil_img)
    results = easy_reader.readtext(img, detail=0)
    return " ".join(results)

def spell_fix(text):
    corrected = []
    for word in text.split():
        # If it's an ordinal like "2nd", DO NOT CORRECT
        if protect_ordinals(word):
            corrected.append(word)
            continue

        # Normal spellcheck
        fixed = spell.correction(word)
        corrected.append(fixed if fixed else word)
    return " ".join(corrected)

def protect_ordinals(word):
    # Match patterns like 1st, 2nd, 3rd, 4th, 21st, 33rd, 100th
    if re.fullmatch(r"\d+(st|nd|rd|th)", word.lower()):
        return True
    return False

@app.route("/credits")
def credits():
    return render_template("credits.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)

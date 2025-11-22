from flask import Flask, request, render_template, jsonify
import pytesseract
import os
from PIL import Image, ImageOps, ImageFilter, ImageEnhance
import numpy as np
import re

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

    # Convert to grayscale
    image = image.convert("L")

    # Detect black backgrounds on white text
    image = auto_invert(image)

    # Boost contrast
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(2.0)

    # Sharpen
    image = image.filter(ImageFilter.SHARPEN)

    # Get string from image
    text = pytesseract.image_to_string(image)

    # Cleanup
    cleaned_text = manual_replacement(clean_text(text))
    
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


@app.route("/credits")
def credits():
    return render_template("credits.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)

from flask import Flask, request, render_template, jsonify
import pytesseract
import os
from flask import Flask, request, jsonify
from PIL import Image, ImageOps, ImageFilter, ImageEnhance
import pytesseract
import numpy as np

# IMPORTANT: Set Tesseract path (use your actual path)
pytesseract.pytesseract.tesseract_cmd = "/opt/homebrew/bin/tesseract"

app = Flask(__name__)
app.debug = True

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/ocr", methods=["POST"])
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

    # Boost contrast
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(2.0)

    # Optional: sharpen
    image = image.filter(ImageFilter.SHARPEN)

    # Optional: threshold (black/white)
    image = image.point(lambda x: 0 if x < 140 else 255)

    text = pytesseract.image_to_string(image)

    return jsonify({"text": text})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)

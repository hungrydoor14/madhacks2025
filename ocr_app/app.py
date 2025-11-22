from flask import Flask, request, render_template, jsonify
import pytesseract
from PIL import Image
import os

# IMPORTANT: Set Tesseract path (use your actual path)
pytesseract.pytesseract.tesseract_cmd = "/opt/homebrew/bin/tesseract"

app = Flask(__name__)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/ocr", methods=["POST"])
def ocr():
    if "photo" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["photo"]
    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    text = pytesseract.image_to_string(Image.open(filepath))
    return jsonify({"text": text})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)

# OCR Reader - DoBrain

A modern OCR application that extracts text from images and provides AI-powered assistance using Claude.

## Features

- 📸 **Image Upload & OCR**: Upload images or take photos to extract text using Tesseract OCR
- 🤖 **AI Assistant**: Chat with Claude AI to organize, summarize, and analyze your extracted notes
- 🎨 **Modern UI**: Beautiful React frontend with Tailwind CSS
- 🔄 **Two Modes**: 
  - Default Mode: View extracted text
  - Enhanced Mode: Chat with AI about your notes

## Tech Stack

- **Backend**: Flask (Python)
- **Frontend**: React + TypeScript + Vite
- **OCR**: Tesseract (pytesseract)
- **AI**: Anthropic Claude API
- **Styling**: Tailwind CSS

## Setup Instructions

### Prerequisites

1. **Python 3.8+** installed
2. **Node.js 18+** and npm installed
3. **Tesseract OCR** installed:
   - macOS: `brew install tesseract`
   - Linux: `sudo apt-get install tesseract-ocr`
   - Windows: Download from [GitHub](https://github.com/UB-Mannheim/tesseract/wiki)

### Installation

1. **Clone the repository** (if not already done)

2. **Set up Python backend**:
   ```bash
   # Create virtual environment
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install dependencies
   pip install -r requirements.txt
   ```

3. **Set up React frontend**:
   ```bash
   # Install dependencies
   npm install
   ```

4. **Configure environment variables**:
   ```bash
   # Copy example env file
   cp .env.example .env
   
   # Edit .env and add your Anthropic API key
   # Get your key from: https://console.anthropic.com/
   ```

   Update `.env`:
   ```env
   TESSERACT_CMD=/opt/homebrew/bin/tesseract  # Adjust for your system
   ANTHROPIC_API_KEY=your_claude_key_here
   ```

### Running the Application

**Option 1: Development Mode (Recommended)**

1. **Terminal 1 - Start Flask backend**:
   ```bash
   source venv/bin/activate
   cd ocr_app
   python app.py
   ```
   Backend runs on `http://localhost:5001`

2. **Terminal 2 - Start React frontend**:
   ```bash
   npm run dev
   ```
   Frontend runs on `http://localhost:5173`

**Option 2: Production Mode**

1. **Build React frontend**:
   ```bash
   npm run build
   ```

2. **Start Flask server** (it will serve the built React app):
   ```bash
   source venv/bin/activate
   cd ocr_app
   python app.py
   ```
   App runs on `http://localhost:5001`

## Usage

1. Open the application in your browser
2. Upload an image or take a photo
3. Wait for OCR processing
4. View extracted text in Default Mode
5. Switch to Enhanced Mode to chat with AI about your notes

## API Endpoints

- `POST /ocr` - Upload image and get extracted text
- `POST /api/enhanced` - Send user instruction with extracted text, get AI response
- `GET /credits` - View team credits

## Project Structure

```
madhacks2025/
├── ocr_app/
│   ├── app.py              # Flask backend
│   ├── templates/          # HTML templates (legacy)
│   └── uploads/            # Uploaded images
├── frontend/
│   ├── App.tsx             # Main React app
│   ├── EntryScreen.tsx     # Entry screen component
│   ├── ui/                 # UI components
│   │   ├── button.tsx
│   │   └── input.tsx
│   ├── main.tsx            # React entry point
│   └── index.css           # Global styles
├── dist/                   # Built React app (generated)
├── package.json            # Frontend dependencies
├── requirements.txt        # Python dependencies
└── .env                    # Environment variables (create from .env.example)
```

## Troubleshooting

### Tesseract not found
- Make sure Tesseract is installed and in your PATH
- Update `TESSERACT_CMD` in `.env` with the correct path

### Claude API errors
- Verify your `ANTHROPIC_API_KEY` is set correctly in `.env`
- Check that you have API credits in your Anthropic account

### CORS errors
- Make sure Flask-CORS is installed: `pip install flask-cors`
- The Flask app should have `CORS(app)` enabled (already configured)

## Team

Juan Sandoval, Viktoria Sakman, Piha Patel, Alka Lakadia

## License

MIT


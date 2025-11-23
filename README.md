# Replae


Transform your notes into actionable insights with AI-powered OCR, intelligent assistance, and voice synthesis. Replae extracts text from images, helps you organize and understand your notes through AI conversation, and converts your content into natural-sounding audio with customizable voices.


## Features


- 📸 **Advanced OCR**: Extract text from images using GPT-4.1 Vision API for highly accurate text recognition
- 🤖 **AI Assistant**: Chat with Claude AI to organize, summarize, analyze, and transform your extracted notes
- 🎙️ **Text-to-Speech**: Convert your notes and AI responses into natural-sounding audio
- 🎭 **Voice Cloning**: Upload your own voice sample to generate personalized audio in your voice
- 📝 **Multiple Entries**: Create and manage multiple note entries with a clean sidebar interface
- 🔄 **Two Modes**:
 - **Default Mode**: View and listen to extracted text
 - **Enhanced Mode**: Chat with AI and listen to AI-generated responses
- 🎨 **Modern UI**: Beautiful, responsive React frontend with Tailwind CSS and smooth animations
- 🔊 **Audio Playback**: Play, pause, and control audio playback directly in the interface


## Tech Stack


- **Backend**: Flask (Python)
- **Frontend**: React + TypeScript + Vite
- **OCR**: OpenAI GPT-4.1 Vision API
- **AI Assistant**: Anthropic Claude API
- **Text-to-Speech**: Fish Audio API
- **Styling**: Tailwind CSS
- **Icons**: Lucide React


## Setup Instructions


### Prerequisites


1. **Python 3.8+** installed
2. **Node.js 18+** and npm installed
3. **API Keys** (you'll need these):
  - OpenAI API key (for OCR)
  - Anthropic Claude API key (for AI assistant)
  - Fish Audio API key (for text-to-speech)


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
 
  Create a `.env` file in the project root with the following:
  ```env
  # OpenAI API Key (for OCR)
  OPENAI_API_KEY=your_openai_key_here
 
  # Anthropic Claude API Key (for AI assistant)
  ANTHROPIC_API_KEY=your_claude_key_here
 
  # Fish Audio API Key (for text-to-speech)
  FISH_AUDIO_API_KEY=your_fish_audio_key_here
  ```
 
  Get your API keys from:
  - OpenAI: https://platform.openai.com/api-keys
  - Anthropic: https://console.anthropic.com/
  - Fish Audio: https://fish.audio/ (or your Fish Audio provider)


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


1. **Upload an Image**: Click "Choose File" or "Take Photo" to upload an image containing text
2. **Optional Voice Upload**: Upload an MP3 voice sample for personalized audio generation
3. **Process Image**: Click "Process Image" to extract text using GPT-4.1 Vision
4. **View Extracted Text**: See your extracted text in Default Mode
5. **Listen to Audio**: Click "Play Audio" to hear your notes read aloud (choose default or custom voice)
6. **Chat with AI**: Switch to Enhanced Mode to ask questions, get summaries, create action items, and more
7. **Listen to AI Responses**: Generate and play audio of AI responses in your preferred voice
8. **Manage Entries**: Create multiple entries and switch between them using the sidebar


## API Endpoints


- `POST /ocr` - Upload image and get extracted text using GPT-4.1 Vision
- `POST /api/enhanced` - Send user instruction with extracted text, get AI response from Claude
- `POST /api/upload-voice` - Upload voice sample file for voice cloning
- `POST /api/generate-audio` - Generate audio from text using Fish Audio TTS
- `GET /uploads/audio/<filename>` - Serve generated audio files
- `GET /uploads/voices/<filename>` - Serve uploaded voice files
- `GET /credits` - View team credits


## Project Structure


```
madhacks2025/
├── ocr_app/
│   ├── app.py              # Flask backend
│   ├── tts_service.py      # Text-to-speech service (Fish Audio)
│   ├── templates/          # HTML templates (legacy)
│   └── uploads/            # Uploaded files
│       ├── audio/          # Generated audio files
│       └── voices/         # Uploaded voice samples
├── frontend/
│   ├── App.tsx             # Main React app
│   ├── EntryScreen.tsx     # Entry screen with modes and audio
│   ├── components/
│   │   └── Logo.tsx        # Replae logo component
│   ├── components/ui/      # UI components (buttons, inputs, etc.)
│   ├── types.ts            # TypeScript type definitions
│   ├── main.tsx            # React entry point
│   └── index.css           # Global styles
├── dist/                   # Built React app (generated)
├── package.json            # Frontend dependencies
├── requirements.txt        # Python dependencies
└── .env                    # Environment variables (create this)
```


## Troubleshooting


### API Key Errors
- Verify all three API keys are set correctly in `.env`:
 - `OPENAI_API_KEY` - Required for OCR
 - `ANTHROPIC_API_KEY` - Required for AI assistant
 - `FISH_AUDIO_API_KEY` - Required for audio generation
- Make sure there are no extra spaces or quotes around the keys
- Restart the Flask server after updating `.env`


### Audio Generation Errors
- Check that `FISH_AUDIO_API_KEY` is set in `.env`
- Verify the Fish Audio API endpoint is correct
- Check backend logs for detailed error messages
- Ensure voice files are in MP3, WAV, or OGG format


### OCR Errors
- Verify `OPENAI_API_KEY` is set correctly
- Check that you have credits in your OpenAI account
- Ensure images are in a supported format (JPEG, PNG, etc.)


### Claude API Errors
- Verify your `ANTHROPIC_API_KEY` is set correctly in `.env`
- Check that you have API credits in your Anthropic account
- Review the error message in the browser console for details


### CORS Errors
- Make sure Flask-CORS is installed: `pip install flask-cors`
- The Flask app should have `CORS(app)` enabled (already configured)


### Audio Playback Issues
- Check browser console for audio URL errors
- Verify the `/uploads` proxy is configured in `vite.config.ts`
- Ensure the Flask server is running and accessible
- Check that audio files are being generated in `ocr_app/uploads/audio/`


## Team


Juan Sandoval, Viktoria Sakman, Piha Patel, Alka Lakadia


## License


MIT



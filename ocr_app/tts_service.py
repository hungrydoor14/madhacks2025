from fish_audio_sdk import Session, TTSRequest
import os

#HOW TO RUN:
#Go to OCR app directory
#USe export FISH_AUDIO_API_KEY="your_api_key_here"
#Run python3 tts_service.py "Hello, this is a test" test.mp3
class TTSService:
    def __init__(self, api_key=None):
        """
        Initialize TTS service with API key.
        If no API key provided, will try to get from environment variable FISH_AUDIO_API_KEY
        """
        self.api_key = api_key or os.getenv("FISH_AUDIO_API_KEY")
        if not self.api_key:
            raise ValueError("API key is required. Set FISH_AUDIO_API_KEY environment variable or pass api_key parameter.")
        
        self.session = Session(self.api_key)
    
    def generate_speech(self, text, output_path=None, backend='s1'):
        """
        Generate speech from text.
        
        Args:
            text: The text to convert to speech
            output_path: Optional path to save the audio file. If None, returns audio data as bytes
            backend: The TTS backend to use (default: 's1')
        
        Returns:
            If output_path is provided: returns the file path
            If output_path is None: returns audio data as bytes
        """
        audio_data = b""
        
        for chunk in self.session.tts(
            TTSRequest(text=text),
            backend=backend
        ):
            audio_data += chunk
        
        if output_path:
            with open(output_path, "wb") as f:
                f.write(audio_data)
            return output_path
        else:
            return audio_data

# Convenience function for quick usage
def generate_speech_file(text, output_path, api_key=None, backend='s1'):
    """
    Quick function to generate speech and save to file.
    
    Args:
        text: Text to convert to speech
        output_path: Path to save the audio file
        api_key: Optional API key (will use env var if not provided)
        backend: TTS backend (default: 's1')
    
    Returns:
        Path to the saved audio file
    """
    service = TTSService(api_key=api_key)
    return service.generate_speech(text, output_path=output_path, backend=backend)

#FOR TESTING PURPOSES
if __name__ == "__main__":
    # Test the TTS service
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python tts_service.py 'text to speak' [output_file.mp3]")
        sys.exit(1)
    
    text = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else "output.mp3"
    
    try:
        service = TTSService()
        result = service.generate_speech(text, output_path=output_file)
        print(f"✓ Audio saved to {result}")
    except ValueError as e:
        print(f"Error: {e}")
        print("Set FISH_AUDIO_API_KEY environment variable or pass api_key to TTSService()")
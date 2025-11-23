"""
TTS Service using Fish Audio
Handles text-to-speech generation with custom voice support
"""
import os
import uuid
from pathlib import Path
from typing import Optional
import requests

# Try to import Fish Audio SDK
try:
    from fishaudio import FishAudio
    from fishaudio.types import ReferenceAudio
    FISH_SDK_AVAILABLE = True
except ImportError:
    FISH_SDK_AVAILABLE = False
    FishAudio = None
    ReferenceAudio = None

class TTSService:
    def __init__(self, api_key: Optional[str] = None, base_url: str = "https://api.fish.audio"):
        """
        Initialize TTS Service
        
        Args:
            api_key: Fish Audio API key (optional, can be set via env var FISH_AUDIO_API_KEY)
            base_url: Fish Audio API base URL
        """
        self.api_key = api_key or os.getenv("FISH_AUDIO_API_KEY")
        self.base_url = base_url.rstrip('/')
        self.sdk_client = None
        
        # Try to initialize SDK if available
        if FISH_SDK_AVAILABLE and self.api_key and FishAudio:
            try:
                self.sdk_client = FishAudio(api_key=self.api_key)
            except Exception:
                self.sdk_client = None
    
    def generate_audio(
        self, 
        text: str, 
        voice_file_path: Optional[str] = None,
        output_path: Optional[str] = None,
        use_default_voice: bool = True
    ) -> Optional[str]:
        """
        Generate audio from text using Fish Audio API
        
        Args:
            text: Text to convert to speech
            voice_file_path: Path to custom voice MP3 file (optional)
            output_path: Path to save generated audio (optional, auto-generated if not provided)
            use_default_voice: Use default voice if no custom voice provided
            
        Returns:
            Path to generated audio file, or None if generation failed
        """
        if not self.api_key:
            raise Exception("FISH_AUDIO_API_KEY is not set. Please configure your API key in the .env file.")
        
        try:
            # Prepare output path - use absolute path from app directory
            if not output_path:
                # Get the directory where this file is located
                APP_DIR = os.path.dirname(os.path.abspath(__file__))
                AUDIO_FOLDER = os.path.join(APP_DIR, "uploads", "audio")
                os.makedirs(AUDIO_FOLDER, exist_ok=True)
                output_path = os.path.join(AUDIO_FOLDER, f"tts_{uuid.uuid4().hex[:8]}.wav")
            
            # Prepare request
            url = f"{self.base_url}/v1/tts"
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "text": text,
                "format": "wav"
            }
            
            # Add voice file if provided
            if voice_file_path and os.path.exists(voice_file_path):
                # Try using SDK first if available
                if self.sdk_client and FISH_SDK_AVAILABLE and ReferenceAudio:
                    try:
                        with open(voice_file_path, 'rb') as f:
                            voice_data = f.read()
                        
                        reference_audio = ReferenceAudio(
                            audio=voice_data,
                            text=text
                        )
                        
                        result = self.sdk_client.tts.convert(
                            text=text,
                            references=[reference_audio]
                        )
                        
                        if result:
                            if isinstance(result, bytes):
                                with open(output_path, 'wb') as f:
                                    f.write(result)
                                return output_path
                            elif hasattr(result, 'audio'):
                                with open(output_path, 'wb') as f:
                                    f.write(result.audio)
                                return output_path
                    except Exception:
                        pass
                
                # Try different endpoints for voice cloning
                endpoints_to_try = [
                    f"{self.base_url}/v1/tts/clone",
                    f"{self.base_url}/v1/voice-clone",
                    f"{self.base_url}/v1/tts",
                ]
                
                field_names_to_try = ['reference_audio', 'voice', 'audio', 'file', 'voice_file', 'reference']
                
                response = None
                for endpoint_url in endpoints_to_try:
                    if response and response.status_code == 200:
                        break
                    
                    for field_name in field_names_to_try:
                        try:
                            with open(voice_file_path, 'rb') as f:
                                files = {
                                    field_name: (os.path.basename(voice_file_path), f, 'audio/mpeg')
                                }
                                data = {
                                    'text': text,
                                    'format': 'wav'
                                }
                                
                                multipart_headers = {
                                    "Authorization": f"Bearer {self.api_key}"
                                }
                                
                                response = requests.post(
                                    endpoint_url,
                                    headers=multipart_headers,
                                    files=files,
                                    data=data,
                                    timeout=120
                                )
                                
                                if response.status_code == 200:
                                    break
                        except Exception:
                            continue
                    
                    if response and response.status_code == 200:
                        break
                
                if not use_default_voice:
                    if not response or response.status_code != 200:
                        error_msg = f"Failed to generate audio with custom voice. API returned status {response.status_code if response else 'None'}"
                        if response:
                            error_msg += f": {response.text[:500]}"
                        raise Exception(error_msg)
                elif not response or response.status_code != 200:
                    response = requests.post(url, headers=headers, json=payload, timeout=60)
            elif use_default_voice:
                response = requests.post(url, headers=headers, json=payload, timeout=60)
            else:
                return None
            
            if response.status_code == 200:
                # Save audio file
                with open(output_path, 'wb') as f:
                    f.write(response.content)
                
                # Verify file was created and has content
                if not os.path.exists(output_path):
                    raise Exception(f"Failed to create audio file at {output_path}")
                
                file_size = os.path.getsize(output_path)
                if file_size == 0:
                    raise Exception(f"Audio file is empty: {output_path}")
                
                print(f"Audio file saved successfully: {output_path} (size: {file_size} bytes)")
                return output_path
            else:
                error_text = response.text if hasattr(response, 'text') else "Unknown error"
                print(f"TTS API returned status {response.status_code}: {error_text[:500]}")
                raise Exception(f"TTS API error: Status {response.status_code} - {error_text[:200]}")
                
        except Exception as e:
            import traceback
            error_msg = str(e)
            print(f"TTS Service error: {error_msg}")
            print(f"Traceback:\n{traceback.format_exc()}")
            # Re-raise the exception so it can be caught by the caller
            raise
    
    def _fallback_tts(self, text: str, output_path: Optional[str] = None) -> Optional[str]:
        """Fallback TTS using system TTS (platform-dependent)"""
        return None

# Global instance
_tts_service = None

def get_tts_service() -> TTSService:
    """Get or create global TTS service instance"""
    global _tts_service
    if _tts_service is None:
        _tts_service = TTSService()
    return _tts_service


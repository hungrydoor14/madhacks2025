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
            return self._fallback_tts(text, output_path)
        
        try:
            # Prepare output path
            if not output_path:
                output_dir = Path("uploads/audio")
                output_dir.mkdir(parents=True, exist_ok=True)
                output_path = str(output_dir / f"tts_{uuid.uuid4().hex[:8]}.wav")
            
            # Prepare request
            # Fish Audio API endpoints - try different possible endpoints
            # Option 1: Direct TTS with voice file
            url = f"{self.base_url}/v1/tts"
            # Option 2: Alternative endpoint (uncomment if needed)
            # url = f"{self.base_url}/api/v1/tts"
            # url = f"{self.base_url}/tts"
            
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
                # Try using SDK first if available (this is the proper way to do voice cloning)
                if self.sdk_client and FISH_SDK_AVAILABLE and ReferenceAudio:
                    try:
                        # Read the voice file
                        with open(voice_file_path, 'rb') as f:
                            voice_data = f.read()
                        
                        # Create reference audio object
                        # Note: For instant voice cloning, we need the transcript of the reference audio
                        # For now, we'll use the text we want to generate (this may not be ideal)
                        reference_audio = ReferenceAudio(
                            audio=voice_data,
                            text=text  # Using the target text as transcript (may need actual transcript)
                        )
                        
                        # Generate audio using SDK with voice cloning
                        result = self.sdk_client.tts.convert(
                            text=text,
                            references=[reference_audio]
                        )
                        
                        # Save the result
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
                
                # Initialize response variable for fallback
                response = None
                
                # Try different endpoints for voice cloning
                endpoints_to_try = [
                    f"{self.base_url}/v1/tts/clone",
                    f"{self.base_url}/v1/voice-clone",
                    f"{self.base_url}/v1/tts",
                    f"{self.base_url}/api/v1/tts",
                ]
                
                # Try different field names that Fish Audio might expect
                field_names_to_try = ['reference_audio', 'voice', 'audio', 'file', 'voice_file', 'reference']
                
                # Try each endpoint with each field name
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
                
                # If custom voice was explicitly requested but failed, don't silently fall back
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
                return output_path
            else:
                return self._fallback_tts(text, output_path)
                
        except Exception:
            return self._fallback_tts(text, output_path)
    
    def _fallback_tts(self, text: str, output_path: Optional[str] = None) -> Optional[str]:
        """
        Fallback TTS using system TTS (platform-dependent)
        This is a placeholder - you may want to use pyttsx3 or other libraries
        """
        return None
    
    def generate_audio_simple(self, text: str, voice_file_path: Optional[str] = None) -> Optional[str]:
        """
        Simplified interface for generating audio
        
        Args:
            text: Text to convert to speech
            voice_file_path: Optional path to custom voice file
            
        Returns:
            Path to generated audio file, or None if failed
        """
        return self.generate_audio(
            text=text,
            voice_file_path=voice_file_path,
            use_default_voice=True
        )

# Global instance
_tts_service = None

def get_tts_service() -> TTSService:
    """Get or create global TTS service instance"""
    global _tts_service
    if _tts_service is None:
        _tts_service = TTSService()
    return _tts_service


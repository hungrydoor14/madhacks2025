#!/usr/bin/env python3
"""
Test script for Claude API integration
Run this to verify your API key is working before testing the full app
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("ANTHROPIC_API_KEY")

if not api_key or api_key == "your_claude_key_here":
    print("❌ ERROR: ANTHROPIC_API_KEY not set or still has placeholder value")
    print("\nPlease:")
    print("1. Get your API key from: https://console.anthropic.com/")
    print("2. Edit .env file and replace 'your_claude_key_here' with your actual key")
    exit(1)

print(f"✅ API Key found: {api_key[:10]}...")

# Test API call
try:
    response = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2024-06-20"
        },
        json={
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 100,
            "messages": [
                {"role": "user", "content": "Say 'Hello, DoBrain is working!' if you can read this."}
            ]
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        text = data.get("content", [{}])[0].get("text", "")
        print(f"✅ Claude API is working!")
        print(f"Response: {text}")
    else:
        print(f"❌ API Error (status {response.status_code}):")
        print(response.text)
        exit(1)
        
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)


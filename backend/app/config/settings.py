"""Application settings and environment variables"""
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent.parent
load_dotenv(ROOT_DIR / '.env')

# JWT Settings
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'fleet-os-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"

# Twilio Settings
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER')

# OpenAI Settings
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

# Google Maps
GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY')

# App Settings
DEBUG = os.environ.get('DEBUG', 'false').lower() == 'true'

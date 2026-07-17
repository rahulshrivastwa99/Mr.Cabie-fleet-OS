"""Twilio OTP Service"""
import random
from datetime import datetime, timezone, timedelta
from ..config.settings import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
from ..config.database import db

# Initialize Twilio client if credentials are available
twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        from twilio.rest import Client
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    except Exception:
        pass


def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return str(random.randint(100000, 999999))


async def send_otp(phone: str) -> tuple[str, bool]:
    """
    Send OTP to phone number via Twilio SMS
    Returns: (otp, sms_sent)
    """
    otp = generate_otp()
    otp_expiry = datetime.now(timezone.utc) + timedelta(minutes=5)
    
    # Store OTP in database
    await db.driver_otps.update_one(
        {"phone": phone},
        {"$set": {
            "otp": otp,
            "expires_at": otp_expiry.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    sms_sent = False
    
    # Try to send via Twilio
    if twilio_client and TWILIO_PHONE_NUMBER:
        try:
            message = twilio_client.messages.create(
                body=f"Your Mr. Cabie driver login OTP is: {otp}. Valid for 5 minutes.",
                from_=TWILIO_PHONE_NUMBER,
                to=f"+91{phone}"
            )
            sms_sent = True
        except Exception as e:
            print(f"Twilio SMS failed: {e}")
    
    return otp, sms_sent


async def verify_otp(phone: str, otp: str) -> bool:
    """Verify OTP for phone number"""
    stored = await db.driver_otps.find_one({"phone": phone})
    
    if not stored:
        return False
    
    if stored.get("otp") != otp:
        return False
    
    # Check expiry
    expires_at = datetime.fromisoformat(stored.get("expires_at", "2000-01-01T00:00:00+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        return False
    
    # Delete used OTP
    await db.driver_otps.delete_one({"phone": phone})
    
    return True

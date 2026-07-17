"""Driver Portal Authentication Routes"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone

from ...config.database import db
from ...models import DriverOTPRequest, DriverOTPVerify, DriverLocationUpdate
from ...middleware.auth import create_access_token, get_current_driver
from ...services.otp_service import send_otp, verify_otp

router = APIRouter(prefix="/driver", tags=["Driver Portal"])


@router.post("/auth/send-otp")
async def driver_send_otp(data: DriverOTPRequest):
    """Send OTP to driver's phone for login"""
    phone = data.phone.strip()[-10:]  # Get last 10 digits
    
    # Check if driver exists
    driver = await db.drivers.find_one({"phone": phone})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not registered. Contact your fleet operator.")
    
    # Send OTP
    otp, sms_sent = await send_otp(phone)
    
    response = {"message": "OTP sent successfully"}
    
    # Include debug OTP if SMS wasn't sent (for testing)
    if not sms_sent:
        response["debug_otp"] = otp
        response["note"] = "SMS service unavailable. Using debug OTP."
    
    return response


@router.post("/auth/verify-otp")
async def driver_verify_otp(data: DriverOTPVerify):
    """Verify OTP and login driver"""
    phone = data.phone.strip()[-10:]
    
    # Verify OTP
    is_valid = await verify_otp(phone, data.otp)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")
    
    # Get driver
    driver = await db.drivers.find_one({"phone": phone}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Create token
    token = create_access_token({
        "sub": driver["id"],
        "type": "driver",
        "phone": phone
    })
    
    return {
        "token": token,
        "driver": driver
    }


@router.get("/auth/me")
async def driver_get_me(current_driver: dict = Depends(get_current_driver)):
    """Get current driver profile"""
    return current_driver


@router.post("/location")
async def driver_update_location(
    data: DriverLocationUpdate,
    current_driver: dict = Depends(get_current_driver)
):
    """Update driver's current location"""
    # Check if driver has an active trip
    active_trip = await db.duties.find_one({
        "driver_id": current_driver["id"],
        "status": "STARTED"
    })
    
    location_data = {
        "driver_id": current_driver["id"],
        "latitude": data.latitude,
        "longitude": data.longitude,
        "accuracy": data.accuracy,
        "speed": data.speed,
        "heading": data.heading,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "trip_id": active_trip["id"] if active_trip else None,
        "client_id": active_trip["client_id"] if active_trip else None
    }
    
    # Upsert location
    await db.driver_locations.update_one(
        {"driver_id": current_driver["id"]},
        {"$set": location_data},
        upsert=True
    )
    
    # Update driver's current_location field
    await db.drivers.update_one(
        {"id": current_driver["id"]},
        {"$set": {
            "current_location": {
                "lat": data.latitude,
                "lng": data.longitude,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Location updated", "timestamp": location_data["timestamp"]}

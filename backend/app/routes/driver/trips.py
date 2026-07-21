"""Driver Portal Trip Routes"""
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form
from typing import List, Optional
from datetime import datetime, timezone
from pathlib import Path
import uuid
import os

from ...config.database import db
from ...models import TripActionRequest, TripStatus, DutySlipStatus
from ...middleware.auth import get_current_driver

router = APIRouter(prefix="/driver/trips", tags=["Driver Trips"])

# Upload directory for duty-slip photos
UPLOAD_ROOT = Path("/app/backend/uploads")
PHOTO_DIR = UPLOAD_ROOT / "duty_photos"
PHOTO_DIR.mkdir(parents=True, exist_ok=True)


@router.get("")
async def driver_get_trips(current_driver: dict = Depends(get_current_driver)):
    """Get all trips assigned to driver"""
    trips = await db.duties.find({
        "driver_id": current_driver["id"],
        "status": {"$in": ["ASSIGNED", "ACCEPTED", "STARTED"]}
    }, {"_id": 0}).sort("pickup_time", 1).to_list(100)
    
    return trips


@router.get("/history")
async def driver_get_trip_history(current_driver: dict = Depends(get_current_driver)):
    """Get completed trips"""
    trips = await db.duties.find({
        "driver_id": current_driver["id"],
        "status": {"$in": ["COMPLETED", "BILLED", "CLOSED"]}
    }, {"_id": 0}).sort("pickup_time", -1).to_list(50)
    
    return trips


@router.get("/{trip_id}")
async def driver_get_trip(trip_id: str, current_driver: dict = Depends(get_current_driver)):
    """Get specific trip details"""
    trip = await db.duties.find_one({
        "id": trip_id,
        "driver_id": current_driver["id"]
    }, {"_id": 0})
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Get duty slip if exists
    duty_slip = await db.duty_slips.find_one({"trip_id": trip_id}, {"_id": 0})
    
    return {"trip": trip, "duty_slip": duty_slip}


@router.patch("/{trip_id}/accept")
async def driver_accept_trip(trip_id: str, current_driver: dict = Depends(get_current_driver)):
    """Accept an assigned trip"""
    trip = await db.duties.find_one({
        "id": trip_id,
        "driver_id": current_driver["id"],
        "status": "ASSIGNED"
    })
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found or cannot be accepted")
    
    await db.duties.update_one(
        {"id": trip_id},
        {"$set": {
            "status": TripStatus.ACCEPTED.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Trip accepted"}


@router.patch("/{trip_id}/reject")
async def driver_reject_trip(trip_id: str, current_driver: dict = Depends(get_current_driver)):
    """Reject an assigned trip"""
    trip = await db.duties.find_one({
        "id": trip_id,
        "driver_id": current_driver["id"],
        "status": "ASSIGNED"
    })
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found or cannot be rejected")
    
    # Remove assignment
    await db.duties.update_one(
        {"id": trip_id},
        {"$set": {
            "driver_id": None,
            "vehicle_id": None,
            "status": TripStatus.CREATED.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update driver status back to available
    await db.drivers.update_one(
        {"id": current_driver["id"]},
        {"$set": {"status": "AVAILABLE"}}
    )
    
    return {"message": "Trip rejected"}


@router.post("/{trip_id}/start")
async def driver_start_trip(
    trip_id: str,
    data: TripActionRequest,
    current_driver: dict = Depends(get_current_driver)
):
    """Start a trip with opening KM reading"""
    trip = await db.duties.find_one({
        "id": trip_id,
        "driver_id": current_driver["id"],
        "status": "ACCEPTED"
    })
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found or cannot be started")
    
    if data.opening_km is None:
        raise HTTPException(status_code=400, detail="Opening KM is required")

    now_iso = datetime.now(timezone.utc).isoformat()

    # Build start location stamp (if provided by app)
    start_location = None
    if data.latitude is not None and data.longitude is not None:
        start_location = {
            "latitude": data.latitude,
            "longitude": data.longitude,
            "address": data.address,
            "timestamp": now_iso,
        }

    # Update trip status + timestamp + location
    await db.duties.update_one(
        {"id": trip_id},
        {"$set": {
            "status": TripStatus.STARTED.value,
            "started_at": now_iso,
            "start_location": start_location,
            "updated_at": now_iso
        }}
    )
    
    # Get vehicle and client info
    vehicle = await db.vehicles.find_one({"id": trip.get("vehicle_id")}, {"_id": 0})
    client = await db.clients.find_one({"id": trip.get("client_id")}, {"_id": 0})
    
    # Create duty slip
    duty_slip = {
        "id": str(uuid.uuid4()),
        "trip_id": trip_id,
        "client_id": trip.get("client_id"),
        "date": now_iso,
        "start_time": now_iso,
        "started_at": now_iso,
        "start_location": start_location,
        "trip_type": trip.get("trip_type", "ONE_WAY"),
        "driver_id": current_driver["id"],
        "driver_name": current_driver.get("name"),
        "vehicle_id": trip.get("vehicle_id"),
        "vehicle_number": vehicle.get("registration_number") if vehicle else None,
        "vehicle_type": vehicle.get("vehicle_type") if vehicle else None,
        "corporate_name": client.get("company_name") if client else None,
        "pickup_location": trip.get("pickup_location"),
        "dropoff_location": trip.get("dropoff_location"),
        "opening_km": data.opening_km,
        "passenger_name": trip.get("passenger_name"),
        "status": DutySlipStatus.DRAFT.value,
        "driver_remarks": data.driver_remarks,
        "created_at": now_iso,
        "updated_at": now_iso
    }
    
    await db.duty_slips.insert_one(duty_slip)
    
    # Link duty slip to trip
    await db.duties.update_one(
        {"id": trip_id},
        {"$set": {"duty_slip_id": duty_slip["id"]}}
    )
    
    # Update driver status
    await db.drivers.update_one(
        {"id": current_driver["id"]},
        {"$set": {"status": "ON_DUTY"}}
    )
    
    return {"message": "Trip started", "duty_slip_id": duty_slip["id"]}


@router.post("/{trip_id}/complete")
async def driver_complete_trip(
    trip_id: str,
    data: TripActionRequest,
    current_driver: dict = Depends(get_current_driver)
):
    """Complete a trip with closing KM and signature"""
    trip = await db.duties.find_one({
        "id": trip_id,
        "driver_id": current_driver["id"],
        "status": "STARTED"
    })
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found or cannot be completed")
    
    if data.closing_km is None:
        raise HTTPException(status_code=400, detail="Closing KM is required")
    
    if not data.passenger_signature:
        raise HTTPException(status_code=400, detail="Passenger signature is required")
    
    if not data.traveller_name:
        raise HTTPException(status_code=400, detail="Traveller name is required")
    
    # Get duty slip
    duty_slip = await db.duty_slips.find_one({"trip_id": trip_id})
    if not duty_slip:
        raise HTTPException(status_code=404, detail="Duty slip not found")
    
    opening_km = duty_slip.get("opening_km", 0)
    total_km = data.closing_km - opening_km
    
    if total_km < 0:
        raise HTTPException(status_code=400, detail="Closing KM must be greater than opening KM")

    now_iso = datetime.now(timezone.utc).isoformat()

    # Build end location stamp
    end_location = None
    if data.latitude is not None and data.longitude is not None:
        end_location = {
            "latitude": data.latitude,
            "longitude": data.longitude,
            "address": data.address,
            "timestamp": now_iso,
        }

    # Update duty slip
    await db.duty_slips.update_one(
        {"trip_id": trip_id},
        {"$set": {
            "closing_km": data.closing_km,
            "total_km": total_km,
            "end_time": now_iso,
            "completed_at": now_iso,
            "end_location": end_location,
            "traveller_name": data.traveller_name,
            "passenger_signature": data.passenger_signature,
            "signed_at": now_iso,
            "signed_by": data.traveller_name,
            "driver_remarks": data.driver_remarks,
            "status": DutySlipStatus.SIGNED.value,
            "updated_at": now_iso
        }}
    )

    # Update trip status
    await db.duties.update_one(
        {"id": trip_id},
        {"$set": {
            "status": TripStatus.COMPLETED.value,
            "end_time": now_iso,
            "completed_at": now_iso,
            "end_location": end_location,
            "updated_at": now_iso
        }}
    )
    
    # Update driver status
    await db.drivers.update_one(
        {"id": current_driver["id"]},
        {"$set": {"status": "AVAILABLE"}}
    )
    
    # Update vehicle status
    if trip.get("vehicle_id"):
        await db.vehicles.update_one(
            {"id": trip["vehicle_id"]},
            {"$set": {"status": "AVAILABLE"}}
        )
    
    return {"message": "Trip completed", "total_km": total_km}


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_PHOTO_SIZE_MB = 10


@router.post("/{trip_id}/upload-photo")
async def driver_upload_trip_photo(
    trip_id: str,
    photo: UploadFile = File(...),
    photo_type: str = Form(...),  # "start" or "end"
    current_driver: dict = Depends(get_current_driver),
):
    """
    Upload a photo captured on trip start or completion.
    - photo_type must be "start" or "end"
    - Saves the file to /app/backend/uploads/duty_photos/
    - Links the URL to the trip's duty slip (start_photo_url / end_photo_url)
    """
    # Validate photo_type
    if photo_type not in ("start", "end"):
        raise HTTPException(status_code=400, detail="photo_type must be 'start' or 'end'")

    # Verify trip belongs to driver
    trip = await db.duties.find_one({
        "id": trip_id,
        "driver_id": current_driver["id"],
    })
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Validate content type
    if photo.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}"
        )

    # Read and validate file size
    content = await photo.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_PHOTO_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"Photo too large ({size_mb:.1f} MB). Max {MAX_PHOTO_SIZE_MB} MB."
        )

    # Determine extension
    ext_map = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    }
    ext = ext_map.get(photo.content_type, "jpg")
    filename = f"{trip_id}_{photo_type}_{uuid.uuid4().hex}.{ext}"
    file_path = PHOTO_DIR / filename

    # Ensure dir exists (in case it was removed)
    PHOTO_DIR.mkdir(parents=True, exist_ok=True)

    # Save file
    with open(file_path, "wb") as f:
        f.write(content)

    # Public URL served by StaticFiles mount in server.py (under /api so K8s ingress routes it)
    photo_url = f"/api/uploads/duty_photos/{filename}"

    # Update duty slip
    field = "start_photo_url" if photo_type == "start" else "end_photo_url"
    now_iso = datetime.now(timezone.utc).isoformat()

    duty_slip = await db.duty_slips.find_one({"trip_id": trip_id})
    if duty_slip:
        await db.duty_slips.update_one(
            {"trip_id": trip_id},
            {"$set": {field: photo_url, "updated_at": now_iso}}
        )

    return {
        "message": f"{photo_type.capitalize()} photo uploaded",
        "photo_url": photo_url,
        "photo_type": photo_type,
    }

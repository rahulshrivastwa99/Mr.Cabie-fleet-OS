"""Driver Portal Location Update Route

Receives GPS pings from the driver mobile/web apps every ~30 seconds while a
trip is active. Persists a rolling location history and updates the
`current_location` on the driver document for admin live-tracking.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

from ...config.database import db
from ...middleware.auth import get_current_driver

router = APIRouter(prefix="/driver", tags=["Driver Location"])


class DriverLocationPing(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None
    trip_id: Optional[str] = None


@router.post("/location")
async def driver_update_location(
    data: DriverLocationPing,
    current_driver: dict = Depends(get_current_driver),
):
    """Store a driver GPS location ping (and update driver's current location)."""
    now_iso = datetime.now(timezone.utc).isoformat()

    doc = {
        "id": str(uuid.uuid4()),
        "driver_id": current_driver["id"],
        "trip_id": data.trip_id,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "accuracy": data.accuracy,
        "speed": data.speed,
        "heading": data.heading,
        "timestamp": now_iso,
    }
    await db.driver_locations.insert_one(doc)

    # Keep the latest location on the driver doc for fast admin lookup
    await db.drivers.update_one(
        {"id": current_driver["id"]},
        {"$set": {
            "current_location": {
                "latitude": data.latitude,
                "longitude": data.longitude,
                "accuracy": data.accuracy,
                "timestamp": now_iso,
            },
            "last_location_at": now_iso,
        }},
    )

    return {"message": "Location updated", "timestamp": now_iso}

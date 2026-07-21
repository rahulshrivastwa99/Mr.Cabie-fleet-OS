"""Admin Portal Duty/Trip Routes

Provides the minimal CRUD & assignment endpoints needed to create trips and
hand them off to drivers. Larger admin trip features (bulk assign, contracts,
etc.) still live in the legacy monolith and are not required for the
founder-requested Driver App features.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone

from ...config.database import db
from ...models import (
    TripCreate, TripAssign, TripStatusUpdate, TripStatus,
)
from ...middleware.auth import get_current_user

router = APIRouter(prefix="/duties", tags=["Admin Duties/Trips"])


def _to_iso(value):
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    return value


@router.get("")
async def admin_list_duties(current_admin: dict = Depends(get_current_user)):
    """List all trips (duties)."""
    trips = await db.duties.find({}, {"_id": 0}).sort("pickup_time", -1).to_list(500)
    return trips


@router.post("")
async def admin_create_duty(
    data: TripCreate,
    current_admin: dict = Depends(get_current_user),
):
    """Create a new trip (duty). Status starts as CREATED."""
    import uuid
    now_iso = datetime.now(timezone.utc).isoformat()
    trip = {
        "id": str(uuid.uuid4()),
        "client_id": data.client_id,
        "booking_id": data.booking_id,
        "contract_id": data.contract_id,
        "vehicle_id": None,
        "driver_id": None,
        "status": TripStatus.CREATED.value,
        "trip_type": data.trip_type.value if hasattr(data.trip_type, "value") else data.trip_type,
        "pickup_location": data.pickup_location,
        "dropoff_location": data.dropoff_location,
        "pickup_time": _to_iso(data.pickup_time),
        "end_time": None,
        "passenger_name": data.passenger_name,
        "passenger_phone": data.passenger_phone,
        "passengers": data.passengers or [],
        "notes": data.notes,
        "duty_slip_id": None,
        "started_at": None,
        "completed_at": None,
        "start_location": None,
        "end_location": None,
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    await db.duties.insert_one(trip)
    # Remove MongoDB's _id field before returning
    trip.pop("_id", None)
    return trip


@router.get("/{trip_id}")
async def admin_get_duty(
    trip_id: str,
    current_admin: dict = Depends(get_current_user),
):
    trip = await db.duties.find_one({"id": trip_id}, {"_id": 0})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    duty_slip = await db.duty_slips.find_one({"trip_id": trip_id}, {"_id": 0})
    return {"trip": trip, "duty_slip": duty_slip}


@router.patch("/{trip_id}/assign")
async def admin_assign_duty(
    trip_id: str,
    data: TripAssign,
    current_admin: dict = Depends(get_current_user),
):
    """Assign a driver + vehicle to a trip and move status to ASSIGNED."""
    trip = await db.duties.find_one({"id": trip_id})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Validate driver + vehicle exist
    driver = await db.drivers.find_one({"id": data.driver_id})
    vehicle = await db.vehicles.find_one({"id": data.vehicle_id})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    await db.duties.update_one(
        {"id": trip_id},
        {"$set": {
            "driver_id": data.driver_id,
            "vehicle_id": data.vehicle_id,
            "contract_id": data.contract_id or trip.get("contract_id"),
            "status": TripStatus.ASSIGNED.value,
            "updated_at": now_iso,
        }},
    )

    # Mark driver as ON_DUTY_PENDING (soft) — full state handled on start.
    await db.drivers.update_one(
        {"id": data.driver_id},
        {"$set": {"status": "ASSIGNED"}}
    )

    updated = await db.duties.find_one({"id": trip_id}, {"_id": 0})
    return updated


@router.patch("/{trip_id}/status")
async def admin_update_duty_status(
    trip_id: str,
    data: TripStatusUpdate,
    current_admin: dict = Depends(get_current_user),
):
    trip = await db.duties.find_one({"id": trip_id})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    await db.duties.update_one(
        {"id": trip_id},
        {"$set": {
            "status": data.status.value if hasattr(data.status, "value") else data.status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {"message": "Status updated"}


@router.delete("/{trip_id}")
async def admin_delete_duty(
    trip_id: str,
    current_admin: dict = Depends(get_current_user),
):
    result = await db.duties.delete_one({"id": trip_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trip not found")
    # Best-effort delete of the linked duty slip
    await db.duty_slips.delete_one({"trip_id": trip_id})
    return {"message": "Trip deleted"}

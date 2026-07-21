"""Admin Portal Bookings Routes

Minimal booking API + founder-requested Auto-Trip Creation on approval.
When an admin approves a booking, an assignable trip is automatically
created and linked so dispatch can pick a driver + vehicle immediately.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone
import uuid

from ...config.database import db
from ...models.booking import BookingCreate, Booking, BookingStatus
from ...models import TripStatus
from ...middleware.auth import get_current_user as get_current_admin

router = APIRouter(prefix="/bookings", tags=["Admin Bookings"])


def _iso(v):
    if isinstance(v, datetime):
        return v.astimezone(timezone.utc).isoformat()
    return v


@router.get("")
async def admin_list_bookings(current_admin: dict = Depends(get_current_admin)):
    return await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.post("")
async def admin_create_booking(
    data: BookingCreate,
    current_admin: dict = Depends(get_current_admin),
):
    """Create a booking in PENDING status. Approval creates the trip."""
    now_iso = datetime.now(timezone.utc).isoformat()
    booking = Booking(**data.model_dump())
    doc = booking.model_dump()
    doc["created_at"] = now_iso
    doc["updated_at"] = now_iso
    doc["pickup_time"] = _iso(doc["pickup_time"])
    # Enum field may or may not be a plain string
    if hasattr(doc.get("trip_type"), "value"):
        doc["trip_type"] = doc["trip_type"].value
    await db.bookings.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/{booking_id}")
async def admin_get_booking(
    booking_id: str,
    current_admin: dict = Depends(get_current_admin),
):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.get("trip_id"):
        booking["trip"] = await db.duties.find_one(
            {"id": booking["trip_id"]}, {"_id": 0}
        )
    return booking


@router.patch("/{booking_id}/approve")
async def admin_approve_booking(
    booking_id: str,
    current_admin: dict = Depends(get_current_admin),
):
    """
    Approve a booking. Founder-requested behaviour: automatically creates
    an assignable trip (duty) and links it back onto the booking, so dispatch
    can immediately assign a driver + vehicle without re-entering the trip.
    """
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.get("status") == BookingStatus.APPROVED:
        # Idempotent: if it's already approved just return current state
        return booking

    now_iso = datetime.now(timezone.utc).isoformat()

    # Auto-create the trip
    trip = {
        "id": str(uuid.uuid4()),
        "client_id": booking.get("client_id"),
        "booking_id": booking_id,
        "contract_id": None,
        "vehicle_id": None,
        "driver_id": None,
        "status": TripStatus.CREATED.value,
        "trip_type": booking.get("trip_type") or "ONE_WAY",
        "pickup_location": booking.get("pickup_location"),
        "dropoff_location": booking.get("dropoff_location"),
        "pickup_time": booking.get("pickup_time"),
        "end_time": None,
        "passenger_name": booking.get("passenger_name"),
        "passenger_phone": booking.get("passenger_phone"),
        "passengers": booking.get("passengers") or [],
        "notes": booking.get("notes"),
        "duty_slip_id": None,
        "started_at": None,
        "completed_at": None,
        "start_location": None,
        "end_location": None,
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    await db.duties.insert_one(trip)

    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": BookingStatus.APPROVED,
            "approved_by": current_admin.id,
            "approved_at": now_iso,
            "trip_id": trip["id"],
            "updated_at": now_iso,
        }},
    )

    updated = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if updated is None:
        updated = {}
    trip.pop("_id", None)
    updated["trip"] = trip
    return updated


@router.patch("/{booking_id}/reject")
async def admin_reject_booking(
    booking_id: str,
    current_admin: dict = Depends(get_current_admin),
):
    result = await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": BookingStatus.REJECTED,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"message": "Booking rejected"}

"""Driver Portal Trip Routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid

from ...config.database import db
from ...models import TripActionRequest, TripStatus, DutySlipStatus
from ...middleware.auth import get_current_driver

router = APIRouter(prefix="/driver/trips", tags=["Driver Trips"])


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
    
    # Update trip status
    await db.duties.update_one(
        {"id": trip_id},
        {"$set": {
            "status": TripStatus.STARTED.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
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
        "date": datetime.now(timezone.utc).isoformat(),
        "start_time": datetime.now(timezone.utc).isoformat(),
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
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
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
    
    # Update duty slip
    await db.duty_slips.update_one(
        {"trip_id": trip_id},
        {"$set": {
            "closing_km": data.closing_km,
            "total_km": total_km,
            "end_time": datetime.now(timezone.utc).isoformat(),
            "traveller_name": data.traveller_name,
            "passenger_signature": data.passenger_signature,
            "signed_at": datetime.now(timezone.utc).isoformat(),
            "signed_by": data.traveller_name,
            "driver_remarks": data.driver_remarks,
            "status": DutySlipStatus.SIGNED.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update trip status
    await db.duties.update_one(
        {"id": trip_id},
        {"$set": {
            "status": TripStatus.COMPLETED.value,
            "end_time": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
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

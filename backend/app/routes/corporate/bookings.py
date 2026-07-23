"""Corporate Portal Bookings Routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid

from ...config.database import db
from ...models.corporate import Booking, BookingCreate, CorporateUser
from ...models.enums import BookingStatus
from ...middleware.auth import get_current_corporate_user

router = APIRouter(prefix="/corporate/bookings", tags=["Corporate Bookings"])

@router.get("", response_model=List[Booking])
async def get_corporate_bookings(
    current_user: CorporateUser = Depends(get_current_corporate_user)
):
    """Get all bookings for the corporate client"""
    bookings = await db.bookings.find(
        {"client_id": current_user.client_id}
    ).sort("created_at", -1).to_list(1000)
    
    # Map _id or ensure id exists
    for b in bookings:
        if "_id" in b and "id" not in b:
            b["id"] = str(b["_id"])
            
    return bookings


@router.post("", response_model=Booking)
async def create_corporate_booking(
    data: BookingCreate,
    current_user: CorporateUser = Depends(get_current_corporate_user)
):
    """Create a new booking"""
    # Verify employee exists
    employee = await db.employees.find_one({
        "id": data.employee_id,
        "client_id": current_user.client_id,
        "is_active": True
    })
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    booking_dict = data.model_dump()
    booking_id = str(uuid.uuid4())
    
    new_booking = {
        **booking_dict,
        "id": booking_id,
        "client_id": current_user.client_id,
        "status": BookingStatus.PENDING,
        "passenger_name": employee["name"],
        "passenger_phone": employee["phone"],
        "created_by": current_user.id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Insert booking into database
    await db.bookings.insert_one(new_booking)
    
    # Optional legacy code integration: Create a duty slip / trip in progress automatically 
    # if the admin dashboard or system relies on it
    return new_booking


@router.post("/bulk-create")
async def bulk_create_corporate_bookings(
    data: List[BookingCreate],
    current_user: CorporateUser = Depends(get_current_corporate_user)
):
    """Bulk create bookings from CSV"""
    created_count = 0
    failed_count = 0
    
    for booking_data in data:
        try:
            employee = await db.employees.find_one({
                "id": booking_data.employee_id,
                "client_id": current_user.client_id,
                "is_active": True
            })
            if not employee:
                failed_count += 1
                continue
                
            booking_dict = booking_data.model_dump()
            booking_id = str(uuid.uuid4())
            
            new_booking = {
                **booking_dict,
                "id": booking_id,
                "client_id": current_user.client_id,
                "status": BookingStatus.PENDING,
                "passenger_name": employee["name"],
                "passenger_phone": employee["phone"],
                "created_by": current_user.id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.bookings.insert_one(new_booking)
            created_count += 1
        except Exception:
            failed_count += 1
            
    return {"created": created_count, "failed": failed_count}

# Verify the booking status and update it to CANCELLED.
# If a linked duty (driver/vehicle assignment) exists and is not yet started
# (ASSIGNED or ACCEPTED), automatically cancel the linked duty as well.
@router.patch("/{booking_id}/cancel")
async def cancel_corporate_booking(
    booking_id: str,
    current_user: CorporateUser = Depends(get_current_corporate_user)
):
    """Cancel a corporate booking"""
    booking = await db.bookings.find_one({
        "id": booking_id,
        "client_id": current_user.client_id
    })
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    if booking.get("status") in ["COMPLETED", "CANCELLED"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Booking cannot be cancelled because it is already {booking.get('status')}."
        )
        
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "CANCELLED",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # If there is a linked duty slip/trip, cancel it too (if not started)
    duty_id = booking.get("duty_id")
    if duty_id:
        await db.duties.update_one(
            {"id": duty_id, "status": {"$in": ["ASSIGNED", "ACCEPTED"]}},
            {"$set": {
                "status": "CANCELLED",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
    return {"message": "Booking cancelled successfully"}

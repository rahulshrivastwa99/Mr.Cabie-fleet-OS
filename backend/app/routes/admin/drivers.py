"""Driver Management Routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone

from ...config.database import db
from ...models import Driver, DriverCreate, DriverStatusUpdate, User
from ...middleware.auth import get_current_user

router = APIRouter(prefix="/drivers", tags=["Drivers"])


@router.get("", response_model=List[Driver])
async def get_drivers(current_user: User = Depends(get_current_user)):
    """Get all drivers"""
    drivers = await db.drivers.find({}, {"_id": 0}).to_list(1000)
    return drivers


@router.post("", response_model=Driver)
async def create_driver(driver_data: DriverCreate, current_user: User = Depends(get_current_user)):
    """Create a new driver"""
    # Check for duplicate phone
    existing = await db.drivers.find_one({"phone": driver_data.phone})
    if existing:
        raise HTTPException(status_code=400, detail="Driver with this phone already exists")
    
    driver = Driver(**driver_data.model_dump())
    await db.drivers.insert_one(driver.model_dump())
    return driver


@router.get("/{driver_id}", response_model=Driver)
async def get_driver(driver_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific driver"""
    driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return Driver(**driver)


@router.put("/{driver_id}", response_model=Driver)
async def update_driver(driver_id: str, driver_data: DriverCreate, current_user: User = Depends(get_current_user)):
    """Update a driver"""
    driver = await db.drivers.find_one({"id": driver_id})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    update_data = driver_data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.drivers.update_one({"id": driver_id}, {"$set": update_data})
    
    updated = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    return Driver(**updated)


@router.patch("/{driver_id}/status")
async def update_driver_status(
    driver_id: str,
    data: DriverStatusUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update driver status manually"""
    driver = await db.drivers.find_one({"id": driver_id})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    await db.drivers.update_one(
        {"id": driver_id},
        {"$set": {
            "status": data.status.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": f"Driver status updated to {data.status.value}"}


@router.get("/{driver_id}/location")
async def get_driver_location(driver_id: str, current_user: User = Depends(get_current_user)):
    """Get driver's current location"""
    driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    location = await db.driver_locations.find_one({"driver_id": driver_id}, {"_id": 0})
    
    return {"driver": driver, "location": location}


@router.delete("/{driver_id}")
async def delete_driver(driver_id: str, current_user: User = Depends(get_current_user)):
    """Delete a driver"""
    result = await db.drivers.delete_one({"id": driver_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    return {"message": "Driver deleted"}

"""Vehicle Management Routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone

from ...config.database import db
from ...models import Vehicle, VehicleCreate, VehicleStatusUpdate, User
from ...middleware.auth import get_current_user

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@router.get("", response_model=List[Vehicle])
async def get_vehicles(current_user: User = Depends(get_current_user)):
    """Get all vehicles"""
    vehicles = await db.vehicles.find({}, {"_id": 0}).to_list(1000)
    return vehicles


@router.post("", response_model=Vehicle)
async def create_vehicle(vehicle_data: VehicleCreate, current_user: User = Depends(get_current_user)):
    """Create a new vehicle"""
    vehicle = Vehicle(**vehicle_data.model_dump())
    await db.vehicles.insert_one(vehicle.model_dump())
    return vehicle


@router.get("/{vehicle_id}", response_model=Vehicle)
async def get_vehicle(vehicle_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific vehicle"""
    vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return Vehicle(**vehicle)


@router.put("/{vehicle_id}", response_model=Vehicle)
async def update_vehicle(vehicle_id: str, vehicle_data: VehicleCreate, current_user: User = Depends(get_current_user)):
    """Update a vehicle"""
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    update_data = vehicle_data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.vehicles.update_one({"id": vehicle_id}, {"$set": update_data})
    
    updated = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    return Vehicle(**updated)


@router.patch("/{vehicle_id}/status")
async def update_vehicle_status(
    vehicle_id: str,
    data: VehicleStatusUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update vehicle status"""
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    await db.vehicles.update_one(
        {"id": vehicle_id},
        {"$set": {
            "status": data.status.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": f"Vehicle status updated to {data.status.value}"}


@router.delete("/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, current_user: User = Depends(get_current_user)):
    """Delete a vehicle"""
    result = await db.vehicles.delete_one({"id": vehicle_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"message": "Vehicle deleted"}

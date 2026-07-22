"""Admin Corporate Users Routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid

from ...config.database import db
from ...models import CorporateUser, CorporateUserCreate, User
from ...middleware.auth import get_current_user, get_password_hash

router = APIRouter(prefix="/admin", tags=["Admin Corporate Users"])


@router.get("/corporate-users", response_model=List[CorporateUser])
async def get_corporate_users(current_user: User = Depends(get_current_user)):
    """Get all corporate users"""
    users = await db.corporate_users.find({}, {"_id": 0}).to_list(1000)
    return [CorporateUser(**u) for u in users]


@router.post("/onboard-corporate-user")
async def onboard_corporate_user(user_data: CorporateUserCreate, current_user: User = Depends(get_current_user)):
    """Create a new corporate user"""
    # Check duplicate email
    existing = await db.corporate_users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Check client exists
    client = await db.clients.find_one({"id": user_data.client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    user_id = str(uuid.uuid4())
    user_dict = {
        "id": user_id,
        "email": user_data.email.strip(),
        "name": user_data.name.strip(),
        "display_name": user_data.display_name.strip() if user_data.display_name else user_data.name.strip(),
        "client_id": user_data.client_id,
        "role": user_data.role.value if hasattr(user_data.role, "value") else user_data.role,
        "department": user_data.department.strip() if user_data.department else None,
        "password_hash": get_password_hash(user_data.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.corporate_users.insert_one(user_dict)
    
    # Return user details excluding password hash
    return {
        "id": user_id,
        "email": user_dict["email"],
        "name": user_dict["name"],
        "display_name": user_dict["display_name"],
        "client_id": user_dict["client_id"],
        "role": user_dict["role"],
        "department": user_dict["department"],
        "created_at": user_dict["created_at"]
    }


@router.delete("/corporate-users/{user_id}")
async def delete_corporate_user(user_id: str, current_user: User = Depends(get_current_user)):
    """Delete a corporate user"""
    result = await db.corporate_users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Corporate user deleted"}

# @router.get("/driver/gpstracking", response_model=List[dict])
# async def get_driver_gpstracking(current_user:User=Depends(get_current_user)):
#     driver_location =await db.driver_locations.find("",{"id":0}).to_list(1000)
#     return driver_location

@router.get("/drivers/locations")
async def get_admin_drivers_locations(current_user: User = Depends(get_current_user)):
    """Get last known locations of all drivers for Live Tracking"""
    drivers = await db.drivers.find({}, {"_id": 0}).to_list(1000)
    result = []
    for driver in drivers:
        driver_id = driver.get("id")
        loc_record = await db.driver_locations.find_one({"driver_id": driver_id}, {"_id": 0})
        
        driver_entry = {
            "id": driver_id,
            "name": driver.get("name"),
            "phone": driver.get("phone"),
            "status": driver.get("status"),
            "location": {
                "latitude": loc_record.get("latitude"),
                "longitude": loc_record.get("longitude"),
                "updated_at": loc_record.get("timestamp"),
                "trip_id": loc_record.get("trip_id")
            } if loc_record else None
        }
        result.append(driver_entry)
    return result

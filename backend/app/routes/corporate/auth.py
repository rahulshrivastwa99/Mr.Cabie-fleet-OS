"""Corporate Portal Authentication Routes"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone

from ...config.database import db
from ...models import CorporateUserLogin, CorporateUser, CorporatePasswordChange
from ...middleware.auth import (
    verify_password, get_password_hash,
    create_access_token, get_current_corporate_user
)

router = APIRouter(prefix="/corporate", tags=["Corporate Portal"])


@router.post("/auth/login")
async def corporate_login(data: CorporateUserLogin):
    """Corporate user login"""
    user = await db.corporate_users.find_one({"email": data.email})
    
    if not user or not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({
        "sub": user["id"],
        "type": "corporate",
        "client_id": user.get("client_id")
    })
    
    # Get client info
    client = await db.clients.find_one({"id": user.get("client_id")}, {"_id": 0})
    
    user_data = {k: v for k, v in user.items() if k not in ["_id", "password_hash"]}
    user_data["client"] = client
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_data
    }


@router.get("/auth/me")
async def corporate_get_me(current_user: CorporateUser = Depends(get_current_corporate_user)):
    """Get current corporate user"""
    client = await db.clients.find_one({"id": current_user.client_id}, {"_id": 0})
    user_data = current_user.model_dump()
    user_data["client"] = client
    return user_data


@router.post("/auth/change-password")
async def corporate_change_password(
    data: CorporatePasswordChange,
    current_user: CorporateUser = Depends(get_current_corporate_user)
):
    """Change corporate user password"""
    user = await db.corporate_users.find_one({"id": current_user.id})
    
    if not verify_password(data.current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    new_hash = get_password_hash(data.new_password)
    
    await db.corporate_users.update_one(
        {"id": current_user.id},
        {"$set": {
            "password_hash": new_hash,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Password changed successfully"}

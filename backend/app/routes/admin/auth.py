"""Admin Authentication Routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List

from ...config.database import db
from ...models import User, UserCreate, UserLogin, DashboardStats
from ...middleware.auth import (
    get_password_hash, verify_password, 
    create_access_token, get_current_user
)

router = APIRouter(prefix="/auth", tags=["Admin Auth"])


@router.post("/register", response_model=User)
async def register(user_data: UserCreate):
    """Register a new admin user"""
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role
    )
    
    doc = user.model_dump()
    doc["password_hash"] = get_password_hash(user_data.password)
    
    await db.users.insert_one(doc)
    return user


@router.post("/login")
async def login(user_data: UserLogin):
    """Admin login"""
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user["id"]})
    user_obj = User(**{k: v for k, v in user.items() if k != "_id" and k != "password_hash"})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_obj
    }


@router.get("/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated admin user"""
    return current_user


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Mr. Cabie Fleet OS API"}


@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    """Get admin dashboard statistics"""
    total_vehicles = await db.vehicles.count_documents({})
    available_vehicles = await db.vehicles.count_documents({"status": "AVAILABLE"})
    total_drivers = await db.drivers.count_documents({})
    available_drivers = await db.drivers.count_documents({"status": "AVAILABLE"})
    active_duties = await db.duties.count_documents({"status": {"$in": ["ASSIGNED", "ACCEPTED", "STARTED"]}})
    pending_invoices = await db.invoices.count_documents({"status": "DRAFT"})
    
    # Calculate total revenue from paid invoices
    pipeline = [
        {"$match": {"status": "PAID"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    revenue_result = await db.invoices.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    return DashboardStats(
        total_vehicles=total_vehicles,
        available_vehicles=available_vehicles,
        total_drivers=total_drivers,
        available_drivers=available_drivers,
        active_duties=active_duties,
        pending_invoices=pending_invoices,
        total_revenue=total_revenue
    )

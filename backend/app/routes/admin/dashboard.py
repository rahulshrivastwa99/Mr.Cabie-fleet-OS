"""Admin Dashboard Routes"""
from fastapi import APIRouter, Depends
from ...config.database import db
from ...models import User, DashboardStats
from ...middleware.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Admin Dashboard"])

@router.get("/stats", response_model=DashboardStats)
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

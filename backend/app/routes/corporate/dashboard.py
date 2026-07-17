"""Corporate Portal Dashboard Routes"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta

from ...config.database import db
from ...models import CorporateUser, CorporateDashboardStats
from ...middleware.auth import get_current_corporate_user

router = APIRouter(prefix="/corporate", tags=["Corporate Dashboard"])


@router.get("/dashboard/stats", response_model=CorporateDashboardStats)
async def get_corporate_dashboard_stats(current_user: CorporateUser = Depends(get_current_corporate_user)):
    """Get dashboard statistics for corporate user"""
    client_id = current_user.client_id
    
    total_bookings = await db.bookings.count_documents({"client_id": client_id})
    pending_bookings = await db.bookings.count_documents({
        "client_id": client_id,
        "status": "PENDING"
    })
    active_trips = await db.duties.count_documents({
        "client_id": client_id,
        "status": {"$in": ["ASSIGNED", "ACCEPTED", "STARTED"]}
    })
    total_employees = await db.employees.count_documents({"client_id": client_id})
    
    # Monthly cost from invoices
    start_of_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    pipeline = [
        {
            "$match": {
                "client_id": client_id,
                "status": {"$in": ["SENT", "PAID"]},
                "invoice_date": {"$gte": start_of_month.isoformat()}
            }
        },
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    
    result = await db.invoices.aggregate(pipeline).to_list(1)
    monthly_cost = result[0]["total"] if result else 0
    
    # This month trips
    this_month_trips = await db.duties.count_documents({
        "client_id": client_id,
        "created_at": {"$gte": start_of_month.isoformat()}
    })
    
    return CorporateDashboardStats(
        total_bookings=total_bookings,
        pending_bookings=pending_bookings,
        active_trips=active_trips,
        total_employees=total_employees,
        monthly_cost=monthly_cost,
        this_month_trips=this_month_trips
    )

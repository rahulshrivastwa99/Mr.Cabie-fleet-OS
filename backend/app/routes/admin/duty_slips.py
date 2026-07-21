"""Admin Portal Duty Slips Routes

Read-only endpoints so the Admin web portal can list/inspect duty slips
with their photos, signature, timestamps and location stamps.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime

from ...config.database import db
from ...middleware.auth import get_current_user as get_current_admin

router = APIRouter(prefix="/duty-slips", tags=["Admin Duty Slips"])


@router.get("")
async def admin_list_duty_slips(
    client_id: Optional[str] = Query(None),
    driver_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(200, le=1000),
    current_admin: dict = Depends(get_current_admin),
):
    """List duty slips, newest first, with optional filters."""
    query: dict = {}
    if client_id:
        query["client_id"] = client_id
    if driver_id:
        query["driver_id"] = driver_id
    if status:
        query["status"] = status

    slips = (
        await db.duty_slips.find(query, {"_id": 0})
        .sort("created_at", -1)
        .to_list(limit)
    )

    # Attach a summary trip snippet for each slip (best-effort)
    for slip in slips:
        trip = await db.duties.find_one(
            {"id": slip.get("trip_id")},
            {"_id": 0, "id": 1, "status": 1, "trip_type": 1, "pickup_location": 1,
             "dropoff_location": 1, "passenger_name": 1, "passenger_phone": 1,
             "pickup_time": 1, "started_at": 1, "completed_at": 1},
        )
        slip["trip"] = trip
    return slips


@router.get("/{slip_id}")
async def admin_get_duty_slip(
    slip_id: str,
    current_admin: dict = Depends(get_current_admin),
):
    slip = await db.duty_slips.find_one({"id": slip_id}, {"_id": 0})
    if not slip:
        raise HTTPException(status_code=404, detail="Duty slip not found")
    slip["trip"] = await db.duties.find_one({"id": slip.get("trip_id")}, {"_id": 0})
    return slip

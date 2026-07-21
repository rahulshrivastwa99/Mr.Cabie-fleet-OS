"""Admin Portal Live Tracking Routes

Endpoints backing the Admin web portal's Live Tracking map:
  - GET /tracking/drivers -> current location + status of every driver
  - GET /tracking/driver/{id}/pings -> recent GPS ping history for one driver
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timedelta, timezone

from ...config.database import db
from ...middleware.auth import get_current_user as get_current_admin

router = APIRouter(prefix="/tracking", tags=["Admin Live Tracking"])


@router.get("/drivers")
async def admin_list_driver_locations(
    current_admin: dict = Depends(get_current_admin),
    active_within_minutes: int = Query(60, ge=1, le=1440),
):
    """List all drivers with their last known location. Marks a driver as
    `is_online=True` when their last_location_at is within the given
    freshness window."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=active_within_minutes)
    cutoff_iso = cutoff.isoformat()

    drivers = await db.drivers.find(
        {},
        {"_id": 0, "id": 1, "name": 1, "phone": 1, "status": 1,
         "current_location": 1, "last_location_at": 1, "current_trip_id": 1},
    ).to_list(1000)

    for d in drivers:
        last = d.get("last_location_at")
        d["is_online"] = bool(last and last >= cutoff_iso)
    return drivers


@router.get("/driver/{driver_id}/pings")
async def admin_driver_pings(
    driver_id: str,
    limit: int = Query(200, le=2000),
    current_admin: dict = Depends(get_current_admin),
):
    driver = await db.drivers.find_one({"id": driver_id})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    pings = await db.driver_locations.find(
        {"driver_id": driver_id}, {"_id": 0}
    ).sort("timestamp", -1).to_list(limit)
    return pings

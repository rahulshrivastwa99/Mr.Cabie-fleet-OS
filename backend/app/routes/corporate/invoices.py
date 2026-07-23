"""Corporate Portal Invoices & Combined Data Routes"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from ...config.database import db
from ...models.corporate import CorporateUser
from ...middleware.auth import get_current_corporate_user

router = APIRouter(prefix="/corporate", tags=["Corporate Data Endpoints"])


@router.get("/invoices")
async def get_corporate_invoices(
    current_user: CorporateUser = Depends(get_current_corporate_user)
):
    """Get all invoices for the corporate client"""
    invoices = await db.invoices.find(
        {"client_id": current_user.client_id}
    ).sort("created_at", -1).to_list(1000)
    
    # Map _id to id
    for inv in invoices:
        if "_id" in inv and "id" not in inv:
            inv["id"] = str(inv["_id"])
            
    return invoices


@router.get("/duty-slips")
async def get_corporate_duty_slips(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    current_user: CorporateUser = Depends(get_current_corporate_user)
):
    """Get all duty slips for the corporate client"""
    query = {"client_id": current_user.client_id}
    
    # Optional date filtering
    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = date_from
        if date_to:
            date_query["$lte"] = date_to
        query["created_at"] = date_query
        
    slips = await db.duty_slips.find(query).sort("created_at", -1).to_list(1000)
    
    # Map and attach trips
    for slip in slips:
        if "_id" in slip and "id" not in slip:
            slip["id"] = str(slip["_id"])
            
        trip = await db.duties.find_one(
            {"id": slip.get("trip_id")},
            {"_id": 0, "id": 1, "status": 1, "trip_type": 1, "pickup_location": 1,
             "dropoff_location": 1, "passenger_name": 1, "passenger_phone": 1,
             "pickup_time": 1, "started_at": 1, "completed_at": 1},
        )
        slip["trip"] = trip
        
    return slips


@router.get("/contract")
async def get_corporate_contract(
    current_user: CorporateUser = Depends(get_current_corporate_user)
):
    """Get contract details for the corporate client"""
    contract = await db.contracts.find_one(
        {"client_id": current_user.client_id}, 
        {"_id": 0}
    )
    return {"contract": contract}


@router.get("/monthly-summary")
async def get_corporate_monthly_summary(
    year: int,
    month: int,
    current_user: CorporateUser = Depends(get_current_corporate_user)
):
    """Get monthly summary stats of trips for the client"""
    # Count completed duties in the month range
    try:
        start_date = datetime(year, month, 1, 0, 0, 0)
        if month == 12:
            end_date = datetime(year + 1, 1, 1, 0, 0, 0)
        else:
            end_date = datetime(year, month + 1, 1, 0, 0, 0)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid year or month value")

    duties = await db.duties.find({
        "client_id": current_user.client_id,
        "status": "COMPLETED",
        "completed_at": {"$gte": start_date.isoformat(), "$lt": end_date.isoformat()}
    }).to_list(1000)
    
    total_kms = 0.0
    total_trips = len(duties)
    total_cost = 0.0
    
    for duty in duties:
        opening = duty.get("opening_km", 0.0) or 0.0
        closing = duty.get("closing_km", 0.0) or 0.0
        total_kms += max(0.0, closing - opening)
        total_cost += duty.get("estimated_cost", 0.0) or duty.get("total_amount", 0.0) or 0.0
        
    return {
        "total_kms": total_kms,
        "total_hours": total_trips * 2.0,  # Estimated 2 hours per trip
        "total_trips": total_trips,
        "total_cost": total_cost
    }


@router.get("/tracking/active")
async def get_corporate_active_tracking(
    current_user: CorporateUser = Depends(get_current_corporate_user)
):
    """Get live tracking info for in-progress trips of the corporate client"""
    active_duties = await db.duties.find({
        "client_id": current_user.client_id,
        "status": {"$in": ["ASSIGNED", "ACCEPTED", "STARTED"]}
    }).to_list(100)
    
    active_trips_list = []
    for duty in active_duties:
        driver_id = duty.get("driver_id")
        location_doc = None
        driver_doc = None
        
        if driver_id:
            location_doc = await db.driver_locations.find_one({"driver_id": driver_id}, {"_id": 0})
            driver_doc = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
            
        vehicle_id = duty.get("vehicle_id")
        vehicle_doc = None
        if vehicle_id:
            vehicle_doc = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
            
        active_trips_list.append({
            "trip_id": duty.get("id"),
            "passenger_name": duty.get("passenger_name", "Unknown"),
            "pickup_location": duty.get("pickup_location", "Unknown"),
            "dropoff_location": duty.get("dropoff_location", "Unknown"),
            "vehicle": vehicle_doc,
            "driver": driver_doc,
            "location": location_doc
        })
        
    return {"active_trips": active_trips_list}


@router.get("/reports/trips")
async def get_corporate_trips_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: CorporateUser = Depends(get_current_corporate_user)
):
    """Generate trips report and analytics for the corporate client"""
    query = {"client_id": current_user.client_id}
    
    if start_date or end_date:
        date_query = {}
        if start_date:
            date_query["$gte"] = start_date
        if end_date:
            date_query["$lte"] = end_date
        query["created_at"] = date_query
        
    total_bookings = await db.bookings.count_documents(query)
    
    completed = await db.bookings.count_documents({**query, "status": "COMPLETED"})
    if completed == 0:
        completed = await db.duties.count_documents({**query, "status": "COMPLETED"})
        
    confirmed = await db.bookings.count_documents({**query, "status": "CONFIRMED"})
    if confirmed == 0:
        confirmed = await db.duties.count_documents({**query, "status": {"$in": ["ASSIGNED", "ACCEPTED", "STARTED"]}})
        
    pending = await db.bookings.count_documents({**query, "status": "PENDING"})
    
    # Calculate trips by employee
    bookings = await db.bookings.find(query).to_list(1000)
    employee_trips = {}
    for b in bookings:
        emp_id = b.get("employee_id")
        if emp_id:
            employee_trips[emp_id] = employee_trips.get(emp_id, 0) + 1
            
    by_employee_list = []
    for emp_id, count in employee_trips.items():
        emp = await db.employees.find_one({"id": emp_id})
        if emp:
            by_employee_list.append({
                "employee_name": emp.get("name"),
                "employee_id": emp.get("employee_id"),
                "cost_center": emp.get("cost_center"),
                "total_trips": count
            })
            
    return {
        "total_bookings": total_bookings,
        "by_status": {
            "completed": completed,
            "confirmed": confirmed,
            "pending": pending
        },
        "by_employee": by_employee_list
    }

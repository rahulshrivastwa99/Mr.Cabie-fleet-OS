"""Corporate Portal Employees Routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid

from ...config.database import db
from ...models.corporate import Employee, EmployeeCreate, CorporateUser
from ...middleware.auth import get_current_corporate_user

router = APIRouter(prefix="/corporate/employees", tags=["Corporate Employees"])


@router.get("", response_model=List[Employee])
async def get_corporate_employees(
    current_user: CorporateUser = Depends(get_current_corporate_user)
):
    """Get all employees for the corporate client"""
    employees = await db.employees.find(
        {"client_id": current_user.client_id, "is_active": True}
    ).to_list(1000)
    
    # Map _id or ensure id exists
    for emp in employees:
        if "_id" in emp and "id" not in emp:
            emp["id"] = str(emp["_id"])
            
    return employees


@router.post("", response_model=Employee)
async def create_corporate_employee(
    data: EmployeeCreate,
    current_user: CorporateUser = Depends(get_current_corporate_user)
):
    """Add a single employee"""
    # Check if employee_id already exists for this client
    existing = await db.employees.find_one({
        "client_id": current_user.client_id,
        "employee_id": data.employee_id,
        "is_active": True
    })
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Employee ID {data.employee_id} already exists."
        )
        
    employee_dict = data.model_dump()
    employee_id = str(uuid.uuid4())
    
    new_employee = {
        **employee_dict,
        "id": employee_id,
        "client_id": current_user.client_id,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.employees.insert_one(new_employee)
    return new_employee


@router.post("/bulk-create")
async def bulk_create_corporate_employees(
    data: List[EmployeeCreate],
    current_user: CorporateUser = Depends(get_current_corporate_user)
):
    """Bulk upload employees from CSV"""
    created_count = 0
    failed_count = 0
    
    for emp_data in data:
        try:
            # Check if employee_id already exists for this client
            existing = await db.employees.find_one({
                "client_id": current_user.client_id,
                "employee_id": emp_data.employee_id,
                "is_active": True
            })
            if existing:
                failed_count += 1
                continue
                
            employee_dict = emp_data.model_dump()
            employee_id = str(uuid.uuid4())
            
            new_employee = {
                **employee_dict,
                "id": employee_id,
                "client_id": current_user.client_id,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.employees.insert_one(new_employee)
            created_count += 1
        except Exception:
            failed_count += 1
            
    return {"created": created_count, "failed": failed_count}

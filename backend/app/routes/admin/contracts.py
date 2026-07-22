"""Admin Contracts Routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid

from ...config.database import db
from ...models import Contract, User
from ...middleware.auth import get_current_user

router = APIRouter(prefix="/contracts", tags=["Admin Contracts"])


@router.get("", response_model=List[Contract])
async def get_contracts(current_user: User = Depends(get_current_user)):
    """Get all contracts"""
    contracts = await db.contracts.find({}, {"_id": 0}).to_list(1000)
    return [Contract(**c) for c in contracts]


@router.post("", response_model=Contract)
async def create_contract(contract_data: dict, current_user: User = Depends(get_current_user)):
    """Create a new contract"""
    contract_id = str(uuid.uuid4())
    contract = {
        "id": contract_id,
        "client_id": contract_data.get("client_id"),
        "name": contract_data.get("name"),
        "contract_type": contract_data.get("contract_type"),
        "start_date": contract_data.get("start_date"),
        "end_date": contract_data.get("end_date"),
        "billing_cycle": contract_data.get("billing_cycle", "MONTHLY"),
        "vehicle_rate_cards": contract_data.get("vehicle_rate_cards", []),
        "fixed_routes": contract_data.get("fixed_routes", []),
        "extra_charges_config": contract_data.get("extra_charges_config"),
        "monthly_amount": contract_data.get("monthly_amount"),
        "included_days": contract_data.get("included_days"),
        "included_km": contract_data.get("included_km"),
        "rate_per_km": contract_data.get("rate_per_km"),
        "minimum_km_per_day": contract_data.get("minimum_km_per_day")
    }
    
    await db.contracts.insert_one(contract)
    
    # Return contract details
    return Contract(**contract)


@router.get("/{contract_id}", response_model=Contract)
async def get_contract(contract_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific contract"""
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return Contract(**contract)


@router.put("/{contract_id}", response_model=Contract)
async def update_contract(contract_id: str, contract_data: dict, current_user: User = Depends(get_current_user)):
    """Update a contract"""
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    update_data = {
        "name": contract_data.get("name"),
        "contract_type": contract_data.get("contract_type"),
        "start_date": contract_data.get("start_date"),
        "end_date": contract_data.get("end_date"),
        "billing_cycle": contract_data.get("billing_cycle", "MONTHLY"),
        "vehicle_rate_cards": contract_data.get("vehicle_rate_cards", []),
        "fixed_routes": contract_data.get("fixed_routes", []),
        "extra_charges_config": contract_data.get("extra_charges_config"),
        "monthly_amount": contract_data.get("monthly_amount"),
        "included_days": contract_data.get("included_days"),
        "included_km": contract_data.get("included_km"),
        "rate_per_km": contract_data.get("rate_per_km"),
        "minimum_km_per_day": contract_data.get("minimum_km_per_day")
    }
    
    # Remove keys with None values to avoid overwriting existing properties with None
    update_data = {k: v for k, v in update_data.items() if v is not None}
    
    await db.contracts.update_one({"id": contract_id}, {"$set": update_data})
    
    updated = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    return Contract(**updated)


@router.delete("/{contract_id}")
async def delete_contract(contract_id: str, current_user: User = Depends(get_current_user)):
    """Delete a contract"""
    result = await db.contracts.delete_one({"id": contract_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contract not found")
    return {"message": "Contract deleted"}

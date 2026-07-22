"""Admin Invoices Routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone, timedelta
import uuid

from ...config.database import db
from ...models import Invoice, User
from ...middleware.auth import get_current_user

router = APIRouter(prefix="/invoices", tags=["Admin Invoices"])


@router.get("", response_model=List[Invoice])
async def get_invoices(current_user: User = Depends(get_current_user)):
    """Get all invoices"""
    invoices = await db.invoices.find({}, {"_id": 0}).to_list(1000)
    return [Invoice(**i) for i in invoices]


@router.post("", response_model=Invoice)
async def create_invoice(invoice_data: dict, current_user: User = Depends(get_current_user)):
    """Create a new invoice"""
    invoice_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    invoice = {
        "id": invoice_id,
        "invoice_number": f"MC-{now.strftime('%Y%m%d')}-{str(uuid.uuid4())[:4].upper()}",
        "client_id": invoice_data.get("client_id"),
        "contract_id": invoice_data.get("contract_id"),
        "duty_slip_ids": invoice_data.get("duty_slip_ids", []),
        "trips": invoice_data.get("trips", []),
        "duties": invoice_data.get("duties", []),
        "base_amount": invoice_data.get("base_amount", 0.0),
        "extra_charges_amount": invoice_data.get("extra_charges_amount", 0.0),
        "subtotal": invoice_data.get("subtotal", 0.0),
        "gst_percentage": invoice_data.get("gst_percentage", 18.0),
        "gst_amount": invoice_data.get("gst_amount", 0.0),
        "total_amount": invoice_data.get("total_amount", 0.0),
        "amount": invoice_data.get("amount", 0.0),
        "status": invoice_data.get("status", "DRAFT"),
        "due_date": (now + timedelta(days=30)).isoformat(),
        "invoice_date": now.isoformat(),
        "created_at": now.isoformat()
    }
    
    await db.invoices.insert_one(invoice)
    return Invoice(**invoice)


@router.get("/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific invoice"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return Invoice(**invoice)


@router.put("/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, data: dict, current_user: User = Depends(get_current_user)):
    """Update invoice status"""
    status = data.get("status")
    if not status:
        raise HTTPException(status_code=400, detail="Status is required")
        
    invoice = await db.invoices.find_one({"id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    await db.invoices.update_one({"id": invoice_id}, {"$set": {"status": status}})
    return {"message": "Status updated successfully", "status": status}


@router.delete("/{invoice_id}")
async def delete_invoice(invoice_id: str, current_user: User = Depends(get_current_user)):
    """Delete an invoice"""
    result = await db.invoices.delete_one({"id": invoice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": "Invoice deleted"}

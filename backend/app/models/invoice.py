"""Invoice models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from .enums import InvoiceStatus


class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    client_id: str
    contract_id: Optional[str] = None
    duty_slip_ids: List[str] = []
    trips: List[str] = []
    duties: List[str] = []
    
    billing_period_start: Optional[datetime] = None
    billing_period_end: Optional[datetime] = None
    
    line_items: List[dict] = []
    extra_charges: List[dict] = []
    manual_trip_entries: List[dict] = []
    is_manual_invoice: bool = False
    
    base_amount: float = 0
    extra_charges_amount: float = 0
    subtotal: float = 0
    gst_percentage: float = 18.0
    gst_amount: float = 0
    total_amount: float = 0
    amount: float = 0
    
    status: InvoiceStatus = InvoiceStatus.DRAFT
    invoice_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    due_date: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class InvoiceCreate(BaseModel):
    client_id: str
    contract_id: Optional[str] = None
    duty_slip_ids: List[str] = []
    billing_period_start: Optional[datetime] = None
    billing_period_end: Optional[datetime] = None
    extra_charges: Optional[List[dict]] = []
    gst_percentage: float = 18.0
    due_days: int = 30
    is_manual_pricing: bool = False
    manual_line_items: Optional[List[dict]] = []
    manual_base_fare: Optional[float] = None
    manual_toll: Optional[float] = None
    manual_parking: Optional[float] = None
    manual_driver_allowance: Optional[float] = None
    manual_extras: Optional[float] = None
    manual_total: Optional[float] = None
    manual_trip_entries: Optional[List[dict]] = []
    duties: Optional[List[str]] = []
    line_items: Optional[List[dict]] = []
    amount: Optional[float] = None


class ExtraChargeInput(BaseModel):
    name: str
    amount: float
    description: Optional[str] = None

"""Duty Slip models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from .enums import DutySlipStatus, TripType, VehicleType


class DutySlip(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trip_id: str
    client_id: str
    
    # Trip Info
    date: Optional[datetime] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    trip_type: Optional[TripType] = TripType.ONE_WAY
    
    # Driver & Vehicle
    driver_id: str
    driver_name: Optional[str] = None
    vehicle_id: Optional[str] = None
    vehicle_number: Optional[str] = None
    vehicle_type: Optional[VehicleType] = None
    
    # Client Info
    corporate_name: Optional[str] = None
    pickup_location: Optional[str] = None
    dropoff_location: Optional[str] = None
    
    # Meter Reading
    opening_km: float
    closing_km: Optional[float] = None
    total_km: Optional[float] = None
    
    # Passengers
    passenger_name: Optional[str] = None
    traveller_name: Optional[str] = None
    passengers: List[dict] = []
    
    # Status & Signature
    status: DutySlipStatus = DutySlipStatus.DRAFT
    driver_remarks: Optional[str] = None
    passenger_signature: Optional[str] = None
    signed_at: Optional[datetime] = None
    signed_by: Optional[str] = None

    # Founder-requested feature: precise timestamps
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # Founder-requested feature: location stamps (lat/lng/address)
    start_location: Optional[dict] = None  # {latitude, longitude, address, timestamp}
    end_location: Optional[dict] = None

    # Founder-requested feature: camera capture photos (URLs)
    start_photo_url: Optional[str] = None
    end_photo_url: Optional[str] = None
    
    note: str = "Additional charges (Toll, Parking, Taxes, GST) will be added in final invoice"
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DutySlipCreate(BaseModel):
    trip_id: str
    opening_km: float
    driver_remarks: Optional[str] = None


class DutySlipComplete(BaseModel):
    closing_km: float
    driver_remarks: Optional[str] = None


class DutySlipSign(BaseModel):
    passenger_signature: str
    signed_by: str

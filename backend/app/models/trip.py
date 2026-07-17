"""Trip/Duty models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from .enums import TripStatus, TripType


class Trip(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    booking_id: Optional[str] = None
    contract_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    driver_id: Optional[str] = None
    status: TripStatus = TripStatus.CREATED
    trip_type: TripType = TripType.ONE_WAY
    pickup_location: str
    dropoff_location: str
    pickup_time: datetime
    end_time: Optional[datetime] = None
    passenger_name: str
    passenger_phone: str
    passengers: List[str] = []
    notes: Optional[str] = None
    duty_slip_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Alias for backward compatibility
Duty = Trip


class TripCreate(BaseModel):
    client_id: str
    booking_id: Optional[str] = None
    contract_id: Optional[str] = None
    trip_type: TripType = TripType.ONE_WAY
    pickup_location: str
    dropoff_location: str
    pickup_time: datetime
    passenger_name: str
    passenger_phone: str
    passengers: Optional[List[str]] = []
    notes: Optional[str] = None


DutyCreate = TripCreate


class TripAssign(BaseModel):
    vehicle_id: str
    driver_id: str
    contract_id: Optional[str] = None


DutyAssign = TripAssign


class TripStatusUpdate(BaseModel):
    status: TripStatus


DutyStatusUpdate = TripStatusUpdate


class TripActionRequest(BaseModel):
    opening_km: Optional[float] = None
    closing_km: Optional[float] = None
    driver_remarks: Optional[str] = None
    passenger_signature: Optional[str] = None
    traveller_name: Optional[str] = None

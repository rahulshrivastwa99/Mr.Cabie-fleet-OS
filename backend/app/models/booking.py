"""Bookings model

Simple corporate booking model + creation payload. The full corporate
portal is not ported into the modular backend yet — this minimal model is
sufficient to power the founder-requested "auto-trip creation on booking
approval" flow.
"""
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
import uuid

from .enums import TripType


class BookingStatus:
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class BookingCreate(BaseModel):
    client_id: str
    pickup_location: str
    dropoff_location: str
    pickup_time: datetime
    passenger_name: str
    passenger_phone: str
    trip_type: TripType = TripType.ONE_WAY
    vehicle_type_requested: Optional[str] = None
    passengers: List[str] = []
    notes: Optional[str] = None
    cost_center: Optional[str] = None


class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    pickup_location: str
    dropoff_location: str
    pickup_time: datetime
    passenger_name: str
    passenger_phone: str
    passengers: List[str] = []
    trip_type: TripType = TripType.ONE_WAY
    vehicle_type_requested: Optional[str] = None
    notes: Optional[str] = None
    cost_center: Optional[str] = None
    status: str = BookingStatus.PENDING
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    trip_id: Optional[str] = None  # populated when auto-trip is created on approval
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

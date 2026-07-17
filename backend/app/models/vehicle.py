"""Vehicle models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid
from .enums import VehicleType, VehicleStatus


class Vehicle(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    registration_number: str
    vehicle_type: VehicleType
    model: str
    manufacturer: str
    year: int
    status: VehicleStatus = VehicleStatus.AVAILABLE
    capacity: int
    current_location: Optional[dict] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class VehicleCreate(BaseModel):
    registration_number: str
    vehicle_type: VehicleType
    model: str
    manufacturer: str
    year: int
    capacity: int


class VehicleStatusUpdate(BaseModel):
    status: VehicleStatus
    reason: Optional[str] = None

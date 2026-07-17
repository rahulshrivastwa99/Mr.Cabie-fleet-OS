"""Driver models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid
from .enums import DriverStatus


class Driver(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: str
    license_number: str
    status: DriverStatus = DriverStatus.AVAILABLE
    current_location: Optional[dict] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DriverCreate(BaseModel):
    name: str
    email: str
    phone: str
    license_number: str


class DriverStatusUpdate(BaseModel):
    status: DriverStatus
    reason: Optional[str] = None


class DriverOTPRequest(BaseModel):
    phone: str


class DriverOTPVerify(BaseModel):
    phone: str
    otp: str


class DriverLocationUpdate(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None
    timestamp: Optional[datetime] = None


class DriverLocation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    driver_id: str
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    trip_id: Optional[str] = None

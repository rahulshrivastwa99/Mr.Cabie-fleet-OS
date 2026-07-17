"""Corporate user and booking models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from .enums import (
    CorporateUserRole, BookingStatus, BookingType, 
    TripType, RecurringType, VehicleType, ServiceType
)


class CorporateUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    display_name: Optional[str] = None
    client_id: str
    role: CorporateUserRole = CorporateUserRole.VIEWER
    department: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CorporateUserCreate(BaseModel):
    email: str
    password: str
    name: str
    display_name: Optional[str] = None
    client_id: str
    role: CorporateUserRole = CorporateUserRole.VIEWER
    department: Optional[str] = None


class CorporateUserLogin(BaseModel):
    email: str
    password: str


class CorporateUserUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    department: Optional[str] = None


class CorporatePasswordChange(BaseModel):
    current_password: str
    new_password: str


class Employee(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    name: str
    email: str
    phone: str
    employee_id: str
    department: Optional[str] = None
    cost_center: Optional[str] = None
    default_pickup: Optional[str] = None
    default_dropoff: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EmployeeCreate(BaseModel):
    name: str
    email: str
    phone: str
    employee_id: str
    department: Optional[str] = None
    cost_center: Optional[str] = None
    default_pickup: Optional[str] = None
    default_dropoff: Optional[str] = None


class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    employee_id: str
    contract_id: Optional[str] = None
    booking_type: BookingType = BookingType.ONE_TIME
    status: BookingStatus = BookingStatus.PENDING
    trip_type: TripType = TripType.ONE_WAY
    pickup_location: str
    dropoff_location: str
    pickup_time: datetime
    return_time: Optional[datetime] = None
    passenger_name: str
    passenger_phone: str
    passengers: List[str] = []
    recurring_type: Optional[RecurringType] = None
    recurring_days: List[int] = []
    recurring_end_date: Optional[datetime] = None
    vehicle_type_requested: Optional[VehicleType] = None
    service_type: Optional[ServiceType] = None
    estimated_cost: Optional[float] = None
    pricing_rule_applied: Optional[str] = None
    trip_ids: List[str] = []
    cost_center: Optional[str] = None
    notes: Optional[str] = None
    duty_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    driver_id: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BookingCreate(BaseModel):
    employee_id: str
    booking_type: BookingType = BookingType.ONE_TIME
    trip_type: TripType = TripType.ONE_WAY
    pickup_location: str
    dropoff_location: str
    pickup_time: datetime
    return_time: Optional[datetime] = None
    passengers: Optional[List[str]] = []
    recurring_type: Optional[RecurringType] = None
    recurring_days: Optional[List[int]] = []
    recurring_end_date: Optional[datetime] = None
    vehicle_type_requested: Optional[VehicleType] = None
    service_type: Optional[ServiceType] = None
    cost_center: Optional[str] = None
    notes: Optional[str] = None


class CorporateDashboardStats(BaseModel):
    total_bookings: int
    pending_bookings: int
    active_trips: int
    total_employees: int
    monthly_cost: float
    this_month_trips: int

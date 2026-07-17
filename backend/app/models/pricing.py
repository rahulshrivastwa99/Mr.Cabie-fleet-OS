"""Pricing related models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from .enums import PricingType, VehicleType, ServiceType


class Service(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    service_type: ServiceType
    description: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ServiceCreate(BaseModel):
    name: str
    service_type: ServiceType
    description: Optional[str] = None


class PricingRule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pricing_type: PricingType
    vehicle_type: VehicleType
    rate_per_km: Optional[float] = None
    minimum_km: Optional[float] = None
    extra_km_charge: Optional[float] = None
    package_hours: Optional[float] = None
    package_km: Optional[float] = None
    base_fare: Optional[float] = None
    extra_hour_charge: Optional[float] = None
    extra_km_charge_package: Optional[float] = None
    route_from: Optional[str] = None
    route_to: Optional[str] = None
    one_way_price: Optional[float] = None
    round_trip_price: Optional[float] = None
    daily_rate: Optional[float] = None
    included_km: Optional[float] = None
    included_hours: Optional[float] = None
    custom_logic: Optional[dict] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PricingRuleCreate(BaseModel):
    pricing_type: PricingType
    vehicle_type: VehicleType
    rate_per_km: Optional[float] = None
    minimum_km: Optional[float] = None
    extra_km_charge: Optional[float] = None
    package_hours: Optional[float] = None
    package_km: Optional[float] = None
    base_fare: Optional[float] = None
    extra_hour_charge: Optional[float] = None
    extra_km_charge_package: Optional[float] = None
    route_from: Optional[str] = None
    route_to: Optional[str] = None
    one_way_price: Optional[float] = None
    round_trip_price: Optional[float] = None
    daily_rate: Optional[float] = None
    included_km: Optional[float] = None
    included_hours: Optional[float] = None
    custom_logic: Optional[dict] = None


class AdditionalCharge(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    charge_type: str
    rate: float
    unit: str
    description: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AdditionalChargeCreate(BaseModel):
    name: str
    charge_type: str
    rate: float
    unit: str
    description: Optional[str] = None


class RateCard(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    name: str
    is_active: bool = True
    pricing_rules: List[str] = []
    additional_charges: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RateCardCreate(BaseModel):
    client_id: str
    name: str
    pricing_rules: Optional[List[str]] = []
    additional_charges: Optional[List[str]] = []


class DashboardStats(BaseModel):
    total_vehicles: int
    available_vehicles: int
    total_drivers: int
    available_drivers: int
    active_duties: int
    pending_invoices: int
    total_revenue: float

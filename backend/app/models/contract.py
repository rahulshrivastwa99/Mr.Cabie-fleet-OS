"""Contract models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from .enums import ContractType, BillingCycle


class VehicleRateCard(BaseModel):
    vehicle_category: str
    vehicle_examples: Optional[str] = None
    local_4hr_40km: Optional[float] = None
    local_8hr_80km: Optional[float] = None
    local_12hr_120km: Optional[float] = None
    local_extra_km: Optional[float] = None
    local_extra_hour: Optional[float] = None
    outstation_per_km: Optional[float] = None
    outstation_min_km_per_day: Optional[float] = 300
    outstation_driver_allowance: Optional[float] = None
    monthly_rental: Optional[float] = None
    monthly_included_km: Optional[float] = None
    monthly_extra_km: Optional[float] = None


class FixedRoutePackage(BaseModel):
    route_name: str
    from_location: str
    to_location: str
    one_way_rates: dict = {}
    round_trip_rates: dict = {}
    includes_toll: bool = True
    notes: Optional[str] = None


class ExtraChargesConfig(BaseModel):
    driver_night_allowance: Optional[float] = 250
    waiting_charge_per_hour: Optional[float] = 100
    gst_percentage: float = 5
    toll_included: bool = False
    parking_included: bool = False
    state_tax_included: bool = False
    permit_included: bool = False
    notes: Optional[str] = None


class Contract(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    name: str
    contract_type: ContractType
    start_date: datetime
    end_date: datetime
    billing_cycle: BillingCycle = BillingCycle.MONTHLY
    
    # Rate Cards
    vehicle_rate_cards: List[dict] = []
    fixed_routes: List[dict] = []
    extra_charges_config: Optional[dict] = None
    
    # Legacy fields
    monthly_amount: Optional[float] = None
    included_days: Optional[int] = None
    included_km: Optional[float] = None
    rate_per_km: Optional[float] = None
    minimum_km_per_day: Optional[float] = None
    daily_rate: Optional[float] = None
    package_hours: Optional[float] = None
    package_km: Optional[float] = None
    package_rate: Optional[float] = None
    extra_hour_rate: Optional[float] = None
    extra_km_rate: Optional[float] = None
    routes: List[dict] = []
    base_monthly_amount: Optional[float] = None
    usage_rate_per_km: Optional[float] = None
    vehicle_rates: List[dict] = []
    source_pdf_url: Optional[str] = None
    
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ContractCreate(BaseModel):
    client_id: str
    name: str
    contract_type: ContractType
    start_date: datetime
    end_date: datetime
    billing_cycle: BillingCycle = BillingCycle.MONTHLY
    vehicle_rate_cards: Optional[List[dict]] = []
    fixed_routes: Optional[List[dict]] = []
    extra_charges_config: Optional[dict] = None
    monthly_amount: Optional[float] = None
    included_days: Optional[int] = None
    included_km: Optional[float] = None
    rate_per_km: Optional[float] = None
    minimum_km_per_day: Optional[float] = None
    daily_rate: Optional[float] = None
    package_hours: Optional[float] = None
    package_km: Optional[float] = None
    package_rate: Optional[float] = None
    extra_hour_rate: Optional[float] = None
    extra_km_rate: Optional[float] = None
    routes: Optional[List[dict]] = []
    base_monthly_amount: Optional[float] = None
    usage_rate_per_km: Optional[float] = None
    vehicle_rates: Optional[List[dict]] = []
    source_pdf_url: Optional[str] = None

from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from passlib.context import CryptContext
import jwt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'fleet-os-secret-key-change-in-production')

# Create the main app
app = FastAPI(title="Fleet OS API")
api_router = APIRouter(prefix="/api")

# Enums
class VehicleType(str, Enum):
    SEDAN = "SEDAN"
    SUV = "SUV"
    HATCHBACK = "HATCHBACK"
    EV = "EV"
    LUXURY = "LUXURY"

class VehicleStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    ON_DUTY = "ON_DUTY"
    MAINTENANCE = "MAINTENANCE"
    INACTIVE = "INACTIVE"

class DriverStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    ON_DUTY = "ON_DUTY"
    OFF_DUTY = "OFF_DUTY"
    INACTIVE = "INACTIVE"

# Renamed from DutyStatus to TripStatus
class TripStatus(str, Enum):
    CREATED = "CREATED"
    ASSIGNED = "ASSIGNED"
    ACCEPTED = "ACCEPTED"
    STARTED = "STARTED"
    COMPLETED = "COMPLETED"
    BILLED = "BILLED"
    CLOSED = "CLOSED"

# Keep DutyStatus as alias for backward compatibility
DutyStatus = TripStatus

class DutySlipStatus(str, Enum):
    DRAFT = "DRAFT"       # Created but not signed
    SIGNED = "SIGNED"     # Signed by passenger - LOCKED
    DISPUTED = "DISPUTED" # Under dispute

class ContractType(str, Enum):
    FIXED_MONTHLY = "FIXED_MONTHLY"
    PER_KM = "PER_KM"
    PER_DAY = "PER_DAY"
    PACKAGE = "PACKAGE"       # e.g., 8hr/80km
    ROUTE_BASED = "ROUTE_BASED"
    HYBRID = "HYBRID"         # Base + usage

class BillingCycle(str, Enum):
    WEEKLY = "WEEKLY"
    BIWEEKLY = "BIWEEKLY"
    MONTHLY = "MONTHLY"

class InvoiceStatus(str, Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    PAID = "PAID"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"

class CorporateUserRole(str, Enum):
    ADMIN = "ADMIN"  # Full access
    HR = "HR"  # Employee + booking access
    FINANCE = "FINANCE"  # Billing only
    VIEWER = "VIEWER"  # Read-only

class BookingStatus(str, Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class BookingType(str, Enum):
    ONE_TIME = "ONE_TIME"
    RECURRING = "RECURRING"


class TripType(str, Enum):
    ONE_WAY = "ONE_WAY"
    ROUND_TRIP = "ROUND_TRIP"

class RecurringType(str, Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"

class PricingType(str, Enum):
    PER_KM = "PER_KM"  # Rate per KM with minimum KM
    TIME_BASED = "TIME_BASED"  # 8hr/80km packages
    ROUTE_BASED = "ROUTE_BASED"  # Fixed route pricing
    DAILY_RENTAL = "DAILY_RENTAL"  # Daily fixed rate
    CUSTOM = "CUSTOM"  # Custom pricing structure

class ServiceType(str, Enum):
    AIRPORT_TRANSFER = "AIRPORT_TRANSFER"
    LOCAL_DUTY = "LOCAL_DUTY"
    OUTSTATION = "OUTSTATION"
    EMPLOYEE_TRANSPORT = "EMPLOYEE_TRANSPORT"
    CUSTOM = "CUSTOM"

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    role: str  # admin, operations, dispatch, finance
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "operations"

class UserLogin(BaseModel):
    email: str
    password: str

class Vehicle(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    registration_number: str
    vehicle_type: VehicleType
    model: str
    manufacturer: str
    year: int
    status: VehicleStatus = VehicleStatus.AVAILABLE
    capacity: int  # number of passengers
    current_location: Optional[dict] = None  # {lat, lng}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VehicleCreate(BaseModel):
    registration_number: str
    vehicle_type: VehicleType
    model: str
    manufacturer: str
    year: int
    capacity: int

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

class Client(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_name: str
    contact_person: str
    email: str
    phone: str
    gstin: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClientCreate(BaseModel):
    company_name: str
    contact_person: str
    email: str
    phone: str
    gstin: Optional[str] = None

# Renamed from Duty to Trip
class Trip(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    booking_id: Optional[str] = None  # Link to parent booking
    contract_id: Optional[str] = None  # Link to contract for pricing
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
    passengers: List[str] = []  # Multi-passenger employee IDs
    notes: Optional[str] = None
    duty_slip_id: Optional[str] = None  # 1:1 link to DutySlip
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

# Alias for backward compatibility
DutyCreate = TripCreate

class TripAssign(BaseModel):
    vehicle_id: str
    driver_id: str
    contract_id: Optional[str] = None  # Admin selects contract when assigning

# Alias for backward compatibility
DutyAssign = TripAssign

class TripStatusUpdate(BaseModel):
    status: TripStatus

# Alias for backward compatibility
DutyStatusUpdate = TripStatusUpdate

# ==================== DUTY SLIP MODEL ====================

class DutySlip(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trip_id: str  # 1:1 with Trip
    client_id: str
    
    # Trip Info
    date: datetime
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    trip_type: TripType = TripType.ONE_WAY
    
    # Driver & Vehicle
    driver_id: str
    driver_name: str
    vehicle_id: str
    vehicle_number: str
    vehicle_type: VehicleType
    
    # Client Info
    corporate_name: str
    pickup_location: str
    dropoff_location: str
    
    # Meter Reading
    opening_km: float
    closing_km: Optional[float] = None
    total_km: Optional[float] = None  # Auto-calculated
    
    # Passengers
    passenger_name: str
    passengers: List[dict] = []  # [{name, phone}]
    
    # Status & Signature
    status: DutySlipStatus = DutySlipStatus.DRAFT
    driver_remarks: Optional[str] = None
    passenger_signature: Optional[str] = None  # Base64 signature image
    signed_at: Optional[datetime] = None
    signed_by: Optional[str] = None  # Passenger name
    
    # Note
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
    passenger_signature: str  # Base64 signature
    signed_by: str  # Passenger name

# ==================== CONTRACT MODEL ====================

class Contract(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    name: str
    contract_type: ContractType
    
    # Contract Period
    start_date: datetime
    end_date: datetime
    billing_cycle: BillingCycle = BillingCycle.MONTHLY
    
    # Pricing Configuration
    # Fixed Monthly
    monthly_amount: Optional[float] = None
    included_days: Optional[int] = None
    included_km: Optional[float] = None
    
    # Per KM
    rate_per_km: Optional[float] = None
    minimum_km_per_day: Optional[float] = None
    
    # Per Day
    daily_rate: Optional[float] = None
    
    # Package (e.g., 8hr/80km)
    package_hours: Optional[float] = None
    package_km: Optional[float] = None
    package_rate: Optional[float] = None
    extra_hour_rate: Optional[float] = None
    extra_km_rate: Optional[float] = None
    
    # Route-Based
    routes: List[dict] = []  # [{from, to, one_way_price, round_trip_price}]
    
    # Hybrid
    base_monthly_amount: Optional[float] = None
    usage_rate_per_km: Optional[float] = None
    
    # Vehicle Type specific rates
    vehicle_rates: List[dict] = []  # [{vehicle_type, rate_multiplier}]
    
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
    
    # Optional pricing fields
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

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    client_id: str
    contract_id: Optional[str] = None  # Link to contract for pricing
    duty_slip_ids: List[str] = []  # List of DutySlip IDs
    trips: List[str] = []  # List of Trip IDs (kept for backward compatibility)
    duties: List[str] = []  # Alias for trips (backward compatibility)
    
    # Billing Period
    billing_period_start: Optional[datetime] = None
    billing_period_end: Optional[datetime] = None
    
    # Line Items (calculated from duty slips + contract)
    line_items: List[dict] = []
    
    # Extra Charges (Admin only: Toll, Parking, GST, etc.)
    extra_charges: List[dict] = []  # [{name, amount, description}]
    
    # Amounts
    base_amount: float = 0  # From contract calculation
    extra_charges_amount: float = 0  # Sum of extra charges
    subtotal: float = 0  # base + extra
    gst_percentage: float = 18.0
    gst_amount: float = 0
    total_amount: float = 0
    
    # Legacy fields
    amount: float = 0  # Alias for subtotal
    
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
    extra_charges: Optional[List[dict]] = []  # [{name, amount, description}]
    gst_percentage: float = 18.0
    due_days: int = 30
    
    # Legacy fields
    duties: Optional[List[str]] = []
    line_items: Optional[List[dict]] = []
    amount: Optional[float] = None

class ExtraChargeInput(BaseModel):
    name: str  # Toll, Parking, Driver Allowance, Night Charges, etc.
    amount: float
    description: Optional[str] = None

class DashboardStats(BaseModel):
    total_vehicles: int
    available_vehicles: int
    total_drivers: int
    available_drivers: int
    active_duties: int
    pending_invoices: int
    total_revenue: float


# Corporate Customer Models
class CorporateUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    client_id: str  # Links to Client
    role: CorporateUserRole = CorporateUserRole.VIEWER
    department: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CorporateUserCreate(BaseModel):
    email: str
    password: str
    name: str
    client_id: str
    role: CorporateUserRole = CorporateUserRole.VIEWER
    department: Optional[str] = None

class CorporateUserLogin(BaseModel):
    email: str
    password: str

class Employee(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    name: str
    email: str
    phone: str
    employee_id: str  # Company employee ID
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
    contract_id: Optional[str] = None  # Link to contract for pricing
    booking_type: BookingType = BookingType.ONE_TIME
    status: BookingStatus = BookingStatus.PENDING
    
    # Trip Details
    trip_type: TripType = TripType.ONE_WAY
    pickup_location: str
    dropoff_location: str
    pickup_time: datetime
    return_time: Optional[datetime] = None  # For round trips
    
    # Passenger Details
    passenger_name: str
    passenger_phone: str
    passengers: List[str] = []  # Multi-employee booking (employee IDs)
    
    # Recurring Booking
    recurring_type: Optional[RecurringType] = None
    recurring_days: List[int] = []  # [1,2,3,4,5] for Mon-Fri
    recurring_end_date: Optional[datetime] = None
    
    # Vehicle & Service
    vehicle_type_requested: Optional[VehicleType] = None
    service_type: Optional[ServiceType] = None
    
    # Pricing
    estimated_cost: Optional[float] = None
    pricing_rule_applied: Optional[str] = None  # PricingRule ID
    
    # Trip IDs (one booking can create multiple trips for recurring)
    trip_ids: List[str] = []
    
    cost_center: Optional[str] = None
    notes: Optional[str] = None
    duty_id: Optional[str] = None  # Legacy: single trip link
    vehicle_id: Optional[str] = None
    driver_id: Optional[str] = None
    created_by: str  # Corporate user ID
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
    passengers: Optional[List[str]] = []  # Additional employee IDs
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

# ==================== PRICING ENGINE MODELS ====================

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
    
    # Per KM Pricing
    rate_per_km: Optional[float] = None
    minimum_km: Optional[float] = None
    extra_km_charge: Optional[float] = None
    
    # Time-Based Package
    package_hours: Optional[float] = None
    package_km: Optional[float] = None
    base_fare: Optional[float] = None
    extra_hour_charge: Optional[float] = None
    extra_km_charge_package: Optional[float] = None
    
    # Route-Based
    route_from: Optional[str] = None
    route_to: Optional[str] = None
    one_way_price: Optional[float] = None
    round_trip_price: Optional[float] = None
    
    # Daily Rental
    daily_rate: Optional[float] = None
    included_km: Optional[float] = None
    included_hours: Optional[float] = None
    
    # Custom
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
    charge_type: str  # waiting, night, driver_allowance, toll, parking, state_tax, fuel_adjustment
    rate: float
    unit: str  # per_hour, per_day, fixed, percentage
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
    pricing_rules: List[str] = []  # List of PricingRule IDs
    additional_charges: List[str] = []  # List of AdditionalCharge IDs
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RateCardCreate(BaseModel):
    client_id: str
    name: str
    pricing_rules: Optional[List[str]] = []
    additional_charges: Optional[List[str]] = []

class InvoiceLineItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    service_type: ServiceType
    service_name: str
    vehicle_type: Optional[VehicleType] = None
    pricing_type: Optional[PricingType] = None
    base_fare: float
    additional_charges: List[dict] = []  # [{name, amount}]
    total_amount: float
    description: Optional[str] = None

class InvoiceLineItemCreate(BaseModel):
    service_type: ServiceType
    service_name: str
    vehicle_type: Optional[VehicleType] = None
    pricing_type: Optional[PricingType] = None
    base_fare: float
    additional_charges: Optional[List[dict]] = []
    description: Optional[str] = None


# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication")

async def get_current_corporate_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        user_type: str = payload.get("type")
        if user_id is None or user_type != "corporate":
            raise HTTPException(status_code=401, detail="Invalid authentication")
        user = await db.corporate_users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return CorporateUser(**user)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication")


# Routes
@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['password'] = get_password_hash(user_data.password)
    
    await db.users.insert_one(doc)
    return user

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token({"sub": user_doc['id']})
    return {"access_token": access_token, "token_type": "bearer", "user": User(**user_doc).model_dump()}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Dashboard
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    total_vehicles = await db.vehicles.count_documents({})
    available_vehicles = await db.vehicles.count_documents({"status": VehicleStatus.AVAILABLE})
    total_drivers = await db.drivers.count_documents({})
    available_drivers = await db.drivers.count_documents({"status": DriverStatus.AVAILABLE})
    active_duties = await db.duties.count_documents({"status": {"$in": [DutyStatus.ASSIGNED, DutyStatus.ACCEPTED, DutyStatus.STARTED]}})
    pending_invoices = await db.invoices.count_documents({"status": {"$in": [InvoiceStatus.SENT, InvoiceStatus.OVERDUE]}})
    
    # Calculate total revenue from paid invoices
    paid_invoices = await db.invoices.find({"status": InvoiceStatus.PAID}, {"_id": 0}).to_list(1000)
    total_revenue = sum(inv.get('total_amount', 0) for inv in paid_invoices)
    
    return DashboardStats(
        total_vehicles=total_vehicles,
        available_vehicles=available_vehicles,
        total_drivers=total_drivers,
        available_drivers=available_drivers,
        active_duties=active_duties,
        pending_invoices=pending_invoices,
        total_revenue=total_revenue
    )

# Vehicles
@api_router.get("/vehicles", response_model=List[Vehicle])
async def get_vehicles(current_user: User = Depends(get_current_user)):
    vehicles = await db.vehicles.find({}, {"_id": 0}).to_list(1000)
    for v in vehicles:
        v['created_at'] = datetime.fromisoformat(v['created_at']) if isinstance(v['created_at'], str) else v['created_at']
        v['updated_at'] = datetime.fromisoformat(v['updated_at']) if isinstance(v['updated_at'], str) else v['updated_at']
    return vehicles

@api_router.post("/vehicles", response_model=Vehicle)
async def create_vehicle(vehicle_data: VehicleCreate, current_user: User = Depends(get_current_user)):
    vehicle = Vehicle(**vehicle_data.model_dump())
    doc = vehicle.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.vehicles.insert_one(doc)
    return vehicle

@api_router.get("/vehicles/{vehicle_id}", response_model=Vehicle)
async def get_vehicle(vehicle_id: str, current_user: User = Depends(get_current_user)):
    vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    vehicle['created_at'] = datetime.fromisoformat(vehicle['created_at']) if isinstance(vehicle['created_at'], str) else vehicle['created_at']
    vehicle['updated_at'] = datetime.fromisoformat(vehicle['updated_at']) if isinstance(vehicle['updated_at'], str) else vehicle['updated_at']
    return Vehicle(**vehicle)

@api_router.put("/vehicles/{vehicle_id}", response_model=Vehicle)
async def update_vehicle(vehicle_id: str, vehicle_data: VehicleCreate, current_user: User = Depends(get_current_user)):
    existing = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    updated_data = vehicle_data.model_dump()
    updated_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.vehicles.update_one({"id": vehicle_id}, {"$set": updated_data})
    
    vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    vehicle['created_at'] = datetime.fromisoformat(vehicle['created_at'])
    vehicle['updated_at'] = datetime.fromisoformat(vehicle['updated_at'])
    return Vehicle(**vehicle)

# Drivers
@api_router.get("/drivers", response_model=List[Driver])
async def get_drivers(current_user: User = Depends(get_current_user)):
    drivers = await db.drivers.find({}, {"_id": 0}).to_list(1000)
    for d in drivers:
        d['created_at'] = datetime.fromisoformat(d['created_at']) if isinstance(d['created_at'], str) else d['created_at']
        d['updated_at'] = datetime.fromisoformat(d['updated_at']) if isinstance(d['updated_at'], str) else d['updated_at']
    return drivers

@api_router.post("/drivers", response_model=Driver)
async def create_driver(driver_data: DriverCreate, current_user: User = Depends(get_current_user)):
    driver = Driver(**driver_data.model_dump())
    doc = driver.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.drivers.insert_one(doc)
    return driver

@api_router.get("/drivers/{driver_id}", response_model=Driver)
async def get_driver(driver_id: str, current_user: User = Depends(get_current_user)):
    driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    driver['created_at'] = datetime.fromisoformat(driver['created_at']) if isinstance(driver['created_at'], str) else driver['created_at']
    driver['updated_at'] = datetime.fromisoformat(driver['updated_at']) if isinstance(driver['updated_at'], str) else driver['updated_at']
    return Driver(**driver)

# Clients
@api_router.get("/clients", response_model=List[Client])
async def get_clients(current_user: User = Depends(get_current_user)):
    clients = await db.clients.find({}, {"_id": 0}).to_list(1000)
    for c in clients:
        c['created_at'] = datetime.fromisoformat(c['created_at']) if isinstance(c['created_at'], str) else c['created_at']
    return clients

@api_router.post("/clients", response_model=Client)
async def create_client(client_data: ClientCreate, current_user: User = Depends(get_current_user)):
    client = Client(**client_data.model_dump())
    doc = client.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.clients.insert_one(doc)
    return client

# Duties
@api_router.get("/duties", response_model=List[Duty])
async def get_duties(current_user: User = Depends(get_current_user)):
    duties = await db.duties.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for d in duties:
        d['created_at'] = datetime.fromisoformat(d['created_at']) if isinstance(d['created_at'], str) else d['created_at']
        d['updated_at'] = datetime.fromisoformat(d['updated_at']) if isinstance(d['updated_at'], str) else d['updated_at']
        d['pickup_time'] = datetime.fromisoformat(d['pickup_time']) if isinstance(d['pickup_time'], str) else d['pickup_time']
    return duties

@api_router.post("/duties", response_model=Duty)
async def create_duty(duty_data: DutyCreate, current_user: User = Depends(get_current_user)):
    duty = Duty(**duty_data.model_dump())
    doc = duty.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    doc['pickup_time'] = doc['pickup_time'].isoformat()
    await db.duties.insert_one(doc)
    return duty

@api_router.get("/duties/{duty_id}", response_model=Duty)
async def get_duty(duty_id: str, current_user: User = Depends(get_current_user)):
    duty = await db.duties.find_one({"id": duty_id}, {"_id": 0})
    if not duty:
        raise HTTPException(status_code=404, detail="Duty not found")
    duty['created_at'] = datetime.fromisoformat(duty['created_at'])
    duty['updated_at'] = datetime.fromisoformat(duty['updated_at'])
    duty['pickup_time'] = datetime.fromisoformat(duty['pickup_time'])
    return Duty(**duty)

@api_router.post("/duties/{duty_id}/assign")
async def assign_duty(duty_id: str, assign_data: DutyAssign, current_user: User = Depends(get_current_user)):
    duty = await db.duties.find_one({"id": duty_id}, {"_id": 0})
    if not duty:
        raise HTTPException(status_code=404, detail="Duty not found")
    
    # Check vehicle availability
    vehicle = await db.vehicles.find_one({"id": assign_data.vehicle_id}, {"_id": 0})
    if not vehicle or vehicle['status'] != VehicleStatus.AVAILABLE:
        raise HTTPException(status_code=400, detail="Vehicle not available")
    
    # Check driver availability
    driver = await db.drivers.find_one({"id": assign_data.driver_id}, {"_id": 0})
    if not driver or driver['status'] != DriverStatus.AVAILABLE:
        raise HTTPException(status_code=400, detail="Driver not available")
    
    # Validate contract if provided
    if assign_data.contract_id:
        contract = await db.contracts.find_one({"id": assign_data.contract_id}, {"_id": 0})
        if not contract:
            raise HTTPException(status_code=400, detail="Contract not found")
    
    # Update duty with contract
    update_data = {
        "vehicle_id": assign_data.vehicle_id,
        "driver_id": assign_data.driver_id,
        "status": DutyStatus.ASSIGNED,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if assign_data.contract_id:
        update_data["contract_id"] = assign_data.contract_id
    
    await db.duties.update_one({"id": duty_id}, {"$set": update_data})
    
    # Update vehicle and driver status
    await db.vehicles.update_one({"id": assign_data.vehicle_id}, {"$set": {"status": VehicleStatus.ON_DUTY}})
    await db.drivers.update_one({"id": assign_data.driver_id}, {"$set": {"status": DriverStatus.ON_DUTY}})
    
    return {"message": "Duty assigned successfully"}

@api_router.patch("/duties/{duty_id}/status")
async def update_duty_status(duty_id: str, status_data: DutyStatusUpdate, current_user: User = Depends(get_current_user)):
    duty = await db.duties.find_one({"id": duty_id}, {"_id": 0})
    if not duty:
        raise HTTPException(status_code=404, detail="Duty not found")
    
    await db.duties.update_one(
        {"id": duty_id},
        {"$set": {"status": status_data.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # If duty is completed, mark vehicle and driver as available
    if status_data.status == DutyStatus.COMPLETED:
        if duty.get('vehicle_id'):
            await db.vehicles.update_one({"id": duty['vehicle_id']}, {"$set": {"status": VehicleStatus.AVAILABLE}})
        if duty.get('driver_id'):
            await db.drivers.update_one({"id": duty['driver_id']}, {"$set": {"status": DriverStatus.AVAILABLE}})
    
    return {"message": "Duty status updated"}

# Invoices
@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(current_user: User = Depends(get_current_user)):
    invoices = await db.invoices.find({}, {"_id": 0}).to_list(1000)
    for inv in invoices:
        inv['invoice_date'] = datetime.fromisoformat(inv['invoice_date']) if isinstance(inv['invoice_date'], str) else inv['invoice_date']
        inv['due_date'] = datetime.fromisoformat(inv['due_date']) if isinstance(inv['due_date'], str) else inv['due_date']
        inv['created_at'] = datetime.fromisoformat(inv['created_at']) if isinstance(inv['created_at'], str) else inv['created_at']
        if inv.get('billing_period_start'):
            inv['billing_period_start'] = datetime.fromisoformat(inv['billing_period_start']) if isinstance(inv['billing_period_start'], str) else inv['billing_period_start']
        if inv.get('billing_period_end'):
            inv['billing_period_end'] = datetime.fromisoformat(inv['billing_period_end']) if isinstance(inv['billing_period_end'], str) else inv['billing_period_end']
    return invoices

@api_router.post("/invoices", response_model=Invoice)
async def create_invoice(invoice_data: InvoiceCreate, current_user: User = Depends(get_current_user)):
    from datetime import timedelta
    
    # Generate invoice number
    count = await db.invoices.count_documents({}) + 1
    invoice_number = f"INV-{count:05d}"
    
    invoice_date = datetime.now(timezone.utc)
    due_date = invoice_date + timedelta(days=invoice_data.due_days)
    
    # Calculate amounts from duty slips + contract
    base_amount = 0
    line_items = []
    
    if invoice_data.duty_slip_ids:
        # Fetch duty slips
        duty_slips = await db.duty_slips.find({"id": {"$in": invoice_data.duty_slip_ids}}, {"_id": 0}).to_list(1000)
        
        # Get contract for pricing
        contract = None
        if invoice_data.contract_id:
            contract = await db.contracts.find_one({"id": invoice_data.contract_id}, {"_id": 0})
        
        if contract:
            # Calculate based on contract type
            total_km = sum(ds.get('total_km', 0) or 0 for ds in duty_slips)
            total_trips = len(duty_slips)
            
            if contract['contract_type'] == ContractType.FIXED_MONTHLY:
                base_amount = contract.get('monthly_amount', 0)
                line_items.append({
                    "description": f"Fixed Monthly Contract - {contract['name']}",
                    "quantity": 1,
                    "rate": base_amount,
                    "amount": base_amount
                })
            
            elif contract['contract_type'] == ContractType.PER_KM:
                rate = contract.get('rate_per_km', 0)
                base_amount = total_km * rate
                line_items.append({
                    "description": f"Per KM Billing @ ₹{rate}/km",
                    "quantity": total_km,
                    "rate": rate,
                    "amount": base_amount
                })
            
            elif contract['contract_type'] == ContractType.PER_DAY:
                rate = contract.get('daily_rate', 0)
                base_amount = total_trips * rate
                line_items.append({
                    "description": f"Per Day Billing @ ₹{rate}/day",
                    "quantity": total_trips,
                    "rate": rate,
                    "amount": base_amount
                })
            
            elif contract['contract_type'] == ContractType.PACKAGE:
                # Calculate per trip package charges
                pkg_rate = contract.get('package_rate', 0)
                pkg_hours = contract.get('package_hours', 8)
                pkg_km = contract.get('package_km', 80)
                extra_hour_rate = contract.get('extra_hour_rate', 0)
                extra_km_rate = contract.get('extra_km_rate', 0)
                
                for ds in duty_slips:
                    trip_km = ds.get('total_km', 0) or 0
                    # Calculate hours from start/end time
                    trip_hours = 0
                    if ds.get('start_time') and ds.get('end_time'):
                        start = datetime.fromisoformat(ds['start_time']) if isinstance(ds['start_time'], str) else ds['start_time']
                        end = datetime.fromisoformat(ds['end_time']) if isinstance(ds['end_time'], str) else ds['end_time']
                        trip_hours = (end - start).total_seconds() / 3600
                    
                    trip_amount = pkg_rate
                    extra_km = max(0, trip_km - pkg_km)
                    extra_hours = max(0, trip_hours - pkg_hours)
                    
                    trip_amount += extra_km * extra_km_rate
                    trip_amount += extra_hours * extra_hour_rate
                    
                    base_amount += trip_amount
                    line_items.append({
                        "description": f"Trip {ds['id'][:8]} - Package {pkg_hours}hr/{pkg_km}km",
                        "quantity": 1,
                        "rate": pkg_rate,
                        "km": trip_km,
                        "extra_km": extra_km,
                        "extra_km_charge": extra_km * extra_km_rate,
                        "amount": trip_amount
                    })
            
            elif contract['contract_type'] == ContractType.ROUTE_BASED:
                routes = contract.get('routes', [])
                for ds in duty_slips:
                    pickup = ds.get('pickup_location', '').lower()
                    dropoff = ds.get('dropoff_location', '').lower()
                    trip_type = ds.get('trip_type', TripType.ONE_WAY)
                    
                    route_price = 0
                    for route in routes:
                        if route.get('from', '').lower() in pickup and route.get('to', '').lower() in dropoff:
                            if trip_type == TripType.ROUND_TRIP:
                                route_price = route.get('round_trip_price', 0)
                            else:
                                route_price = route.get('one_way_price', 0)
                            break
                    
                    base_amount += route_price
                    line_items.append({
                        "description": f"Route: {ds['pickup_location']} → {ds['dropoff_location']}",
                        "quantity": 1,
                        "rate": route_price,
                        "amount": route_price
                    })
            
            elif contract['contract_type'] == ContractType.HYBRID:
                base_monthly = contract.get('base_monthly_amount', 0)
                usage_rate = contract.get('usage_rate_per_km', 0)
                base_amount = base_monthly + (total_km * usage_rate)
                line_items.append({
                    "description": f"Base Monthly Amount",
                    "quantity": 1,
                    "rate": base_monthly,
                    "amount": base_monthly
                })
                line_items.append({
                    "description": f"Usage Charge @ ₹{usage_rate}/km",
                    "quantity": total_km,
                    "rate": usage_rate,
                    "amount": total_km * usage_rate
                })
    
    # Legacy support: if amount is provided directly
    if invoice_data.amount is not None and base_amount == 0:
        base_amount = invoice_data.amount
    
    # Calculate extra charges
    extra_charges = invoice_data.extra_charges or []
    extra_charges_amount = sum(ec.get('amount', 0) for ec in extra_charges)
    
    # Calculate totals
    subtotal = base_amount + extra_charges_amount
    gst_amount = subtotal * (invoice_data.gst_percentage / 100)
    total_amount = subtotal + gst_amount
    
    invoice = Invoice(
        invoice_number=invoice_number,
        client_id=invoice_data.client_id,
        contract_id=invoice_data.contract_id,
        duty_slip_ids=invoice_data.duty_slip_ids,
        trips=invoice_data.duties or [],
        duties=invoice_data.duties or [],
        billing_period_start=invoice_data.billing_period_start,
        billing_period_end=invoice_data.billing_period_end,
        line_items=line_items or invoice_data.line_items or [],
        extra_charges=extra_charges,
        base_amount=base_amount,
        extra_charges_amount=extra_charges_amount,
        subtotal=subtotal,
        gst_percentage=invoice_data.gst_percentage,
        gst_amount=gst_amount,
        total_amount=total_amount,
        amount=subtotal,
        invoice_date=invoice_date,
        due_date=due_date
    )
    
    doc = invoice.model_dump()
    doc['invoice_date'] = doc['invoice_date'].isoformat()
    doc['due_date'] = doc['due_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('billing_period_start'):
        doc['billing_period_start'] = doc['billing_period_start'].isoformat()
    if doc.get('billing_period_end'):
        doc['billing_period_end'] = doc['billing_period_end'].isoformat()
    
    await db.invoices.insert_one(doc)
    
    # Mark trips associated with duty slips as billed
    # Note: Duty slips remain SIGNED - only trips get BILLED status
    if invoice_data.duty_slip_ids:
        # Get trip IDs from duty slips
        duty_slips_for_billing = await db.duty_slips.find(
            {"id": {"$in": invoice_data.duty_slip_ids}},
            {"trip_id": 1, "_id": 0}
        ).to_list(1000)
        trip_ids_from_slips = [ds.get('trip_id') for ds in duty_slips_for_billing if ds.get('trip_id')]
        if trip_ids_from_slips:
            await db.duties.update_many(
                {"id": {"$in": trip_ids_from_slips}},
                {"$set": {"status": TripStatus.BILLED}}
            )
    
    # Mark trips as billed (legacy support)
    if invoice_data.duties:
        await db.duties.update_many(
            {"id": {"$in": invoice_data.duties}},
            {"$set": {"status": TripStatus.BILLED}}
        )
    
    return invoice

# Invoice Update Endpoint - Admin can edit line items, rates, extra charges
class InvoiceUpdate(BaseModel):
    line_items: Optional[List[dict]] = None
    extra_charges: Optional[List[dict]] = None
    gst_percentage: Optional[float] = None
    status: Optional[InvoiceStatus] = None
    notes: Optional[str] = None

@api_router.put("/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, update_data: InvoiceUpdate, current_user: User = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    update_fields = {}
    
    if update_data.line_items is not None:
        update_fields['line_items'] = update_data.line_items
        # Recalculate base amount from line items
        base_amount = sum(item.get('amount', 0) for item in update_data.line_items)
        update_fields['base_amount'] = base_amount
    else:
        base_amount = invoice.get('base_amount', 0)
    
    if update_data.extra_charges is not None:
        update_fields['extra_charges'] = update_data.extra_charges
        extra_charges_amount = sum(ec.get('amount', 0) for ec in update_data.extra_charges)
        update_fields['extra_charges_amount'] = extra_charges_amount
    else:
        extra_charges_amount = invoice.get('extra_charges_amount', 0)
    
    gst_percentage = update_data.gst_percentage if update_data.gst_percentage is not None else invoice.get('gst_percentage', 18.0)
    if update_data.gst_percentage is not None:
        update_fields['gst_percentage'] = gst_percentage
    
    # Recalculate totals
    subtotal = base_amount + extra_charges_amount
    gst_amount = subtotal * (gst_percentage / 100)
    total_amount = subtotal + gst_amount
    
    update_fields['subtotal'] = subtotal
    update_fields['amount'] = subtotal
    update_fields['gst_amount'] = gst_amount
    update_fields['total_amount'] = total_amount
    update_fields['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    if update_data.status is not None:
        update_fields['status'] = update_data.status
    
    if update_data.notes is not None:
        update_fields['notes'] = update_data.notes
    
    await db.invoices.update_one({"id": invoice_id}, {"$set": update_fields})
    
    updated_invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    return updated_invoice

@api_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, current_user: User = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Fetch duty slip details for reconciliation
    if invoice.get('duty_slip_ids'):
        duty_slips = await db.duty_slips.find(
            {"id": {"$in": invoice['duty_slip_ids']}},
            {"_id": 0}
        ).to_list(1000)
        invoice['duty_slips_detail'] = duty_slips
    
    # Fetch client details
    client = await db.clients.find_one({"id": invoice['client_id']}, {"_id": 0})
    invoice['client_detail'] = client
    
    # Fetch contract details
    if invoice.get('contract_id'):
        contract = await db.contracts.find_one({"id": invoice['contract_id']}, {"_id": 0})
        invoice['contract_detail'] = contract
    
    return invoice

# Default/Fallback Rates Configuration
class DefaultRates(BaseModel):
    rate_per_km: float = 15.0  # Default fallback rate
    minimum_km: float = 25.0
    night_charge_percentage: float = 25.0
    waiting_charge_per_hour: float = 100.0

@api_router.get("/settings/default-rates")
async def get_default_rates(current_user: User = Depends(get_current_user)):
    rates = await db.settings.find_one({"key": "default_rates"}, {"_id": 0})
    if not rates:
        # Return default values
        return DefaultRates().model_dump()
    return rates.get('value', DefaultRates().model_dump())

@api_router.put("/settings/default-rates")
async def update_default_rates(rates: DefaultRates, current_user: User = Depends(get_current_user)):
    await db.settings.update_one(
        {"key": "default_rates"},
        {"$set": {"key": "default_rates", "value": rates.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "Default rates updated", "rates": rates.model_dump()}

# ==================== CONTRACT API ENDPOINTS ====================

@api_router.get("/contracts", response_model=List[Contract])
async def get_contracts(current_user: User = Depends(get_current_user)):
    contracts = await db.contracts.find({}, {"_id": 0}).to_list(1000)
    for c in contracts:
        c['start_date'] = datetime.fromisoformat(c['start_date']) if isinstance(c['start_date'], str) else c['start_date']
        c['end_date'] = datetime.fromisoformat(c['end_date']) if isinstance(c['end_date'], str) else c['end_date']
        c['created_at'] = datetime.fromisoformat(c['created_at']) if isinstance(c['created_at'], str) else c['created_at']
        c['updated_at'] = datetime.fromisoformat(c['updated_at']) if isinstance(c['updated_at'], str) else c['updated_at']
    return contracts

@api_router.post("/contracts", response_model=Contract)
async def create_contract(contract_data: ContractCreate, current_user: User = Depends(get_current_user)):
    # Verify client exists
    client = await db.clients.find_one({"id": contract_data.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    contract = Contract(**contract_data.model_dump())
    doc = contract.model_dump()
    doc['start_date'] = doc['start_date'].isoformat()
    doc['end_date'] = doc['end_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.contracts.insert_one(doc)
    return contract

@api_router.get("/contracts/{contract_id}", response_model=Contract)
async def get_contract(contract_id: str, current_user: User = Depends(get_current_user)):
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    contract['start_date'] = datetime.fromisoformat(contract['start_date'])
    contract['end_date'] = datetime.fromisoformat(contract['end_date'])
    contract['created_at'] = datetime.fromisoformat(contract['created_at'])
    contract['updated_at'] = datetime.fromisoformat(contract['updated_at'])
    return Contract(**contract)

@api_router.put("/contracts/{contract_id}", response_model=Contract)
async def update_contract(contract_id: str, contract_data: ContractCreate, current_user: User = Depends(get_current_user)):
    existing = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    update_data = contract_data.model_dump()
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    update_data['start_date'] = update_data['start_date'].isoformat()
    update_data['end_date'] = update_data['end_date'].isoformat()
    
    await db.contracts.update_one({"id": contract_id}, {"$set": update_data})
    
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    contract['start_date'] = datetime.fromisoformat(contract['start_date'])
    contract['end_date'] = datetime.fromisoformat(contract['end_date'])
    contract['created_at'] = datetime.fromisoformat(contract['created_at'])
    contract['updated_at'] = datetime.fromisoformat(contract['updated_at'])
    return Contract(**contract)

@api_router.get("/contracts/client/{client_id}")
async def get_client_contracts(client_id: str, current_user: User = Depends(get_current_user)):
    contracts = await db.contracts.find({"client_id": client_id}, {"_id": 0}).to_list(100)
    for c in contracts:
        c['start_date'] = datetime.fromisoformat(c['start_date']) if isinstance(c['start_date'], str) else c['start_date']
        c['end_date'] = datetime.fromisoformat(c['end_date']) if isinstance(c['end_date'], str) else c['end_date']
        c['created_at'] = datetime.fromisoformat(c['created_at']) if isinstance(c['created_at'], str) else c['created_at']
        c['updated_at'] = datetime.fromisoformat(c['updated_at']) if isinstance(c['updated_at'], str) else c['updated_at']
    return contracts

@api_router.get("/contracts/client/{client_id}/active")
async def get_active_contract(client_id: str, current_user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    contract = await db.contracts.find_one({
        "client_id": client_id,
        "is_active": True,
        "start_date": {"$lte": now.isoformat()},
        "end_date": {"$gte": now.isoformat()}
    }, {"_id": 0})
    
    if not contract:
        return {"message": "No active contract found", "contract": None}
    
    contract['start_date'] = datetime.fromisoformat(contract['start_date'])
    contract['end_date'] = datetime.fromisoformat(contract['end_date'])
    contract['created_at'] = datetime.fromisoformat(contract['created_at'])
    contract['updated_at'] = datetime.fromisoformat(contract['updated_at'])
    return {"contract": Contract(**contract)}

# ==================== DUTY SLIP API ENDPOINTS ====================

@api_router.get("/duty-slips", response_model=List[DutySlip])
async def get_duty_slips(
    client_id: Optional[str] = None,
    driver_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if client_id:
        query["client_id"] = client_id
    if driver_id:
        query["driver_id"] = driver_id
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in query:
            query["date"]["$lte"] = date_to
        else:
            query["date"] = {"$lte": date_to}
    
    duty_slips = await db.duty_slips.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for ds in duty_slips:
        ds['date'] = datetime.fromisoformat(ds['date']) if isinstance(ds['date'], str) else ds['date']
        if ds.get('start_time'):
            ds['start_time'] = datetime.fromisoformat(ds['start_time']) if isinstance(ds['start_time'], str) else ds['start_time']
        if ds.get('end_time'):
            ds['end_time'] = datetime.fromisoformat(ds['end_time']) if isinstance(ds['end_time'], str) else ds['end_time']
        if ds.get('signed_at'):
            ds['signed_at'] = datetime.fromisoformat(ds['signed_at']) if isinstance(ds['signed_at'], str) else ds['signed_at']
        ds['created_at'] = datetime.fromisoformat(ds['created_at']) if isinstance(ds['created_at'], str) else ds['created_at']
        ds['updated_at'] = datetime.fromisoformat(ds['updated_at']) if isinstance(ds['updated_at'], str) else ds['updated_at']
    return duty_slips

@api_router.post("/duty-slips", response_model=DutySlip)
async def create_duty_slip(slip_data: DutySlipCreate, current_user: User = Depends(get_current_user)):
    # Get trip details
    trip = await db.duties.find_one({"id": slip_data.trip_id}, {"_id": 0})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Check if duty slip already exists for this trip
    existing = await db.duty_slips.find_one({"trip_id": slip_data.trip_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Duty slip already exists for this trip")
    
    # Get driver and vehicle details
    driver = await db.drivers.find_one({"id": trip.get('driver_id')}, {"_id": 0})
    vehicle = await db.vehicles.find_one({"id": trip.get('vehicle_id')}, {"_id": 0})
    client = await db.clients.find_one({"id": trip.get('client_id')}, {"_id": 0})
    
    if not driver or not vehicle:
        raise HTTPException(status_code=400, detail="Trip must be assigned to driver and vehicle before creating duty slip")
    
    # Build passenger list
    passengers = [{"name": trip.get('passenger_name'), "phone": trip.get('passenger_phone')}]
    for emp_id in trip.get('passengers', []):
        emp = await db.employees.find_one({"id": emp_id}, {"_id": 0})
        if emp:
            passengers.append({"name": emp['name'], "phone": emp['phone']})
    
    duty_slip = DutySlip(
        id=slip_data.trip_id,  # Use trip ID as duty slip ID
        trip_id=slip_data.trip_id,
        client_id=trip.get('client_id'),
        date=datetime.fromisoformat(trip['pickup_time']) if isinstance(trip['pickup_time'], str) else trip['pickup_time'],
        start_time=datetime.now(timezone.utc),
        trip_type=trip.get('trip_type', TripType.ONE_WAY),
        driver_id=driver['id'],
        driver_name=driver['name'],
        vehicle_id=vehicle['id'],
        vehicle_number=vehicle['registration_number'],
        vehicle_type=vehicle['vehicle_type'],
        corporate_name=client['company_name'] if client else "Unknown",
        pickup_location=trip['pickup_location'],
        dropoff_location=trip['dropoff_location'],
        opening_km=slip_data.opening_km,
        passenger_name=trip.get('passenger_name'),
        passengers=passengers,
        driver_remarks=slip_data.driver_remarks
    )
    
    doc = duty_slip.model_dump()
    doc['date'] = doc['date'].isoformat()
    doc['start_time'] = doc['start_time'].isoformat() if doc.get('start_time') else None
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.duty_slips.insert_one(doc)
    
    # Link duty slip to trip
    await db.duties.update_one(
        {"id": slip_data.trip_id},
        {"$set": {"duty_slip_id": duty_slip.id, "status": TripStatus.STARTED}}
    )
    
    return duty_slip

@api_router.get("/duty-slips/{slip_id}", response_model=DutySlip)
async def get_duty_slip(slip_id: str, current_user: User = Depends(get_current_user)):
    ds = await db.duty_slips.find_one({"id": slip_id}, {"_id": 0})
    if not ds:
        raise HTTPException(status_code=404, detail="Duty slip not found")
    
    ds['date'] = datetime.fromisoformat(ds['date']) if isinstance(ds['date'], str) else ds['date']
    if ds.get('start_time'):
        ds['start_time'] = datetime.fromisoformat(ds['start_time']) if isinstance(ds['start_time'], str) else ds['start_time']
    if ds.get('end_time'):
        ds['end_time'] = datetime.fromisoformat(ds['end_time']) if isinstance(ds['end_time'], str) else ds['end_time']
    if ds.get('signed_at'):
        ds['signed_at'] = datetime.fromisoformat(ds['signed_at']) if isinstance(ds['signed_at'], str) else ds['signed_at']
    ds['created_at'] = datetime.fromisoformat(ds['created_at']) if isinstance(ds['created_at'], str) else ds['created_at']
    ds['updated_at'] = datetime.fromisoformat(ds['updated_at']) if isinstance(ds['updated_at'], str) else ds['updated_at']
    
    return DutySlip(**ds)

@api_router.patch("/duty-slips/{slip_id}/complete")
async def complete_duty_slip(slip_id: str, complete_data: DutySlipComplete, current_user: User = Depends(get_current_user)):
    ds = await db.duty_slips.find_one({"id": slip_id}, {"_id": 0})
    if not ds:
        raise HTTPException(status_code=404, detail="Duty slip not found")
    
    if ds.get('status') == DutySlipStatus.SIGNED:
        raise HTTPException(status_code=400, detail="Cannot modify signed duty slip")
    
    # Calculate total KM
    opening_km = ds.get('opening_km', 0)
    total_km = complete_data.closing_km - opening_km
    
    await db.duty_slips.update_one(
        {"id": slip_id},
        {"$set": {
            "closing_km": complete_data.closing_km,
            "total_km": total_km,
            "end_time": datetime.now(timezone.utc).isoformat(),
            "driver_remarks": complete_data.driver_remarks or ds.get('driver_remarks'),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Duty slip completed", "total_km": total_km}

@api_router.patch("/duty-slips/{slip_id}/sign")
async def sign_duty_slip(slip_id: str, sign_data: DutySlipSign, current_user: User = Depends(get_current_user)):
    ds = await db.duty_slips.find_one({"id": slip_id}, {"_id": 0})
    if not ds:
        raise HTTPException(status_code=404, detail="Duty slip not found")
    
    if ds.get('status') == DutySlipStatus.SIGNED:
        raise HTTPException(status_code=400, detail="Duty slip already signed")
    
    if not ds.get('closing_km'):
        raise HTTPException(status_code=400, detail="Complete duty slip with closing KM before signing")
    
    # Lock the duty slip
    await db.duty_slips.update_one(
        {"id": slip_id},
        {"$set": {
            "status": DutySlipStatus.SIGNED,
            "passenger_signature": sign_data.passenger_signature,
            "signed_by": sign_data.signed_by,
            "signed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Mark trip as completed
    await db.duties.update_one(
        {"id": ds['trip_id']},
        {"$set": {"status": TripStatus.COMPLETED, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Duty slip signed and locked"}

@api_router.get("/duty-slips/trip/{trip_id}")
async def get_duty_slip_by_trip(trip_id: str, current_user: User = Depends(get_current_user)):
    ds = await db.duty_slips.find_one({"trip_id": trip_id}, {"_id": 0})
    if not ds:
        return {"duty_slip": None}
    
    ds['date'] = datetime.fromisoformat(ds['date']) if isinstance(ds['date'], str) else ds['date']
    if ds.get('start_time'):
        ds['start_time'] = datetime.fromisoformat(ds['start_time']) if isinstance(ds['start_time'], str) else ds['start_time']
    if ds.get('end_time'):
        ds['end_time'] = datetime.fromisoformat(ds['end_time']) if isinstance(ds['end_time'], str) else ds['end_time']
    if ds.get('signed_at'):
        ds['signed_at'] = datetime.fromisoformat(ds['signed_at']) if isinstance(ds['signed_at'], str) else ds['signed_at']
    ds['created_at'] = datetime.fromisoformat(ds['created_at']) if isinstance(ds['created_at'], str) else ds['created_at']
    ds['updated_at'] = datetime.fromisoformat(ds['updated_at']) if isinstance(ds['updated_at'], str) else ds['updated_at']
    
    return {"duty_slip": DutySlip(**ds)}

# Generate Invoice from Duty Slips (1-click)
@api_router.post("/invoices/generate-from-slips")
async def generate_invoice_from_slips(
    client_id: str,
    billing_period_start: datetime,
    billing_period_end: datetime,
    extra_charges: Optional[List[dict]] = None,
    gst_percentage: float = 18.0,
    due_days: int = 30,
    current_user: User = Depends(get_current_user)
):
    # Find all signed duty slips for this client in the billing period
    duty_slips = await db.duty_slips.find({
        "client_id": client_id,
        "status": DutySlipStatus.SIGNED,
        "date": {
            "$gte": billing_period_start.isoformat(),
            "$lte": billing_period_end.isoformat()
        }
    }, {"_id": 0}).to_list(1000)
    
    if not duty_slips:
        raise HTTPException(status_code=400, detail="No signed duty slips found for this period")
    
    duty_slip_ids = [ds['id'] for ds in duty_slips]
    
    # Get active contract for client
    contract = await db.contracts.find_one({
        "client_id": client_id,
        "is_active": True,
        "start_date": {"$lte": billing_period_end.isoformat()},
        "end_date": {"$gte": billing_period_start.isoformat()}
    }, {"_id": 0})
    
    contract_id = contract['id'] if contract else None
    
    # Create invoice
    invoice_data = InvoiceCreate(
        client_id=client_id,
        contract_id=contract_id,
        duty_slip_ids=duty_slip_ids,
        billing_period_start=billing_period_start,
        billing_period_end=billing_period_end,
        extra_charges=extra_charges or [],
        gst_percentage=gst_percentage,
        due_days=due_days
    )
    
    return await create_invoice(invoice_data, current_user)
    
    return invoice



# ==================== PRICING ENGINE API ENDPOINTS ====================

# Services Management
@api_router.get("/services", response_model=List[Service])
async def get_services(current_user: User = Depends(get_current_user)):
    services = await db.services.find({}, {"_id": 0}).to_list(1000)
    for s in services:
        s['created_at'] = datetime.fromisoformat(s['created_at']) if isinstance(s['created_at'], str) else s['created_at']
    return services

@api_router.post("/services", response_model=Service)
async def create_service(service_data: ServiceCreate, current_user: User = Depends(get_current_user)):
    service = Service(**service_data.model_dump())
    doc = service.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.services.insert_one(doc)
    return service

# Pricing Rules Management
@api_router.get("/pricing-rules", response_model=List[PricingRule])
async def get_pricing_rules(current_user: User = Depends(get_current_user)):
    rules = await db.pricing_rules.find({}, {"_id": 0}).to_list(1000)
    for r in rules:
        r['created_at'] = datetime.fromisoformat(r['created_at']) if isinstance(r['created_at'], str) else r['created_at']
    return rules

@api_router.post("/pricing-rules", response_model=PricingRule)
async def create_pricing_rule(rule_data: PricingRuleCreate, current_user: User = Depends(get_current_user)):
    rule = PricingRule(**rule_data.model_dump())
    doc = rule.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.pricing_rules.insert_one(doc)
    return rule

# Additional Charges Management
@api_router.get("/additional-charges", response_model=List[AdditionalCharge])
async def get_additional_charges(current_user: User = Depends(get_current_user)):
    charges = await db.additional_charges.find({}, {"_id": 0}).to_list(1000)
    for c in charges:
        c['created_at'] = datetime.fromisoformat(c['created_at']) if isinstance(c['created_at'], str) else c['created_at']
    return charges

@api_router.post("/additional-charges", response_model=AdditionalCharge)
async def create_additional_charge(charge_data: AdditionalChargeCreate, current_user: User = Depends(get_current_user)):
    charge = AdditionalCharge(**charge_data.model_dump())
    doc = charge.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.additional_charges.insert_one(doc)
    return charge

# Rate Cards Management
@api_router.get("/rate-cards", response_model=List[RateCard])
async def get_rate_cards(current_user: User = Depends(get_current_user)):
    rate_cards = await db.rate_cards.find({}, {"_id": 0}).to_list(1000)
    for rc in rate_cards:
        rc['created_at'] = datetime.fromisoformat(rc['created_at']) if isinstance(rc['created_at'], str) else rc['created_at']
        rc['updated_at'] = datetime.fromisoformat(rc['updated_at']) if isinstance(rc['updated_at'], str) else rc['updated_at']
    return rate_cards

@api_router.post("/rate-cards", response_model=RateCard)
async def create_rate_card(rate_card_data: RateCardCreate, current_user: User = Depends(get_current_user)):
    rate_card = RateCard(**rate_card_data.model_dump())
    doc = rate_card.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.rate_cards.insert_one(doc)
    return rate_card

@api_router.get("/rate-cards/client/{client_id}", response_model=RateCard)
async def get_client_rate_card(client_id: str, current_user: User = Depends(get_current_user)):
    rate_card = await db.rate_cards.find_one({"client_id": client_id, "is_active": True}, {"_id": 0})
    if not rate_card:
        raise HTTPException(status_code=404, detail="Rate card not found for this client")
    rate_card['created_at'] = datetime.fromisoformat(rate_card['created_at'])
    rate_card['updated_at'] = datetime.fromisoformat(rate_card['updated_at'])
    return RateCard(**rate_card)

# Pricing Calculator
@api_router.post("/calculate-pricing")
async def calculate_pricing(
    client_id: str,
    pickup: str,
    dropoff: str,
    vehicle_type: VehicleType,
    trip_type: TripType,
    distance_km: Optional[float] = None,
    duration_hours: Optional[float] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Calculate pricing based on client's rate card and trip details
    """
    # Get client's rate card
    rate_card = await db.rate_cards.find_one({"client_id": client_id, "is_active": True}, {"_id": 0})
    if not rate_card:
        return {"error": "No rate card found for client", "estimated_cost": 0}
    
    # Get pricing rules
    pricing_rules = []
    for rule_id in rate_card.get('pricing_rules', []):
        rule = await db.pricing_rules.find_one({"id": rule_id}, {"_id": 0})
        if rule and rule['vehicle_type'] == vehicle_type:
            pricing_rules.append(rule)
    
    if not pricing_rules:
        return {"error": "No pricing rules found", "estimated_cost": 0}
    
    # Try route-based pricing first
    for rule in pricing_rules:
        if rule['pricing_type'] == PricingType.ROUTE_BASED:
            if rule.get('route_from') and rule.get('route_to'):
                if (pickup.lower() in rule['route_from'].lower() and dropoff.lower() in rule['route_to'].lower()):
                    if trip_type == TripType.ROUND_TRIP and rule.get('round_trip_price'):
                        return {
                            "estimated_cost": rule['round_trip_price'],
                            "pricing_type": "ROUTE_BASED",
                            "breakdown": {
                                "base_fare": rule['round_trip_price'],
                                "trip_type": "Round Trip"
                            }
                        }
                    elif rule.get('one_way_price'):
                        return {
                            "estimated_cost": rule['one_way_price'],
                            "pricing_type": "ROUTE_BASED",
                            "breakdown": {
                                "base_fare": rule['one_way_price'],
                                "trip_type": "One Way"
                            }
                        }
    
    # Try time-based package
    for rule in pricing_rules:
        if rule['pricing_type'] == PricingType.TIME_BASED:
            if rule.get('base_fare') and duration_hours and distance_km:
                base_fare = rule['base_fare']
                extra_charges = 0
                
                if duration_hours > rule.get('package_hours', 0):
                    extra_hours = duration_hours - rule['package_hours']
                    extra_charges += extra_hours * rule.get('extra_hour_charge', 0)
                
                if distance_km > rule.get('package_km', 0):
                    extra_km = distance_km - rule['package_km']
                    extra_charges += extra_km * rule.get('extra_km_charge_package', 0)
                
                return {
                    "estimated_cost": base_fare + extra_charges,
                    "pricing_type": "TIME_BASED",
                    "breakdown": {
                        "base_fare": base_fare,
                        "extra_charges": extra_charges,
                        "package": f"{rule.get('package_hours')}hr/{rule.get('package_km')}km"
                    }
                }
    
    # Fallback to per KM pricing
    for rule in pricing_rules:
        if rule['pricing_type'] == PricingType.PER_KM:
            if distance_km and rule.get('rate_per_km'):
                min_km = rule.get('minimum_km', 0)
                billable_km = max(distance_km, min_km)
                cost = billable_km * rule['rate_per_km']
                
                return {
                    "estimated_cost": cost,
                    "pricing_type": "PER_KM",
                    "breakdown": {
                        "rate_per_km": rule['rate_per_km'],
                        "km_charged": billable_km,
                        "minimum_km": min_km
                    }
                }
    
    return {"error": "No applicable pricing found", "estimated_cost": 0}


# ==================== CORPORATE CUSTOMER API ENDPOINTS ====================

# Corporate Authentication
@api_router.post("/corporate/auth/register", response_model=CorporateUser)
async def corporate_register(user_data: CorporateUserCreate):
    existing = await db.corporate_users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Verify client exists
    client = await db.clients.find_one({"id": user_data.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    user = CorporateUser(
        email=user_data.email,
        name=user_data.name,
        client_id=user_data.client_id,
        role=user_data.role,
        department=user_data.department
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['password'] = get_password_hash(user_data.password)
    
    await db.corporate_users.insert_one(doc)
    return user

@api_router.post("/corporate/auth/login")
async def corporate_login(credentials: CorporateUserLogin):
    user_doc = await db.corporate_users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token({"sub": user_doc['id'], "type": "corporate"})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": CorporateUser(**user_doc).model_dump()
    }

@api_router.get("/corporate/auth/me", response_model=CorporateUser)
async def get_corporate_me(current_user: CorporateUser = Depends(get_current_corporate_user)):
    return current_user

# Corporate Dashboard
@api_router.get("/corporate/dashboard/stats", response_model=CorporateDashboardStats)
async def get_corporate_dashboard_stats(current_user: CorporateUser = Depends(get_current_corporate_user)):
    total_bookings = await db.bookings.count_documents({"client_id": current_user.client_id})
    pending_bookings = await db.bookings.count_documents({
        "client_id": current_user.client_id,
        "status": BookingStatus.PENDING
    })
    active_trips = await db.bookings.count_documents({
        "client_id": current_user.client_id,
        "status": BookingStatus.IN_PROGRESS
    })
    total_employees = await db.employees.count_documents({
        "client_id": current_user.client_id,
        "is_active": True
    })
    
    # Calculate monthly cost from invoices
    from datetime import timedelta
    first_day_of_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    invoices = await db.invoices.find({
        "client_id": current_user.client_id,
        "invoice_date": {"$gte": first_day_of_month.isoformat()}
    }, {"_id": 0}).to_list(1000)
    monthly_cost = sum(inv.get('total_amount', 0) for inv in invoices)
    
    # Count this month's trips
    bookings_this_month = await db.bookings.count_documents({
        "client_id": current_user.client_id,
        "created_at": {"$gte": first_day_of_month.isoformat()}
    })
    
    return CorporateDashboardStats(
        total_bookings=total_bookings,
        pending_bookings=pending_bookings,
        active_trips=active_trips,
        total_employees=total_employees,
        monthly_cost=monthly_cost,
        this_month_trips=bookings_this_month
    )

# Employee Management
@api_router.get("/corporate/employees", response_model=List[Employee])
async def get_employees(current_user: CorporateUser = Depends(get_current_corporate_user)):
    if current_user.role == CorporateUserRole.FINANCE:
        raise HTTPException(status_code=403, detail="Finance users cannot access employee data")
    
    employees = await db.employees.find({
        "client_id": current_user.client_id
    }, {"_id": 0}).to_list(1000)
    
    for emp in employees:
        emp['created_at'] = datetime.fromisoformat(emp['created_at']) if isinstance(emp['created_at'], str) else emp['created_at']
    
    return employees

@api_router.post("/corporate/employees", response_model=Employee)
async def create_employee(emp_data: EmployeeCreate, current_user: CorporateUser = Depends(get_current_corporate_user)):
    if current_user.role not in [CorporateUserRole.ADMIN, CorporateUserRole.HR]:
        raise HTTPException(status_code=403, detail="Only Admin and HR can add employees")
    
    employee = Employee(
        client_id=current_user.client_id,
        **emp_data.model_dump()
    )
    
    doc = employee.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.employees.insert_one(doc)
    return employee

@api_router.get("/corporate/employees/{employee_id}", response_model=Employee)
async def get_employee(employee_id: str, current_user: CorporateUser = Depends(get_current_corporate_user)):
    if current_user.role == CorporateUserRole.FINANCE:
        raise HTTPException(status_code=403, detail="Finance users cannot access employee data")
    
    employee = await db.employees.find_one({
        "id": employee_id,
        "client_id": current_user.client_id
    }, {"_id": 0})
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    employee['created_at'] = datetime.fromisoformat(employee['created_at'])
    return Employee(**employee)

# Booking Management
@api_router.get("/corporate/bookings", response_model=List[Booking])
async def get_bookings(current_user: CorporateUser = Depends(get_current_corporate_user)):
    bookings = await db.bookings.find({
        "client_id": current_user.client_id
    }, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for booking in bookings:
        booking['created_at'] = datetime.fromisoformat(booking['created_at']) if isinstance(booking['created_at'], str) else booking['created_at']
        booking['updated_at'] = datetime.fromisoformat(booking['updated_at']) if isinstance(booking['updated_at'], str) else booking['updated_at']
        booking['pickup_time'] = datetime.fromisoformat(booking['pickup_time']) if isinstance(booking['pickup_time'], str) else booking['pickup_time']
    
    return bookings

@api_router.post("/corporate/bookings", response_model=Booking)
async def create_booking(booking_data: BookingCreate, current_user: CorporateUser = Depends(get_current_corporate_user)):
    if current_user.role == CorporateUserRole.VIEWER:
        raise HTTPException(status_code=403, detail="Viewers cannot create bookings")
    
    # Verify employee exists and belongs to this client
    employee = await db.employees.find_one({
        "id": booking_data.employee_id,
        "client_id": current_user.client_id
    }, {"_id": 0})
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Calculate estimated pricing
    estimated_cost = None
    pricing_rule_applied = None
    
    # Try to find rate card and calculate pricing
    rate_card = await db.rate_cards.find_one({"client_id": current_user.client_id, "is_active": True}, {"_id": 0})
    if rate_card and booking_data.vehicle_type_requested:
        # Get pricing rules
        for rule_id in rate_card.get('pricing_rules', []):
            rule = await db.pricing_rules.find_one({"id": rule_id}, {"_id": 0})
            if rule and rule['vehicle_type'] == booking_data.vehicle_type_requested:
                # Try route-based pricing first
                if rule['pricing_type'] == PricingType.ROUTE_BASED:
                    pickup_lower = booking_data.pickup_location.lower()
                    dropoff_lower = booking_data.dropoff_location.lower()
                    route_from = (rule.get('route_from') or '').lower()
                    route_to = (rule.get('route_to') or '').lower()
                    
                    if route_from and route_to and (route_from in pickup_lower or pickup_lower in route_from) and (route_to in dropoff_lower or dropoff_lower in route_to):
                        if booking_data.trip_type == TripType.ROUND_TRIP and rule.get('round_trip_price'):
                            estimated_cost = rule['round_trip_price']
                            pricing_rule_applied = rule_id
                            break
                        elif rule.get('one_way_price'):
                            estimated_cost = rule['one_way_price']
                            pricing_rule_applied = rule_id
                            break
                
                # Try time-based package
                elif rule['pricing_type'] == PricingType.TIME_BASED:
                    if rule.get('base_fare'):
                        estimated_cost = rule['base_fare']
                        pricing_rule_applied = rule_id
                        break
                
                # Try per KM pricing
                elif rule['pricing_type'] == PricingType.PER_KM:
                    if rule.get('rate_per_km'):
                        min_km = rule.get('minimum_km', 0)
                        estimated_cost = min_km * rule['rate_per_km']
                        pricing_rule_applied = rule_id
                        break
    
    # Build passengers list
    all_passengers = [booking_data.employee_id]
    if booking_data.passengers:
        all_passengers.extend(booking_data.passengers)
    
    booking = Booking(
        client_id=current_user.client_id,
        employee_id=booking_data.employee_id,
        booking_type=booking_data.booking_type,
        trip_type=booking_data.trip_type,
        pickup_location=booking_data.pickup_location,
        dropoff_location=booking_data.dropoff_location,
        pickup_time=booking_data.pickup_time,
        return_time=booking_data.return_time,
        passenger_name=employee['name'],
        passenger_phone=employee['phone'],
        passengers=booking_data.passengers or [],
        recurring_type=booking_data.recurring_type,
        recurring_days=booking_data.recurring_days or [],
        recurring_end_date=booking_data.recurring_end_date,
        vehicle_type_requested=booking_data.vehicle_type_requested,
        service_type=booking_data.service_type,
        estimated_cost=estimated_cost,
        pricing_rule_applied=pricing_rule_applied,
        cost_center=booking_data.cost_center or employee.get('cost_center'),
        notes=booking_data.notes,
        created_by=current_user.id
    )
    
    doc = booking.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    doc['pickup_time'] = doc['pickup_time'].isoformat()
    if doc.get('return_time'):
        doc['return_time'] = doc['return_time'].isoformat()
    if doc.get('recurring_end_date'):
        doc['recurring_end_date'] = doc['recurring_end_date'].isoformat()
    
    await db.bookings.insert_one(doc)
    
    # Build notes for duty
    duty_notes_parts = [f"Booking ID: {booking.id}"]
    if booking.cost_center:
        duty_notes_parts.append(f"Cost Center: {booking.cost_center}")
    if booking.trip_type == TripType.ROUND_TRIP:
        duty_notes_parts.append("Round Trip")
    if booking.vehicle_type_requested:
        duty_notes_parts.append(f"Vehicle: {booking.vehicle_type_requested}")
    if booking.service_type:
        duty_notes_parts.append(f"Service: {booking.service_type}")
    if booking_data.notes:
        duty_notes_parts.append(booking_data.notes)
    
    # AUTO-CREATE DUTY: When corporate creates booking, automatically create duty in admin panel
    duty = Duty(
        client_id=current_user.client_id,
        pickup_location=booking_data.pickup_location,
        dropoff_location=booking_data.dropoff_location,
        pickup_time=booking_data.pickup_time,
        passenger_name=employee['name'],
        passenger_phone=employee['phone'],
        notes=" | ".join(duty_notes_parts)
    )
    
    duty_doc = duty.model_dump()
    duty_doc['created_at'] = duty_doc['created_at'].isoformat()
    duty_doc['updated_at'] = duty_doc['updated_at'].isoformat()
    duty_doc['pickup_time'] = duty_doc['pickup_time'].isoformat()
    
    await db.duties.insert_one(duty_doc)
    
    # Link duty to booking
    await db.bookings.update_one(
        {"id": booking.id},
        {"$set": {"duty_id": duty.id, "status": BookingStatus.CONFIRMED}}
    )
    
    return booking

# Corporate Pricing Estimate Endpoint
class PricingEstimateRequest(BaseModel):
    pickup_location: str
    dropoff_location: str
    trip_type: TripType = TripType.ONE_WAY
    vehicle_type_requested: Optional[VehicleType] = None

@api_router.post("/corporate/estimate-pricing")
async def corporate_estimate_pricing(
    request: PricingEstimateRequest,
    current_user: CorporateUser = Depends(get_current_corporate_user)
):
    """
    Get pricing estimate for corporate user based on their client's rate card
    """
    rate_card = await db.rate_cards.find_one({"client_id": current_user.client_id, "is_active": True}, {"_id": 0})
    if not rate_card:
        return {"estimated_cost": None, "message": "No rate card configured for your company"}
    
    if not request.vehicle_type_requested:
        return {"estimated_cost": None, "message": "Please select a vehicle type for pricing estimate"}
    
    # Get pricing rules
    for rule_id in rate_card.get('pricing_rules', []):
        rule = await db.pricing_rules.find_one({"id": rule_id}, {"_id": 0})
        if rule and rule['vehicle_type'] == request.vehicle_type_requested:
            # Try route-based pricing first
            if rule['pricing_type'] == PricingType.ROUTE_BASED:
                pickup_lower = request.pickup_location.lower()
                dropoff_lower = request.dropoff_location.lower()
                route_from = (rule.get('route_from') or '').lower()
                route_to = (rule.get('route_to') or '').lower()
                
                if route_from and route_to and (route_from in pickup_lower or pickup_lower in route_from) and (route_to in dropoff_lower or dropoff_lower in route_to):
                    if request.trip_type == TripType.ROUND_TRIP and rule.get('round_trip_price'):
                        return {
                            "estimated_cost": rule['round_trip_price'],
                            "pricing_type": "ROUTE_BASED",
                            "vehicle_type": request.vehicle_type_requested,
                            "message": f"Route-based pricing: {rule.get('route_from')} → {rule.get('route_to')} (Round Trip)"
                        }
                    elif rule.get('one_way_price'):
                        return {
                            "estimated_cost": rule['one_way_price'],
                            "pricing_type": "ROUTE_BASED",
                            "vehicle_type": request.vehicle_type_requested,
                            "message": f"Route-based pricing: {rule.get('route_from')} → {rule.get('route_to')} (One Way)"
                        }
            
            # Try time-based package
            elif rule['pricing_type'] == PricingType.TIME_BASED:
                if rule.get('base_fare'):
                    return {
                        "estimated_cost": rule['base_fare'],
                        "pricing_type": "TIME_BASED",
                        "vehicle_type": request.vehicle_type_requested,
                        "message": f"Package: {rule.get('package_hours')}hr / {rule.get('package_km')}km"
                    }
            
            # Try per KM pricing
            elif rule['pricing_type'] == PricingType.PER_KM:
                if rule.get('rate_per_km'):
                    min_km = rule.get('minimum_km', 0)
                    estimated = min_km * rule['rate_per_km']
                    return {
                        "estimated_cost": estimated,
                        "pricing_type": "PER_KM",
                        "vehicle_type": request.vehicle_type_requested,
                        "message": f"₹{rule['rate_per_km']}/km (Minimum {min_km}km)"
                    }
    
    return {"estimated_cost": None, "message": "No pricing rule found for selected vehicle type"}

@api_router.get("/corporate/bookings/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str, current_user: CorporateUser = Depends(get_current_corporate_user)):
    booking = await db.bookings.find_one({
        "id": booking_id,
        "client_id": current_user.client_id
    }, {"_id": 0})
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    booking['created_at'] = datetime.fromisoformat(booking['created_at'])
    booking['updated_at'] = datetime.fromisoformat(booking['updated_at'])
    booking['pickup_time'] = datetime.fromisoformat(booking['pickup_time'])
    
    return Booking(**booking)

# Live Tracking (for corporate users)
@api_router.get("/corporate/tracking/active")
async def get_active_tracking(current_user: CorporateUser = Depends(get_current_corporate_user)):
    # Get active bookings
    active_bookings = await db.bookings.find({
        "client_id": current_user.client_id,
        "status": {"$in": [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS]}
    }, {"_id": 0}).to_list(1000)
    
    result = []
    for booking in active_bookings:
        booking['created_at'] = datetime.fromisoformat(booking['created_at'])
        booking['updated_at'] = datetime.fromisoformat(booking['updated_at'])
        booking['pickup_time'] = datetime.fromisoformat(booking['pickup_time'])
        
        # Get vehicle and driver info if assigned
        vehicle_info = None
        driver_info = None
        
        if booking.get('vehicle_id'):
            vehicle = await db.vehicles.find_one({"id": booking['vehicle_id']}, {"_id": 0})
            if vehicle:
                vehicle_info = {
                    "registration": vehicle['registration_number'],
                    "type": vehicle['vehicle_type'],
                    "model": f"{vehicle['manufacturer']} {vehicle['model']}",
                    "location": vehicle.get('current_location')
                }
        
        if booking.get('driver_id'):
            driver = await db.drivers.find_one({"id": booking['driver_id']}, {"_id": 0})
            if driver:
                driver_info = {
                    "name": driver['name'],
                    "phone": driver['phone']
                }
        
        result.append({
            "booking": Booking(**booking).model_dump(),
            "vehicle": vehicle_info,
            "driver": driver_info
        })
    
    return result

# Invoices (Read-only for corporate users)
@api_router.get("/corporate/invoices")
async def get_corporate_invoices(current_user: CorporateUser = Depends(get_current_corporate_user)):
    invoices = await db.invoices.find({
        "client_id": current_user.client_id
    }, {"_id": 0}).to_list(1000)
    
    for inv in invoices:
        inv['invoice_date'] = datetime.fromisoformat(inv['invoice_date']) if isinstance(inv['invoice_date'], str) else inv['invoice_date']
        inv['due_date'] = datetime.fromisoformat(inv['due_date']) if isinstance(inv['due_date'], str) else inv['due_date']
        inv['created_at'] = datetime.fromisoformat(inv['created_at']) if isinstance(inv['created_at'], str) else inv['created_at']
    
    return invoices

# Reports
@api_router.get("/corporate/reports/trips")
async def get_trips_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: CorporateUser = Depends(get_current_corporate_user)
):
    query = {"client_id": current_user.client_id}
    
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = end_date
        else:
            query["created_at"] = {"$lte": end_date}
    
    bookings = await db.bookings.find(query, {"_id": 0}).to_list(1000)
    
    # Group by employee
    employee_stats = {}
    for booking in bookings:
        emp_id = booking['employee_id']
        if emp_id not in employee_stats:
            employee = await db.employees.find_one({"id": emp_id}, {"_id": 0})
            employee_stats[emp_id] = {
                "employee_name": employee['name'] if employee else "Unknown",
                "employee_id": emp_id,
                "total_trips": 0,
                "cost_center": employee.get('cost_center') if employee else None
            }
        employee_stats[emp_id]["total_trips"] += 1
    
    return {
        "total_bookings": len(bookings),
        "by_employee": list(employee_stats.values()),
        "by_status": {
            "pending": len([b for b in bookings if b['status'] == BookingStatus.PENDING]),
            "confirmed": len([b for b in bookings if b['status'] == BookingStatus.CONFIRMED]),
            "completed": len([b for b in bookings if b['status'] == BookingStatus.COMPLETED]),
            "cancelled": len([b for b in bookings if b['status'] == BookingStatus.CANCELLED])
        }
    }

# Bulk Upload Endpoints
@api_router.post("/corporate/employees/bulk-upload")
async def bulk_upload_employees(current_user: CorporateUser = Depends(get_current_corporate_user)):
    """
    Bulk upload employees from CSV
    Expected CSV format: employee_id,name,email,phone,department,cost_center,default_pickup,default_dropoff
    """
    if current_user.role not in [CorporateUserRole.ADMIN, CorporateUserRole.HR]:
        raise HTTPException(status_code=403, detail="Only Admin and HR can bulk upload employees")
    
    from fastapi import File, UploadFile
    import csv
    import io
    
    # This endpoint expects file in request, but we'll return the structure for frontend
    return {"message": "Upload CSV with format: employee_id,name,email,phone,department,cost_center,default_pickup,default_dropoff"}

@api_router.post("/corporate/employees/bulk-create")
async def bulk_create_employees(employees_data: List[EmployeeCreate], current_user: CorporateUser = Depends(get_current_corporate_user)):
    """
    Create multiple employees at once
    """
    if current_user.role not in [CorporateUserRole.ADMIN, CorporateUserRole.HR]:
        raise HTTPException(status_code=403, detail="Only Admin and HR can bulk create employees")
    
    created_employees = []
    errors = []
    
    for idx, emp_data in enumerate(employees_data):
        try:
            employee = Employee(
                client_id=current_user.client_id,
                **emp_data.model_dump()
            )
            
            doc = employee.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            
            await db.employees.insert_one(doc)
            created_employees.append(employee)
        except Exception as e:
            errors.append({"row": idx + 1, "error": str(e)})
    
    return {
        "created": len(created_employees),
        "failed": len(errors),
        "errors": errors
    }

@api_router.post("/corporate/bookings/bulk-create")
async def bulk_create_bookings(bookings_data: List[BookingCreate], current_user: CorporateUser = Depends(get_current_corporate_user)):
    """
    Create multiple bookings at once
    """
    if current_user.role == CorporateUserRole.VIEWER:
        raise HTTPException(status_code=403, detail="Viewers cannot create bookings")
    
    created_bookings = []
    errors = []
    
    for idx, booking_data in enumerate(bookings_data):
        try:
            # Verify employee exists
            employee = await db.employees.find_one({
                "id": booking_data.employee_id,
                "client_id": current_user.client_id
            }, {"_id": 0})
            
            if not employee:
                errors.append({"row": idx + 1, "error": f"Employee {booking_data.employee_id} not found"})
                continue
            
            booking = Booking(
                client_id=current_user.client_id,
                employee_id=booking_data.employee_id,
                booking_type=booking_data.booking_type,
                pickup_location=booking_data.pickup_location,
                dropoff_location=booking_data.dropoff_location,
                pickup_time=booking_data.pickup_time,
                passenger_name=employee['name'],
                passenger_phone=employee['phone'],
                cost_center=booking_data.cost_center or employee.get('cost_center'),
                notes=booking_data.notes,
                created_by=current_user.id
            )
            
            doc = booking.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['updated_at'] = doc['updated_at'].isoformat()
            doc['pickup_time'] = doc['pickup_time'].isoformat()
            
            await db.bookings.insert_one(doc)
            
            # Auto-create duty
            duty = Duty(
                client_id=current_user.client_id,
                pickup_location=booking_data.pickup_location,
                dropoff_location=booking_data.dropoff_location,
                pickup_time=booking_data.pickup_time,
                passenger_name=employee['name'],
                passenger_phone=employee['phone'],
                notes=f"Booking ID: {booking.id} | Cost Center: {booking.cost_center or 'N/A'}"
            )
            
            duty_doc = duty.model_dump()
            duty_doc['created_at'] = duty_doc['created_at'].isoformat()
            duty_doc['updated_at'] = duty_doc['updated_at'].isoformat()
            duty_doc['pickup_time'] = duty_doc['pickup_time'].isoformat()
            
            await db.duties.insert_one(duty_doc)
            
            # Link duty to booking
            await db.bookings.update_one(
                {"id": booking.id},
                {"$set": {"duty_id": duty.id, "status": BookingStatus.CONFIRMED}}
            )
            
            created_bookings.append(booking)
        except Exception as e:
            errors.append({"row": idx + 1, "error": str(e)})
    
    return {
        "created": len(created_bookings),
        "failed": len(errors),
        "errors": errors
    }

# Corporate Duty Slips (Read-Only)
@api_router.get("/corporate/duty-slips")
async def get_corporate_duty_slips(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: CorporateUser = Depends(get_current_corporate_user)
):
    query = {"client_id": current_user.client_id}
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in query:
            query["date"]["$lte"] = date_to
        else:
            query["date"] = {"$lte": date_to}
    
    duty_slips = await db.duty_slips.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for ds in duty_slips:
        ds['date'] = datetime.fromisoformat(ds['date']) if isinstance(ds['date'], str) else ds['date']
        if ds.get('start_time'):
            ds['start_time'] = datetime.fromisoformat(ds['start_time']) if isinstance(ds['start_time'], str) else ds['start_time']
        if ds.get('end_time'):
            ds['end_time'] = datetime.fromisoformat(ds['end_time']) if isinstance(ds['end_time'], str) else ds['end_time']
        if ds.get('signed_at'):
            ds['signed_at'] = datetime.fromisoformat(ds['signed_at']) if isinstance(ds['signed_at'], str) else ds['signed_at']
        ds['created_at'] = datetime.fromisoformat(ds['created_at']) if isinstance(ds['created_at'], str) else ds['created_at']
        ds['updated_at'] = datetime.fromisoformat(ds['updated_at']) if isinstance(ds['updated_at'], str) else ds['updated_at']
    return duty_slips

@api_router.get("/corporate/duty-slips/{slip_id}")
async def get_corporate_duty_slip(slip_id: str, current_user: CorporateUser = Depends(get_current_corporate_user)):
    ds = await db.duty_slips.find_one({"id": slip_id, "client_id": current_user.client_id}, {"_id": 0})
    if not ds:
        raise HTTPException(status_code=404, detail="Duty slip not found")
    
    ds['date'] = datetime.fromisoformat(ds['date']) if isinstance(ds['date'], str) else ds['date']
    if ds.get('start_time'):
        ds['start_time'] = datetime.fromisoformat(ds['start_time']) if isinstance(ds['start_time'], str) else ds['start_time']
    if ds.get('end_time'):
        ds['end_time'] = datetime.fromisoformat(ds['end_time']) if isinstance(ds['end_time'], str) else ds['end_time']
    if ds.get('signed_at'):
        ds['signed_at'] = datetime.fromisoformat(ds['signed_at']) if isinstance(ds['signed_at'], str) else ds['signed_at']
    ds['created_at'] = datetime.fromisoformat(ds['created_at']) if isinstance(ds['created_at'], str) else ds['created_at']
    ds['updated_at'] = datetime.fromisoformat(ds['updated_at']) if isinstance(ds['updated_at'], str) else ds['updated_at']
    
    return ds

# Corporate Monthly Summary
@api_router.get("/corporate/monthly-summary")
async def get_corporate_monthly_summary(
    year: int,
    month: int,
    current_user: CorporateUser = Depends(get_current_corporate_user)
):
    from calendar import monthrange
    
    start_date = datetime(year, month, 1, tzinfo=timezone.utc)
    last_day = monthrange(year, month)[1]
    end_date = datetime(year, month, last_day, 23, 59, 59, tzinfo=timezone.utc)
    
    # Get duty slips for the month
    duty_slips = await db.duty_slips.find({
        "client_id": current_user.client_id,
        "date": {
            "$gte": start_date.isoformat(),
            "$lte": end_date.isoformat()
        }
    }, {"_id": 0}).to_list(1000)
    
    total_trips = len(duty_slips)
    total_km = sum(ds.get('total_km', 0) or 0 for ds in duty_slips)
    signed_trips = len([ds for ds in duty_slips if ds.get('status') == DutySlipStatus.SIGNED])
    
    # Get invoices for the month
    invoices = await db.invoices.find({
        "client_id": current_user.client_id,
        "billing_period_start": {"$lte": end_date.isoformat()},
        "billing_period_end": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(100)
    
    total_payable = sum(inv.get('total_amount', 0) for inv in invoices)
    
    return {
        "year": year,
        "month": month,
        "total_trips": total_trips,
        "signed_trips": signed_trips,
        "total_km": total_km,
        "total_payable": total_payable,
        "invoices_count": len(invoices)
    }

# Corporate Contract View
@api_router.get("/corporate/contract")
async def get_corporate_contract(current_user: CorporateUser = Depends(get_current_corporate_user)):
    now = datetime.now(timezone.utc)
    contract = await db.contracts.find_one({
        "client_id": current_user.client_id,
        "is_active": True,
        "start_date": {"$lte": now.isoformat()},
        "end_date": {"$gte": now.isoformat()}
    }, {"_id": 0})
    
    if not contract:
        return {"message": "No active contract", "contract": None}
    
    contract['start_date'] = datetime.fromisoformat(contract['start_date'])
    contract['end_date'] = datetime.fromisoformat(contract['end_date'])
    contract['created_at'] = datetime.fromisoformat(contract['created_at'])
    contract['updated_at'] = datetime.fromisoformat(contract['updated_at'])
    
    return {"contract": contract}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
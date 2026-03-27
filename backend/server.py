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

class DutyStatus(str, Enum):
    CREATED = "CREATED"
    ASSIGNED = "ASSIGNED"
    ACCEPTED = "ACCEPTED"
    STARTED = "STARTED"
    COMPLETED = "COMPLETED"
    BILLED = "BILLED"
    CLOSED = "CLOSED"

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

class Duty(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    vehicle_id: Optional[str] = None
    driver_id: Optional[str] = None
    status: DutyStatus = DutyStatus.CREATED
    pickup_location: str
    dropoff_location: str
    pickup_time: datetime
    passenger_name: str
    passenger_phone: str
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DutyCreate(BaseModel):
    client_id: str
    pickup_location: str
    dropoff_location: str
    pickup_time: datetime
    passenger_name: str
    passenger_phone: str
    notes: Optional[str] = None

class DutyAssign(BaseModel):
    vehicle_id: str
    driver_id: str

class DutyStatusUpdate(BaseModel):
    status: DutyStatus

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    client_id: str
    duties: List[str]  # List of duty IDs
    line_items: List[dict] = []  # List of InvoiceLineItem dicts
    amount: float
    gst_amount: float
    total_amount: float
    status: InvoiceStatus = InvoiceStatus.DRAFT
    invoice_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    due_date: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InvoiceCreate(BaseModel):
    client_id: str
    duties: List[str]
    line_items: Optional[List[dict]] = []  # Will be InvoiceLineItemCreate dicts
    amount: float
    gst_percentage: float = 18.0
    due_days: int = 30

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
    
    cost_center: Optional[str] = None
    notes: Optional[str] = None
    duty_id: Optional[str] = None  # Linked duty created by admin
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
    
    # Update duty
    await db.duties.update_one(
        {"id": duty_id},
        {"$set": {
            "vehicle_id": assign_data.vehicle_id,
            "driver_id": assign_data.driver_id,
            "status": DutyStatus.ASSIGNED,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
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
    return invoices

@api_router.post("/invoices", response_model=Invoice)
async def create_invoice(invoice_data: InvoiceCreate, current_user: User = Depends(get_current_user)):
    # Generate invoice number
    count = await db.invoices.count_documents({}) + 1
    invoice_number = f"INV-{count:05d}"
    
    # Calculate amounts
    gst_amount = invoice_data.amount * (invoice_data.gst_percentage / 100)
    total_amount = invoice_data.amount + gst_amount
    
    # Calculate due date
    from datetime import timedelta
    invoice_date = datetime.now(timezone.utc)
    due_date = invoice_date + timedelta(days=invoice_data.due_days)
    
    invoice = Invoice(
        invoice_number=invoice_number,
        client_id=invoice_data.client_id,
        duties=invoice_data.duties,
        amount=invoice_data.amount,
        gst_amount=gst_amount,
        total_amount=total_amount,
        invoice_date=invoice_date,
        due_date=due_date
    )
    
    doc = invoice.model_dump()
    doc['invoice_date'] = doc['invoice_date'].isoformat()
    doc['due_date'] = doc['due_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.invoices.insert_one(doc)
    
    # Mark duties as billed
    await db.duties.update_many(
        {"id": {"$in": invoice_data.duties}},
        {"$set": {"status": DutyStatus.BILLED}}
    )
    
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
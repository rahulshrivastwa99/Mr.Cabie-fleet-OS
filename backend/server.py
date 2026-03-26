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
    pickup_location: str
    dropoff_location: str
    pickup_time: datetime
    passenger_name: str
    passenger_phone: str
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
    pickup_location: str
    dropoff_location: str
    pickup_time: datetime
    cost_center: Optional[str] = None
    notes: Optional[str] = None

class CorporateDashboardStats(BaseModel):
    total_bookings: int
    pending_bookings: int
    active_trips: int
    total_employees: int
    monthly_cost: float
    this_month_trips: int

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
    return booking

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
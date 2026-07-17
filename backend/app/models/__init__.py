"""Models package - exports all models"""
from .enums import *
from .user import User, UserCreate, UserLogin
from .vehicle import Vehicle, VehicleCreate, VehicleStatusUpdate
from .driver import (
    Driver, DriverCreate, DriverStatusUpdate,
    DriverOTPRequest, DriverOTPVerify,
    DriverLocationUpdate, DriverLocation
)
from .client import Client, ClientCreate
from .trip import (
    Trip, TripCreate, TripAssign, TripStatusUpdate, TripActionRequest,
    Duty, DutyCreate, DutyAssign, DutyStatusUpdate
)
from .duty_slip import DutySlip, DutySlipCreate, DutySlipComplete, DutySlipSign
from .contract import Contract, ContractCreate, VehicleRateCard, FixedRoutePackage, ExtraChargesConfig
from .invoice import Invoice, InvoiceCreate, ExtraChargeInput
from .corporate import (
    CorporateUser, CorporateUserCreate, CorporateUserLogin,
    CorporateUserUpdate, CorporatePasswordChange,
    Employee, EmployeeCreate, Booking, BookingCreate,
    CorporateDashboardStats
)
from .pricing import (
    Service, ServiceCreate, PricingRule, PricingRuleCreate,
    AdditionalCharge, AdditionalChargeCreate,
    RateCard, RateCardCreate, DashboardStats
)

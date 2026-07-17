"""All application enums"""
from enum import Enum


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
    ON_LEAVE = "ON_LEAVE"
    INACTIVE = "INACTIVE"


class TripStatus(str, Enum):
    CREATED = "CREATED"
    ASSIGNED = "ASSIGNED"
    ACCEPTED = "ACCEPTED"
    STARTED = "STARTED"
    COMPLETED = "COMPLETED"
    BILLED = "BILLED"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"


# Alias for backward compatibility
DutyStatus = TripStatus


class DutySlipStatus(str, Enum):
    DRAFT = "DRAFT"
    SIGNED = "SIGNED"
    DISPUTED = "DISPUTED"


class ContractType(str, Enum):
    FIXED_MONTHLY = "FIXED_MONTHLY"
    PER_KM = "PER_KM"
    PER_DAY = "PER_DAY"
    PACKAGE = "PACKAGE"
    ROUTE_BASED = "ROUTE_BASED"
    HYBRID = "HYBRID"


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
    ADMIN = "ADMIN"
    HR = "HR"
    FINANCE = "FINANCE"
    VIEWER = "VIEWER"


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
    PER_KM = "PER_KM"
    TIME_BASED = "TIME_BASED"
    ROUTE_BASED = "ROUTE_BASED"
    DAILY_RENTAL = "DAILY_RENTAL"
    CUSTOM = "CUSTOM"


class ServiceType(str, Enum):
    AIRPORT_TRANSFER = "AIRPORT_TRANSFER"
    LOCAL_DUTY = "LOCAL_DUTY"
    OUTSTATION = "OUTSTATION"
    EMPLOYEE_TRANSPORT = "EMPLOYEE_TRANSPORT"
    CUSTOM = "CUSTOM"

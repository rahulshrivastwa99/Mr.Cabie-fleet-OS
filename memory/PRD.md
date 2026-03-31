# Fleet OS - Product Requirements Document

## Overview
Fleet OS is a production-grade Fleet Operating System for B2B cab/fleet management companies. It consists of:
1. **Enterprise Web Platform (Admin Panel)** - For operations team
2. **Corporate Customer Dashboard** - For client companies
3. **Driver Mobile App** (Planned - Android/Flutter)
4. **Passenger Mobile App** (Planned - Android/iOS)

## Core Architecture
- **One Booking → Multiple Trips** (for recurring bookings)
- **One Trip → One Duty Slip** (STRICT 1:1 relationship)
- **Multiple Duty Slips → One Invoice** (based on billing cycle)

## User Personas
- **Fleet Admin** - Manages vehicles, drivers, trips, contracts, billing
- **Corporate HR/Admin** - Creates bookings for employees
- **Corporate Finance** - Views invoices and billing
- **Driver** (Future) - Accepts duties, navigation, trip management
- **Passenger/Employee** (Future) - Views trip details, live tracking

## Core Modules

### 1. Fleet & Vehicle Management (COMPLETE)
- Vehicle CRUD with type (SEDAN, SUV, HATCHBACK, EV, LUXURY)
- Vehicle status tracking (AVAILABLE, ON_DUTY, MAINTENANCE, INACTIVE)

### 2. Driver Management (COMPLETE)
- Driver CRUD with license, contact details
- Driver status tracking and availability

### 3. Trip Management (COMPLETE - Renamed from Duty)
- **Strict State Machine**: CREATED → ASSIGNED → ACCEPTED → STARTED → COMPLETED → BILLED → CLOSED
- Manual driver/vehicle assignment by admin
- Trip links to bookings and contracts

### 4. Duty Slip System (COMPLETE - NEW)
- **1:1 relationship with Trip** - Each trip generates exactly one duty slip
- **Meter Reading**: Opening KM, Closing KM, Total KM (auto-calculated)
- **Digital Signature**: Canvas-based signature capture (mandatory)
- **Status Flow**: DRAFT → SIGNED (locked after signature)
- **Important Note**: "Additional charges (Toll, Parking, Taxes, GST) will be added in final invoice"
- Admin: Full access, filters by date/client/driver
- Corporate: Read-only view, download PDF

### 5. Contract Management (COMPLETE - UPGRADED)
- **Multiple Contracts per Client** - Clients can have multiple active contracts
- **Contract Types**:
  - FIXED_MONTHLY: Fixed monthly amount with optional included days/KM
  - PER_KM: Rate per kilometer with optional minimum KM/day
  - PER_DAY: Daily rate billing
  - PACKAGE: e.g., 8hr/80km with extra hour/km rates
  - ROUTE_BASED: Fixed pricing for specific routes
  - HYBRID: Base monthly amount + usage rate per KM
- **Admin selects contract when assigning trip** (not during booking)
- **Default/Fallback Rates** for on-call trips without contract
- **Billing Cycle**: Weekly, Bi-Weekly, Monthly

### 6. Billing & Invoicing (COMPLETE - UPGRADED)
- **Invoice Generation from Duty Slips**:
  - Select client and view unbilled (signed) duty slips
  - Select which duty slips to include
  - Optionally select contract for pricing calculation
  - Add extra charges (Toll, Parking, Night charges, Driver allowance)
  - Configure GST % and payment due days
- **Invoice Editing** - Admin can edit at any time:
  - Line items (descriptions, amounts)
  - Extra charges (add/remove)
  - GST percentage
  - Auto-recalculates totals
- **Duty Slip Reconciliation** - Invoices show:
  - Duty slip IDs for easy matching
  - KM breakdown per slip
  - Billing period dates

### 7. Corporate Customer Dashboard (COMPLETE - UPGRADED)
- **Authentication**: Role-based (ADMIN, HR, FINANCE, VIEWER)
- **Employee Management**: CRUD with cost center assignment
- **Bookings**: Trip Type, Recurring, Vehicle Preference, Multi-Employee
  - **No estimated fare shown** (per business requirement)
- **Duty Slips View**: Read-only access to all company duty slips
- **Monthly Summary**: Total trips, signed slips, total KM, total payable
- **Active Contract View**: Current contract details
- **Invoices**: View with breakdown

### 8. Live Tracking (MOCKED)
- Requires Google Maps API integration

### 9. Notifications (MOCKED)
- Requires Firebase/Twilio integration

---

## Completed Work (as of Dec 27, 2025)

### Session 1-3: Base Architecture & Core Features
- FastAPI backend with MongoDB
- React frontend with Tailwind CSS + shadcn/ui
- Admin Panel: Fleet, Driver, Client, Billing management
- Corporate Dashboard: Bookings, Employees, Tracking, Invoices, Reports

### Session 4: Pricing Engine & Booking Upgrades
- Services, Pricing Rules, Rate Cards
- Corporate Booking Form with all advanced options
- Dynamic pricing calculation

### Session 5: Duty Slip System + Contract-Based Billing
- **Trip Model** (renamed from Duty) with contract_id and duty_slip_id
- **DutySlip Model** with KM tracking, signature, status
- **Contract Model** with 6 pricing types
- **Invoice Model** upgraded with duty_slip_ids, extra_charges, billing_period
- **Admin Pages**: TripManagement, DutySlips, ContractManagement
- **Corporate Pages**: CorporateDutySlips with monthly summary
- **APIs**: Full CRUD for contracts, duty slips, invoice generation

### Session 6: Admin Onboarding + Corporate Self-Service (Dec 31, 2025 - CURRENT)
- **Client Management Upgrade**:
  - Added tabs: "Clients" and "Corporate Users"
  - Corporate User creation form with role/department/password generation
  - Credentials display modal (email + password to share with client)
  - User count per client card
  - Delete user functionality
- **Admin Cancel Trip Feature**:
  - Added "Cancel Trip" button for trips not yet started (CREATED, ASSIGNED, ACCEPTED)
  - Button hidden for STARTED/COMPLETED/BILLED/CLOSED trips
  - Calls PATCH /api/duties/{id}/cancel
- **Corporate Password Change**:
  - Settings gear icon added to sidebar profile
  - Password change modal with current/new/confirm fields
  - Eye toggle icons for password visibility
  - Calls POST /api/corporate/auth/change-password

---

## Upcoming Tasks (P0 - High Priority)
1. **Driver Mobile App (Flutter/Android)**
   - Secure login
   - Duty list and accept/reject
   - Duty Slip creation (opening KM entry)
   - Trip completion (closing KM entry)
   - Signature capture from passenger
   - Real-time location sharing

2. **Passenger Mobile App (Flutter/iOS + Android)**
   - Trip details view
   - Live tracking
   - SOS feature
   - Push notifications
   - Sign duty slip digitally

3. **Real Notifications Integration**
   - Firebase Cloud Messaging
   - Twilio SMS/WhatsApp

---

## Future Tasks (P2 - Backlog)
1. **Auto Assignment Engine** - Proximity-based driver assignment
2. **Deep Analytics** - Fleet utilization, driver performance, cost analysis
3. **Backend Refactoring** - Split server.py (2800+ lines) into modular routers (/app/backend/routes/)
4. **Invoice PDF Download** - Generate downloadable PDF invoices

---

## Test Credentials
- **Admin Portal**: admin@fleetOS.com / password123
- **Corporate Portal**: hr@techcorp.in / password123

## Technical Stack
- **Backend**: FastAPI (Python 3.11), MongoDB
- **Frontend**: React 18, Tailwind CSS, shadcn/ui
- **Mobile (Planned)**: Flutter

## Key API Endpoints
- Admin: `/api/trips`, `/api/duty-slips`, `/api/contracts`, `/api/invoices`, `/api/admin/onboard-corporate-user`, `/api/duties/{id}/cancel`
- Corporate: `/api/corporate/duty-slips`, `/api/corporate/monthly-summary`, `/api/corporate/auth/change-password`
- Invoice Generation: `/api/invoices/generate-from-slips`

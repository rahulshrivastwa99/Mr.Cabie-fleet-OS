# Fleet OS - Product Requirements Document

## Overview
Fleet OS is a production-grade Fleet Operating System for B2B cab/fleet management companies. It consists of:
1. **Enterprise Web Platform (Admin Panel)** - For operations team
2. **Corporate Customer Dashboard** - For client companies
3. **Driver Mobile App** (Flutter/Android) - **IN DEVELOPMENT**
4. **Passenger Mobile App** (Planned - Android/iOS)

## Core Architecture
- **One Booking → Multiple Trips** (for recurring bookings)
- **One Trip → One Duty Slip** (STRICT 1:1 relationship)
- **Multiple Duty Slips → One Invoice** (based on billing cycle)

## User Personas
- **Fleet Admin** - Manages vehicles, drivers, trips, contracts, billing
- **Corporate HR/Admin** - Creates bookings for employees
- **Corporate Finance** - Views invoices and billing
- **Driver** - Accepts duties, navigation, trip management (**APP READY**)
- **Passenger/Employee** (Future) - Views trip details, live tracking

## Core Modules

### 1. Fleet & Vehicle Management (COMPLETE)
- Vehicle CRUD with type (SEDAN, SUV, HATCHBACK, EV, LUXURY)
- Vehicle status tracking (AVAILABLE, ON_DUTY, MAINTENANCE, INACTIVE)

### 2. Driver Management (COMPLETE + ENHANCED)
- Driver CRUD with license, contact details
- **NEW**: Driver status management (AVAILABLE, ON_DUTY, OFF_DUTY, ON_LEAVE, INACTIVE)
- **NEW**: Admin can manually override driver status
- **NEW**: Location tracking column with GPS status

### 3. Trip Management (COMPLETE - Renamed from Duty)
- **Strict State Machine**: CREATED → ASSIGNED → ACCEPTED → STARTED → COMPLETED → BILLED → CLOSED
- Manual driver/vehicle assignment by admin
- Trip links to bookings and contracts
- **NEW**: Admin Cancel Trip feature (before trip starts)

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

### Session 6: Admin Onboarding + Corporate Self-Service (Dec 31, 2025)
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

### Session 7: Driver Mobile App + Live Tracking (Dec 31, 2025)
- **Driver Mobile App (Flutter - Code Complete)**
  - `/app/driver_app/` - Full Flutter project structure
  - OTP-based authentication (phone number login)
  - Trip list with accept/reject
  - Start trip (opening KM entry)
  - Complete trip (closing KM, passenger signature)
  - Real-time location broadcasting (every 30 seconds)
  - Screens: Login, OTP, Home, Trip List, Trip Detail, Active Trip, Complete Trip with Signature

- **Backend Driver APIs (COMPLETE)**
  - POST `/api/driver/auth/send-otp` - Send OTP to driver phone
  - POST `/api/driver/auth/verify-otp` - Verify and get JWT token
  - GET `/api/driver/auth/me` - Get driver profile
  - GET `/api/driver/trips` - Get assigned trips
  - PATCH `/api/driver/trips/{id}/accept` - Accept trip
  - PATCH `/api/driver/trips/{id}/reject` - Reject trip
  - POST `/api/driver/trips/{id}/start` - Start trip (create duty slip)
  - POST `/api/driver/trips/{id}/complete` - Complete trip (close duty slip)
  - POST `/api/driver/location` - Update driver location

- **Live Tracking (COMPLETE)**
  - Admin Dashboard: View all driver locations with GPS status
  - Driver status summary cards (Available, On Duty, Off Duty, On Leave, Inactive)
  - Admin can manually change driver status with reason
  - Corporate Dashboard: View only assigned driver locations during active trips
  - Google Maps placeholder (requires API key to enable map view)

- **Driver/Vehicle Status Management**
  - New driver status: ON_LEAVE (for holidays)
  - PATCH `/api/admin/drivers/{id}/status` - Admin update driver status
  - PATCH `/api/admin/vehicles/{id}/status` - Admin update vehicle status
  - Validation: Cannot set to ON_LEAVE/INACTIVE if driver has active trips

### Session 8: Advanced Features - Contract PDF Extraction, Manual Pricing, Trip Filters (Apr 5, 2026)
- **Manual Pricing in Invoice Generation** (COMPLETE):
  - Itemized breakdown UI: Base Fare, Toll, Parking, Driver Allowance, Extras
  - Custom line items with "+ Add Custom Item" button
  - Live subtotal calculation before GST
  - Toggle: "Enable itemized manual pricing" checkbox when no contract selected
  - Backend supports `is_manual_pricing`, `manual_base_fare`, `manual_toll`, `manual_parking`, `manual_driver_allowance`, `manual_extras`, `manual_line_items`
  
- **Contract PDF Upload with AI Rate Extraction** (COMPLETE):
  - **NEW: File Upload Option** - "Choose File" button for direct PDF upload
  - URL option remains available for remote PDFs
  - Uses `emergentintegrations` library with Gemini for AI extraction
  - Auto-populates: Vehicle Rate Cards, Fixed Routes, Extra Charges Config
  - APIs: 
    - `POST /api/contracts/extract-from-upload` (file upload)
    - `POST /api/contracts/extract-from-pdf` (URL)
  - Tested with real quotation (Perfetti Van Melle) - extracted 4 vehicle categories, 3 routes
  
- **Trip Management Filters** (COMPLETE):
  - Quick filters: All Trips, Today's Trips, Ongoing, Unassigned, Completed Today, Upcoming (Next 7 Days)
  - Dropdown filters: Company, Status, Sort By
  - Search input for passenger, phone, location
  - "More Filters" panel with Driver and Date Range filters
  - "Clear All" button to reset filters

### Session 9: Real-World Operational Flexibility (May 21, 2026)
- **Contract Enhancements** (COMPLETE):
  - Vehicle Rate Cards: Added **"Driver Allowance/Day"** field for local packages (₹/day)
  - Fixed Routes: Added **"Max KM Included"** field to specify included kilometers per route
  
- **Billing - Manual Invoice Creation WITHOUT Duty Slips** (COMPLETE):
  - **Problem Solved**: Clients sometimes forget to sign duty slips - now admin can still invoice
  - **MANUAL TRIP ENTRIES** section when manual pricing enabled
  - Add Trip button adds entry form: Date, Passenger Name, Pickup, Dropoff, KM, Description, Amount
  - Manual Trips Total calculated and displayed separately
  - Invoice can be generated with ONLY manual trip entries (no duty slips required)
  - Backend stores `manual_trip_entries` and `is_manual_invoice` flag for audit trail
  - Existing duty slip-based invoice generation still works

### Session 10: Driver Web Portal + Integrations (May 21, 2026 - CURRENT)
- **Driver Web Portal at /driver** (COMPLETE):
  - Mobile-first dark theme design
  - OTP Login via **Twilio SMS** (real SMS integration)
  - Driver must be pre-registered by Admin
  - Dashboard with trip stats (New, Active, Done)
  - Trip cards with Accept/Reject/Start/Continue actions
  - Real-time location tracking (sends to backend every 30s)
  - Active Trip page with:
    - Passenger info + call button
    - Pickup/Drop locations with "Navigate" (opens Google Maps)
    - Start KM / End KM entry
    - Complete Trip triggers Duty Slip modal

- **Enterprise-Grade Duty Slip Workflow** (COMPLETE):
  - **Traveller Name Field** (mandatory) - filled by traveller for legal record
  - **Digital Signature Pad** - touch/mouse drawing
  - Trip summary (Start KM, End KM, Total Distance, Date)
  - Legal warning before submission
  - Signature stored as Base64 in database
  - `traveller_name` stored separately for audit trail

- **Google Maps Integration** (COMPLETE):
  - **Places Autocomplete** in all booking forms
  - Corporate Bookings: Pickup/Dropoff with lat/lng capture
  - Admin Trip Creation: Pickup/Dropoff with lat/lng capture
  - Restricted to India (componentRestrictions: 'in')
  - "Powered by Google" attribution

- **Twilio SMS Integration** (COMPLETE):
  - Real OTP delivery to driver phones
  - Fallback to debug OTP if SMS fails
  - Phone number formatted with +91 prefix

---

## Integration Credentials (Configured)
- **Twilio SMS**: Account SID, Auth Token, Phone Number (+15732615539)
- **Google Maps**: API Key for Places Autocomplete
- **Emergent LLM**: For PDF Rate Extraction

---

## Driver App Setup Instructions
1. Navigate to `/app/driver_app/`
2. Run `flutter pub get` to install dependencies
3. Update `lib/config/api_config.dart` with production API URL
4. Run `flutter run` to test on device/emulator
5. Build APK: `flutter build apk --release`

## Google Maps Integration
1. Get API key from https://console.cloud.google.com/google/maps-apis
2. Enable: Maps JavaScript API, Directions API, Geocoding API
3. Add to frontend/.env: `REACT_APP_GOOGLE_MAPS_API_KEY=your_key_here`
4. Restart frontend service

---

## Upcoming Tasks (P0 - High Priority)
1. **Passenger Mobile App (Flutter/iOS + Android)**
   - Trip details view
   - Live tracking
   - SOS feature
   - Push notifications
   - Sign duty slip digitally

2. **Real Notifications Integration**
   - Firebase Cloud Messaging
   - Twilio SMS/WhatsApp (OTP delivery)

---

## Future Tasks (P2 - Backlog)
1. **Auto Assignment Engine** - Proximity-based driver assignment
2. **Deep Analytics** - Fleet utilization, driver performance, cost analysis
3. **Backend Refactoring** - Split server.py (3800+ lines) into modular routers (/app/backend/routes/)
4. **Invoice PDF Download** - Generate downloadable PDF invoices

---

## Test Credentials
- **Admin Portal**: admin@fleetOS.com / password123
- **Corporate Portal**: hr@techcorp.in / password123
- **Test Driver**: 9876543210 (Use OTP from debug response)

## Technical Stack
- **Backend**: FastAPI (Python 3.11), MongoDB
- **Frontend**: React 18, Tailwind CSS, shadcn/ui
- **Mobile**: Flutter (driver_app ready, passenger_app planned)
- **AI/PDF Extraction**: emergentintegrations library with Gemini

## Key API Endpoints
- Admin: `/api/trips`, `/api/duty-slips`, `/api/contracts`, `/api/invoices`, `/api/admin/drivers/{id}/status`, `/api/admin/drivers/locations`
- Corporate: `/api/corporate/duty-slips`, `/api/corporate/tracking/active`, `/api/corporate/auth/change-password`
- Driver: `/api/driver/auth/*`, `/api/driver/trips/*`, `/api/driver/location`
- Invoice Generation: `/api/invoices/generate-from-slips`
- Contract PDF Extraction: `POST /api/contracts/extract-from-pdf`

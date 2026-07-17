# Mr. Cabie - Fleet OS Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Access Links & Credentials](#access-links--credentials)
3. [Tech Stack](#tech-stack)
4. [Directory Structure](#directory-structure)
5. [Backend API Reference](#backend-api-reference)
6. [Frontend Architecture](#frontend-architecture)
7. [Database Schema](#database-schema)
8. [RBAC - Role Based Access Control](#rbac---role-based-access-control)
9. [Complete Workflow](#complete-workflow)
10. [Flutter Driver App](#flutter-driver-app)
11. [Setup Guide](#setup-guide)
12. [What's Done vs TODO](#whats-done-vs-todo)

---

## Overview

**Mr. Cabie** is a production-grade B2B Fleet Management System with 3 portals:

| Portal | Users | Purpose |
|--------|-------|---------|
| **Admin** | Fleet operators | Full system control |
| **Corporate** | Client companies | Bookings, tracking, invoices |
| **Driver** | Drivers | Trip management, GPS tracking |

### Core Business Logic
```
1 Booking → Multiple Trips (recurring)
1 Trip → 1 Duty Slip (strict 1:1)
Multiple Duty Slips → 1 Invoice (billing cycle)
```

---

## Access Links & Credentials

### Production URLs
| Portal | URL | Auth Method |
|--------|-----|-------------|
| Admin | `https://fleet-os-preview-1.emergent.host` | Email/Password |
| Corporate | `https://fleet-os-preview-1.emergent.host/corporate/login` | Email/Password |
| Driver | `https://fleet-os-preview-1.emergent.host/driver` | Phone + OTP |

### Demo Credentials
| Portal | Credentials |
|--------|-------------|
| **Admin** | `admin@fleetOS.com` / `password123` |
| **Corporate** | Create via Admin → Clients (auto-generates) |
| **Driver** | Create via Admin → Drivers (uses Twilio OTP) |

---

## Tech Stack

### Backend
| Component | Technology |
|-----------|------------|
| Framework | FastAPI (Python 3.10+) |
| Database | MongoDB (Motor async driver) |
| Auth | JWT + bcrypt |
| OTP | Twilio SMS |
| AI/PDF | OpenAI GPT-4o (emergentintegrations) |

### Frontend
| Component | Technology |
|-----------|------------|
| Framework | React 18 |
| Styling | TailwindCSS + Shadcn/UI |
| State | React Context |
| HTTP | Axios |
| Maps | @vis.gl/react-google-maps |
| Icons | Phosphor Icons, Lucide React |
| Toasts | Sonner |

### Mobile (Flutter - Partial)
| Component | Technology |
|-----------|------------|
| Framework | Flutter 3.x |
| State | Provider |
| HTTP | Dio |
| Maps | google_maps_flutter |
| Storage | flutter_secure_storage |

---

## Directory Structure

```
/app
├── backend/
│   ├── server.py              # LEGACY monolithic server (4054 lines)
│   ├── app/                   # NEW REFACTORED STRUCTURE
│   │   ├── main.py            # FastAPI app entry point
│   │   ├── config/
│   │   │   ├── database.py    # MongoDB connection
│   │   │   └── settings.py    # Environment variables
│   │   ├── models/
│   │   │   ├── enums.py       # All enums (Status, Types)
│   │   │   ├── user.py        # User models
│   │   │   ├── vehicle.py     # Vehicle models
│   │   │   ├── driver.py      # Driver models
│   │   │   ├── client.py      # Client models
│   │   │   ├── trip.py        # Trip/Duty models
│   │   │   ├── duty_slip.py   # Duty slip models
│   │   │   ├── contract.py    # Contract models
│   │   │   ├── invoice.py     # Invoice models
│   │   │   ├── corporate.py   # Corporate user/booking models
│   │   │   └── pricing.py     # Pricing rule models
│   │   ├── routes/
│   │   │   ├── admin/         # Admin portal routes
│   │   │   │   ├── auth.py    # Admin auth + dashboard
│   │   │   │   ├── vehicles.py
│   │   │   │   ├── drivers.py
│   │   │   │   └── clients.py
│   │   │   ├── corporate/     # Corporate portal routes
│   │   │   │   ├── auth.py
│   │   │   │   └── dashboard.py
│   │   │   └── driver/        # Driver portal routes
│   │   │       ├── auth.py    # OTP login
│   │   │       └── trips.py   # Trip actions
│   │   ├── middleware/
│   │   │   └── auth.py        # JWT auth, password hashing
│   │   └── services/
│   │       ├── otp_service.py     # Twilio OTP
│   │       ├── pdf_service.py     # AI PDF extraction
│   │       └── pricing_service.py # Price calculation
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # Environment variables
│   └── tests/                 # Pytest test files
│
├── frontend/
│   ├── public/
│   │   ├── index.html         # HTML entry + meta tags
│   │   └── logo.png           # Mr. Cabie logo
│   ├── src/
│   │   ├── App.js             # Route definitions
│   │   ├── index.js           # React entry point
│   │   ├── pages/
│   │   │   ├── Login.js               # Admin login
│   │   │   ├── Dashboard.js           # Admin dashboard
│   │   │   ├── FleetManagement.js     # Vehicle CRUD
│   │   │   ├── DriverManagement.js    # Driver CRUD
│   │   │   ├── TripManagement.js      # Trip/Duty CRUD
│   │   │   ├── DutySlips.js           # Duty slip management
│   │   │   ├── ContractManagement.js  # Client contracts
│   │   │   ├── LiveTracking.js        # Real-time map
│   │   │   ├── Billing.js             # Invoice generation
│   │   │   ├── ClientManagement.js    # Client CRUD
│   │   │   ├── corporate/             # Corporate portal (7 pages)
│   │   │   │   ├── CorporateLogin.js
│   │   │   │   ├── CorporateDashboard.js
│   │   │   │   ├── CorporateBookings.js
│   │   │   │   ├── CorporateDutySlips.js
│   │   │   │   ├── CorporateEmployees.js
│   │   │   │   ├── CorporateInvoices.js
│   │   │   │   ├── CorporateReports.js
│   │   │   │   └── CorporateTracking.js
│   │   │   └── driver/                # Driver portal (3 pages)
│   │   │       ├── DriverLogin.js
│   │   │       ├── DriverDashboard.js
│   │   │       └── DriverActiveTrip.js
│   │   ├── components/
│   │   │   ├── Layout.js              # Admin sidebar
│   │   │   ├── CorporateLayout.js     # Corporate sidebar
│   │   │   ├── ProtectedRoute.js      # Admin auth guard
│   │   │   ├── CorporateProtectedRoute.js
│   │   │   ├── LocationAutocomplete.js # Google Places
│   │   │   └── ui/                    # Shadcn components
│   │   └── context/
│   │       ├── AuthContext.js         # Admin auth state
│   │       └── CorporateAuthContext.js # Corporate auth state
│   ├── package.json
│   ├── tailwind.config.js
│   └── .env                   # REACT_APP_BACKEND_URL, GOOGLE_MAPS_API_KEY
│
├── driver_app/                # Flutter Driver App (INCOMPLETE)
│   ├── lib/
│   │   ├── main.dart
│   │   ├── config/theme.dart
│   │   ├── models/
│   │   ├── providers/
│   │   │   ├── auth_provider.dart
│   │   │   └── trip_provider.dart
│   │   ├── screens/
│   │   │   ├── login_screen.dart
│   │   │   ├── otp_screen.dart
│   │   │   ├── home_screen.dart
│   │   │   ├── trip_detail_screen.dart
│   │   │   └── active_trip_screen.dart
│   │   ├── services/
│   │   │   ├── api_service.dart
│   │   │   ├── auth_service.dart
│   │   │   ├── location_service.dart
│   │   │   └── trip_service.dart
│   │   └── widgets/
│   └── pubspec.yaml
│
├── memory/
│   └── PRD.md                 # Product requirements
│
├── test_reports/              # Test iteration results
│
└── document.md                # THIS FILE
```

---

## Backend API Reference

### Authentication APIs
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | Admin registration |
| POST | `/api/auth/login` | Admin login → JWT |
| GET | `/api/auth/me` | Get current admin |
| POST | `/api/corporate/auth/login` | Corporate login |
| POST | `/api/driver/auth/send-otp` | Send OTP to driver |
| POST | `/api/driver/auth/verify-otp` | Verify OTP → JWT |

### Admin APIs
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/POST | `/api/vehicles` | Vehicle CRUD |
| GET/POST | `/api/drivers` | Driver CRUD |
| GET/POST | `/api/clients` | Client CRUD |
| GET/POST | `/api/duties` | Trip/Duty CRUD |
| GET/POST | `/api/contracts` | Contract CRUD |
| GET/POST | `/api/duty-slips` | Duty slip CRUD |
| GET/POST | `/api/invoices` | Invoice CRUD |
| GET | `/api/admin/drivers/locations` | All driver GPS |
| POST | `/api/admin/clear-all-data` | Reset database |
| POST | `/api/contracts/extract-from-pdf` | AI rate extraction |

### Corporate APIs
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/corporate/dashboard/stats` | Dashboard metrics |
| GET/POST | `/api/corporate/employees` | Employee CRUD |
| GET/POST | `/api/corporate/bookings` | Booking CRUD |
| GET | `/api/corporate/duty-slips` | View duty slips |
| GET | `/api/corporate/invoices` | View invoices |
| GET | `/api/corporate/tracking/active` | Track active trips |
| GET | `/api/corporate/reports/trips` | Trip reports |

### Driver APIs
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/driver/trips` | Assigned trips |
| PATCH | `/api/driver/trips/{id}/accept` | Accept trip |
| PATCH | `/api/driver/trips/{id}/reject` | Reject trip |
| POST | `/api/driver/trips/{id}/start` | Start trip |
| POST | `/api/driver/trips/{id}/complete` | Complete + sign |
| POST | `/api/driver/location` | Update GPS location |

---

## Database Schema

### Collections & Key Fields

```javascript
// users - Admin users
{ id, email, password_hash, name, role: "admin" }

// clients - Corporate companies
{ id, company_name, contact_person, email, phone, gstin }

// corporate_users - Corporate portal users
{ id, client_id, email, password_hash, role: ADMIN|HR|FINANCE|VIEWER }

// drivers
{ id, name, phone, license_number, status: AVAILABLE|ON_DUTY|... }

// vehicles
{ id, registration_number, type: SEDAN|SUV|..., status }

// contracts
{ id, client_id, type, rates: {...}, driver_allowance_per_day, max_km_included }

// bookings - Created by corporate
{ id, client_id, employee_id, pickup_location, drop_location, scheduled_time }

// duties (trips) - Created from bookings
{ id, booking_id, driver_id, vehicle_id, status: CREATED→ASSIGNED→ACCEPTED→STARTED→COMPLETED }

// duty_slips - 1:1 with trip
{ id, trip_id, opening_km, closing_km, total_km, traveller_name, signature_url, status: DRAFT|SIGNED }

// invoices
{ id, client_id, duty_slip_ids[], amount, tax, total, status: DRAFT|SENT|PAID }

// driver_locations - GPS tracking
{ driver_id, latitude, longitude, timestamp, trip_id }
```

---

## RBAC - Role Based Access Control

### Admin Portal Roles
| Role | Access |
|------|--------|
| `admin` | Full access to everything |

### Corporate Portal Roles
| Role | Access |
|------|--------|
| `ADMIN` | Full access + employee management |
| `HR` | Employees + bookings |
| `FINANCE` | Invoices + billing only |
| `VIEWER` | Read-only access |

### Driver Portal
- Single role: Driver
- Auth: Phone + OTP (Twilio)
- Access: Own assigned trips only

---

## Complete Workflow

### Phase 1: Setup
```
Admin creates:
  └── Client (company) → auto-generates corporate login
  └── Vehicles (fleet)
  └── Drivers (with phone numbers)
  └── Contract (rates for client)
```

### Phase 2: Booking
```
Corporate User:
  └── Adds Employees
  └── Creates Booking (employee, pickup, drop, datetime)
      └── System creates TRIP (status: CREATED)
```

### Phase 3: Assignment
```
Admin:
  └── Assigns Driver + Vehicle to Trip
      └── Trip status: ASSIGNED
      └── Driver receives notification
```

### Phase 4: Trip Execution
```
Driver (via app/web):
  └── ACCEPTS trip → status: ACCEPTED
  └── STARTS trip → enters opening KM → status: STARTED
  └── Location tracking begins (GPS updates every 30s)
  └── COMPLETES trip → enters closing KM
  └── Gets SIGNATURE from passenger
      └── Duty Slip created → status: SIGNED
      └── Trip status: COMPLETED
```

### Phase 5: Billing
```
Admin:
  └── Selects multiple duty slips (same client)
  └── Generates Invoice (auto-calculates from contract rates)
  └── Can add manual adjustments (toll, parking, taxes)
  └── Sends invoice → status: SENT

Corporate:
  └── Views/downloads invoice
  └── Marks as PAID (or admin does)
```

### State Machine
```
TRIP:      CREATED → ASSIGNED → ACCEPTED → STARTED → COMPLETED → BILLED → CLOSED
                                    ↓
                               CANCELLED

DUTY_SLIP: DRAFT → SIGNED (locked, cannot edit)

INVOICE:   DRAFT → SENT → PAID
                     ↓
                  OVERDUE
```

---

## Flutter Driver App

### Current Status: PARTIAL (60% complete)

### What EXISTS:
| File | Status | Features |
|------|--------|----------|
| `main.dart` | ✅ Done | App entry, providers |
| `login_screen.dart` | ✅ Done | Phone input UI |
| `otp_screen.dart` | ✅ Done | OTP verification UI |
| `home_screen.dart` | ✅ Done | Trip list, status |
| `active_trip_screen.dart` | ✅ Done | Active trip UI |
| `trip_detail_screen.dart` | ✅ Done | Trip details |
| `auth_provider.dart` | ✅ Done | Auth state |
| `trip_provider.dart` | ✅ Done | Trip state |
| `api_service.dart` | ✅ Done | HTTP client |
| `location_service.dart` | ✅ Done | GPS tracking |

### What's MISSING:
| Feature | Priority |
|---------|----------|
| Digital Signature widget | P0 |
| Duty slip completion flow | P0 |
| Push notifications | P1 |
| Offline mode | P2 |
| Trip history screen | P2 |
| Profile/settings screen | P2 |
| Mr. Cabie branding update | P1 |

### To Build Flutter App:
```bash
cd /app/driver_app
flutter pub get
flutter run
```

---

## Setup Guide

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB
- Twilio Account (for OTP)
- Google Maps API Key
- OpenAI API Key (for PDF parsing)

### Backend Setup
```bash
cd /app/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=fleet_os
JWT_SECRET_KEY=your-secret-key-here
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890
OPENAI_API_KEY=your-openai-key
EOF

# Run server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup
```bash
cd /app/frontend

# Install dependencies
yarn install

# Create .env file
cat > .env << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-key
EOF

# Run frontend
yarn start
```

### Flutter Setup (Optional)
```bash
cd /app/driver_app

# Get dependencies
flutter pub get

# Update API URL in lib/config/api_config.dart
# Run on device/emulator
flutter run
```

---

## What's Done vs TODO

### ✅ COMPLETED (Web App - 100%)

#### Admin Portal
- [x] Login/Auth (JWT)
- [x] Dashboard with stats
- [x] Fleet Management (CRUD)
- [x] Driver Management (CRUD + status)
- [x] Client Management (CRUD)
- [x] Contract Management (CRUD + PDF AI extraction)
- [x] Trip Management (CRUD + assignment)
- [x] Duty Slip Management (with digital signature)
- [x] Live Tracking (Google Maps + markers)
- [x] Billing/Invoicing (manual pricing + auto-calculation)
- [x] Clear All Data function

#### Corporate Portal
- [x] Login/Auth (JWT)
- [x] Dashboard with stats
- [x] Employee Management
- [x] Booking Creation
- [x] Duty Slip Viewing
- [x] Invoice Viewing
- [x] Live Tracking (own trips)
- [x] Reports

#### Driver Web Portal
- [x] OTP Login (Twilio)
- [x] Dashboard (assigned trips)
- [x] Accept/Reject trips
- [x] Start/Complete trips
- [x] KM readings
- [x] Digital Signature
- [x] GPS Location updates

### ⚠️ PARTIAL (Flutter App - 60%)
- [x] Project structure
- [x] Auth flow (OTP)
- [x] Trip list
- [x] Trip details
- [x] Active trip screen
- [x] GPS tracking service
- [ ] Digital signature widget
- [ ] Duty slip completion
- [ ] Push notifications
- [ ] Offline mode
- [ ] Branding update

### ✅ COMPLETED (Backend Refactoring)
- [x] Modular folder structure created
- [x] Models separated by domain
- [x] Routes organized by portal (admin/corporate/driver)
- [x] Services extracted (OTP, PDF, Pricing)
- [x] Middleware for authentication
- [ ] Migrate remaining routes from server.py
- [ ] Test new modular structure
- [ ] Switch production to new entry point

### ❌ TODO (Future)
- [ ] Passenger mobile app
- [ ] Auto driver assignment (proximity-based)
- [ ] Advanced analytics
- [ ] WhatsApp notifications
- [ ] Backend refactoring (split server.py)
- [ ] Multi-language support

---

## Environment Variables Reference

### Backend (.env)
```env
MONGO_URL=mongodb://...
DB_NAME=fleet_os
JWT_SECRET_KEY=xxx
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+xxx
OPENAI_API_KEY=xxx
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=https://...
REACT_APP_GOOGLE_MAPS_API_KEY=xxx
```

---

## Quick Commands

```bash
# Backend logs
tail -f /var/log/supervisor/backend.err.log

# Frontend logs
tail -f /var/log/supervisor/frontend.err.log

# Restart services
sudo supervisorctl restart backend
sudo supervisorctl restart frontend

# Test API
curl -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fleetOS.com","password":"password123"}'
```

---

## Contact & Support

- **Platform**: Emergent Agent
- **Production URL**: https://fleet-os-preview-1.emergent.host
- **Brand**: Mr. Cabie

---

*Last Updated: May 2026*

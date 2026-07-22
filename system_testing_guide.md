# 🧪 Mr. Cabie — Fleet OS: Complete System Testing & Operations Guide (Local Setup)

> **Project:** Mr. Cabie B2B Fleet Management System
> **Version:** 2.0.0
> **Local Base URL (Frontend):** `http://localhost:3000`
> **Local Base URL (Backend):** `http://localhost:8001`

---

## 🔐 1. Portal Access Links & Credentials (Local Testing)

| Portal | URL | Access Method / Credentials |
|--------|-----|-----------------------------|
| **Admin Portal** | `http://localhost:3000` | **Email:** `admin@fleetOS.com`<br>**Password:** `password123` |
| **Corporate Portal** | `http://localhost:3000/corporate/login` | Created via Admin → Clients (Auto-generated email & password) |
| **Driver Portal (Web)** | `http://localhost:3000/driver` | Phone Number + OTP (Twilio / Dev OTP `123456`) |

---

## 🧭 2. Navigation Menus

### 🛡️ Admin Portal (`/`)
`Dashboard` → `Fleet (Vehicles)` → `Drivers` → `Trips` → `Duty Slips` → `Contracts` → `Live Tracking` → `Billing (Invoices)` → `Clients`

### 🏢 Corporate Portal (`/corporate/login`)
`Dashboard` → `Bookings` → `Duty Slips` → `Employees` → `Live Tracking` → `Invoices` → `Reports`

### 🚗 Driver Portal (`/driver` or Flutter APK)
`Dashboard` → `Active Trip` (Opening/Closing KM, Location Stamp, Camera Photo, Finger Signature)

---

## 🔄 3. Complete End-to-End Workflow

```
1. Admin creates CLIENT (Auto-generates corporate login credentials)
2. Admin creates DRIVER + VEHICLE
3. Corporate/Admin creates BOOKING (Pickup, Drop, Datetime, Employee) → System creates TRIP
4. Admin assigns DRIVER + VEHICLE to the Trip
5. Driver receives trip → ACCEPTS → STARTS (Captures start location stamp & start photo)
6. Driver completes trip → Enters closing KM → Captures end photo → Gets Traveller SIGNATURE
7. System generates SIGNED DUTY SLIP (Locked)
8. Admin selects multiple Duty Slips → Generates INVOICE (Auto-calculated from contract rates)
9. Corporate views/downloads Invoice & marks as PAID
```

### State Machine Reference:
- **TRIP**: `CREATED` → `ASSIGNED` → `ACCEPTED` → `STARTED` → `COMPLETED` → `BILLED`
- **DUTY SLIP**: `DRAFT` → `SIGNED` (Locked)
- **INVOICE**: `DRAFT` → `SENT` → `PAID`

---

## 🗄️ 4. MongoDB Database Schema & Collections

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `users` | Admin users | `id`, `email`, `password_hash`, `name`, `role` |
| `drivers` | Driver profiles | `id`, `name`, `phone`, `license_number`, `status` (`AVAILABLE`, `ON_DUTY`) |
| `vehicles` | Fleet vehicles | `id`, `registration_number`, `vehicle_type`, `status` |
| `clients` | Corporate clients | `id`, `company_name`, `contact_person`, `email`, `phone`, `gstin` |
| `corporate_users` | Client portal users | `id`, `client_id`, `email`, `password_hash`, `role` (`ADMIN`, `HR`, `FINANCE`) |
| `employees` | Client employees | `id`, `client_id`, `name`, `employee_id`, `department` |
| `contracts` | Rate contracts | `id`, `client_id`, `contract_type`, `rates`, `driver_allowance` |
| `bookings` | Corporate bookings | `id`, `client_id`, `employee_id`, `pickup_location`, `drop_location`, `status` |
| `duties` | Trips | `id`, `client_id`, `driver_id`, `vehicle_id`, `status`, `started_at`, `completed_at` |
| `duty_slips` | KM records + photos + signature | `id`, `trip_id`, `opening_km`, `closing_km`, `passenger_signature`, `start_photo_url`, `end_photo_url`, `start_location`, `end_location` |
| `invoices` | Client billing | `id`, `client_id`, `duty_slip_ids`, `amount`, `tax`, `total_amount`, `status` |
| `driver_locations` | Real-time GPS | `driver_id`, `latitude`, `longitude`, `timestamp`, `trip_id` |
| `driver_otps` | Driver OTP login | `phone`, `otp`, `expires_at` |

---

## 🔑 5. Core API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/auth/login` | Admin login |
| `POST` | `/api/corporate/auth/login` | Corporate login |
| `POST` | `/api/driver/auth/send-otp` | Driver OTP request |
| `POST` | `/api/driver/auth/verify-otp` | Driver OTP verification |
| `GET/POST` | `/api/duties` | Admin trip creation / list |
| `PATCH` | `/api/duties/{id}/assign` | Assign driver + vehicle |
| `POST` | `/api/driver/trips/{id}/start` | Driver start trip (Timestamp + Location stamp) |
| `POST` | `/api/driver/trips/{id}/complete` | Driver complete trip (KM + Signature + Location) |
| `POST` | `/api/driver/trips/{id}/upload-photo` | Driver photo upload (Start/End photos) |
| `POST` | `/api/driver/location` | Driver live GPS location ping |
| `GET` | `/api/admin/drivers/locations` | Admin live tracking map |
| `GET` | `/api/duty-slips` | Admin list duty slips |

---

## 🧪 6. Testing Step-by-Step Checklist

### Test Phase A — Admin Setup & Corporate Creation
1. Go to `http://localhost:3000` and login with `admin@fleetOS.com` / `password123`.
2. Go to **Clients** → **Add Client**. Enter company details. Copy the auto-generated email & password from the popup modal.
3. Go to **Drivers** → **Add Driver**. Enter driver name and 10-digit Indian phone number (e.g. `9876543210`).
4. Go to **Fleet** → **Add Vehicle**. Enter registration number & vehicle type.

### Test Phase B — Corporate Booking
1. Open Incognito window and go to `http://localhost:3000/corporate/login`.
2. Login with the corporate email & password generated in Test Phase A.
3. Go to **Bookings** → **Create Booking**. Select employee, pickup location, drop location, and date/time.

### Test Phase C — Driver App Execution (Flutter APK / Web)
1. Open Driver App on mobile phone.
2. Enter driver phone number (`9876543210`).
3. Enter OTP (`123456` in dev or from backend logs).
4. See assigned trip on Dashboard → Click **Accept**.
5. Click **Start Trip**:
   - Take start photo (odometer)
   - Verify Location Stamp (GPS lat/lng + Address captured)
   - Verify Timestamp (`started_at`)
6. Click **Complete Trip**:
   - Enter closing KM (must be ≥ opening KM)
   - Take end photo
   - Finger-draw traveller signature & enter traveller name
7. Verify **Live Duty Slip Preview** screen appears.

### Test Phase D — Billing & Invoicing
1. Go back to Admin Portal → **Duty Slips**. Verify the signed duty slip appears with photos & timestamps.
2. Go to **Billing** → **Generate Invoice**. Select client and signed duty slips.
3. Verify auto-calculated invoice amounts based on contract rates.

---

## ⚙️ 7. Local VS Code Environment Setup

### Environment Variables (.env)

#### `backend/.env`
```env
MONGO_URL="mongodb+srv://CabieOpsAI:CabieOpsAI@cabieopsdata.decymbq.mongodb.net/?appName=CabieopsData"
DB_NAME="test_database"
JWT_SECRET_KEY="your-jwt-secret"
CORS_ORIGINS="*"
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-token"
TWILIO_PHONE_NUMBER="+1xxx"
```

#### `frontend/.env`
```env
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

### Running Locally

```bash
# Terminal 1 — Backend API
cd backend
./venv/Scripts/python.exe -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2 — React Web Portals (Admin/Corporate/Driver Web)
cd frontend
yarn start

# Terminal 3 — Flutter Mobile Driver App (on device)
cd driver_app
flutter run --android-skip-build-dependency-validation
```

---

*Updated: July 2026 | Project: Mr. Cabie Fleet OS*

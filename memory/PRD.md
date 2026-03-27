# Fleet OS - Product Requirements Document

## Overview
Fleet OS is a production-grade Fleet Operating System for B2B cab/fleet management companies. It consists of:
1. **Enterprise Web Platform (Admin Panel)** - For operations team
2. **Corporate Customer Dashboard** - For client companies
3. **Driver Mobile App** (Planned - Android/Flutter)
4. **Passenger Mobile App** (Planned - Android/iOS)

## User Personas
- **Fleet Admin** - Manages vehicles, drivers, duties, billing
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

### 3. Duty/Trip Management (COMPLETE)
- **Strict State Machine**: CREATED → ASSIGNED → ACCEPTED → STARTED → COMPLETED → BILLED → CLOSED
- Manual driver/vehicle assignment by admin
- Duty links to bookings automatically

### 4. Billing & Invoicing (COMPLETE)
- Invoice generation with line items
- GST calculation support
- Invoice status tracking (DRAFT, SENT, PAID, OVERDUE, CANCELLED)

### 5. Pricing Engine (COMPLETE)
- **Services**: Configurable service types (Airport Transfer, Local Duty, Outstation, etc.)
- **Pricing Rules**: Multiple pricing types
  - PER_KM: Rate per km with minimum km
  - TIME_BASED: Package hours/km with base fare
  - ROUTE_BASED: Fixed pricing for specific routes
  - DAILY_RENTAL: Daily rate with included km/hours
- **Rate Cards**: Client-specific pricing configuration

### 6. Corporate Customer Dashboard (COMPLETE)
- **Authentication**: Role-based (ADMIN, HR, FINANCE, VIEWER)
- **Employee Management**: CRUD with cost center assignment
- **Bookings**: 
  - Trip Type: One-way / Round-trip
  - Recurring Booking: Daily / Weekly / Monthly
  - Vehicle Preference: SEDAN, SUV, HATCHBACK, EV, LUXURY
  - Service Type selection
  - Multi-Employee booking
  - Real-time pricing estimate
- **Invoices**: View and download
- **Reports**: Monthly expense summaries

### 7. Live Tracking (MOCKED)
- Requires Google Maps API integration

### 8. Notifications (MOCKED)
- Requires Firebase/Twilio integration

---

## Completed Work (as of Dec 27, 2025)

### Session 1 - Base Architecture
- FastAPI backend with MongoDB
- React frontend with Tailwind CSS + shadcn/ui
- JWT authentication for both Admin and Corporate users

### Session 2 - Admin Panel
- Dashboard with stats
- Fleet, Driver, Duty, Client, Billing management
- CSV bulk upload components

### Session 3 - Corporate Dashboard
- Corporate login and auth context
- Bookings, Employees, Tracking, Invoices, Reports pages
- Booking → Duty auto-creation

### Session 4 - Pricing Engine & Booking Upgrades
- Services Management (Admin)
- Pricing Rules with 4 pricing types
- Rate Cards with client assignment
- Corporate Booking Form upgraded with:
  - Trip Type selection
  - Vehicle Preference
  - Service Type
  - Recurring booking options
  - Multi-employee passenger selection
  - Real-time pricing estimate display
- Dynamic pricing calculation on booking creation

---

## Upcoming Tasks (P0 - High Priority)
1. **Driver Mobile App (Flutter/Android)**
   - Secure login
   - Duty list and accept/reject
   - Navigation integration
   - Start/end trip functionality
   - Real-time location sharing

2. **Passenger Mobile App (Flutter/iOS + Android)**
   - Trip details view
   - Live tracking
   - SOS feature
   - Push notifications

3. **Real Notifications Integration**
   - Firebase Cloud Messaging
   - Twilio SMS/WhatsApp

---

## Future Tasks (P2 - Backlog)
1. **Auto Assignment Engine**
   - Driver proximity-based assignment
   - Smart dispatch suggestions

2. **Deep Analytics**
   - Fleet utilization reports
   - Driver performance metrics
   - Cost analysis dashboards

3. **Backend Refactoring**
   - Split server.py into modular routers
   - Separate models, routes, services

---

## Test Credentials
- **Admin Portal**: admin@fleetOS.com / password123
- **Corporate Portal**: hr@techcorp.in / password123

## Technical Stack
- **Backend**: FastAPI (Python 3.11), MongoDB
- **Frontend**: React 18, Tailwind CSS, shadcn/ui
- **Mobile (Planned)**: Flutter

## API Base URLs
- Admin API: `/api/*`
- Corporate API: `/api/corporate/*`
- Pricing API: `/api/services`, `/api/pricing-rules`, `/api/rate-cards`

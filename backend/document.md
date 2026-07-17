# Mr. Cabie Backend Service

This directory contains the FastAPI-based backend for the Mr. Cabie Fleet OS.

## Architecture

The backend is built as a monolithic FastAPI application currently contained mostly within `server.py` (over 4,000 lines). It connects to a MongoDB database (using the `motor` async driver).

### Core Components
- **Framework**: FastAPI (Python 3.10+)
- **Database**: MongoDB (motor)
- **Auth**: JWT tokens & bcrypt for password hashing
- **OTP Delivery**: Twilio SMS
- **AI Integrations**: OpenAI GPT-4o for parsing PDF contracts

## Data Models (MongoDB Collections)

- `users`: Admin portal users.
- `clients`: B2B clients (Corporate).
- `corporate_users`: Users associated with clients.
- `drivers` & `vehicles`: Fleet resources.
- `contracts`: Rates and terms for clients.
- `bookings`: Initiated by Corporate users.
- `duties` (Trips): The actual execution object assigned to drivers.
- `duty_slips`: The signed completion document for a trip.
- `invoices`: Aggregated duty slips for billing.
- `driver_locations`: Real-time GPS pings.

## API Groupings

1. **Auth & Identity**: Login endpoints for all 3 portals (Admin, Corporate, Driver OTP).
2. **Resource Management**: CRUD for Drivers, Vehicles, Clients, and Employees.
3. **Trip Lifecycle**: Booking -> Duty -> Assignment -> Start -> Complete/Sign.
4. **Billing**: Contract AI parsing, Duty slip aggregation, Invoice generation.
5. **Real-time**: Driver GPS updates and Live Tracking aggregation.

## Setup Instructions

1. Ensure Python 3.10+ is installed.
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables in `.env`:
   ```env
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=fleet_os
   JWT_SECRET_KEY=your-secret-key
   TWILIO_ACCOUNT_SID=xxx
   TWILIO_AUTH_TOKEN=xxx
   TWILIO_PHONE_NUMBER=+1xxx
   OPENAI_API_KEY=xxx
   ```
5. Run the server:
   ```bash
   uvicorn server:app --host 0.0.0.0 --port 8001 --reload
   ```

## Development Status

- **Status**: ✅ **100% Complete** for the initial MVP.
- **Future Work**: The `server.py` file should ideally be refactored into modular routers (`/routers/auth.py`, `/routers/trips.py`, etc.) for maintainability as the project grows.

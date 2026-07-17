# Mr. Cabie Frontend Web App

This directory contains the React-based frontend for the Mr. Cabie Fleet OS. It implements three separate portals within a single Single Page Application (SPA).

## Architecture

- **Framework**: React 18
- **Styling**: Tailwind CSS + Shadcn UI components
- **Routing**: `react-router-dom`
- **State Management**: React Context API (`AuthContext.js`, `CorporateAuthContext.js`)
- **HTTP Client**: Axios

## Portals Implemented

### 1. Admin Portal
- **Path**: `/`
- **Source**: `/src/pages/`
- **Purpose**: Full system management for fleet operators.
- **Key Features**:
  - Fleet & Driver Management
  - Client & Contract Management
  - Booking & Duty Slip generation
  - Invoicing
  - Live Map Tracking (Google Maps integration)

### 2. Corporate Portal
- **Path**: `/corporate`
- **Source**: `/src/pages/corporate/`
- **Purpose**: Client-facing portal for B2B companies to manage their employee bookings.
- **Key Features**:
  - Employee directory
  - Booking creation
  - Viewing invoices & duty slips
  - Tracking active company trips

### 3. Driver Web Portal
- **Path**: `/driver`
- **Source**: `/src/pages/driver/`
- **Purpose**: A web fallback for drivers to manage trips if they don't have the mobile app.
- **Key Features**:
  - OTP Login
  - View Assigned Trips
  - Start/Complete Trip flows
  - Enter KM readings and collect passenger signatures.

## Setup Instructions

1. Install Node.js (v18+ recommended).
2. Install dependencies:
   ```bash
   yarn install
   ```
3. Configure environment variables in `.env`:
   ```env
   REACT_APP_BACKEND_URL=http://localhost:8001
   REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_key
   ```
4. Start the development server:
   ```bash
   yarn start
   ```

## Development Status

- **Status**: ✅ **100% Complete** for the MVP. All 3 portals are fully built with their respective authentication guards and user interfaces.

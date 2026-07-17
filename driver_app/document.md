# Mr. Cabie Driver Mobile App (Flutter)

This directory contains the cross-platform (Android/iOS) mobile application for Drivers using Flutter.

## Architecture

- **Framework**: Flutter (Dart)
- **State Management**: Provider
- **HTTP Client**: Dio / http
- **Local Storage**: `shared_preferences` & `flutter_secure_storage`
- **Location Services**: `geolocator`
- **Maps**: `google_maps_flutter`

## Features

The mobile app focuses strictly on the Driver's workflow during a trip.

### Implemented Screens (`/lib/screens/`)
- `login_screen.dart`: Phone number entry.
- `otp_screen.dart`: OTP verification via Twilio.
- `home_screen.dart`: Dashboard showing assigned/upcoming trips.
- `trip_detail_screen.dart`: View pickup/drop locations and customer details.
- `active_trip_screen.dart`: Real-time tracking, starting the trip, entering opening KM, completing the trip, entering closing KM.

### Core Services (`/lib/services/`)
- `api_service.dart`: Handles HTTP requests to the FastAPI backend.
- `auth_service.dart`: Manages OTP login and JWT tokens.
- `location_service.dart`: Continuously pings the driver's GPS location to the backend for live tracking.
- `trip_service.dart`: Handles accepting, starting, and completing trips.

## Setup Instructions

1. Install the Flutter SDK (>=3.0.0).
2. Install Android Studio / Xcode for emulators.
3. Fetch dependencies:
   ```bash
   cd driver_app
   flutter pub get
   ```
4. Run the app:
   ```bash
   flutter run
   ```
*(Note: You will need a valid Google Maps API key placed in `android/app/src/main/AndroidManifest.xml` and `ios/Runner/AppDelegate.swift` for the map features to work).*

## Development Status

- **Status**: ⚠️ **~60% Complete**
- **Existing**: All the core screens, API connections, OTP login, and GPS tracking are implemented.
- **Pending/TODO**:
  - Digital signature pad implementation for Duty Slips.
  - Finalizing the Duty Slip completion flow.
  - Push notifications.
  - App icons and Mr. Cabie branding updates.

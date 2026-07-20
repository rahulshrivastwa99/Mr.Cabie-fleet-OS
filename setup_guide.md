# Mr. Cabie Fleet OS - Quick Setup & Architecture Guide

## 1. Local Setup Instructions

### Backend (Python/FastAPI)
```bash
cd backend
python -m venv venv

# On Windows:
.\venv\Scripts\activate
# On Mac/Linux:
# source venv/bin/activate

pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend (React)
```bash
cd frontend
yarn install
yarn start
```

---

## 2. Technology Stack & Architecture

### Backend Stack (✅ 100% Complete)
- **Framework:** FastAPI (Python 3.10+)
- **Database:** MongoDB (using Motor async driver)
- **Authentication:** JWT tokens + bcrypt hashing
- **External Services:** Twilio (for Driver OTPs), OpenAI GPT-4o (for AI PDF contract parsing)
- **Architecture:** Fully modularized routes inside `/app/routes/` separated into `admin`, `corporate`, and `driver` endpoints.

### Frontend Stack (✅ 100% Complete)
- **Framework:** React 18
- **Styling:** TailwindCSS + Shadcn/UI
- **State Management:** React Context (`AuthContext`, `CorporateAuthContext`)
- **Maps:** Google Maps integration (`@vis.gl/react-google-maps`)
- **Architecture:** A Single-Page Application (SPA) handling three separate portals: Admin (`/`), Corporate (`/corporate`), and Driver Web (`/driver`).
- **RBAC Completion:** ✅ 100% done. Role-Based Access Control is fully implemented across the Admin, Corporate, and Driver web portals within the frontend folder.

### Driver Mobile App Stack (⚠️ ~60% Complete)
- **Framework:** Flutter 3.x (Dart)
- **State Management:** Provider
- **Location & Maps:** `geolocator`, `google_maps_flutter`
- **Completion Status:** The app structure, OTP authentication flow, API integration, and GPS live tracking are **fully implemented**. 
- **Missing Features (Web vs Flutter Comparison):** 
  - **Driver Web App (Frontend Folder):** 100% complete. It successfully handles the entire end-trip flow. It captures Start/End KM readings, opens a Duty Slip modal, collects the Traveller's name, captures a digital signature using an HTML `<canvas>`, and submits it to the backend.
  - **Flutter Driver App:** Missing the final end-trip flow to achieve parity with the web app. **Remaining tasks to execute here:**
    1. Build a Duty Slip modal/screen to capture final KM readings.
    2. Integrate a digital signature drawing pad (using a Flutter package like `signature`).
    3. Capture the Traveller's name and submit the Base64 signature image to the `/complete` API endpoint just like `DriverActiveTrip.js` does in the web app.

---

## 3. Testing the Flutter App on a Mobile Device (USB)

To run the Flutter Driver app directly on your physical mobile phone via USB:

### Prerequisites
1. Ensure the **Flutter SDK** is installed and added to your system path.
2. Ensure you have **Android Studio** installed (for Android testing).

### Device Setup (Android)
1. **Enable Developer Options:** Go to your phone's *Settings > About Phone*. Tap the "Build Number" 7 times to enable Developer Mode.
2. **Enable USB Debugging:** Go back to *Settings > Developer Options* and turn on **USB Debugging**.
3. **Connect Device:** Plug your phone into your computer via a USB cable. Tap "Allow" when the USB Debugging prompt appears on your phone screen.
4. **Verify Connection:** Open a terminal and run:
   ```bash
   flutter devices
   ```
   *You should see your phone's name listed in the output.*

### Running the App
Once your device is connected and recognized, open your terminal and run:
```bash
cd driver_app
flutter pub get
flutter run
```
Flutter will automatically build the app and launch it on your physical phone!

> **⚠️ CRITICAL NETWORKING STEP**
> Since your backend is running locally on your computer, your phone cannot connect to `localhost:8001` (because "localhost" on the phone refers to the phone itself). 
> 
> You MUST change the API URL in your Flutter app (usually in `lib/config/api_config.dart` or `services/api_service.dart`) to your computer's **Local IPv4 Address** (e.g., `http://192.168.1.15:8001`). Ensure your computer and phone are connected to the exact same Wi-Fi network!

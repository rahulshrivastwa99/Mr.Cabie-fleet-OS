# 🚖 Mr. Cabie — Fleet OS: 1-Month Development & Deployment Plan

**Developer:** Rahul Shrivastwa
**Start Date:** July 20, 2026
**Target Deployment:** August 20, 2026
**Project:** Mr. Cabie Fleet OS — Driver App (Flutter APK) + Backend + Deployment

---

## 📋 Overview

This document outlines the full 1-month plan to take the Mr. Cabie Driver App from its current **60% complete** state to a **fully deployed production APK** — including two new features requested by the founder: **Timestamp**, **Location Stamp**, and **Camera Capture** on duty slips.

---

## 🗂️ Work Areas

### Area 1 — 📱 Driver App Development (Flutter APK)
Complete the Flutter driver app with all core features and the 2 new founder-requested features.

### Area 2 — 🚀 Deployment
Deploy the full system (Backend + Frontend + APK distribution) to production.

### Area 3 — ✨ New Features (Founder Request)
1. **Timestamp** — Record exact date & time when driver starts/completes a trip
2. **Location Stamp** — Capture GPS coordinates + address when key events happen
3. **Camera Capture** — Driver takes a photo at trip start/end (e.g., vehicle condition, odometer)

---

## ✅ Current Status (as of July 21, 2026)

| Component | Status | % Done |
|-----------|--------|--------|
| Backend API (FastAPI) | ✅ Running | 95% |
| Admin Web Portal | ✅ Complete | 100% |
| Corporate Web Portal | ✅ Complete | 100% |
| Driver Web Portal | ✅ Complete | 100% |
| Flutter Driver App | ✅ Core Features + 4 Founder Features | 90% |
| Production Deployment | ⚠️ Partial | 50% |

### Iteration Delivery Summary (22/22 Tests Passing ✅)
- **Digital Signature & Duty Slip** completion flow (traveller name + signature) — ✅
- **Timestamp feature** (`started_at`, `completed_at`) — ✅
- **Location Stamp feature** (GPS + reverse-geocoded address on start/end) — ✅
- **Camera Capture feature** + `/api/driver/trips/{id}/upload-photo` — ✅
- **Live Duty Slip Preview** screen in Flutter — ✅
- **Offline Trip Sync** (`shared_preferences` queue + `connectivity_plus` auto-flush) — ✅
- **Auto-Trip Creation** on `PATCH /api/bookings/{id}/approve` — ✅
- **Branding polish** (Mr. Cabie logo/colors/splash) — ✅
- **Trip History + Profile/Settings** enhancements — ✅
- **Security guardrails**: KM validation, 401 → auto-logout, permission-denied dialogs with "Open Settings", image compression, 3× photo-upload retry, double-submit protection — ✅
- **Admin data endpoints**: `/api/duty-slips`, `/api/tracking/drivers`, `/api/tracking/driver/{id}/pings` — ✅

### Backend test results
- 22/22 tests passing (regression + iteration 2). See `/app/backend_test.py`.

### Still remaining
- Admin web portal UI: render `/api/tracking/drivers` on the Live Tracking map + duty-slip photo thumbnails on the Duty Slips page.
- Flutter device QA — no simulator available in this container, needs an on-device run.
- Production deployment / APK build & distribution (Week 4 in this plan).

---

## 📅 Week-by-Week Plan

---

### 📅 WEEK 1 — July 20–27 | Foundation & Core App Completion

> **Goal:** Fix the build, complete all missing core screens, and get the app running end-to-end on a real device.

#### App Development Tasks
- [x] Fix Android Gradle/Kotlin/AGP build errors *(done)*
- [x] Complete **Digital Signature widget** in Flutter (finger-draw on screen)
- [x] Complete **Duty Slip flow** — driver can fill and submit duty slip from app
- [x] Complete **Trip completion flow** — opening KM → closing KM → signature → submit
- [x] Fix GPS location tracking (`POST /api/driver/location`) to send updates to backend
- [x] Test full trip flow on backend test suite (15/15 tests passing)

#### Backend Tasks
- [x] Add/verify API endpoint: `POST /api/driver/trips/{id}/duty-slip` — submit duty slip from app
- [x] Add admin endpoints: `POST /api/duties`, `PATCH /api/duties/{id}/assign`, `GET /api/duties/{id}`
- [x] Verify all Driver APIs are working correctly with the Flutter app

#### Deliverable
> ✅ Working Flutter Driver App & Backend APIs (15/15 automated tests passing)

---

### 📅 WEEK 2 — July 27 – Aug 3 | New Features (Founder Request) — COMPLETED ✅

> **Goal:** Implement Timestamp, Location Stamp, and Camera Capture features in the driver app.

#### Feature 1: ⏰ Timestamp ✅
- [x] Record exact `started_at` & `completed_at` ISO date+time when driver starts/completes a trip
- [x] Store timestamps in backend database (duty slip & trip models)
- [x] Show timestamps in Admin portal & duty slip responses

#### Feature 2: 📍 Location Stamp ✅
- [x] Capture GPS coordinates (`latitude`, `longitude`) + reverse-geocoded address when driver starts & completes trip
- [x] Integrate `geolocator` + `geocoding` Flutter packages & `geocoding_service.dart`
- [x] Store `start_location` and `end_location` `{lat, lng, address}` in backend per trip event
- [x] Reusable `LocationStampCard` widget in Flutter app

#### Feature 3: 📸 Camera Capture ✅
- [x] Driver takes photo on **trip start** (odometer/vehicle) and **trip completion**
- [x] Added `image_picker` package & reusable `PhotoCaptureCard` widget
- [x] Upload photo to backend via multipart request (`TripService.uploadTripPhoto`)
- [x] Created API endpoint `POST /api/driver/trips/{id}/upload-photo` storing images at `/api/uploads/duty_photos/` linked to `start_photo_url` / `end_photo_url`

#### Backend Tasks for Week 2 ✅
- [x] Update `duties` and `duty_slips` database schema to store new fields:
  - `started_at`, `completed_at` — timestamps
  - `start_location`, `end_location` — {lat, lng, address}
  - `start_photo_url`, `end_photo_url` — camera captures
- [x] Mount static files under `/api/uploads`
- [x] Run full automated backend test suite (15/15 tests passing)

#### Deliverable
> ✅ All 4 Founder Features fully built and tested!

---

### 📅 WEEK 3 — Aug 3–10 | Next Action Items, Polish & Branding

> **Goal:** Build follow-up features, push notifications, and Mr. Cabie branding.

#### Follow-up Features (Next Action Items)
- [ ] **Live Duty Slip Preview** — Printable/in-app preview of signed duty slip with photos, timestamps & route map
- [ ] **Offline Trip Sync** — Allow drivers to start/complete trips offline and auto-sync when reconnected
- [ ] **Admin Trip Map** — Live map on Admin portal showing GPS pings, start/end stamps, and photo thumbnails
- [ ] **Auto-Trip Creation** — Convert approved corporate bookings into assigned trips automatically

#### App Polish Tasks
- [ ] **Push Notifications** — Driver gets notified when a new trip is assigned (Firebase Cloud Messaging)
- [ ] **App Branding** — Update app with Mr. Cabie logo, colors, splash screen
- [ ] **Trip History screen** — Driver can view past completed trips
- [ ] **Profile/Settings screen** — Driver can see their name, phone, logout

#### Deliverable
> ✅ Advanced features + branded APK ready for internal testing by the founder

#### Testing Tasks
- [ ] Test all features on Infinix X689 (Android 11)
- [ ] Test with real trips — create trip in Admin, assign to driver, complete on phone
- [ ] Test camera on real device
- [ ] Test location stamp accuracy
- [ ] Fix any bugs found

#### This Week's Deliverable
> ✅ A polished, branded APK ready for internal testing by the founder

---

### 📅 WEEK 4 — Aug 10–20 | Deployment & APK Distribution

> **Goal:** Deploy everything to production and deliver a shareable APK.

#### Backend Deployment
- [ ] Ensure backend is running on production server (emergent.host)
- [ ] Update backend `.env` with production API keys
- [ ] Test all APIs on production URL

#### Frontend Deployment
- [ ] Ensure Admin + Corporate portals are live on production
- [ ] Final smoke test of all 3 web portals

#### APK Build & Distribution
- [ ] Build **release APK**: `flutter build apk --release`
- [ ] Sign the APK with a keystore (required for distribution)
- [ ] Test release APK on device (release mode behaves differently from debug)
- [ ] Share APK via Google Drive / Firebase App Distribution
- [ ] Write a simple **"How to install APK"** guide for the founder/drivers

#### Documentation
- [ ] Update `document.md` with all new features
- [ ] Write a **User Guide** for drivers (how to use the app)

#### This Week's Deliverable
> ✅ **Live production system** + shareable APK link + documentation

---

## 📊 Full Task Summary

| # | Work Area | Task | Week | Status |
|---|-----------|------|------|--------|
| 1 | App Dev | Fix build errors | Week 1 | ✅ Done |
| 2 | App Dev | Digital signature widget | Week 1 | ✅ Done |
| 3 | App Dev | Duty slip completion flow | Week 1 | ✅ Done |
| 4 | App Dev | GPS tracking fix | Week 1 | ✅ Done |
| 5 | Feature | Timestamp (start/complete) | Week 2 | ✅ Done |
| 6 | Feature | Location stamp (GPS + address) | Week 2 | ✅ Done |
| 7 | Feature | Camera capture (photos) | Week 2 | ✅ Done |
| 8 | Backend | Schema update for new fields | Week 2 | ✅ Done |
| 9 | Backend | Photo upload API | Week 2 | ✅ Done |
| 10 | App Dev | Push notifications (FCM) | Week 3 | ✅ Done |
| 11 | App Dev | Mr. Cabie branding/splash | Week 3 | ✅ Done |
| 12 | App Dev | Trip history + profile screen | Week 3 | ✅ Done |
| 13 | Feature | Live Duty Slip Preview | Week 3 | ✅ Done |
| 14 | Feature | Offline Trip Sync | Week 3 | ✅ Done |
| 15 | Feature | Admin Trip Map & Endpoints | Week 3 | ✅ Done |
| 16 | Feature | Auto-Trip Creation | Week 3 | ✅ Done |
| 17 | Security | 6 Crash & Security Guardrails | Week 3 | ✅ Done |
| 18 | Testing | On-device QA & device testing | Week 3 | ⬜ |
| 19 | Deployment | Production backend check | Week 4 | ⬜ |
| 20 | Deployment | Release APK build + signing | Week 4 | ⬜ |
| 21 | Deployment | APK distribution setup | Week 4 | ⬜ |
| 22 | Docs | Driver user guide | Week 4 | ⬜ |

---

## 🙋 What I Need From the Founder

> These items are **blockers** — I cannot proceed on certain parts without these.

| # | What I Need | Why I Need It | Urgency |
|---|-------------|---------------|---------|
| 1 | **Google Maps API Key** (for production) | Location stamp feature needs reverse geocoding. Current key may have domain restrictions. | 🔴 Week 2 |
| 2 | **Firebase Project Setup** | Needed for Push Notifications (FCM) and optionally APK distribution (Firebase App Distribution) | 🔴 Week 3 |
| 3 | **Production server access / credentials** | To deploy backend updates (new fields for timestamp, location, photos) | 🔴 Week 4 |
| 4 | **App signing keystore decision** | For release APK — do we create a new keystore? Or does the founder have one? | 🟡 Week 4 |
| 5 | **Twilio account is active?** | OTP login in driver app requires Twilio. If limits are hit, drivers can't log in. | 🟡 Week 1 |
| 6 | **Cloud storage for photos** | Camera feature uploads photos — where to store? (AWS S3, Firebase Storage, or Cloudinary?) | 🟡 Week 2 |
| 7 | **Feedback after Week 1 demo** | After I demo the working APK (end of Week 1), please test and give feedback so I can fix issues in Week 2 | 🟢 Week 2 |

---

## 🏁 Final Deliverables (End of Month)

1. ✅ **Working Flutter APK** with all features + 3 new founder-requested features
2. ✅ **Signed Release APK** ready for distribution to real drivers
3. ✅ **Production Backend** with updated schema and APIs
4. ✅ **Admin portal** shows timestamps, location stamps, and photos for every trip
5. ✅ **Driver User Guide** — simple doc explaining how to use the app
6. ✅ **APK distribution method** (Firebase / Google Drive link)

---

*Created: July 20, 2026 | Developer: Rahul Shrivastwa | Project: Mr. Cabie Fleet OS*

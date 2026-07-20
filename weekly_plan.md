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

## ✅ Current Status (as of July 20, 2026)

| Component | Status | % Done |
|-----------|--------|--------|
| Backend API (FastAPI) | ✅ Running | 85% |
| Admin Web Portal | ✅ Complete | 100% |
| Corporate Web Portal | ✅ Complete | 100% |
| Driver Web Portal | ✅ Complete | 100% |
| Flutter Driver App | ⚠️ Partial | 60% |
| Production Deployment | ⚠️ Partial | 50% |

---

## 📅 Week-by-Week Plan

---

### 📅 WEEK 1 — July 20–27 | Foundation & Core App Completion

> **Goal:** Fix the build, complete all missing core screens, and get the app running end-to-end on a real device.

#### App Development Tasks
- [x] Fix Android Gradle/Kotlin/AGP build errors *(done today)*
- [ ] Complete **Digital Signature widget** in Flutter (finger-draw on screen)
- [ ] Complete **Duty Slip flow** — driver can fill and submit duty slip from app
- [ ] Complete **Trip completion flow** — opening KM → closing KM → signature → submit
- [ ] Fix GPS location tracking to send updates every 30 seconds to backend
- [ ] Test full trip flow: Accept → Start → Complete → Sign on real device (Infinix X689)

#### Backend Tasks
- [ ] Add/verify API endpoint: `POST /api/driver/trips/{id}/duty-slip` — submit duty slip from app
- [ ] Verify all Driver APIs are working correctly with the Flutter app

#### This Week's Deliverable
> ✅ A working Flutter APK that can do a **complete trip from start to finish** on a real phone

---

### 📅 WEEK 2 — July 27 – Aug 3 | New Features (Founder Request)

> **Goal:** Implement Timestamp, Location Stamp, and Camera Capture features in the driver app.

#### Feature 1: ⏰ Timestamp
- [ ] Record exact `date + time` when driver:
  - Accepts a trip
  - Starts a trip
  - Completes a trip
- [ ] Store timestamps in backend database (add fields to duty slip & trip models)
- [ ] Show timestamps in Admin portal duty slip view
- [ ] Design API: `PATCH /api/driver/trips/{id}/start` → now saves `started_at: "2026-07-20T10:30:00"`

#### Feature 2: 📍 Location Stamp
- [ ] Capture GPS coordinates (lat/lng) + reverse geocode to readable address when:
  - Driver starts a trip → **Pickup Location Stamp**
  - Driver completes a trip → **Drop Location Stamp**
- [ ] Use `geolocator` + `geocoding` Flutter packages
- [ ] Store `{lat, lng, address, timestamp}` in backend per trip event
- [ ] Show on Admin portal: "Started at: Connaught Place, New Delhi (28.6315, 77.2167)"

#### Feature 3: 📸 Camera Capture
- [ ] Driver takes a photo when **starting a trip** (e.g., vehicle/odometer photo)
- [ ] Driver takes a photo when **completing a trip** (e.g., drop-off confirmation)
- [ ] Use `image_picker` Flutter package
- [ ] Upload photo to backend (store as base64 or cloud URL)
- [ ] Add API: `POST /api/driver/trips/{id}/upload-photo`
- [ ] Show photos in Admin portal duty slip view

#### Backend Tasks for Week 2
- [ ] Update `duties` and `duty_slips` database schema to store new fields:
  - `started_at`, `completed_at` — timestamps
  - `start_location`, `end_location` — {lat, lng, address}
  - `start_photo_url`, `end_photo_url` — camera captures
- [ ] Update existing APIs to accept and return new fields
- [ ] Add file upload endpoint for photos

#### This Week's Deliverable
> ✅ APK with all 3 new features working. Admin can see timestamps, location stamps, and photos for each trip.

---

### 📅 WEEK 3 — Aug 3–10 | Polish, Notifications & Branding

> **Goal:** Make the app feel production-ready with push notifications, good UI, and Mr. Cabie branding.

#### App Polish Tasks
- [ ] **Push Notifications** — Driver gets notified when a new trip is assigned
  - Use Firebase Cloud Messaging (FCM)
  - Backend sends notification when admin assigns trip
- [ ] **App Branding** — Update app with Mr. Cabie logo, colors, splash screen
- [ ] **Trip History screen** — Driver can view past completed trips
- [ ] **Profile/Settings screen** — Driver can see their name, phone, logout
- [ ] **Offline handling** — Show proper error message if no internet (no crashes)
- [ ] **Loading states** — Add proper loading spinners everywhere

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
| 2 | App Dev | Digital signature widget | Week 1 | ⬜ |
| 3 | App Dev | Duty slip completion flow | Week 1 | ⬜ |
| 4 | App Dev | GPS tracking fix | Week 1 | ⬜ |
| 5 | Feature | Timestamp (start/complete) | Week 2 | ⬜ |
| 6 | Feature | Location stamp (GPS + address) | Week 2 | ⬜ |
| 7 | Feature | Camera capture (photos) | Week 2 | ⬜ |
| 8 | Backend | Schema update for new fields | Week 2 | ⬜ |
| 9 | Backend | Photo upload API | Week 2 | ⬜ |
| 10 | App Dev | Push notifications (FCM) | Week 3 | ⬜ |
| 11 | App Dev | Mr. Cabie branding/splash | Week 3 | ⬜ |
| 12 | App Dev | Trip history + profile screen | Week 3 | ⬜ |
| 13 | Testing | Full flow test on real device | Week 3 | ⬜ |
| 14 | Deployment | Production backend check | Week 4 | ⬜ |
| 15 | Deployment | Release APK build + signing | Week 4 | ⬜ |
| 16 | Deployment | APK distribution setup | Week 4 | ⬜ |
| 17 | Docs | Driver user guide | Week 4 | ⬜ |

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

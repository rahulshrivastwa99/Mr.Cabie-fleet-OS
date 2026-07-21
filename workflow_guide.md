# 📘 Mr. Cabie — Complete Developer & Deployment Guide

> **Created for:** Rahul Shrivastwa (Developer)
> **Goal:** Develop the Driver App (APK), sync with Emergent & GitHub, and deploy to production smoothly.

---

## 🏗️ 1. System Architecture — How Everything Works Together

```
┌─────────────────────────────────────────────────────────────────┐
│                      GITHUB REPOSITORY                          │
│               rahulshrivastwa99/Mr.Cabie-fleet-OS               │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
  ┌─────────────────────────────┐  ┌─────────────────────────────┐
  │   EMERGENT CLOUD SERVER     │  │      YOUR LAPTOP            │
  │                             │  │                             │
  │ • Admin Portal (React)      │  │ • Flutter Code Editing      │
  │ • Corporate Portal (React)  │  │ • Wireless ADB to Mobile    │
  │ • FastAPI Backend (Python)  │  │ • Git Push / Pull           │
  │ • MongoDB Atlas Database    │  │                             │
  └──────────────┬──────────────┘  └──────────────┬──────────────┘
                 │                                │
                 └────────────────┬───────────────┘
                                  ▼
                     ┌──────────────────────────┐
                     │   PHYSICAL MOBILE PHONE  │
                     │  Mr. Cabie Driver APK    │
                     └──────────────────────────┘
```

1. **Web Portals (Admin & Corporate)**: Already built and running on Emergent Cloud (`https://fleet-os-preview-1.emergent.host`).
2. **Backend API**: Hosted on Emergent Cloud and connected to MongoDB Atlas database.
3. **Driver Mobile App**: Runs directly on your Android mobile phone over wireless/USB.

---

## ⚡ 2. How to Avoid Laptop Heating Up

To keep your laptop cool and fast:
- **Do NOT run heavy local servers on laptop.**
- Point the Driver App directly to the **Emergent Cloud Backend** (`https://duty-slip-flow.preview.emergentagent.com/api` or `https://fleet-os-preview-1.emergent.host/api`).
- Your laptop only compiles the Flutter code to your phone once, and then uses lightweight **Hot Reload (`r`)**.

---

## 🔄 3. Daily Workflow (Step-by-Step)

### Step 1 — Connect Phone Wirelessly (if disconnected)
On phone: **Settings → Developer Options → Wireless Debugging** → check `IP:PORT`.
In laptop terminal:
```bash
adb connect <IP>:<PORT>
```

### Step 2 — Run Flutter App on Phone
```bash
cd /d/Mr.Cabie-fleet-OS/driver_app
flutter run --android-skip-build-dependency-validation
```

### Step 3 — Fast Coding with Hot Reload
While coding in Flutter:
- Press **`r`** in terminal → **Hot Reload** (UI updates on phone in 1 second! ⚡)
- Press **`R`** in terminal → **Hot Restart** (Restarts app state in 3 seconds)

### Step 4 — End of Day Git Sync
Save your work to GitHub:
```bash
cd /d/Mr.Cabie-fleet-OS
git add .
git commit -m "feat(driver_app): completed task description"
git push origin main
```

---

## 🐙 4. GitHub & Emergent Sync Strategy

- Whenever you run `git push origin main`, your changes go straight to GitHub.
- Emergent automatically fetches the new commits from GitHub `main` branch.
- This ensures **zero merge conflicts** and keeps local, Emergent, and GitHub perfectly synchronized.

---

## 🔑 5. OTP & Driver Login Logic

- **B2B Security**: Only drivers registered in the database can log in.
- **Testing Credentials**:
  - Registered Phone: **`9876543210`**
  - Master Dev OTP: **`123456`** (always works in dev mode without waiting for SMS)

---

## 🚀 6. Production Deployment (Final APK Release)

When all features are completed and ready for the founder:

1. **Build Production Signed APK**:
   ```bash
   cd /d/Mr.Cabie-fleet-OS/driver_app
   flutter build apk --release --dart-define=API_BASE_URL=https://fleet-os-preview-1.emergent.host/api
   ```
2. **Output Location**:
   `driver_app/build/app/outputs/flutter-apk/app-release.apk`
3. **Share APK**: Upload the generated `app-release.apk` to Google Drive or Firebase App Distribution for the founder and drivers to install!

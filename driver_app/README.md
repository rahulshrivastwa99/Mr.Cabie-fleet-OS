# Fleet OS Driver App - Play Store Publishing Guide

## Quick Start Commands

### 1. Get Dependencies
```bash
flutter pub get
```

### 2. Build Debug APK (for testing)
```bash
flutter build apk --debug
```
Output: `build/app/outputs/flutter-apk/app-debug.apk`

### 3. Build Release APK (for Play Store)
```bash
# First, create a keystore (one-time)
keytool -genkey -v -keystore ~/fleet-os-driver-key.jks -keyalias fleet-os-driver -keyalg RSA -keysize 2048 -validity 10000

# Then configure signing in android/app/build.gradle
# Then build:
flutter build apk --release --dart-define=API_BASE_URL=https://your-production-domain.com/api
```
Output: `build/app/outputs/flutter-apk/app-release.apk`

### 4. Build App Bundle (Recommended for Play Store)
```bash
flutter build appbundle --release --dart-define=API_BASE_URL=https://your-production-domain.com/api
```
Output: `build/app/outputs/bundle/release/app-release.aab`

## Important: Update API URL Before Building
The app connects to your backend. Update the API_BASE_URL when building:
- Preview: https://fleet-os-preview-1.preview.emergentagent.com/api
- Production: Update to your deployed domain after clicking "Deploy" in Emergent

## Signing Configuration
Before building release, create `android/key.properties`:
```
storePassword=your-keystore-password
keyPassword=your-key-password
keyAlias=fleet-os-driver
storeFile=/path/to/fleet-os-driver-key.jks
```

Then update `android/app/build.gradle` to use these properties.

## Test Credentials
- Phone: 9876543210
- OTP: Check backend logs or use debug mode

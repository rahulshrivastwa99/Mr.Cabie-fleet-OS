"""
Backend Test Suite for Founder-Requested Driver App Features
Tests timestamp, location stamp, and camera capture features
"""
import requests
import json
import io
from PIL import Image
from datetime import datetime, timedelta, timezone
import base64

# Base URL from frontend/.env
BASE_URL = "https://duty-slip-flow.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@fleetOS.com"
ADMIN_PASSWORD = "password123"
DRIVER_PHONE = "+919999999999"
DEV_OTP = "123456"

# Global variables to store IDs
admin_token = None
driver_token = None
client_id = None
vehicle_id = None
driver_id = None
trip_id = None


def create_test_image():
    """Create a tiny in-memory JPEG for testing"""
    img = Image.new('RGB', (10, 10), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    return img_bytes


def test_admin_login():
    """Test A: Admin login"""
    global admin_token
    print("\n=== Test: Admin Login ===")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    assert "access_token" in data, "No access token in response"
    
    admin_token = data["access_token"]
    print(f"✅ Admin login successful, token: {admin_token[:20]}...")
    return True


def test_create_client():
    """Test B: Create a client"""
    global client_id
    print("\n=== Test: Create Client ===")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.post(
        f"{BASE_URL}/clients",
        headers=headers,
        json={
            "company_name": "TestCorp",
            "contact_person": "T",
            "email": "t@t.com",
            "phone": "+911111111111",
            "gstin": "22AAAAA0000A1Z5"
        }
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    assert response.status_code == 200, f"Client creation failed: {response.text}"
    data = response.json()
    assert "id" in data, "No client ID in response"
    
    client_id = data["id"]
    print(f"✅ Client created with ID: {client_id}")
    return True


def test_create_vehicle():
    """Test C: Create a vehicle"""
    global vehicle_id
    print("\n=== Test: Create Vehicle ===")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.post(
        f"{BASE_URL}/vehicles",
        headers=headers,
        json={
            "registration_number": "TS01AB1234",
            "vehicle_type": "SEDAN"
        }
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    assert response.status_code == 200, f"Vehicle creation failed: {response.text}"
    data = response.json()
    assert "id" in data, "No vehicle ID in response"
    
    vehicle_id = data["id"]
    print(f"✅ Vehicle created with ID: {vehicle_id}")
    return True


def test_create_driver():
    """Test D: Create a driver"""
    global driver_id
    print("\n=== Test: Create Driver ===")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.post(
        f"{BASE_URL}/drivers",
        headers=headers,
        json={
            "name": "Test Driver",
            "phone": DRIVER_PHONE,
            "license_number": "LIC123"
        }
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    assert response.status_code == 200, f"Driver creation failed: {response.text}"
    data = response.json()
    assert "id" in data, "No driver ID in response"
    
    driver_id = data["id"]
    print(f"✅ Driver created with ID: {driver_id}")
    return True


def test_create_trip():
    """Test E: Create a trip/duty"""
    global trip_id
    print("\n=== Test: Create Trip ===")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    pickup_time = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    
    response = requests.post(
        f"{BASE_URL}/duties",
        headers=headers,
        json={
            "client_id": client_id,
            "pickup_location": "Connaught Place, New Delhi",
            "dropoff_location": "India Gate, New Delhi",
            "pickup_time": pickup_time,
            "passenger_name": "John Doe",
            "passenger_phone": "+919876543210",
            "trip_type": "ONE_WAY"
        }
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    assert response.status_code == 200, f"Trip creation failed: {response.text}"
    data = response.json()
    assert "id" in data, "No trip ID in response"
    
    trip_id = data["id"]
    print(f"✅ Trip created with ID: {trip_id}")
    return True


def test_assign_trip():
    """Test F: Assign driver and vehicle to trip"""
    print("\n=== Test: Assign Trip ===")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.patch(
        f"{BASE_URL}/duties/{trip_id}/assign",
        headers=headers,
        json={
            "driver_id": driver_id,
            "vehicle_id": vehicle_id
        }
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    assert response.status_code == 200, f"Trip assignment failed: {response.text}"
    
    # Verify trip is ASSIGNED
    response = requests.get(
        f"{BASE_URL}/duties/{trip_id}",
        headers=headers
    )
    data = response.json()
    assert data["status"] == "ASSIGNED", f"Trip status is {data['status']}, expected ASSIGNED"
    
    print(f"✅ Trip assigned successfully, status: {data['status']}")
    return True


def test_driver_otp_login():
    """Test G: Driver OTP login"""
    global driver_token
    print("\n=== Test: Driver OTP Login ===")
    
    # Send OTP
    print("Sending OTP...")
    response = requests.post(
        f"{BASE_URL}/driver/auth/send-otp",
        json={"phone": DRIVER_PHONE}
    )
    
    print(f"Send OTP Status: {response.status_code}")
    print(f"Send OTP Response: {response.text}")
    
    assert response.status_code == 200, f"Send OTP failed: {response.text}"
    
    # Verify OTP
    print("Verifying OTP...")
    response = requests.post(
        f"{BASE_URL}/driver/auth/verify-otp",
        json={"phone": DRIVER_PHONE, "otp": DEV_OTP}
    )
    
    print(f"Verify OTP Status: {response.status_code}")
    print(f"Verify OTP Response: {response.text}")
    
    assert response.status_code == 200, f"Verify OTP failed: {response.text}"
    data = response.json()
    assert "access_token" in data, "No access token in response"
    
    driver_token = data["access_token"]
    print(f"✅ Driver login successful, token: {driver_token[:20]}...")
    return True


def test_driver_accept_trip():
    """Test H: Driver accepts trip"""
    print("\n=== Test: Driver Accept Trip ===")
    
    headers = {"Authorization": f"Bearer {driver_token}"}
    response = requests.patch(
        f"{BASE_URL}/driver/trips/{trip_id}/accept",
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    assert response.status_code == 200, f"Accept trip failed: {response.text}"
    
    # Verify trip is ACCEPTED
    response = requests.get(
        f"{BASE_URL}/driver/trips/{trip_id}",
        headers=headers
    )
    data = response.json()
    assert data["trip"]["status"] == "ACCEPTED", f"Trip status is {data['trip']['status']}, expected ACCEPTED"
    
    print(f"✅ Trip accepted successfully, status: {data['trip']['status']}")
    return True


def test_trip_start_with_location():
    """Test A — Trip Start: timestamp + location stamp"""
    print("\n=== Test A: Trip Start with Timestamp + Location Stamp ===")
    
    headers = {"Authorization": f"Bearer {driver_token}"}
    response = requests.post(
        f"{BASE_URL}/driver/trips/{trip_id}/start",
        headers=headers,
        json={
            "opening_km": 12345.0,
            "driver_remarks": "Starting",
            "latitude": 28.6139,
            "longitude": 77.2090,
            "address": "Connaught Place, New Delhi"
        }
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    assert response.status_code == 200, f"Trip start failed: {response.text}"
    
    # Verify trip details
    response = requests.get(
        f"{BASE_URL}/driver/trips/{trip_id}",
        headers=headers
    )
    
    print(f"Get Trip Status: {response.status_code}")
    print(f"Get Trip Response: {response.text}")
    
    assert response.status_code == 200, f"Get trip failed: {response.text}"
    data = response.json()
    
    trip = data["trip"]
    duty_slip = data["duty_slip"]
    
    # Assertions
    assert trip["status"] == "STARTED", f"Trip status is {trip['status']}, expected STARTED"
    assert trip["started_at"] is not None, "Trip started_at is null"
    assert trip["start_location"] is not None, "Trip start_location is null"
    assert trip["start_location"]["latitude"] == 28.6139, f"Latitude mismatch: {trip['start_location']['latitude']}"
    assert trip["start_location"]["longitude"] == 77.2090, f"Longitude mismatch: {trip['start_location']['longitude']}"
    assert trip["start_location"]["address"] == "Connaught Place, New Delhi", f"Address mismatch: {trip['start_location']['address']}"
    
    assert duty_slip["started_at"] is not None, "Duty slip started_at is null"
    assert duty_slip["start_location"] is not None, "Duty slip start_location is null"
    assert duty_slip["start_location"]["latitude"] == 28.6139, f"Duty slip latitude mismatch: {duty_slip['start_location']['latitude']}"
    
    print("✅ Test A PASSED: Trip start with timestamp + location stamp working correctly")
    return True


def test_upload_start_photo():
    """Test B — Upload start photo (multipart)"""
    print("\n=== Test B: Upload Start Photo ===")
    
    headers = {"Authorization": f"Bearer {driver_token}"}
    
    # Create test image
    img_bytes = create_test_image()
    
    files = {
        'photo': ('test_start.jpg', img_bytes, 'image/jpeg')
    }
    data = {
        'photo_type': 'start'
    }
    
    response = requests.post(
        f"{BASE_URL}/driver/trips/{trip_id}/upload-photo",
        headers=headers,
        files=files,
        data=data
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    assert response.status_code == 200, f"Upload start photo failed: {response.text}"
    
    result = response.json()
    assert "photo_url" in result, "No photo_url in response"
    assert result["photo_type"] == "start", f"Photo type mismatch: {result['photo_type']}"
    assert result["photo_url"].startswith("/api/uploads/duty_photos/"), f"Invalid photo URL: {result['photo_url']}"
    
    photo_url = result["photo_url"]
    
    # Verify photo is accessible
    full_url = f"https://duty-slip-flow.preview.emergentagent.com{photo_url}"
    photo_response = requests.get(full_url)
    
    print(f"Photo fetch status: {photo_response.status_code}")
    print(f"Photo content-type: {photo_response.headers.get('content-type')}")
    
    assert photo_response.status_code == 200, f"Photo not accessible: {photo_response.status_code}"
    assert "image" in photo_response.headers.get('content-type', ''), "Invalid content type"
    
    # Verify duty slip has start_photo_url
    trip_response = requests.get(
        f"{BASE_URL}/driver/trips/{trip_id}",
        headers=headers
    )
    trip_data = trip_response.json()
    duty_slip = trip_data["duty_slip"]
    
    assert duty_slip["start_photo_url"] == photo_url, f"Duty slip start_photo_url mismatch: {duty_slip.get('start_photo_url')}"
    
    print(f"✅ Test B PASSED: Start photo uploaded and accessible at {photo_url}")
    return True


def test_upload_photo_validation():
    """Test C — Validation on upload-photo"""
    print("\n=== Test C: Upload Photo Validation ===")
    
    headers = {"Authorization": f"Bearer {driver_token}"}
    
    # Test 1: Invalid photo_type
    print("Testing invalid photo_type...")
    img_bytes = create_test_image()
    files = {'photo': ('test.jpg', img_bytes, 'image/jpeg')}
    data = {'photo_type': 'middle'}
    
    response = requests.post(
        f"{BASE_URL}/driver/trips/{trip_id}/upload-photo",
        headers=headers,
        files=files,
        data=data
    )
    
    print(f"Invalid photo_type status: {response.status_code}")
    print(f"Invalid photo_type response: {response.text}")
    
    assert response.status_code == 400, f"Expected 400 for invalid photo_type, got {response.status_code}"
    
    # Test 2: Invalid file type
    print("Testing invalid file type...")
    text_file = io.BytesIO(b"This is not an image")
    files = {'photo': ('test.txt', text_file, 'text/plain')}
    data = {'photo_type': 'start'}
    
    response = requests.post(
        f"{BASE_URL}/driver/trips/{trip_id}/upload-photo",
        headers=headers,
        files=files,
        data=data
    )
    
    print(f"Invalid file type status: {response.status_code}")
    print(f"Invalid file type response: {response.text}")
    
    assert response.status_code == 400, f"Expected 400 for invalid file type, got {response.status_code}"
    
    print("✅ Test C PASSED: Photo upload validation working correctly")
    return True


def test_trip_complete_with_location():
    """Test D — Trip Complete: timestamp + end location + traveller + signature"""
    print("\n=== Test D: Trip Complete with Timestamp + Location + Traveller + Signature ===")
    
    headers = {"Authorization": f"Bearer {driver_token}"}
    
    # Create a simple base64 signature (1x1 PNG)
    signature_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    
    response = requests.post(
        f"{BASE_URL}/driver/trips/{trip_id}/complete",
        headers=headers,
        json={
            "closing_km": 12365.5,
            "traveller_name": "John Doe",
            "passenger_signature": signature_base64,
            "driver_remarks": "Trip complete",
            "latitude": 28.6304,
            "longitude": 77.2177,
            "address": "India Gate, New Delhi"
        }
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    assert response.status_code == 200, f"Trip complete failed: {response.text}"
    
    result = response.json()
    assert result["total_km"] == 20.5, f"Total KM mismatch: {result['total_km']}, expected 20.5"
    
    # Verify trip details (trip might be in history now)
    response = requests.get(
        f"{BASE_URL}/driver/trips/{trip_id}",
        headers=headers
    )
    
    print(f"Get Trip Status: {response.status_code}")
    print(f"Get Trip Response: {response.text}")
    
    assert response.status_code == 200, f"Get trip failed: {response.text}"
    data = response.json()
    
    trip = data["trip"]
    duty_slip = data["duty_slip"]
    
    # Assertions
    assert trip["status"] == "COMPLETED", f"Trip status is {trip['status']}, expected COMPLETED"
    assert trip["completed_at"] is not None, "Trip completed_at is null"
    assert trip["end_location"] is not None, "Trip end_location is null"
    assert trip["end_location"]["address"] == "India Gate, New Delhi", f"End address mismatch: {trip['end_location']['address']}"
    
    assert duty_slip["status"] == "SIGNED", f"Duty slip status is {duty_slip['status']}, expected SIGNED"
    assert duty_slip["completed_at"] is not None, "Duty slip completed_at is null"
    assert duty_slip["end_location"] is not None, "Duty slip end_location is null"
    assert duty_slip["end_location"]["address"] == "India Gate, New Delhi", f"Duty slip end address mismatch: {duty_slip['end_location']['address']}"
    assert duty_slip["traveller_name"] == "John Doe", f"Traveller name mismatch: {duty_slip['traveller_name']}"
    assert duty_slip["passenger_signature"] is not None, "Passenger signature is null"
    assert duty_slip["total_km"] == 20.5, f"Duty slip total_km mismatch: {duty_slip['total_km']}"
    
    print("✅ Test D PASSED: Trip complete with timestamp + location + traveller + signature working correctly")
    return True


def test_upload_end_photo():
    """Test E — Upload end photo"""
    print("\n=== Test E: Upload End Photo ===")
    
    headers = {"Authorization": f"Bearer {driver_token}"}
    
    # Create test image
    img_bytes = create_test_image()
    
    files = {
        'photo': ('test_end.jpg', img_bytes, 'image/jpeg')
    }
    data = {
        'photo_type': 'end'
    }
    
    response = requests.post(
        f"{BASE_URL}/driver/trips/{trip_id}/upload-photo",
        headers=headers,
        files=files,
        data=data
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    assert response.status_code == 200, f"Upload end photo failed: {response.text}"
    
    result = response.json()
    assert "photo_url" in result, "No photo_url in response"
    assert result["photo_type"] == "end", f"Photo type mismatch: {result['photo_type']}"
    
    photo_url = result["photo_url"]
    
    # Verify duty slip has end_photo_url
    trip_response = requests.get(
        f"{BASE_URL}/driver/trips/{trip_id}",
        headers=headers
    )
    trip_data = trip_response.json()
    duty_slip = trip_data["duty_slip"]
    
    assert duty_slip["end_photo_url"] == photo_url, f"Duty slip end_photo_url mismatch: {duty_slip.get('end_photo_url')}"
    
    print(f"✅ Test E PASSED: End photo uploaded and linked to duty slip at {photo_url}")
    return True


def test_auth_guard():
    """Test F — Auth guard"""
    print("\n=== Test F: Auth Guard ===")
    
    # Try to upload photo without JWT
    img_bytes = create_test_image()
    files = {'photo': ('test.jpg', img_bytes, 'image/jpeg')}
    data = {'photo_type': 'start'}
    
    response = requests.post(
        f"{BASE_URL}/driver/trips/{trip_id}/upload-photo",
        files=files,
        data=data
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    assert response.status_code in [401, 403], f"Expected 401 or 403 without JWT, got {response.status_code}"
    
    print("✅ Test F PASSED: Auth guard working correctly")
    return True


def run_all_tests():
    """Run all tests in sequence"""
    print("=" * 80)
    print("BACKEND TEST SUITE - FOUNDER-REQUESTED DRIVER APP FEATURES")
    print("=" * 80)
    
    tests = [
        ("Admin Login", test_admin_login),
        ("Create Client", test_create_client),
        ("Create Vehicle", test_create_vehicle),
        ("Create Driver", test_create_driver),
        ("Create Trip", test_create_trip),
        ("Assign Trip", test_assign_trip),
        ("Driver OTP Login", test_driver_otp_login),
        ("Driver Accept Trip", test_driver_accept_trip),
        ("Test A: Trip Start with Location", test_trip_start_with_location),
        ("Test B: Upload Start Photo", test_upload_start_photo),
        ("Test C: Upload Photo Validation", test_upload_photo_validation),
        ("Test D: Trip Complete with Location", test_trip_complete_with_location),
        ("Test E: Upload End Photo", test_upload_end_photo),
        ("Test F: Auth Guard", test_auth_guard),
    ]
    
    passed = 0
    failed = 0
    errors = []
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
        except AssertionError as e:
            failed += 1
            error_msg = f"{test_name}: {str(e)}"
            errors.append(error_msg)
            print(f"❌ {test_name} FAILED: {e}")
        except Exception as e:
            failed += 1
            error_msg = f"{test_name}: Unexpected error - {str(e)}"
            errors.append(error_msg)
            print(f"❌ {test_name} ERROR: {e}")
    
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total Tests: {len(tests)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if errors:
        print("\nFailed Tests:")
        for error in errors:
            print(f"  - {error}")
    
    print("=" * 80)
    
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)

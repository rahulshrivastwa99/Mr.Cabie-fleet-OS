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
import uuid

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
    """Test 1: Admin login"""
    global admin_token
    print("\n=== Test 1: Admin Login ===")
    
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
    """Test 2: Create a client with unique email/phone"""
    global client_id
    print("\n=== Test 2: Create Client ===")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Create new client with timestamp to avoid duplicates
    timestamp = int(datetime.now().timestamp())
    response = requests.post(
        f"{BASE_URL}/clients",
        headers=headers,
        json={
            "company_name": f"TestCorp_{timestamp}",
            "contact_person": "Test Contact",
            "email": f"test{timestamp}@testcorp.com",
            "phone": f"+91{timestamp % 10000000000:010d}",
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
    """Test 3: Create a vehicle with all required fields"""
    global vehicle_id
    print("\n=== Test 3: Create Vehicle ===")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    timestamp = int(datetime.now().timestamp())
    
    response = requests.post(
        f"{BASE_URL}/vehicles",
        headers=headers,
        json={
            "registration_number": f"TS{timestamp % 100:02d}AB{timestamp % 10000:04d}",
            "vehicle_type": "SEDAN",
            "model": "Dzire",
            "manufacturer": "Maruti",
            "year": 2023,
            "capacity": 4
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
    """Test 4: Create a driver with unique phone"""
    global driver_id, DRIVER_PHONE
    print("\n=== Test 4: Create Driver ===")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Generate unique phone number
    timestamp = int(datetime.now().timestamp())
    DRIVER_PHONE = f"+91{timestamp % 10000000000:010d}"
    
    response = requests.post(
        f"{BASE_URL}/drivers",
        headers=headers,
        json={
            "name": "Test Driver",
            "email": f"testdriver{timestamp}@fleet.com",
            "phone": DRIVER_PHONE,
            "license_number": f"LIC{timestamp % 100000:05d}"
        }
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    assert response.status_code == 200, f"Driver creation failed: {response.text}"
    data = response.json()
    assert "id" in data, "No driver ID in response"
    
    driver_id = data["id"]
    print(f"✅ Driver created with ID: {driver_id}, phone: {DRIVER_PHONE}")
    return True


def test_create_trip_via_api():
    """Test 5: Create a trip via POST /api/duties"""
    global trip_id
    print("\n=== Test 5: Create Trip via API ===")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    pickup_time = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    
    response = requests.post(
        f"{BASE_URL}/duties",
        headers=headers,
        json={
            "client_id": client_id,
            "trip_type": "ONE_WAY",
            "pickup_location": "Connaught Place, New Delhi",
            "dropoff_location": "India Gate, New Delhi",
            "pickup_time": pickup_time,
            "passenger_name": "Test Passenger",
            "passenger_phone": "+919000000000"
        }
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    assert response.status_code == 200, f"Trip creation failed: {response.text}"
    data = response.json()
    assert "id" in data, "No trip ID in response"
    
    trip_id = data["id"]
    print(f"✅ Trip created via API with ID: {trip_id}")
    return True


def test_assign_trip_via_api():
    """Test 6: Assign driver and vehicle via PATCH /api/duties/{trip_id}/assign"""
    print("\n=== Test 6: Assign Trip via API ===")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    response = requests.patch(
        f"{BASE_URL}/duties/{trip_id}/assign",
        headers=headers,
        json={
            "vehicle_id": vehicle_id,
            "driver_id": driver_id
        }
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    assert response.status_code == 200, f"Trip assignment failed: {response.text}"
    data = response.json()
    assert data["status"] == "ASSIGNED", f"Trip status is {data['status']}, expected ASSIGNED"
    assert data["driver_id"] == driver_id, "Driver ID mismatch"
    assert data["vehicle_id"] == vehicle_id, "Vehicle ID mismatch"
    
    print(f"✅ Trip assigned successfully to driver {driver_id} and vehicle {vehicle_id}")
    return True


def test_driver_otp_login():
    """Test 7: Driver OTP login"""
    global driver_token
    print("\n=== Test 7: Driver OTP Login ===")
    
    # Send OTP
    print(f"Sending OTP to {DRIVER_PHONE}...")
    response = requests.post(
        f"{BASE_URL}/driver/auth/send-otp",
        json={"phone": DRIVER_PHONE}
    )
    
    print(f"Send OTP Status: {response.status_code}")
    print(f"Send OTP Response: {response.text}")
    
    assert response.status_code == 200, f"Send OTP failed: {response.text}"
    
    # Get debug OTP if available
    response_data = response.json()
    otp_to_use = response_data.get("debug_otp", DEV_OTP)
    
    # Verify OTP
    print(f"Verifying OTP: {otp_to_use}...")
    response = requests.post(
        f"{BASE_URL}/driver/auth/verify-otp",
        json={"phone": DRIVER_PHONE, "otp": otp_to_use}
    )
    
    print(f"Verify OTP Status: {response.status_code}")
    print(f"Verify OTP Response: {response.text}")
    
    assert response.status_code == 200, f"Verify OTP failed: {response.text}"
    data = response.json()
    assert "token" in data, "No access token in response"
    
    driver_token = data["token"]
    print(f"✅ Driver login successful, token: {driver_token[:20]}...")
    return True


def test_driver_get_trips():
    """Test 8: Driver can see assigned trip via GET /api/driver/trips"""
    print("\n=== Test 8: Driver Get Trips ===")
    
    headers = {"Authorization": f"Bearer {driver_token}"}
    response = requests.get(
        f"{BASE_URL}/driver/trips",
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    assert response.status_code == 200, f"Get trips failed: {response.text}"
    trips = response.json()
    assert isinstance(trips, list), "Response should be a list"
    assert len(trips) > 0, "Driver should have at least one trip"
    
    # Verify our trip is in the list
    trip_ids = [t["id"] for t in trips]
    assert trip_id in trip_ids, f"Trip {trip_id} not found in driver's trips"
    
    print(f"✅ Driver can see {len(trips)} trip(s), including trip {trip_id}")
    return True


def test_driver_accept_trip():
    """Test 9: Driver accepts trip"""
    print("\n=== Test 9: Driver Accept Trip ===")
    
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
    
    # Test 3: No JWT (auth guard)
    print("Testing auth guard (no JWT)...")
    img_bytes = create_test_image()
    files = {'photo': ('test.jpg', img_bytes, 'image/jpeg')}
    data = {'photo_type': 'start'}
    
    response = requests.post(
        f"{BASE_URL}/driver/trips/{trip_id}/upload-photo",
        files=files,
        data=data
    )
    
    print(f"No JWT status: {response.status_code}")
    print(f"No JWT response: {response.text}")
    
    assert response.status_code in [401, 403], f"Expected 401 or 403 without JWT, got {response.status_code}"
    
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


def test_driver_location_endpoint():
    """Test F — Driver location endpoint (NEW)"""
    print("\n=== Test F: Driver Location Endpoint ===")
    
    headers = {"Authorization": f"Bearer {driver_token}"}
    
    response = requests.post(
        f"{BASE_URL}/driver/location",
        headers=headers,
        json={
            "latitude": 28.6139,
            "longitude": 77.2090,
            "accuracy": 5.0,
            "trip_id": trip_id
        }
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    assert response.status_code == 200, f"Driver location update failed: {response.text}"
    
    result = response.json()
    assert "message" in result, "No message in response"
    assert "timestamp" in result, "No timestamp in response"
    
    print(f"✅ Test F PASSED: Driver location endpoint working correctly")
    return True


def run_all_tests():
    """Run all tests in sequence"""
    print("=" * 80)
    print("BACKEND TEST SUITE - FOUNDER-REQUESTED DRIVER APP FEATURES")
    print("=" * 80)
    
    tests = [
        ("1. Admin Login", test_admin_login),
        ("2. Create Client", test_create_client),
        ("3. Create Vehicle", test_create_vehicle),
        ("4. Create Driver", test_create_driver),
        ("5. Create Trip via API", test_create_trip_via_api),
        ("6. Assign Trip via API", test_assign_trip_via_api),
        ("7. Driver OTP Login", test_driver_otp_login),
        ("8. Driver Get Trips", test_driver_get_trips),
        ("9. Driver Accept Trip", test_driver_accept_trip),
        ("A. Trip Start with Location", test_trip_start_with_location),
        ("B. Upload Start Photo", test_upload_start_photo),
        ("C. Upload Photo Validation", test_upload_photo_validation),
        ("D. Trip Complete with Location", test_trip_complete_with_location),
        ("E. Upload End Photo", test_upload_end_photo),
        ("F. Driver Location Endpoint", test_driver_location_endpoint),
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

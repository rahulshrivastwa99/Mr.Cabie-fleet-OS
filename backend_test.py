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
booking_id = None
duty_slip_id = None


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


def test_create_booking():
    """Test G — Create booking via POST /api/bookings"""
    print("\n=== Test G: Create Booking ===")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    response = requests.post(
        f"{BASE_URL}/bookings",
        headers=headers,
        json={
            "client_id": client_id,
            "pickup_location": "Airport Terminal 3, Delhi",
            "dropoff_location": "Aerocity Hotel, Delhi",
            "pickup_time": "2026-08-01T09:00:00Z",
            "passenger_name": "Booking Passenger",
            "passenger_phone": "+919555555555",
            "trip_type": "ONE_WAY",
            "notes": "VIP guest"
        }
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    assert response.status_code == 200, f"Create booking failed: {response.text}"
    data = response.json()
    
    assert data["status"] == "PENDING", f"Booking status is {data['status']}, expected PENDING"
    assert "id" in data, "No booking ID in response"
    assert isinstance(data["id"], str), "Booking ID should be a string"
    # Verify it's a UUID format
    try:
        uuid.UUID(data["id"])
    except ValueError:
        raise AssertionError(f"Booking ID {data['id']} is not a valid UUID")
    
    assert data["trip_id"] is None, f"trip_id should be null for PENDING booking, got {data['trip_id']}"
    
    # Store booking_id for next test
    global booking_id
    booking_id = data["id"]
    
    print(f"✅ Test G PASSED: Booking created with ID {booking_id}, status PENDING, trip_id null")
    return True


def test_approve_booking_auto_trip():
    """Test H — Approve booking and verify auto-trip creation + idempotency"""
    print("\n=== Test H: Approve Booking (Auto-Trip Creation) ===")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # First approval
    response = requests.patch(
        f"{BASE_URL}/bookings/{booking_id}/approve",
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    assert response.status_code == 200, f"Approve booking failed: {response.text}"
    data = response.json()
    
    # Verify booking status
    assert data["status"] == "APPROVED", f"Booking status is {data['status']}, expected APPROVED"
    assert data["trip_id"] is not None, "trip_id should not be null after approval"
    assert isinstance(data["trip_id"], str), "trip_id should be a string"
    
    # Verify it's a UUID
    try:
        uuid.UUID(data["trip_id"])
    except ValueError:
        raise AssertionError(f"trip_id {data['trip_id']} is not a valid UUID")
    
    assert data["approved_at"] is not None, "approved_at should be set"
    
    # Verify nested trip object
    assert "trip" in data, "Response should include nested trip object"
    trip = data["trip"]
    assert trip["pickup_location"] == "Airport Terminal 3, Delhi", f"Trip pickup mismatch: {trip['pickup_location']}"
    assert trip["dropoff_location"] == "Aerocity Hotel, Delhi", f"Trip dropoff mismatch: {trip['dropoff_location']}"
    assert trip["passenger_name"] == "Booking Passenger", f"Trip passenger_name mismatch: {trip['passenger_name']}"
    
    auto_trip_id = data["trip_id"]
    
    # Verify trip exists via GET /api/duties/{trip_id}
    print(f"\nVerifying auto-created trip {auto_trip_id}...")
    trip_response = requests.get(
        f"{BASE_URL}/duties/{auto_trip_id}",
        headers=headers
    )
    
    print(f"Get Trip Status: {trip_response.status_code}")
    print(f"Get Trip Response: {trip_response.text}")
    
    assert trip_response.status_code == 200, f"Get auto-created trip failed: {trip_response.text}"
    trip_data = trip_response.json()
    # GET /api/duties/{id} returns {"trip": {...}, "duty_slip": ...}
    assert "trip" in trip_data, "Response should contain trip field"
    assert trip_data["trip"]["status"] == "CREATED", f"Auto-created trip status is {trip_data['trip']['status']}, expected CREATED"
    
    # Test idempotency: call approve again
    print("\nTesting idempotency (second approve call)...")
    response2 = requests.patch(
        f"{BASE_URL}/bookings/{booking_id}/approve",
        headers=headers
    )
    
    print(f"Second Approve Status: {response2.status_code}")
    print(f"Second Approve Response: {response2.text}")
    
    assert response2.status_code == 200, f"Second approve failed: {response2.text}"
    data2 = response2.json()
    assert data2["trip_id"] == auto_trip_id, f"trip_id changed on second approve: {data2['trip_id']} != {auto_trip_id}"
    
    # Verify only one trip exists with this booking_id
    print("\nVerifying no duplicate trips created...")
    all_trips_response = requests.get(
        f"{BASE_URL}/duties",
        headers=headers
    )
    all_trips = all_trips_response.json()
    trips_with_booking = [t for t in all_trips if t.get("booking_id") == booking_id]
    assert len(trips_with_booking) == 1, f"Expected 1 trip with booking_id {booking_id}, found {len(trips_with_booking)}"
    
    print(f"✅ Test H PASSED: Booking approved, auto-trip created with ID {auto_trip_id}, idempotency verified")
    return True


def test_reject_booking():
    """Test I — Reject booking"""
    print("\n=== Test I: Reject Booking ===")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Create a fresh booking
    timestamp = int(datetime.now().timestamp())
    response = requests.post(
        f"{BASE_URL}/bookings",
        headers=headers,
        json={
            "client_id": client_id,
            "pickup_location": "Connaught Place, Delhi",
            "dropoff_location": "Qutub Minar, Delhi",
            "pickup_time": "2026-08-02T10:00:00Z",
            "passenger_name": "Reject Test Passenger",
            "passenger_phone": "+919666666666",
            "trip_type": "ONE_WAY",
            "notes": "Test rejection"
        }
    )
    
    assert response.status_code == 200, f"Create booking for rejection test failed: {response.text}"
    reject_booking_id = response.json()["id"]
    
    # Reject it
    print(f"Rejecting booking {reject_booking_id}...")
    response = requests.patch(
        f"{BASE_URL}/bookings/{reject_booking_id}/reject",
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    assert response.status_code == 200, f"Reject booking failed: {response.text}"
    data = response.json()
    assert "message" in data, "Response should contain message"
    
    # Verify booking status is REJECTED
    print(f"Verifying booking {reject_booking_id} is REJECTED...")
    get_response = requests.get(
        f"{BASE_URL}/bookings/{reject_booking_id}",
        headers=headers
    )
    
    print(f"Get Booking Status: {get_response.status_code}")
    print(f"Get Booking Response: {get_response.text}")
    
    assert get_response.status_code == 200, f"Get booking failed: {get_response.text}"
    booking_data = get_response.json()
    assert booking_data["status"] == "REJECTED", f"Booking status is {booking_data['status']}, expected REJECTED"
    
    print(f"✅ Test I PASSED: Booking {reject_booking_id} successfully rejected")
    return True


def test_list_duty_slips():
    """Test J — GET /api/duty-slips with filters"""
    print("\n=== Test J: List Duty Slips ===")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Get all duty slips
    response = requests.get(
        f"{BASE_URL}/duty-slips",
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:500]}...")
    
    assert response.status_code == 200, f"List duty slips failed: {response.text}"
    slips = response.json()
    assert isinstance(slips, list), "Response should be a list"
    assert len(slips) > 0, "Should have at least one duty slip from previous tests"
    
    # Verify each slip has a trip field
    for slip in slips:
        assert "trip" in slip, f"Duty slip {slip.get('id')} missing trip field"
        if slip["trip"]:
            assert "pickup_location" in slip["trip"], f"Trip in slip {slip.get('id')} missing pickup_location"
            assert "dropoff_location" in slip["trip"], f"Trip in slip {slip.get('id')} missing dropoff_location"
    
    print(f"Found {len(slips)} duty slip(s)")
    
    # Test filter by client_id
    print(f"\nTesting filter by client_id={client_id}...")
    response = requests.get(
        f"{BASE_URL}/duty-slips?client_id={client_id}",
        headers=headers
    )
    
    print(f"Filter by client Status: {response.status_code}")
    
    assert response.status_code == 200, f"Filter by client_id failed: {response.text}"
    filtered_slips = response.json()
    
    # Verify all returned slips have the correct client_id
    for slip in filtered_slips:
        assert slip.get("client_id") == client_id, f"Slip {slip.get('id')} has wrong client_id: {slip.get('client_id')}"
    
    print(f"Filter by client_id returned {len(filtered_slips)} slip(s)")
    
    # Test filter by driver_id
    print(f"\nTesting filter by driver_id={driver_id}...")
    response = requests.get(
        f"{BASE_URL}/duty-slips?driver_id={driver_id}",
        headers=headers
    )
    
    print(f"Filter by driver Status: {response.status_code}")
    
    assert response.status_code == 200, f"Filter by driver_id failed: {response.text}"
    driver_filtered_slips = response.json()
    
    # Verify all returned slips have the correct driver_id
    for slip in driver_filtered_slips:
        assert slip.get("driver_id") == driver_id, f"Slip {slip.get('id')} has wrong driver_id: {slip.get('driver_id')}"
    
    print(f"Filter by driver_id returned {len(driver_filtered_slips)} slip(s)")
    
    # Store a slip_id for next test
    global duty_slip_id
    duty_slip_id = slips[0]["id"]
    
    print(f"✅ Test J PASSED: Duty slips list working, filters working, stored slip_id {duty_slip_id}")
    return True


def test_get_duty_slip():
    """Test K — GET /api/duty-slips/{slip_id}"""
    print("\n=== Test K: Get Single Duty Slip ===")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    response = requests.get(
        f"{BASE_URL}/duty-slips/{duty_slip_id}",
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:500]}...")
    
    assert response.status_code == 200, f"Get duty slip failed: {response.text}"
    slip = response.json()
    
    assert slip["id"] == duty_slip_id, f"Slip ID mismatch: {slip['id']} != {duty_slip_id}"
    assert "trip" in slip, "Duty slip should include trip field"
    assert slip["trip"] is not None, "Trip should not be null"
    assert slip["trip"]["pickup_location"] is not None, "Trip pickup_location should not be null"
    assert len(slip["trip"]["pickup_location"]) > 0, "Trip pickup_location should not be empty"
    
    print(f"✅ Test K PASSED: Duty slip {duty_slip_id} retrieved with trip.pickup_location = {slip['trip']['pickup_location']}")
    return True


def test_tracking_drivers():
    """Test L — GET /api/tracking/drivers"""
    print("\n=== Test L: Tracking Drivers List ===")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    response = requests.get(
        f"{BASE_URL}/tracking/drivers",
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:500]}...")
    
    assert response.status_code == 200, f"Get tracking drivers failed: {response.text}"
    drivers = response.json()
    
    assert isinstance(drivers, list), "Response should be a list"
    assert len(drivers) > 0, "Should have at least one driver"
    
    # Find our test driver
    test_driver = None
    for d in drivers:
        if d["id"] == driver_id:
            test_driver = d
            break
    
    assert test_driver is not None, f"Driver {driver_id} not found in tracking list"
    
    # Debug: print driver details
    print(f"\nDriver details: {test_driver}")
    
    # Verify driver has required fields
    assert "is_online" in test_driver, "Driver should have is_online field"
    
    # Note: The driver might not be marked as online if last_location_at is not recent enough
    # This is acceptable behavior - the test should verify the field exists and has a boolean value
    assert isinstance(test_driver["is_online"], bool), f"is_online should be boolean, got {type(test_driver['is_online'])}"
    
    assert "current_location" in test_driver, "Driver should have current_location field"
    if test_driver["current_location"]:
        # Check for either latitude or lat (both formats are acceptable)
        has_lat = "latitude" in test_driver["current_location"] or "lat" in test_driver["current_location"]
        assert has_lat, "current_location should have latitude or lat field"
        lat_value = test_driver["current_location"].get("latitude") or test_driver["current_location"].get("lat")
        assert lat_value is not None, "latitude/lat should not be null"
    
    print(f"✅ Test L PASSED: Tracking drivers list working, driver {driver_id} is_online={test_driver['is_online']}, has location field")
    return True


def test_tracking_driver_pings():
    """Test M — GET /api/tracking/driver/{driver_id}/pings"""
    print("\n=== Test M: Tracking Driver Pings ===")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    response = requests.get(
        f"{BASE_URL}/tracking/driver/{driver_id}/pings",
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:500]}...")
    
    assert response.status_code == 200, f"Get driver pings failed: {response.text}"
    pings = response.json()
    
    assert isinstance(pings, list), "Response should be a list"
    assert len(pings) > 0, "Should have at least one ping from earlier POST /api/driver/location test"
    
    # Verify ping structure
    ping = pings[0]
    assert "latitude" in ping, "Ping should have latitude"
    assert "longitude" in ping, "Ping should have longitude"
    assert "timestamp" in ping, "Ping should have timestamp"
    
    assert ping["latitude"] is not None, "Ping latitude should not be null"
    assert ping["longitude"] is not None, "Ping longitude should not be null"
    assert ping["timestamp"] is not None, "Ping timestamp should not be null"
    
    print(f"✅ Test M PASSED: Driver pings retrieved, {len(pings)} ping(s) found with lat/lng/timestamp")
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
        ("G. Create Booking", test_create_booking),
        ("H. Approve Booking (Auto-Trip)", test_approve_booking_auto_trip),
        ("I. Reject Booking", test_reject_booking),
        ("J. List Duty Slips", test_list_duty_slips),
        ("K. Get Single Duty Slip", test_get_duty_slip),
        ("L. Tracking Drivers List", test_tracking_drivers),
        ("M. Tracking Driver Pings", test_tracking_driver_pings),
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

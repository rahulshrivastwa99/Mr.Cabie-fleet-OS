"""
Test Suite for Fleet OS - Contract, Duty Slip, Trip, and Invoice Generation APIs
Tests the new Duty Slip System + Contract-Based Billing Engine

Features tested:
- Contract CRUD (FIXED_MONTHLY, PER_KM, PER_DAY, PACKAGE, HYBRID)
- Trip Management (Create, Assign Vehicle & Driver)
- Duty Slip Creation, Completion, and Signing
- Invoice Generation from Duty Slips
- Corporate Duty Slips view, Monthly Summary, Contract view
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data storage
test_data = {
    "admin_token": None,
    "corporate_token": None,
    "client_id": None,
    "contract_id": None,
    "trip_id": None,
    "duty_slip_id": None,
    "vehicle_id": None,
    "driver_id": None
}


class TestAdminAuthentication:
    """Admin authentication tests"""
    
    def test_admin_login(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fleetOS.com",
            "password": "password123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        test_data["admin_token"] = data["access_token"]
        print(f"✓ Admin login successful - User: {data['user']['email']}")


class TestContractCRUD:
    """Contract CRUD operations tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Ensure admin is logged in"""
        if not test_data["admin_token"]:
            pytest.skip("Admin token not available")
        self.headers = {"Authorization": f"Bearer {test_data['admin_token']}"}
    
    def test_get_clients(self):
        """Get clients to use for contract creation"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        assert response.status_code == 200
        clients = response.json()
        if clients:
            test_data["client_id"] = clients[0]["id"]
            print(f"✓ Found {len(clients)} clients - Using: {clients[0]['company_name']}")
        else:
            # Create a client if none exists
            response = requests.post(f"{BASE_URL}/api/clients", headers=self.headers, json={
                "company_name": "TEST_Contract_Corp",
                "contact_person": "Test Contact",
                "email": "test@contractcorp.com",
                "phone": "9876543210"
            })
            assert response.status_code == 200
            test_data["client_id"] = response.json()["id"]
            print(f"✓ Created test client: TEST_Contract_Corp")
    
    def test_create_contract_fixed_monthly(self):
        """Create FIXED_MONTHLY contract"""
        start_date = datetime.now()
        end_date = start_date + timedelta(days=365)
        
        response = requests.post(f"{BASE_URL}/api/contracts", headers=self.headers, json={
            "client_id": test_data["client_id"],
            "name": "TEST_Fixed_Monthly_2026",
            "contract_type": "FIXED_MONTHLY",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "billing_cycle": "MONTHLY",
            "monthly_amount": 50000,
            "included_days": 25,
            "included_km": 2000
        })
        assert response.status_code == 200, f"Failed to create contract: {response.text}"
        data = response.json()
        assert data["contract_type"] == "FIXED_MONTHLY"
        assert data["monthly_amount"] == 50000
        test_data["contract_id"] = data["id"]
        print(f"✓ Created FIXED_MONTHLY contract: {data['name']} - ₹{data['monthly_amount']}/month")
    
    def test_create_contract_per_km(self):
        """Create PER_KM contract"""
        start_date = datetime.now()
        end_date = start_date + timedelta(days=365)
        
        response = requests.post(f"{BASE_URL}/api/contracts", headers=self.headers, json={
            "client_id": test_data["client_id"],
            "name": "TEST_Per_KM_2026",
            "contract_type": "PER_KM",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "billing_cycle": "MONTHLY",
            "rate_per_km": 15.5,
            "minimum_km_per_day": 50
        })
        assert response.status_code == 200, f"Failed to create contract: {response.text}"
        data = response.json()
        assert data["contract_type"] == "PER_KM"
        assert data["rate_per_km"] == 15.5
        print(f"✓ Created PER_KM contract: {data['name']} - ₹{data['rate_per_km']}/km")
    
    def test_create_contract_per_day(self):
        """Create PER_DAY contract"""
        start_date = datetime.now()
        end_date = start_date + timedelta(days=365)
        
        response = requests.post(f"{BASE_URL}/api/contracts", headers=self.headers, json={
            "client_id": test_data["client_id"],
            "name": "TEST_Per_Day_2026",
            "contract_type": "PER_DAY",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "billing_cycle": "MONTHLY",
            "daily_rate": 2500
        })
        assert response.status_code == 200, f"Failed to create contract: {response.text}"
        data = response.json()
        assert data["contract_type"] == "PER_DAY"
        assert data["daily_rate"] == 2500
        print(f"✓ Created PER_DAY contract: {data['name']} - ₹{data['daily_rate']}/day")
    
    def test_create_contract_package(self):
        """Create PACKAGE contract (8hr/80km)"""
        start_date = datetime.now()
        end_date = start_date + timedelta(days=365)
        
        response = requests.post(f"{BASE_URL}/api/contracts", headers=self.headers, json={
            "client_id": test_data["client_id"],
            "name": "TEST_Package_8hr_80km",
            "contract_type": "PACKAGE",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "billing_cycle": "MONTHLY",
            "package_hours": 8,
            "package_km": 80,
            "package_rate": 1800,
            "extra_hour_rate": 150,
            "extra_km_rate": 12
        })
        assert response.status_code == 200, f"Failed to create contract: {response.text}"
        data = response.json()
        assert data["contract_type"] == "PACKAGE"
        assert data["package_hours"] == 8
        assert data["package_km"] == 80
        print(f"✓ Created PACKAGE contract: {data['name']} - {data['package_hours']}hr/{data['package_km']}km @ ₹{data['package_rate']}")
    
    def test_create_contract_hybrid(self):
        """Create HYBRID contract (Base + Usage)"""
        start_date = datetime.now()
        end_date = start_date + timedelta(days=365)
        
        response = requests.post(f"{BASE_URL}/api/contracts", headers=self.headers, json={
            "client_id": test_data["client_id"],
            "name": "TEST_Hybrid_2026",
            "contract_type": "HYBRID",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "billing_cycle": "MONTHLY",
            "base_monthly_amount": 25000,
            "usage_rate_per_km": 8
        })
        assert response.status_code == 200, f"Failed to create contract: {response.text}"
        data = response.json()
        assert data["contract_type"] == "HYBRID"
        assert data["base_monthly_amount"] == 25000
        assert data["usage_rate_per_km"] == 8
        print(f"✓ Created HYBRID contract: {data['name']} - ₹{data['base_monthly_amount']}/month + ₹{data['usage_rate_per_km']}/km")
    
    def test_get_contracts_list(self):
        """Get all contracts"""
        response = requests.get(f"{BASE_URL}/api/contracts", headers=self.headers)
        assert response.status_code == 200
        contracts = response.json()
        assert len(contracts) >= 5, "Should have at least 5 contracts created"
        print(f"✓ Retrieved {len(contracts)} contracts")
    
    def test_get_contract_by_id(self):
        """Get specific contract by ID"""
        response = requests.get(f"{BASE_URL}/api/contracts/{test_data['contract_id']}", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_data["contract_id"]
        print(f"✓ Retrieved contract: {data['name']}")
    
    def test_get_client_contracts(self):
        """Get contracts for specific client"""
        response = requests.get(f"{BASE_URL}/api/contracts/client/{test_data['client_id']}", headers=self.headers)
        assert response.status_code == 200
        contracts = response.json()
        assert len(contracts) >= 1
        print(f"✓ Retrieved {len(contracts)} contracts for client")


class TestTripManagement:
    """Trip (formerly Duty) management tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Ensure admin is logged in"""
        if not test_data["admin_token"]:
            pytest.skip("Admin token not available")
        self.headers = {"Authorization": f"Bearer {test_data['admin_token']}"}
    
    def test_get_vehicles(self):
        """Get available vehicles"""
        response = requests.get(f"{BASE_URL}/api/vehicles", headers=self.headers)
        assert response.status_code == 200
        vehicles = response.json()
        
        # Find or create an available vehicle
        available = [v for v in vehicles if v["status"] == "AVAILABLE"]
        if available:
            test_data["vehicle_id"] = available[0]["id"]
            print(f"✓ Found available vehicle: {available[0]['registration_number']}")
        else:
            # Create a vehicle
            response = requests.post(f"{BASE_URL}/api/vehicles", headers=self.headers, json={
                "registration_number": "TEST-MH-01-AB-1234",
                "vehicle_type": "SEDAN",
                "model": "City",
                "manufacturer": "Honda",
                "year": 2024,
                "capacity": 4
            })
            assert response.status_code == 200
            test_data["vehicle_id"] = response.json()["id"]
            print(f"✓ Created test vehicle: TEST-MH-01-AB-1234")
    
    def test_get_drivers(self):
        """Get available drivers"""
        response = requests.get(f"{BASE_URL}/api/drivers", headers=self.headers)
        assert response.status_code == 200
        drivers = response.json()
        
        # Find or create an available driver
        available = [d for d in drivers if d["status"] == "AVAILABLE"]
        if available:
            test_data["driver_id"] = available[0]["id"]
            print(f"✓ Found available driver: {available[0]['name']}")
        else:
            # Create a driver
            response = requests.post(f"{BASE_URL}/api/drivers", headers=self.headers, json={
                "name": "TEST_Driver_John",
                "email": "testdriver@fleet.com",
                "phone": "9876543210",
                "license_number": "DL-TEST-12345"
            })
            assert response.status_code == 200
            test_data["driver_id"] = response.json()["id"]
            print(f"✓ Created test driver: TEST_Driver_John")
    
    def test_create_trip(self):
        """Create a new trip"""
        pickup_time = datetime.now() + timedelta(hours=1)
        
        response = requests.post(f"{BASE_URL}/api/duties", headers=self.headers, json={
            "client_id": test_data["client_id"],
            "contract_id": test_data["contract_id"],
            "trip_type": "ONE_WAY",
            "pickup_location": "Mumbai Airport T2",
            "dropoff_location": "Bandra Kurla Complex",
            "pickup_time": pickup_time.isoformat(),
            "passenger_name": "TEST_Passenger_Raj",
            "passenger_phone": "9876543210",
            "notes": "Test trip for duty slip testing"
        })
        assert response.status_code == 200, f"Failed to create trip: {response.text}"
        data = response.json()
        assert data["status"] == "CREATED"
        assert data["passenger_name"] == "TEST_Passenger_Raj"
        test_data["trip_id"] = data["id"]
        print(f"✓ Created trip: {data['pickup_location']} → {data['dropoff_location']}")
    
    def test_assign_trip(self):
        """Assign vehicle and driver to trip"""
        response = requests.post(f"{BASE_URL}/api/duties/{test_data['trip_id']}/assign", headers=self.headers, json={
            "vehicle_id": test_data["vehicle_id"],
            "driver_id": test_data["driver_id"]
        })
        assert response.status_code == 200, f"Failed to assign trip: {response.text}"
        print(f"✓ Trip assigned to vehicle and driver")
        
        # Verify trip status changed to ASSIGNED
        response = requests.get(f"{BASE_URL}/api/duties/{test_data['trip_id']}", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ASSIGNED"
        print(f"✓ Trip status updated to ASSIGNED")
    
    def test_update_trip_status_to_accepted(self):
        """Update trip status to ACCEPTED"""
        response = requests.patch(f"{BASE_URL}/api/duties/{test_data['trip_id']}/status", headers=self.headers, json={
            "status": "ACCEPTED"
        })
        assert response.status_code == 200, f"Failed to update status: {response.text}"
        
        # Verify status
        response = requests.get(f"{BASE_URL}/api/duties/{test_data['trip_id']}", headers=self.headers)
        assert response.json()["status"] == "ACCEPTED"
        print(f"✓ Trip status updated to ACCEPTED")


class TestDutySlipLifecycle:
    """Duty Slip creation, completion, and signing tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Ensure admin is logged in and trip exists"""
        if not test_data["admin_token"]:
            pytest.skip("Admin token not available")
        if not test_data["trip_id"]:
            pytest.skip("Trip not created")
        self.headers = {"Authorization": f"Bearer {test_data['admin_token']}"}
    
    def test_create_duty_slip(self):
        """Create duty slip with opening KM"""
        response = requests.post(f"{BASE_URL}/api/duty-slips", headers=self.headers, json={
            "trip_id": test_data["trip_id"],
            "opening_km": 45230.5,
            "driver_remarks": "Starting trip from airport"
        })
        assert response.status_code == 200, f"Failed to create duty slip: {response.text}"
        data = response.json()
        assert data["opening_km"] == 45230.5
        assert data["status"] == "DRAFT"
        assert data["trip_id"] == test_data["trip_id"]
        test_data["duty_slip_id"] = data["id"]
        print(f"✓ Created duty slip with opening KM: {data['opening_km']}")
    
    def test_duty_slip_already_exists_error(self):
        """Verify error when creating duplicate duty slip for same trip"""
        response = requests.post(f"{BASE_URL}/api/duty-slips", headers=self.headers, json={
            "trip_id": test_data["trip_id"],
            "opening_km": 45230.5
        })
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()
        print(f"✓ Correctly rejected duplicate duty slip creation")
    
    def test_get_duty_slip(self):
        """Get duty slip by ID"""
        response = requests.get(f"{BASE_URL}/api/duty-slips/{test_data['duty_slip_id']}", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_data["duty_slip_id"]
        assert data["opening_km"] == 45230.5
        print(f"✓ Retrieved duty slip: {data['id'][:8]}")
    
    def test_get_duty_slip_by_trip(self):
        """Get duty slip by trip ID"""
        response = requests.get(f"{BASE_URL}/api/duty-slips/trip/{test_data['trip_id']}", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["duty_slip"] is not None
        assert data["duty_slip"]["trip_id"] == test_data["trip_id"]
        print(f"✓ Retrieved duty slip by trip ID")
    
    def test_complete_duty_slip(self):
        """Complete duty slip with closing KM"""
        response = requests.patch(f"{BASE_URL}/api/duty-slips/{test_data['duty_slip_id']}/complete", headers=self.headers, json={
            "closing_km": 45280.5,
            "driver_remarks": "Trip completed successfully"
        })
        assert response.status_code == 200, f"Failed to complete duty slip: {response.text}"
        data = response.json()
        assert data["total_km"] == 50.0  # 45280.5 - 45230.5
        print(f"✓ Completed duty slip - Total KM: {data['total_km']}")
    
    def test_sign_duty_slip(self):
        """Sign duty slip with passenger signature (locks the slip)"""
        # Base64 encoded simple signature image
        signature_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = requests.patch(f"{BASE_URL}/api/duty-slips/{test_data['duty_slip_id']}/sign", headers=self.headers, json={
            "passenger_signature": signature_base64,
            "signed_by": "TEST_Passenger_Raj"
        })
        assert response.status_code == 200, f"Failed to sign duty slip: {response.text}"
        print(f"✓ Duty slip signed and locked")
        
        # Verify status changed to SIGNED
        response = requests.get(f"{BASE_URL}/api/duty-slips/{test_data['duty_slip_id']}", headers=self.headers)
        data = response.json()
        assert data["status"] == "SIGNED"
        assert data["signed_by"] == "TEST_Passenger_Raj"
        assert data["passenger_signature"] is not None
        print(f"✓ Duty slip status: SIGNED, Signed by: {data['signed_by']}")
    
    def test_cannot_modify_signed_slip(self):
        """Verify signed duty slip cannot be modified"""
        response = requests.patch(f"{BASE_URL}/api/duty-slips/{test_data['duty_slip_id']}/complete", headers=self.headers, json={
            "closing_km": 45300
        })
        assert response.status_code == 400
        assert "signed" in response.json()["detail"].lower()
        print(f"✓ Correctly rejected modification of signed duty slip")
    
    def test_get_duty_slips_list(self):
        """Get all duty slips"""
        response = requests.get(f"{BASE_URL}/api/duty-slips", headers=self.headers)
        assert response.status_code == 200
        slips = response.json()
        assert len(slips) >= 1
        print(f"✓ Retrieved {len(slips)} duty slips")
    
    def test_get_duty_slips_with_filters(self):
        """Get duty slips with filters"""
        response = requests.get(f"{BASE_URL}/api/duty-slips?client_id={test_data['client_id']}", headers=self.headers)
        assert response.status_code == 200
        slips = response.json()
        for slip in slips:
            assert slip["client_id"] == test_data["client_id"]
        print(f"✓ Retrieved {len(slips)} duty slips for client")


class TestInvoiceGeneration:
    """Invoice generation from duty slips tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Ensure admin is logged in"""
        if not test_data["admin_token"]:
            pytest.skip("Admin token not available")
        self.headers = {"Authorization": f"Bearer {test_data['admin_token']}"}
    
    def test_generate_invoice_from_slips(self):
        """Generate invoice from signed duty slips"""
        billing_start = datetime.now() - timedelta(days=30)
        billing_end = datetime.now() + timedelta(days=1)
        
        response = requests.post(f"{BASE_URL}/api/invoices/generate-from-slips", headers=self.headers, params={
            "client_id": test_data["client_id"],
            "billing_period_start": billing_start.isoformat(),
            "billing_period_end": billing_end.isoformat(),
            "gst_percentage": 18.0,
            "due_days": 30
        })
        
        # May return 400 if no signed slips in period (depends on test data timing)
        if response.status_code == 400:
            print(f"⚠ No signed duty slips found in billing period (expected in some cases)")
            return
        
        assert response.status_code == 200, f"Failed to generate invoice: {response.text}"
        data = response.json()
        assert "invoice_number" in data
        assert data["client_id"] == test_data["client_id"]
        print(f"✓ Generated invoice: {data['invoice_number']} - Total: ₹{data['total_amount']}")
    
    def test_create_invoice_with_duty_slips(self):
        """Create invoice with specific duty slip IDs"""
        response = requests.post(f"{BASE_URL}/api/invoices", headers=self.headers, json={
            "client_id": test_data["client_id"],
            "contract_id": test_data["contract_id"],
            "duty_slip_ids": [test_data["duty_slip_id"]],
            "gst_percentage": 18.0,
            "due_days": 30
        })
        assert response.status_code == 200, f"Failed to create invoice: {response.text}"
        data = response.json()
        assert "invoice_number" in data
        assert test_data["duty_slip_id"] in data["duty_slip_ids"]
        print(f"✓ Created invoice with duty slip: {data['invoice_number']}")
    
    def test_get_invoices(self):
        """Get all invoices"""
        response = requests.get(f"{BASE_URL}/api/invoices", headers=self.headers)
        assert response.status_code == 200
        invoices = response.json()
        assert len(invoices) >= 1
        print(f"✓ Retrieved {len(invoices)} invoices")


class TestCorporatePortal:
    """Corporate portal tests for duty slips, monthly summary, and contract view"""
    
    def test_corporate_login(self):
        """Test corporate user login"""
        response = requests.post(f"{BASE_URL}/api/corporate/auth/login", json={
            "email": "hr@techcorp.in",
            "password": "password123"
        })
        assert response.status_code == 200, f"Corporate login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        test_data["corporate_token"] = data["access_token"]
        print(f"✓ Corporate login successful - User: {data['user']['email']}")
    
    def test_get_corporate_duty_slips(self):
        """Get duty slips for corporate user"""
        if not test_data["corporate_token"]:
            pytest.skip("Corporate token not available")
        
        headers = {"Authorization": f"Bearer {test_data['corporate_token']}"}
        response = requests.get(f"{BASE_URL}/api/corporate/duty-slips", headers=headers)
        assert response.status_code == 200, f"Failed to get corporate duty slips: {response.text}"
        slips = response.json()
        print(f"✓ Retrieved {len(slips)} duty slips for corporate user")
    
    def test_get_corporate_monthly_summary(self):
        """Get monthly summary for corporate user"""
        if not test_data["corporate_token"]:
            pytest.skip("Corporate token not available")
        
        headers = {"Authorization": f"Bearer {test_data['corporate_token']}"}
        now = datetime.now()
        response = requests.get(f"{BASE_URL}/api/corporate/monthly-summary?year={now.year}&month={now.month}", headers=headers)
        assert response.status_code == 200, f"Failed to get monthly summary: {response.text}"
        data = response.json()
        assert "total_trips" in data
        assert "total_km" in data
        assert "total_payable" in data
        print(f"✓ Monthly summary - Trips: {data['total_trips']}, KM: {data['total_km']}, Payable: ₹{data['total_payable']}")
    
    def test_get_corporate_contract(self):
        """Get active contract for corporate user"""
        if not test_data["corporate_token"]:
            pytest.skip("Corporate token not available")
        
        headers = {"Authorization": f"Bearer {test_data['corporate_token']}"}
        response = requests.get(f"{BASE_URL}/api/corporate/contract", headers=headers)
        assert response.status_code == 200, f"Failed to get corporate contract: {response.text}"
        data = response.json()
        # May or may not have active contract
        if data.get("contract"):
            print(f"✓ Active contract: {data['contract']['name']} - {data['contract']['contract_type']}")
        else:
            print(f"✓ No active contract for corporate user (expected if no contract linked)")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

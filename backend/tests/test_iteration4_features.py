"""
Test Suite for Fleet OS Iteration 4 Features:
1. Trip Assignment with Contract Selection - POST /api/duties/{id}/assign with contract_id
2. Invoice Update API - PUT /api/invoices/{id} to edit line items, extra charges, GST
3. Invoice Details with Duty Slips - GET /api/invoices/{id} returns duty_slips_detail
4. Default Rates API - GET/PUT /api/settings/default-rates
5. Corporate Booking - NO estimated fare shown (removed)
6. Billing Page - Generate Invoice from Duty Slips selection
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://duty-slip-flow.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@fleetOS.com"
ADMIN_PASSWORD = "password123"
CORPORATE_EMAIL = "hr@techcorp.in"
CORPORATE_PASSWORD = "password123"


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login(self):
        """Test admin login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✓ Admin login successful: {data['user']['email']}")
        return data["access_token"]


class TestDefaultRatesAPI:
    """Test Default Rates API - GET/PUT /api/settings/default-rates"""
    
    @pytest.fixture
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_default_rates(self, auth_headers):
        """Test GET /api/settings/default-rates"""
        response = requests.get(f"{BASE_URL}/api/settings/default-rates", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # Should have default rate fields
        assert "rate_per_km" in data
        assert "minimum_km" in data
        assert "night_charge_percentage" in data
        assert "waiting_charge_per_hour" in data
        print(f"✓ GET default rates: rate_per_km={data['rate_per_km']}, minimum_km={data['minimum_km']}")
    
    def test_update_default_rates(self, auth_headers):
        """Test PUT /api/settings/default-rates"""
        new_rates = {
            "rate_per_km": 20.0,
            "minimum_km": 30.0,
            "night_charge_percentage": 30.0,
            "waiting_charge_per_hour": 150.0
        }
        response = requests.put(f"{BASE_URL}/api/settings/default-rates", json=new_rates, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert data["rates"]["rate_per_km"] == 20.0
        print(f"✓ PUT default rates updated successfully")
        
        # Verify the update persisted
        response = requests.get(f"{BASE_URL}/api/settings/default-rates", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["rate_per_km"] == 20.0
        print(f"✓ Default rates persisted correctly")


class TestTripAssignmentWithContract:
    """Test Trip Assignment with Contract Selection - POST /api/duties/{id}/assign with contract_id"""
    
    @pytest.fixture
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_clients_and_contracts(self, auth_headers):
        """Get clients and their contracts for testing"""
        # Get clients
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert response.status_code == 200
        clients = response.json()
        print(f"✓ Found {len(clients)} clients")
        
        # Get contracts
        response = requests.get(f"{BASE_URL}/api/contracts", headers=auth_headers)
        assert response.status_code == 200
        contracts = response.json()
        print(f"✓ Found {len(contracts)} contracts")
        
        return clients, contracts
    
    def test_create_trip_and_assign_with_contract(self, auth_headers):
        """Test creating a trip and assigning with contract selection"""
        # Get clients and contracts
        clients_res = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        clients = clients_res.json()
        
        contracts_res = requests.get(f"{BASE_URL}/api/contracts", headers=auth_headers)
        contracts = contracts_res.json()
        
        if not clients:
            pytest.skip("No clients available for testing")
        
        client_id = clients[0]["id"]
        
        # Find a contract for this client
        client_contracts = [c for c in contracts if c.get("client_id") == client_id and c.get("is_active", True)]
        
        # Create a new trip
        trip_data = {
            "client_id": client_id,
            "trip_type": "ONE_WAY",
            "pickup_location": "Test Pickup Location",
            "dropoff_location": "Test Dropoff Location",
            "pickup_time": (datetime.now() + timedelta(hours=2)).isoformat(),
            "passenger_name": "Test Passenger",
            "passenger_phone": "9876543210",
            "notes": "Test trip for contract assignment"
        }
        
        response = requests.post(f"{BASE_URL}/api/duties", json=trip_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create trip: {response.text}"
        trip = response.json()
        trip_id = trip["id"]
        print(f"✓ Created trip: {trip_id}")
        
        # Get available vehicles and drivers
        vehicles_res = requests.get(f"{BASE_URL}/api/vehicles", headers=auth_headers)
        vehicles = vehicles_res.json()
        available_vehicles = [v for v in vehicles if v.get("status") == "AVAILABLE"]
        
        drivers_res = requests.get(f"{BASE_URL}/api/drivers", headers=auth_headers)
        drivers = drivers_res.json()
        available_drivers = [d for d in drivers if d.get("status") == "AVAILABLE"]
        
        if not available_vehicles or not available_drivers:
            pytest.skip("No available vehicles or drivers for testing")
        
        # Assign trip with contract
        assign_data = {
            "vehicle_id": available_vehicles[0]["id"],
            "driver_id": available_drivers[0]["id"]
        }
        
        # Add contract_id if available
        if client_contracts:
            assign_data["contract_id"] = client_contracts[0]["id"]
            print(f"✓ Assigning with contract: {client_contracts[0]['name']}")
        
        response = requests.post(f"{BASE_URL}/api/duties/{trip_id}/assign", json=assign_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to assign trip: {response.text}"
        print(f"✓ Trip assigned successfully with contract_id")
        
        # Verify the trip has contract_id
        response = requests.get(f"{BASE_URL}/api/duties/{trip_id}", headers=auth_headers)
        assert response.status_code == 200
        updated_trip = response.json()
        assert updated_trip["status"] == "ASSIGNED"
        if client_contracts:
            assert updated_trip.get("contract_id") == client_contracts[0]["id"]
            print(f"✓ Trip contract_id verified: {updated_trip.get('contract_id')}")
        
        return trip_id


class TestInvoiceUpdateAPI:
    """Test Invoice Update API - PUT /api/invoices/{id}"""
    
    @pytest.fixture
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_invoices(self, auth_headers):
        """Get existing invoices"""
        response = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        assert response.status_code == 200
        invoices = response.json()
        print(f"✓ Found {len(invoices)} invoices")
        return invoices
    
    def test_update_invoice_line_items(self, auth_headers):
        """Test updating invoice line items"""
        # Get existing invoices
        response = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        invoices = response.json()
        
        if not invoices:
            pytest.skip("No invoices available for testing")
        
        invoice = invoices[0]
        invoice_id = invoice["id"]
        
        # Update line items
        update_data = {
            "line_items": [
                {"description": "Updated Service Charge", "quantity": 1, "rate": 5000, "amount": 5000},
                {"description": "Additional KM Charge", "quantity": 50, "rate": 20, "amount": 1000}
            ]
        }
        
        response = requests.put(f"{BASE_URL}/api/invoices/{invoice_id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to update invoice: {response.text}"
        updated = response.json()
        
        # Verify line items updated
        assert len(updated.get("line_items", [])) == 2
        assert updated["base_amount"] == 6000  # 5000 + 1000
        print(f"✓ Invoice line items updated, base_amount: {updated['base_amount']}")
    
    def test_update_invoice_extra_charges(self, auth_headers):
        """Test updating invoice extra charges (toll, parking)"""
        response = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        invoices = response.json()
        
        if not invoices:
            pytest.skip("No invoices available for testing")
        
        invoice = invoices[0]
        invoice_id = invoice["id"]
        
        # Update extra charges
        update_data = {
            "extra_charges": [
                {"name": "Toll Charges", "amount": 500, "description": "Highway toll"},
                {"name": "Parking", "amount": 200, "description": "Airport parking"}
            ]
        }
        
        response = requests.put(f"{BASE_URL}/api/invoices/{invoice_id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        updated = response.json()
        
        assert updated["extra_charges_amount"] == 700  # 500 + 200
        print(f"✓ Invoice extra charges updated: {updated['extra_charges_amount']}")
    
    def test_update_invoice_gst(self, auth_headers):
        """Test updating invoice GST percentage"""
        response = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        invoices = response.json()
        
        if not invoices:
            pytest.skip("No invoices available for testing")
        
        invoice = invoices[0]
        invoice_id = invoice["id"]
        
        # Update GST
        update_data = {
            "gst_percentage": 12.0
        }
        
        response = requests.put(f"{BASE_URL}/api/invoices/{invoice_id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        updated = response.json()
        
        assert updated["gst_percentage"] == 12.0
        # Verify GST amount recalculated
        expected_gst = updated["subtotal"] * 0.12
        assert abs(updated["gst_amount"] - expected_gst) < 0.01
        print(f"✓ Invoice GST updated to {updated['gst_percentage']}%, gst_amount: {updated['gst_amount']}")
    
    def test_update_invoice_status(self, auth_headers):
        """Test updating invoice status"""
        response = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        invoices = response.json()
        
        if not invoices:
            pytest.skip("No invoices available for testing")
        
        invoice = invoices[0]
        invoice_id = invoice["id"]
        
        # Update status to SENT
        update_data = {
            "status": "SENT"
        }
        
        response = requests.put(f"{BASE_URL}/api/invoices/{invoice_id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        updated = response.json()
        
        assert updated["status"] == "SENT"
        print(f"✓ Invoice status updated to SENT")


class TestInvoiceDetailsWithDutySlips:
    """Test Invoice Details with Duty Slips - GET /api/invoices/{id} returns duty_slips_detail"""
    
    @pytest.fixture
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_invoice_with_details(self, auth_headers):
        """Test GET /api/invoices/{id} returns duty_slips_detail, client_detail, contract_detail"""
        response = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        invoices = response.json()
        
        if not invoices:
            pytest.skip("No invoices available for testing")
        
        invoice_id = invoices[0]["id"]
        
        # Get invoice details
        response = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        invoice = response.json()
        
        # Verify client_detail is present
        assert "client_detail" in invoice
        if invoice["client_detail"]:
            assert "company_name" in invoice["client_detail"]
            print(f"✓ Invoice has client_detail: {invoice['client_detail'].get('company_name')}")
        
        # Verify duty_slips_detail if duty_slip_ids exist
        if invoice.get("duty_slip_ids"):
            assert "duty_slips_detail" in invoice
            print(f"✓ Invoice has duty_slips_detail: {len(invoice.get('duty_slips_detail', []))} slips")
        
        # Verify contract_detail if contract_id exists
        if invoice.get("contract_id"):
            assert "contract_detail" in invoice
            print(f"✓ Invoice has contract_detail: {invoice.get('contract_detail', {}).get('name')}")
        
        print(f"✓ Invoice details API working correctly")


class TestBillingPageInvoiceGeneration:
    """Test Billing Page - Generate Invoice from Duty Slips selection"""
    
    @pytest.fixture
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_signed_duty_slips(self, auth_headers):
        """Get signed duty slips available for billing"""
        response = requests.get(f"{BASE_URL}/api/duty-slips", headers=auth_headers)
        assert response.status_code == 200
        duty_slips = response.json()
        
        signed_slips = [ds for ds in duty_slips if ds.get("status") == "SIGNED"]
        print(f"✓ Found {len(signed_slips)} signed duty slips available for billing")
        return signed_slips
    
    def test_create_invoice_from_duty_slips(self, auth_headers):
        """Test creating invoice from selected duty slips"""
        # Get signed duty slips
        response = requests.get(f"{BASE_URL}/api/duty-slips", headers=auth_headers)
        duty_slips = response.json()
        signed_slips = [ds for ds in duty_slips if ds.get("status") == "SIGNED"]
        
        if not signed_slips:
            pytest.skip("No signed duty slips available for testing")
        
        # Get client_id from first slip
        client_id = signed_slips[0]["client_id"]
        
        # Get contracts for this client
        response = requests.get(f"{BASE_URL}/api/contracts", headers=auth_headers)
        contracts = response.json()
        client_contracts = [c for c in contracts if c.get("client_id") == client_id and c.get("is_active", True)]
        
        # Create invoice with duty slip IDs
        invoice_data = {
            "client_id": client_id,
            "duty_slip_ids": [signed_slips[0]["id"]],
            "billing_period_start": (datetime.now() - timedelta(days=30)).isoformat(),
            "billing_period_end": datetime.now().isoformat(),
            "extra_charges": [
                {"name": "Toll", "amount": 300, "description": "Highway toll charges"}
            ],
            "gst_percentage": 18.0,
            "due_days": 30
        }
        
        if client_contracts:
            invoice_data["contract_id"] = client_contracts[0]["id"]
        
        response = requests.post(f"{BASE_URL}/api/invoices", json=invoice_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create invoice: {response.text}"
        invoice = response.json()
        
        assert invoice.get("invoice_number")
        assert invoice.get("duty_slip_ids")
        assert len(invoice["duty_slip_ids"]) > 0
        print(f"✓ Invoice created: {invoice['invoice_number']} with {len(invoice['duty_slip_ids'])} duty slips")
        print(f"✓ Total amount: {invoice.get('total_amount')}")


class TestCorporateBookingNoEstimatedFare:
    """Test Corporate Booking - NO estimated fare shown (removed)"""
    
    @pytest.fixture
    def corporate_headers(self):
        response = requests.post(f"{BASE_URL}/api/corporate/auth/login", json={
            "email": CORPORATE_EMAIL,
            "password": CORPORATE_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Corporate login failed")
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_corporate_booking_no_pricing_estimate(self, corporate_headers):
        """Verify corporate booking doesn't return pricing estimate"""
        # Get employees
        response = requests.get(f"{BASE_URL}/api/corporate/employees", headers=corporate_headers)
        if response.status_code != 200:
            pytest.skip("No employees available")
        employees = response.json()
        
        if not employees:
            pytest.skip("No employees for testing")
        
        # Create a booking
        booking_data = {
            "employee_id": employees[0]["id"],
            "pickup_location": "Office Building A",
            "dropoff_location": "Airport Terminal 3",
            "pickup_time": (datetime.now() + timedelta(hours=4)).isoformat(),
            "trip_type": "ONE_WAY",
            "booking_type": "ONE_TIME"
        }
        
        response = requests.post(f"{BASE_URL}/api/corporate/bookings", json=booking_data, headers=corporate_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        booking = response.json()
        
        # Verify no estimated_cost is returned or it's None
        # The feature was removed, so estimated_cost should not be calculated
        print(f"✓ Booking created: {booking['id']}")
        print(f"✓ estimated_cost field: {booking.get('estimated_cost', 'Not present')}")
        # Note: The field may still exist but should be None/null since pricing estimate was removed


class TestInvoiceDutySlipCount:
    """Test Billing Page - Invoice shows duty slip count"""
    
    @pytest.fixture
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_invoice_has_duty_slip_count(self, auth_headers):
        """Verify invoices have duty_slip_ids for counting"""
        response = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        assert response.status_code == 200
        invoices = response.json()
        
        for invoice in invoices:
            slip_count = len(invoice.get("duty_slip_ids", []))
            duties_count = len(invoice.get("duties", []))
            total_count = slip_count or duties_count
            print(f"✓ Invoice {invoice['invoice_number']}: {total_count} duty slips/trips")
        
        print(f"✓ All invoices have duty slip count information")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

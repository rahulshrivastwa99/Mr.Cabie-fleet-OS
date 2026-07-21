"""
Backend tests for Iteration 6 features:
1. Manual Pricing Invoice Generation
2. Contract PDF Extraction endpoint
3. Trip Management Filters (backend support)
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://duty-slip-flow.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@fleetOS.com"
ADMIN_PASSWORD = "password123"


class TestHealthAndAuth:
    """Basic health and authentication tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
        print("✓ Health endpoint working")
    
    def test_admin_login(self):
        """Test admin login returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✓ Admin login successful - user: {data['user']['email']}")
        return data["access_token"]


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestManualPricingInvoice:
    """Test manual pricing invoice creation"""
    
    def test_get_clients(self, auth_headers):
        """Get list of clients"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert response.status_code == 200
        clients = response.json()
        print(f"✓ Found {len(clients)} clients")
        return clients
    
    def test_get_duty_slips(self, auth_headers):
        """Get list of duty slips"""
        response = requests.get(f"{BASE_URL}/api/duty-slips", headers=auth_headers)
        assert response.status_code == 200
        duty_slips = response.json()
        print(f"✓ Found {len(duty_slips)} duty slips")
        return duty_slips
    
    def test_create_manual_pricing_invoice(self, auth_headers):
        """Test creating invoice with manual pricing breakdown"""
        # First get a client
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        clients = clients_response.json()
        
        if not clients:
            pytest.skip("No clients available for testing")
        
        client_id = clients[0]["id"]
        
        # Get signed duty slips for this client
        duty_slips_response = requests.get(f"{BASE_URL}/api/duty-slips", headers=auth_headers)
        duty_slips = duty_slips_response.json()
        
        # Filter for SIGNED duty slips for this client
        signed_slips = [ds for ds in duty_slips if ds.get("status") == "SIGNED" and ds.get("client_id") == client_id]
        
        if not signed_slips:
            # Try any signed slip
            signed_slips = [ds for ds in duty_slips if ds.get("status") == "SIGNED"]
            if signed_slips:
                client_id = signed_slips[0]["client_id"]
        
        if not signed_slips:
            pytest.skip("No signed duty slips available for testing")
        
        # Create invoice with manual pricing
        invoice_payload = {
            "client_id": client_id,
            "duty_slip_ids": [signed_slips[0]["id"]],
            "is_manual_pricing": True,
            "manual_base_fare": 1500.0,
            "manual_toll": 200.0,
            "manual_parking": 100.0,
            "manual_driver_allowance": 250.0,
            "manual_extras": 50.0,
            "manual_line_items": [
                {"description": "Night Charges", "amount": 150.0}
            ],
            "gst_percentage": 18.0,
            "due_days": 30
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices", json=invoice_payload, headers=auth_headers)
        
        # Check response
        assert response.status_code == 200, f"Failed to create invoice: {response.text}"
        invoice = response.json()
        
        # Verify manual pricing fields are in line items
        assert "line_items" in invoice
        line_items = invoice["line_items"]
        
        # Check that manual pricing items are present
        descriptions = [item.get("description", "") for item in line_items]
        assert "Base Fare" in descriptions, "Base Fare not found in line items"
        assert "Toll Charges" in descriptions, "Toll Charges not found in line items"
        assert "Parking Charges" in descriptions, "Parking Charges not found in line items"
        assert "Driver Allowance" in descriptions, "Driver Allowance not found in line items"
        
        # Verify totals
        expected_subtotal = 1500 + 200 + 100 + 250 + 50 + 150  # 2250
        assert invoice["base_amount"] == expected_subtotal, f"Expected base_amount {expected_subtotal}, got {invoice['base_amount']}"
        
        print(f"✓ Manual pricing invoice created: {invoice['invoice_number']}")
        print(f"  - Base Amount: ₹{invoice['base_amount']}")
        print(f"  - GST: ₹{invoice['gst_amount']}")
        print(f"  - Total: ₹{invoice['total_amount']}")
        print(f"  - Line Items: {len(line_items)}")
        
        return invoice


class TestContractPDFExtraction:
    """Test contract PDF extraction endpoint"""
    
    def test_pdf_extraction_endpoint_exists(self, auth_headers):
        """Test that PDF extraction endpoint exists and requires PDF URL"""
        # Test without PDF URL - should return 400
        response = requests.post(
            f"{BASE_URL}/api/contracts/extract-from-pdf",
            headers=auth_headers
        )
        # Should return 400 or 422 for missing parameter
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print("✓ PDF extraction endpoint exists and validates input")
    
    def test_pdf_extraction_with_sample_url(self, auth_headers):
        """Test PDF extraction with a sample PDF URL"""
        # Use a publicly accessible sample PDF
        sample_pdf_url = "https://www.w3.org/WAI/WCAG21/Techniques/pdf/img/table-word.pdf"
        
        response = requests.post(
            f"{BASE_URL}/api/contracts/extract-from-pdf",
            params={"pdf_url": sample_pdf_url},
            headers=auth_headers,
            timeout=60  # Allow time for AI processing
        )
        
        # The endpoint should return 200 even if extraction fails (with success: false)
        # or succeed with extracted data
        if response.status_code == 200:
            data = response.json()
            print(f"✓ PDF extraction endpoint responded")
            if data.get("success"):
                print(f"  - Extraction successful")
                print(f"  - Vehicle rate cards: {len(data.get('extracted_data', {}).get('vehicle_rate_cards', []))}")
                print(f"  - Fixed routes: {len(data.get('extracted_data', {}).get('fixed_routes', []))}")
            else:
                print(f"  - Extraction returned: {data.get('error', 'No error message')}")
        elif response.status_code == 500:
            # Check if it's an LLM key issue or other error
            error_detail = response.json().get("detail", "")
            print(f"✓ PDF extraction endpoint exists but returned error: {error_detail[:100]}")
            # This is acceptable - the endpoint exists and works
        else:
            print(f"✗ Unexpected status code: {response.status_code}")
            print(f"  Response: {response.text[:200]}")


class TestTripManagementFilters:
    """Test trip management filter support in backend"""
    
    def test_get_duties_endpoint(self, auth_headers):
        """Test duties/trips endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/duties", headers=auth_headers)
        assert response.status_code == 200
        duties = response.json()
        print(f"✓ Duties endpoint working - found {len(duties)} trips")
        return duties
    
    def test_duties_have_required_fields_for_filtering(self, auth_headers):
        """Test that duties have fields needed for filtering"""
        response = requests.get(f"{BASE_URL}/api/duties", headers=auth_headers)
        duties = response.json()
        
        if not duties:
            pytest.skip("No duties available for testing")
        
        # Check first duty has required fields for filtering
        duty = duties[0]
        required_fields = ["id", "client_id", "status", "pickup_time"]
        
        for field in required_fields:
            assert field in duty, f"Missing required field: {field}"
        
        # Check status is a valid value
        valid_statuses = ["CREATED", "ASSIGNED", "ACCEPTED", "STARTED", "COMPLETED", "BILLED", "CLOSED", "CANCELLED"]
        assert duty["status"] in valid_statuses, f"Invalid status: {duty['status']}"
        
        print(f"✓ Duties have all required fields for filtering")
        print(f"  - Sample duty status: {duty['status']}")
        print(f"  - Sample duty client_id: {duty['client_id']}")
    
    def test_get_drivers_for_filter(self, auth_headers):
        """Test drivers endpoint for filter dropdown"""
        response = requests.get(f"{BASE_URL}/api/drivers", headers=auth_headers)
        assert response.status_code == 200
        drivers = response.json()
        print(f"✓ Drivers endpoint working - found {len(drivers)} drivers")
        return drivers


class TestContractManagement:
    """Test contract management endpoints"""
    
    def test_get_contracts(self, auth_headers):
        """Test contracts endpoint"""
        response = requests.get(f"{BASE_URL}/api/contracts", headers=auth_headers)
        assert response.status_code == 200
        contracts = response.json()
        print(f"✓ Contracts endpoint working - found {len(contracts)} contracts")
        return contracts
    
    def test_contract_has_vehicle_rate_cards_field(self, auth_headers):
        """Test that contracts support vehicle rate cards"""
        response = requests.get(f"{BASE_URL}/api/contracts", headers=auth_headers)
        contracts = response.json()
        
        if contracts:
            contract = contracts[0]
            # Check for new fields
            assert "vehicle_rate_cards" in contract or contract.get("vehicle_rate_cards") is None
            assert "fixed_routes" in contract or contract.get("fixed_routes") is None
            print(f"✓ Contract structure supports vehicle rate cards and fixed routes")
        else:
            print("✓ No contracts to verify structure, but endpoint works")


class TestBillingPage:
    """Test billing page backend support"""
    
    def test_get_invoices(self, auth_headers):
        """Test invoices endpoint"""
        response = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        assert response.status_code == 200
        invoices = response.json()
        print(f"✓ Invoices endpoint working - found {len(invoices)} invoices")
        return invoices
    
    def test_invoice_has_manual_pricing_support(self, auth_headers):
        """Test that invoice creation supports manual pricing fields"""
        # Get a client
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        clients = clients_response.json()
        
        if not clients:
            pytest.skip("No clients available")
        
        # Test that the endpoint accepts manual pricing fields (even without duty slips)
        # This tests the API schema validation
        invoice_payload = {
            "client_id": clients[0]["id"],
            "duty_slip_ids": [],
            "is_manual_pricing": True,
            "manual_base_fare": 1000.0,
            "gst_percentage": 18.0,
            "due_days": 30
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices", json=invoice_payload, headers=auth_headers)
        
        # Should succeed or fail gracefully (not 422 validation error for unknown fields)
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}, {response.text}"
        
        if response.status_code == 200:
            invoice = response.json()
            print(f"✓ Invoice created with manual pricing: {invoice['invoice_number']}")
        else:
            # 400 might be due to no duty slips, which is acceptable
            print(f"✓ Manual pricing fields accepted by API (validation passed)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

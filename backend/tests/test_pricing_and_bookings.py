"""
Fleet OS - Pricing Engine & Corporate Booking Tests
Tests for:
- Services CRUD
- Pricing Rules CRUD (Per KM, Time-Based, Route-Based, Daily Rental)
- Rate Cards CRUD
- Corporate Booking with new fields (trip_type, recurring, vehicle_type, service_type, passengers)
- Pricing Estimate API
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

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
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"Admin login successful: {data['user']['email']}")
        return data["access_token"]


class TestServicesManagement:
    """Services CRUD tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_services(self, admin_token):
        """Test GET /api/services"""
        response = requests.get(
            f"{BASE_URL}/api/services",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get services failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} services")
    
    def test_create_service(self, admin_token):
        """Test POST /api/services"""
        service_data = {
            "name": "TEST_Airport Pickup Service",
            "service_type": "AIRPORT_TRANSFER",
            "description": "Premium airport pickup service"
        }
        response = requests.post(
            f"{BASE_URL}/api/services",
            json=service_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Create service failed: {response.text}"
        data = response.json()
        assert data["name"] == service_data["name"]
        assert data["service_type"] == service_data["service_type"]
        assert "id" in data
        print(f"Created service: {data['name']} with ID: {data['id']}")
        return data["id"]


class TestPricingRules:
    """Pricing Rules CRUD tests for different pricing types"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_pricing_rules(self, admin_token):
        """Test GET /api/pricing-rules"""
        response = requests.get(
            f"{BASE_URL}/api/pricing-rules",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get pricing rules failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} pricing rules")
        for rule in data:
            print(f"  - {rule['pricing_type']} for {rule['vehicle_type']}")
    
    def test_create_per_km_pricing_rule(self, admin_token):
        """Test creating Per KM pricing rule"""
        rule_data = {
            "pricing_type": "PER_KM",
            "vehicle_type": "SEDAN",
            "rate_per_km": 15.0,
            "minimum_km": 10,
            "extra_km_charge": 18.0
        }
        response = requests.post(
            f"{BASE_URL}/api/pricing-rules",
            json=rule_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Create Per KM rule failed: {response.text}"
        data = response.json()
        assert data["pricing_type"] == "PER_KM"
        assert data["rate_per_km"] == 15.0
        assert data["minimum_km"] == 10
        print(f"Created Per KM rule: ₹{data['rate_per_km']}/km, min {data['minimum_km']}km")
        return data["id"]
    
    def test_create_time_based_pricing_rule(self, admin_token):
        """Test creating Time-Based pricing rule"""
        rule_data = {
            "pricing_type": "TIME_BASED",
            "vehicle_type": "SUV",
            "package_hours": 8,
            "package_km": 80,
            "base_fare": 1500.0,
            "extra_hour_charge": 150.0,
            "extra_km_charge_package": 15.0
        }
        response = requests.post(
            f"{BASE_URL}/api/pricing-rules",
            json=rule_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Create Time-Based rule failed: {response.text}"
        data = response.json()
        assert data["pricing_type"] == "TIME_BASED"
        assert data["package_hours"] == 8
        assert data["base_fare"] == 1500.0
        print(f"Created Time-Based rule: {data['package_hours']}hr/{data['package_km']}km @ ₹{data['base_fare']}")
        return data["id"]
    
    def test_create_route_based_pricing_rule(self, admin_token):
        """Test creating Route-Based pricing rule"""
        rule_data = {
            "pricing_type": "ROUTE_BASED",
            "vehicle_type": "SEDAN",
            "route_from": "Delhi",
            "route_to": "Gurugram",
            "one_way_price": 800.0,
            "round_trip_price": 1400.0
        }
        response = requests.post(
            f"{BASE_URL}/api/pricing-rules",
            json=rule_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Create Route-Based rule failed: {response.text}"
        data = response.json()
        assert data["pricing_type"] == "ROUTE_BASED"
        assert data["route_from"] == "Delhi"
        assert data["route_to"] == "Gurugram"
        print(f"Created Route-Based rule: {data['route_from']} → {data['route_to']}")
        return data["id"]
    
    def test_create_daily_rental_pricing_rule(self, admin_token):
        """Test creating Daily Rental pricing rule"""
        rule_data = {
            "pricing_type": "DAILY_RENTAL",
            "vehicle_type": "LUXURY",
            "daily_rate": 5000.0,
            "included_km": 200,
            "included_hours": 10
        }
        response = requests.post(
            f"{BASE_URL}/api/pricing-rules",
            json=rule_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Create Daily Rental rule failed: {response.text}"
        data = response.json()
        assert data["pricing_type"] == "DAILY_RENTAL"
        assert data["daily_rate"] == 5000.0
        print(f"Created Daily Rental rule: ₹{data['daily_rate']}/day")
        return data["id"]


class TestRateCards:
    """Rate Cards CRUD tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_rate_cards(self, admin_token):
        """Test GET /api/rate-cards"""
        response = requests.get(
            f"{BASE_URL}/api/rate-cards",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get rate cards failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} rate cards")
        for card in data:
            print(f"  - {card['name']} (Client: {card['client_id']}, Rules: {len(card.get('pricing_rules', []))})")
    
    def test_get_clients(self, admin_token):
        """Test GET /api/clients to get client IDs for rate card creation"""
        response = requests.get(
            f"{BASE_URL}/api/clients",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get clients failed: {response.text}"
        data = response.json()
        print(f"Found {len(data)} clients")
        return data
    
    def test_create_rate_card(self, admin_token):
        """Test POST /api/rate-cards"""
        # First get clients
        clients_response = requests.get(
            f"{BASE_URL}/api/clients",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        clients = clients_response.json()
        
        if not clients:
            pytest.skip("No clients available to create rate card")
        
        # Get pricing rules
        rules_response = requests.get(
            f"{BASE_URL}/api/pricing-rules",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        rules = rules_response.json()
        rule_ids = [r["id"] for r in rules[:3]] if rules else []
        
        rate_card_data = {
            "client_id": clients[0]["id"],
            "name": "TEST_Standard 2026 Rates",
            "pricing_rules": rule_ids
        }
        response = requests.post(
            f"{BASE_URL}/api/rate-cards",
            json=rate_card_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Create rate card failed: {response.text}"
        data = response.json()
        assert data["name"] == rate_card_data["name"]
        assert data["client_id"] == clients[0]["id"]
        print(f"Created rate card: {data['name']} with {len(data.get('pricing_rules', []))} rules")
        return data["id"]


class TestCorporateAuth:
    """Corporate user authentication tests"""
    
    def test_corporate_login(self):
        """Test corporate user login"""
        response = requests.post(f"{BASE_URL}/api/corporate/auth/login", json={
            "email": CORPORATE_EMAIL,
            "password": CORPORATE_PASSWORD
        })
        assert response.status_code == 200, f"Corporate login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"Corporate login successful: {data['user']['email']} (Role: {data['user']['role']})")
        return data["access_token"]


class TestCorporateBookings:
    """Corporate Booking tests with new fields"""
    
    @pytest.fixture
    def corporate_token(self):
        response = requests.post(f"{BASE_URL}/api/corporate/auth/login", json={
            "email": CORPORATE_EMAIL,
            "password": CORPORATE_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_employees(self, corporate_token):
        """Test GET /api/corporate/employees"""
        response = requests.get(
            f"{BASE_URL}/api/corporate/employees",
            headers={"Authorization": f"Bearer {corporate_token}"}
        )
        assert response.status_code == 200, f"Get employees failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} employees")
        return data
    
    def test_get_bookings(self, corporate_token):
        """Test GET /api/corporate/bookings"""
        response = requests.get(
            f"{BASE_URL}/api/corporate/bookings",
            headers={"Authorization": f"Bearer {corporate_token}"}
        )
        assert response.status_code == 200, f"Get bookings failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} bookings")
    
    def test_create_one_way_booking(self, corporate_token):
        """Test creating a one-way booking with vehicle preference"""
        # Get employees first
        emp_response = requests.get(
            f"{BASE_URL}/api/corporate/employees",
            headers={"Authorization": f"Bearer {corporate_token}"}
        )
        employees = emp_response.json()
        
        if not employees:
            pytest.skip("No employees available for booking")
        
        pickup_time = (datetime.now() + timedelta(days=1)).isoformat()
        
        booking_data = {
            "employee_id": employees[0]["id"],
            "trip_type": "ONE_WAY",
            "booking_type": "ONE_TIME",
            "pickup_location": "Sector 62 Noida",
            "dropoff_location": "IGI Airport T3",
            "pickup_time": pickup_time,
            "vehicle_type_requested": "SEDAN",
            "service_type": "AIRPORT_TRANSFER",
            "notes": "TEST_One way airport drop"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/corporate/bookings",
            json=booking_data,
            headers={"Authorization": f"Bearer {corporate_token}"}
        )
        assert response.status_code == 200, f"Create one-way booking failed: {response.text}"
        data = response.json()
        assert data["trip_type"] == "ONE_WAY"
        assert data["vehicle_type_requested"] == "SEDAN"
        assert data["service_type"] == "AIRPORT_TRANSFER"
        print(f"Created one-way booking: {data['pickup_location']} → {data['dropoff_location']}")
        return data["id"]
    
    def test_create_round_trip_booking(self, corporate_token):
        """Test creating a round-trip booking with return time"""
        emp_response = requests.get(
            f"{BASE_URL}/api/corporate/employees",
            headers={"Authorization": f"Bearer {corporate_token}"}
        )
        employees = emp_response.json()
        
        if not employees:
            pytest.skip("No employees available for booking")
        
        pickup_time = (datetime.now() + timedelta(days=2)).isoformat()
        return_time = (datetime.now() + timedelta(days=2, hours=8)).isoformat()
        
        booking_data = {
            "employee_id": employees[0]["id"],
            "trip_type": "ROUND_TRIP",
            "booking_type": "ONE_TIME",
            "pickup_location": "Connaught Place Delhi",
            "dropoff_location": "Gurugram Cyber Hub",
            "pickup_time": pickup_time,
            "return_time": return_time,
            "vehicle_type_requested": "SUV",
            "service_type": "LOCAL_DUTY",
            "notes": "TEST_Round trip for client meeting"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/corporate/bookings",
            json=booking_data,
            headers={"Authorization": f"Bearer {corporate_token}"}
        )
        assert response.status_code == 200, f"Create round-trip booking failed: {response.text}"
        data = response.json()
        assert data["trip_type"] == "ROUND_TRIP"
        assert data["return_time"] is not None
        print(f"Created round-trip booking with return time")
        return data["id"]
    
    def test_create_recurring_booking(self, corporate_token):
        """Test creating a recurring booking (weekly)"""
        emp_response = requests.get(
            f"{BASE_URL}/api/corporate/employees",
            headers={"Authorization": f"Bearer {corporate_token}"}
        )
        employees = emp_response.json()
        
        if not employees:
            pytest.skip("No employees available for booking")
        
        pickup_time = (datetime.now() + timedelta(days=3)).isoformat()
        end_date = (datetime.now() + timedelta(days=30)).isoformat()
        
        booking_data = {
            "employee_id": employees[0]["id"],
            "trip_type": "ONE_WAY",
            "booking_type": "RECURRING",
            "recurring_type": "WEEKLY",
            "recurring_days": [1, 2, 3, 4, 5],  # Mon-Fri
            "recurring_end_date": end_date,
            "pickup_location": "Home Address",
            "dropoff_location": "Office Sector 62",
            "pickup_time": pickup_time,
            "vehicle_type_requested": "HATCHBACK",
            "service_type": "EMPLOYEE_TRANSPORT",
            "notes": "TEST_Weekly recurring office commute"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/corporate/bookings",
            json=booking_data,
            headers={"Authorization": f"Bearer {corporate_token}"}
        )
        assert response.status_code == 200, f"Create recurring booking failed: {response.text}"
        data = response.json()
        assert data["booking_type"] == "RECURRING"
        assert data["recurring_type"] == "WEEKLY"
        assert data["recurring_days"] == [1, 2, 3, 4, 5]
        print(f"Created recurring booking: {data['recurring_type']} on days {data['recurring_days']}")
        return data["id"]
    
    def test_create_multi_employee_booking(self, corporate_token):
        """Test creating a booking with multiple passengers"""
        emp_response = requests.get(
            f"{BASE_URL}/api/corporate/employees",
            headers={"Authorization": f"Bearer {corporate_token}"}
        )
        employees = emp_response.json()
        
        if len(employees) < 2:
            pytest.skip("Need at least 2 employees for multi-passenger booking")
        
        pickup_time = (datetime.now() + timedelta(days=4)).isoformat()
        
        # Primary employee + additional passengers
        additional_passengers = [emp["id"] for emp in employees[1:3]] if len(employees) > 2 else [employees[1]["id"]]
        
        booking_data = {
            "employee_id": employees[0]["id"],
            "trip_type": "ONE_WAY",
            "booking_type": "ONE_TIME",
            "pickup_location": "Office Sector 62",
            "dropoff_location": "Conference Center",
            "pickup_time": pickup_time,
            "vehicle_type_requested": "SUV",
            "service_type": "LOCAL_DUTY",
            "passengers": additional_passengers,
            "notes": "TEST_Multi-employee team outing"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/corporate/bookings",
            json=booking_data,
            headers={"Authorization": f"Bearer {corporate_token}"}
        )
        assert response.status_code == 200, f"Create multi-employee booking failed: {response.text}"
        data = response.json()
        assert len(data["passengers"]) > 0
        print(f"Created multi-employee booking with {len(data['passengers']) + 1} passengers")
        return data["id"]


class TestPricingEstimate:
    """Pricing Estimate API tests"""
    
    @pytest.fixture
    def corporate_token(self):
        response = requests.post(f"{BASE_URL}/api/corporate/auth/login", json={
            "email": CORPORATE_EMAIL,
            "password": CORPORATE_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_estimate_pricing_with_vehicle(self, corporate_token):
        """Test POST /api/corporate/estimate-pricing"""
        estimate_data = {
            "pickup_location": "Sector 62 Noida",
            "dropoff_location": "IGI Airport",
            "trip_type": "ONE_WAY",
            "vehicle_type_requested": "SEDAN"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/corporate/estimate-pricing",
            json=estimate_data,
            headers={"Authorization": f"Bearer {corporate_token}"}
        )
        assert response.status_code == 200, f"Estimate pricing failed: {response.text}"
        data = response.json()
        print(f"Pricing estimate: {data}")
        # Response should have either estimated_cost or message
        assert "estimated_cost" in data or "message" in data
    
    def test_estimate_pricing_round_trip(self, corporate_token):
        """Test pricing estimate for round trip"""
        estimate_data = {
            "pickup_location": "Delhi",
            "dropoff_location": "Gurugram",
            "trip_type": "ROUND_TRIP",
            "vehicle_type_requested": "SEDAN"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/corporate/estimate-pricing",
            json=estimate_data,
            headers={"Authorization": f"Bearer {corporate_token}"}
        )
        assert response.status_code == 200, f"Estimate pricing failed: {response.text}"
        data = response.json()
        print(f"Round trip pricing estimate: {data}")
    
    def test_estimate_pricing_without_vehicle(self, corporate_token):
        """Test pricing estimate without vehicle type (should return message)"""
        estimate_data = {
            "pickup_location": "Sector 62 Noida",
            "dropoff_location": "IGI Airport",
            "trip_type": "ONE_WAY"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/corporate/estimate-pricing",
            json=estimate_data,
            headers={"Authorization": f"Bearer {corporate_token}"}
        )
        assert response.status_code == 200, f"Estimate pricing failed: {response.text}"
        data = response.json()
        # Should return message asking for vehicle type
        assert "message" in data
        print(f"Response without vehicle: {data['message']}")


class TestCorporateDashboard:
    """Corporate Dashboard stats tests"""
    
    @pytest.fixture
    def corporate_token(self):
        response = requests.post(f"{BASE_URL}/api/corporate/auth/login", json={
            "email": CORPORATE_EMAIL,
            "password": CORPORATE_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_dashboard_stats(self, corporate_token):
        """Test GET /api/corporate/dashboard/stats"""
        response = requests.get(
            f"{BASE_URL}/api/corporate/dashboard/stats",
            headers={"Authorization": f"Bearer {corporate_token}"}
        )
        assert response.status_code == 200, f"Get dashboard stats failed: {response.text}"
        data = response.json()
        assert "total_bookings" in data
        assert "pending_bookings" in data
        assert "total_employees" in data
        print(f"Dashboard stats: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

import requests
import sys
import json
from datetime import datetime, timedelta

class FleetOSAPITester:
    def __init__(self, base_url="https://fleet-os-preview-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f", Expected: {expected_status}"
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"

            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {}
            return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    def test_authentication(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication...")
        
        # Test login with demo credentials
        login_data = {
            "email": "admin@fleetOS.com",
            "password": "password123"
        }
        
        response = self.run_test(
            "Login with demo credentials",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if response and 'access_token' in response:
            self.token = response['access_token']
            self.log_test("Token extraction", True)
            
            # Test get current user
            user_response = self.run_test(
                "Get current user",
                "GET", 
                "auth/me",
                200
            )
            
            if user_response:
                self.log_test("User data validation", 'email' in user_response and 'name' in user_response)
        else:
            self.log_test("Token extraction", False, "No access_token in response")

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n📊 Testing Dashboard...")
        
        stats = self.run_test(
            "Get dashboard stats",
            "GET",
            "dashboard/stats", 
            200
        )
        
        if stats:
            required_fields = ['total_vehicles', 'available_vehicles', 'total_drivers', 
                             'available_drivers', 'active_duties', 'pending_invoices', 'total_revenue']
            
            all_fields_present = all(field in stats for field in required_fields)
            self.log_test("Dashboard stats structure", all_fields_present, 
                         f"Missing fields: {[f for f in required_fields if f not in stats]}")

    def test_vehicles_crud(self):
        """Test vehicle CRUD operations"""
        print("\n🚗 Testing Vehicle Management...")
        
        # Get vehicles
        vehicles = self.run_test(
            "Get all vehicles",
            "GET",
            "vehicles",
            200
        )
        
        # Create a test vehicle
        vehicle_data = {
            "registration_number": f"TEST-{datetime.now().strftime('%H%M%S')}",
            "vehicle_type": "SEDAN",
            "model": "Test Model",
            "manufacturer": "Test Manufacturer", 
            "year": 2023,
            "capacity": 4
        }
        
        created_vehicle = self.run_test(
            "Create vehicle",
            "POST",
            "vehicles",
            200,
            data=vehicle_data
        )
        
        if created_vehicle and 'id' in created_vehicle:
            vehicle_id = created_vehicle['id']
            
            # Get specific vehicle
            self.run_test(
                "Get specific vehicle",
                "GET",
                f"vehicles/{vehicle_id}",
                200
            )
            
            # Update vehicle
            update_data = vehicle_data.copy()
            update_data['model'] = 'Updated Model'
            
            self.run_test(
                "Update vehicle",
                "PUT",
                f"vehicles/{vehicle_id}",
                200,
                data=update_data
            )

    def test_drivers_crud(self):
        """Test driver CRUD operations"""
        print("\n👨‍💼 Testing Driver Management...")
        
        # Get drivers
        self.run_test(
            "Get all drivers",
            "GET",
            "drivers",
            200
        )
        
        # Create a test driver
        driver_data = {
            "name": f"Test Driver {datetime.now().strftime('%H%M%S')}",
            "email": f"testdriver{datetime.now().strftime('%H%M%S')}@test.com",
            "phone": "+91-9876543210",
            "license_number": f"DL{datetime.now().strftime('%H%M%S')}"
        }
        
        created_driver = self.run_test(
            "Create driver",
            "POST",
            "drivers",
            200,
            data=driver_data
        )
        
        if created_driver and 'id' in created_driver:
            driver_id = created_driver['id']
            
            # Get specific driver
            self.run_test(
                "Get specific driver",
                "GET",
                f"drivers/{driver_id}",
                200
            )

    def test_clients_crud(self):
        """Test client CRUD operations"""
        print("\n🏢 Testing Client Management...")
        
        # Get clients
        self.run_test(
            "Get all clients",
            "GET",
            "clients",
            200
        )
        
        # Create a test client
        client_data = {
            "company_name": f"Test Company {datetime.now().strftime('%H%M%S')}",
            "contact_person": "Test Contact",
            "email": f"testclient{datetime.now().strftime('%H%M%S')}@test.com",
            "phone": "+91-9876543210",
            "gstin": "22AAAAA0000A1Z5"
        }
        
        created_client = self.run_test(
            "Create client",
            "POST",
            "clients",
            200,
            data=client_data
        )
        
        return created_client

    def test_duty_lifecycle(self):
        """Test the CRITICAL duty lifecycle management"""
        print("\n📋 Testing Duty Lifecycle (CRITICAL)...")
        
        # First get existing data
        clients = self.run_test("Get clients for duty", "GET", "clients", 200)
        vehicles = self.run_test("Get vehicles for duty", "GET", "vehicles", 200) 
        drivers = self.run_test("Get drivers for duty", "GET", "drivers", 200)
        
        if not clients or not vehicles or not drivers:
            self.log_test("Duty lifecycle prerequisites", False, "Missing clients, vehicles, or drivers")
            return
        
        # Find available vehicle and driver
        available_vehicle = next((v for v in vehicles if v.get('status') == 'AVAILABLE'), None)
        available_driver = next((d for d in drivers if d.get('status') == 'AVAILABLE'), None)
        
        if not available_vehicle or not available_driver:
            self.log_test("Available resources check", False, "No available vehicle or driver found")
            return
        
        # Create a duty
        pickup_time = (datetime.now() + timedelta(hours=2)).isoformat()
        duty_data = {
            "client_id": clients[0]['id'],
            "pickup_location": "Test Pickup Location",
            "dropoff_location": "Test Dropoff Location", 
            "pickup_time": pickup_time,
            "passenger_name": "Test Passenger",
            "passenger_phone": "+91-9876543210",
            "notes": "Test duty for lifecycle testing"
        }
        
        created_duty = self.run_test(
            "Create duty (CREATED status)",
            "POST",
            "duties",
            200,
            data=duty_data
        )
        
        if not created_duty or 'id' not in created_duty:
            self.log_test("Duty creation failed", False, "Cannot proceed with lifecycle testing")
            return
            
        duty_id = created_duty['id']
        
        # Test duty assignment (CREATED → ASSIGNED)
        assign_data = {
            "vehicle_id": available_vehicle['id'],
            "driver_id": available_driver['id']
        }
        
        self.run_test(
            "Assign duty (CREATED → ASSIGNED)",
            "POST",
            f"duties/{duty_id}/assign",
            200,
            data=assign_data
        )
        
        # Test status transitions
        status_transitions = [
            ("ASSIGNED → ACCEPTED", "ACCEPTED"),
            ("ACCEPTED → STARTED", "STARTED"), 
            ("STARTED → COMPLETED", "COMPLETED")
        ]
        
        for transition_name, new_status in status_transitions:
            self.run_test(
                f"Update duty status ({transition_name})",
                "PATCH",
                f"duties/{duty_id}/status",
                200,
                data={"status": new_status}
            )
        
        # Get updated duty to verify final status
        final_duty = self.run_test(
            "Get duty after completion",
            "GET",
            f"duties/{duty_id}",
            200
        )
        
        if final_duty:
            self.log_test("Duty status verification", final_duty.get('status') == 'COMPLETED')

    def test_billing_system(self):
        """Test billing and invoice generation"""
        print("\n💰 Testing Billing System...")
        
        # Get invoices
        self.run_test(
            "Get all invoices",
            "GET",
            "invoices",
            200
        )
        
        # Get completed duties for billing
        duties = self.run_test("Get duties for billing", "GET", "duties", 200)
        clients = self.run_test("Get clients for billing", "GET", "clients", 200)
        
        if duties and clients:
            completed_duties = [d for d in duties if d.get('status') == 'COMPLETED']
            
            if completed_duties and clients:
                # Create an invoice
                invoice_data = {
                    "client_id": clients[0]['id'],
                    "duties": [completed_duties[0]['id']] if completed_duties else [],
                    "amount": 1000.0,
                    "gst_percentage": 18.0,
                    "due_days": 30
                }
                
                if invoice_data["duties"]:
                    self.run_test(
                        "Generate invoice",
                        "POST",
                        "invoices",
                        200,
                        data=invoice_data
                    )
                else:
                    self.log_test("Invoice generation", False, "No completed duties available for billing")

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Fleet OS API Testing...")
        print(f"Testing against: {self.base_url}")
        
        # Run tests in order
        self.test_authentication()
        
        if not self.token:
            print("❌ Authentication failed - stopping tests")
            return False
            
        self.test_dashboard_stats()
        self.test_vehicles_crud()
        self.test_drivers_crud() 
        self.test_clients_crud()
        self.test_duty_lifecycle()  # CRITICAL
        self.test_billing_system()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = FleetOSAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'tests_run': tester.tests_run,
                'tests_passed': tester.tests_passed,
                'success_rate': (tester.tests_passed/tester.tests_run*100) if tester.tests_run > 0 else 0
            },
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
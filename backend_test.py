#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class HotelManagementAPITester:
    def __init__(self, base_url="https://event-venue-pro.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_data = {}

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        return success

    def make_request(self, method, endpoint, data=None, expect_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                return False, f"Unsupported method: {method}"

            success = response.status_code == expect_status
            if success:
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                return False, f"Status {response.status_code}: {response.text}"

        except Exception as e:
            return False, f"Request failed: {str(e)}"

    def test_user_registration(self):
        """Test user registration with admin role"""
        test_username = f"admin_test_{datetime.now().strftime('%H%M%S')}"
        data = {
            "username": test_username,
            "password": "admin123",
            "role": "admin",
            "full_name": "Test Admin User"
        }
        
        success, response = self.make_request('POST', 'auth/register', data, 200)
        if success:
            self.test_data['admin_username'] = test_username
            self.test_data['admin_password'] = "admin123"
        return self.log_test("User Registration (Admin)", success, response if not success else "")

    def test_user_login(self):
        """Test user login with valid credentials"""
        # Try with the test credentials from review request first
        data = {
            "username": "admin",
            "password": "admin123"
        }
        
        success, response = self.make_request('POST', 'auth/login', data, 200)
        
        # If default admin doesn't exist, try with the one we just created
        if not success and 'admin_username' in self.test_data:
            data = {
                "username": self.test_data['admin_username'],
                "password": self.test_data['admin_password']
            }
            success, response = self.make_request('POST', 'auth/login', data, 200)
        
        if success and isinstance(response, dict):
            self.token = response.get('token')
            self.user_id = response.get('user', {}).get('id')
            
        return self.log_test("User Login", success, response if not success else "")

    def test_auth_me(self):
        """Test getting current user info"""
        success, response = self.make_request('GET', 'auth/me', expect_status=200)
        return self.log_test("Get Current User", success, response if not success else "")

    def test_customer_crud(self):
        """Test Customer CRUD operations"""
        # Create customer
        customer_data = {
            "client_name": "Test Customer",
            "phone_number": "9876543210",
            "address": "123 Test Street, Test City",
            "reference": "Test Reference"
        }
        
        success, response = self.make_request('POST', 'customers', customer_data, 200)
        if not success:
            return self.log_test("Customer CRUD", False, f"Create failed: {response}")
        
        customer_id = response.get('id')
        self.test_data['customer_id'] = customer_id
        
        # Read customers
        success, response = self.make_request('GET', 'customers', expect_status=200)
        if not success:
            return self.log_test("Customer CRUD", False, f"Read failed: {response}")
        
        # Update customer
        update_data = {
            "client_name": "Updated Customer",
            "phone_number": "9876543210",
            "address": "456 Updated Street",
            "reference": "Updated Reference"
        }
        success, response = self.make_request('PUT', f'customers/{customer_id}', update_data, 200)
        if not success:
            return self.log_test("Customer CRUD", False, f"Update failed: {response}")
        
        # Delete customer (we'll keep it for event testing)
        # success, response = self.make_request('DELETE', f'customers/{customer_id}', expect_status=200)
        # if not success:
        #     return self.log_test("Customer CRUD", False, f"Delete failed: {response}")
        
        return self.log_test("Customer CRUD", True)

    def test_event_crud(self):
        """Test Event/Booking CRUD operations"""
        if 'customer_id' not in self.test_data:
            return self.log_test("Event CRUD", False, "No customer available for testing")
        
        # Create event
        event_data = {
            "customer_id": self.test_data['customer_id'],
            "event_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "event_type": "Wedding",
            "number_of_guests": 150,
            "event_timing": "6 PM - 11 PM",
            "venue_name": "Test Venue Hall",
            "per_plate_cost": 500.0,
            "discount": 5000.0,
            "quotation_status": "Pending",
            "notes": "Test event booking"
        }
        
        success, response = self.make_request('POST', 'events', event_data, 200)
        if not success:
            return self.log_test("Event CRUD", False, f"Create failed: {response}")
        
        event_id = response.get('id')
        self.test_data['event_id'] = event_id
        
        # Read events
        success, response = self.make_request('GET', 'events', expect_status=200)
        if not success:
            return self.log_test("Event CRUD", False, f"Read failed: {response}")
        
        # Update event
        update_data = event_data.copy()
        update_data['quotation_status'] = 'Approved'
        update_data['notes'] = 'Updated event booking'
        
        success, response = self.make_request('PUT', f'events/{event_id}', update_data, 200)
        if not success:
            return self.log_test("Event CRUD", False, f"Update failed: {response}")
        
        return self.log_test("Event CRUD", True)

    def test_expense_crud(self):
        """Test Expense CRUD operations"""
        # Create expense
        expense_data = {
            "expense_date": datetime.now().strftime("%Y-%m-%d"),
            "expense_type": "Vegetables",
            "amount": 2500.0,
            "notes": "Daily vegetable purchase"
        }
        
        success, response = self.make_request('POST', 'expenses', expense_data, 200)
        if not success:
            return self.log_test("Expense CRUD", False, f"Create failed: {response}")
        
        expense_id = response.get('id')
        
        # Read expenses
        success, response = self.make_request('GET', 'expenses', expect_status=200)
        if not success:
            return self.log_test("Expense CRUD", False, f"Read failed: {response}")
        
        # Delete expense
        success, response = self.make_request('DELETE', f'expenses/{expense_id}', expect_status=200)
        if not success:
            return self.log_test("Expense CRUD", False, f"Delete failed: {response}")
        
        return self.log_test("Expense CRUD", True)

    def test_payment_crud(self):
        """Test Payment CRUD operations"""
        if 'event_id' not in self.test_data:
            return self.log_test("Payment CRUD", False, "No event available for testing")
        
        # Create payment
        payment_data = {
            "event_id": self.test_data['event_id'],
            "amount": 25000.0,
            "payment_mode": "UPI",
            "notes": "Advance payment received"
        }
        
        success, response = self.make_request('POST', 'payments', payment_data, 200)
        if not success:
            return self.log_test("Payment CRUD", False, f"Create failed: {response}")
        
        payment_id = response.get('id')
        
        # Read payments
        success, response = self.make_request('GET', 'payments', expect_status=200)
        if not success:
            return self.log_test("Payment CRUD", False, f"Read failed: {response}")
        
        # Get payments by event
        success, response = self.make_request('GET', f'payments/by-event/{self.test_data["event_id"]}', expect_status=200)
        if not success:
            return self.log_test("Payment CRUD", False, f"Read by event failed: {response}")
        
        return self.log_test("Payment CRUD", True)

    def test_lead_crud(self):
        """Test Lead CRUD operations"""
        # Create lead
        lead_data = {
            "client_name": "Test Lead Client",
            "phone_number": "9876543211",
            "inquiry_date": datetime.now().strftime("%Y-%m-%d"),
            "lead_source": "Instagram",
            "follow_up_date": (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d"),
            "status": "Hot",
            "notes": "Interested in wedding package"
        }
        
        success, response = self.make_request('POST', 'leads', lead_data, 200)
        if not success:
            return self.log_test("Lead CRUD", False, f"Create failed: {response}")
        
        lead_id = response.get('id')
        
        # Read leads
        success, response = self.make_request('GET', 'leads', expect_status=200)
        if not success:
            return self.log_test("Lead CRUD", False, f"Read failed: {response}")
        
        # Update lead
        update_data = lead_data.copy()
        update_data['status'] = 'Warm'
        update_data['notes'] = 'Follow-up completed, waiting for decision'
        
        success, response = self.make_request('PUT', f'leads/{lead_id}', update_data, 200)
        if not success:
            return self.log_test("Lead CRUD", False, f"Update failed: {response}")
        
        return self.log_test("Lead CRUD", True)

    def test_dashboard_api(self):
        """Test Dashboard API"""
        success, response = self.make_request('GET', 'dashboard', expect_status=200)
        if success and isinstance(response, dict):
            # Check if dashboard has expected keys
            expected_keys = ['todays_events', 'todays_expenses', 'todays_payments', 'pending_payments', 'stats']
            missing_keys = [key for key in expected_keys if key not in response]
            if missing_keys:
                return self.log_test("Dashboard API", False, f"Missing keys: {missing_keys}")
        
        return self.log_test("Dashboard API", success, response if not success else "")

    def test_payment_tracking(self):
        """Test Payment Tracking API"""
        success, response = self.make_request('GET', 'payment-tracking', expect_status=200)
        return self.log_test("Payment Tracking", success, response if not success else "")

    def test_export_functionality(self):
        """Test Export functionality"""
        export_endpoints = ['export/events', 'export/expenses', 'export/payments', 'export/leads']
        all_passed = True
        
        for endpoint in export_endpoints:
            success, response = self.make_request('GET', endpoint, expect_status=200)
            if not success:
                all_passed = False
                print(f"❌ Export {endpoint.split('/')[-1]} - FAILED: {response}")
            else:
                print(f"✅ Export {endpoint.split('/')[-1]} - PASSED")
        
        return self.log_test("Export Functionality", all_passed)

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Hotel Management API Tests")
        print("=" * 50)
        
        # Authentication tests
        self.test_user_registration()
        self.test_user_login()
        
        if not self.token:
            print("❌ Cannot proceed without authentication token")
            return False
        
        self.test_auth_me()
        
        # CRUD tests
        self.test_customer_crud()
        self.test_event_crud()
        self.test_expense_crud()
        self.test_payment_crud()
        self.test_lead_crud()
        
        # Dashboard and analytics
        self.test_dashboard_api()
        self.test_payment_tracking()
        
        # Export functionality
        self.test_export_functionality()
        
        # Summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = HotelManagementAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
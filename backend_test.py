#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Custom Calendar Application
Tests all authentication, calendar sources, events CRUD, and invite response endpoints
"""

import requests
import json
from datetime import datetime, timedelta
import uuid
import sys

# Get backend URL from frontend .env
BACKEND_URL = "https://calendarbridge-1.preview.emergentagent.com/api"

class CalendarAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.auth_token = None
        self.user_data = None
        self.test_events = []
        self.results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
    
    def log_result(self, test_name, success, message=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        
        if success:
            self.results["passed"] += 1
        else:
            self.results["failed"] += 1
            self.results["errors"].append(f"{test_name}: {message}")
    
    def test_auth_register_valid(self):
        """Test user registration with valid data"""
        test_user = {
            "email": f"testuser_{uuid.uuid4().hex[:8]}@example.com",
            "password": "SecurePass123!",
            "name": "Test User"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/register", json=test_user)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "user" in data:
                    self.auth_token = data["access_token"]
                    self.user_data = data["user"]
                    self.log_result("Auth Register Valid", True, f"User created: {data['user']['email']}")
                    return True
                else:
                    self.log_result("Auth Register Valid", False, "Missing token or user data in response")
            else:
                self.log_result("Auth Register Valid", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Auth Register Valid", False, f"Exception: {str(e)}")
        
        return False
    
    def test_auth_register_duplicate(self):
        """Test registration with duplicate email"""
        if not self.user_data:
            self.log_result("Auth Register Duplicate", False, "No user data from previous test")
            return False
        
        duplicate_user = {
            "email": self.user_data["email"],
            "password": "AnotherPass123!",
            "name": "Another User"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/register", json=duplicate_user)
            
            if response.status_code == 400:
                self.log_result("Auth Register Duplicate", True, "Correctly rejected duplicate email")
                return True
            else:
                self.log_result("Auth Register Duplicate", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_result("Auth Register Duplicate", False, f"Exception: {str(e)}")
        
        return False
    
    def test_auth_register_invalid(self):
        """Test registration with invalid data"""
        invalid_cases = [
            ({"email": "invalid-email", "password": "pass", "name": "Test"}, "Invalid email format"),
            ({"email": "test@example.com", "name": "Test"}, "Missing password"),
            ({"email": "test@example.com", "password": "pass"}, "Missing name")
        ]
        
        all_passed = True
        for invalid_data, description in invalid_cases:
            try:
                response = requests.post(f"{self.base_url}/auth/register", json=invalid_data)
                if response.status_code in [400, 422]:
                    self.log_result(f"Auth Register Invalid - {description}", True)
                else:
                    self.log_result(f"Auth Register Invalid - {description}", False, f"Expected 400/422, got {response.status_code}")
                    all_passed = False
            except Exception as e:
                self.log_result(f"Auth Register Invalid - {description}", False, f"Exception: {str(e)}")
                all_passed = False
        
        return all_passed
    
    def test_auth_login_valid(self):
        """Test login with correct credentials"""
        if not self.user_data:
            self.log_result("Auth Login Valid", False, "No user data available")
            return False
        
        login_data = {
            "email": self.user_data["email"],
            "password": "SecurePass123!"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "user" in data:
                    self.auth_token = data["access_token"]  # Update token
                    self.log_result("Auth Login Valid", True, f"Login successful for {data['user']['email']}")
                    return True
                else:
                    self.log_result("Auth Login Valid", False, "Missing token or user data in response")
            else:
                self.log_result("Auth Login Valid", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Auth Login Valid", False, f"Exception: {str(e)}")
        
        return False
    
    def test_auth_login_invalid(self):
        """Test login with incorrect credentials"""
        invalid_cases = [
            ({"email": "nonexistent@example.com", "password": "password"}, "Non-existent email"),
            ({"email": self.user_data["email"] if self.user_data else "test@example.com", "password": "wrongpassword"}, "Wrong password")
        ]
        
        all_passed = True
        for invalid_data, description in invalid_cases:
            try:
                response = requests.post(f"{self.base_url}/auth/login", json=invalid_data)
                if response.status_code == 401:
                    self.log_result(f"Auth Login Invalid - {description}", True)
                else:
                    self.log_result(f"Auth Login Invalid - {description}", False, f"Expected 401, got {response.status_code}")
                    all_passed = False
            except Exception as e:
                self.log_result(f"Auth Login Invalid - {description}", False, f"Exception: {str(e)}")
                all_passed = False
        
        return all_passed
    
    def test_calendar_sources_authenticated(self):
        """Test calendar sources endpoint with authentication"""
        if not self.auth_token:
            self.log_result("Calendar Sources Authenticated", False, "No auth token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = requests.get(f"{self.base_url}/calendar-sources", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                expected_sources = ["google", "apple", "outlook"]
                
                if len(data) == 3:
                    source_ids = [source["id"] for source in data]
                    if all(source_id in source_ids for source_id in expected_sources):
                        # Check if all sources have required fields and colors
                        valid_sources = True
                        for source in data:
                            if not all(key in source for key in ["id", "name", "type", "color", "is_active"]):
                                valid_sources = False
                                break
                        
                        if valid_sources:
                            self.log_result("Calendar Sources Authenticated", True, f"All 3 sources returned with correct structure")
                            return True
                        else:
                            self.log_result("Calendar Sources Authenticated", False, "Sources missing required fields")
                    else:
                        self.log_result("Calendar Sources Authenticated", False, f"Missing expected sources. Got: {source_ids}")
                else:
                    self.log_result("Calendar Sources Authenticated", False, f"Expected 3 sources, got {len(data)}")
            else:
                self.log_result("Calendar Sources Authenticated", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Calendar Sources Authenticated", False, f"Exception: {str(e)}")
        
        return False
    
    def test_calendar_sources_unauthenticated(self):
        """Test calendar sources endpoint without authentication"""
        try:
            response = requests.get(f"{self.base_url}/calendar-sources")
            
            if response.status_code == 401:
                self.log_result("Calendar Sources Unauthenticated", True, "Correctly rejected unauthenticated request")
                return True
            else:
                self.log_result("Calendar Sources Unauthenticated", False, f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_result("Calendar Sources Unauthenticated", False, f"Exception: {str(e)}")
        
        return False
    
    def test_events_get_all(self):
        """Test getting all events"""
        if not self.auth_token:
            self.log_result("Events Get All", False, "No auth token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = requests.get(f"{self.base_url}/events", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    # Should have mock data (20 events generated on registration)
                    if len(data) >= 15:  # Allow some flexibility
                        self.log_result("Events Get All", True, f"Retrieved {len(data)} events (mock data generated)")
                        self.test_events = data  # Store for later tests
                        return True
                    else:
                        self.log_result("Events Get All", False, f"Expected ~20 mock events, got {len(data)}")
                else:
                    self.log_result("Events Get All", False, "Response is not a list")
            else:
                self.log_result("Events Get All", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Events Get All", False, f"Exception: {str(e)}")
        
        return False
    
    def test_events_get_filtered(self):
        """Test getting events filtered by calendar sources"""
        if not self.auth_token:
            self.log_result("Events Get Filtered", False, "No auth token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Test filtering by google and apple
        try:
            response = requests.get(f"{self.base_url}/events?calendar_sources=google,apple", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    # Check that all returned events are from google or apple
                    valid_filter = True
                    for event in data:
                        if event.get("calendar_source") not in ["google", "apple"]:
                            valid_filter = False
                            break
                    
                    if valid_filter:
                        self.log_result("Events Get Filtered", True, f"Filtered events correctly: {len(data)} events from google/apple")
                        return True
                    else:
                        self.log_result("Events Get Filtered", False, "Filter not working - found events from other sources")
                else:
                    self.log_result("Events Get Filtered", False, "Response is not a list")
            else:
                self.log_result("Events Get Filtered", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Events Get Filtered", False, f"Exception: {str(e)}")
        
        return False
    
    def test_events_get_unauthenticated(self):
        """Test getting events without authentication"""
        try:
            response = requests.get(f"{self.base_url}/events")
            
            if response.status_code == 401:
                self.log_result("Events Get Unauthenticated", True, "Correctly rejected unauthenticated request")
                return True
            else:
                self.log_result("Events Get Unauthenticated", False, f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_result("Events Get Unauthenticated", False, f"Exception: {str(e)}")
        
        return False
    
    def test_events_create(self):
        """Test creating a new event"""
        if not self.auth_token:
            self.log_result("Events Create", False, "No auth token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        now = datetime.utcnow()
        event_data = {
            "title": "Test Meeting",
            "description": "A test meeting created by automated testing",
            "start_time": (now + timedelta(hours=1)).isoformat(),
            "end_time": (now + timedelta(hours=2)).isoformat(),
            "calendar_source": "google",
            "location": "Conference Room B"
        }
        
        try:
            response = requests.post(f"{self.base_url}/events", json=event_data, headers=headers)
            
            if response.status_code == 201:
                data = response.json()
                if "id" in data and data["title"] == event_data["title"]:
                    self.created_event_id = data["id"]
                    self.log_result("Events Create", True, f"Event created with ID: {data['id']}")
                    return True
                else:
                    self.log_result("Events Create", False, "Created event missing ID or incorrect data")
            else:
                self.log_result("Events Create", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Events Create", False, f"Exception: {str(e)}")
        
        return False
    
    def test_events_create_unauthenticated(self):
        """Test creating event without authentication"""
        now = datetime.utcnow()
        event_data = {
            "title": "Unauthorized Event",
            "start_time": (now + timedelta(hours=1)).isoformat(),
            "end_time": (now + timedelta(hours=2)).isoformat(),
            "calendar_source": "google"
        }
        
        try:
            response = requests.post(f"{self.base_url}/events", json=event_data)
            
            if response.status_code == 401:
                self.log_result("Events Create Unauthenticated", True, "Correctly rejected unauthenticated request")
                return True
            else:
                self.log_result("Events Create Unauthenticated", False, f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_result("Events Create Unauthenticated", False, f"Exception: {str(e)}")
        
        return False
    
    def test_events_update(self):
        """Test updating an existing event"""
        if not self.auth_token or not hasattr(self, 'created_event_id'):
            self.log_result("Events Update", False, "No auth token or created event available")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        update_data = {
            "title": "Updated Test Meeting",
            "description": "Updated description",
            "location": "Updated Location"
        }
        
        try:
            response = requests.put(f"{self.base_url}/events/{self.created_event_id}", json=update_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data["title"] == update_data["title"] and data["description"] == update_data["description"]:
                    self.log_result("Events Update", True, f"Event updated successfully")
                    return True
                else:
                    self.log_result("Events Update", False, "Updated event data doesn't match")
            else:
                self.log_result("Events Update", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Events Update", False, f"Exception: {str(e)}")
        
        return False
    
    def test_events_update_nonexistent(self):
        """Test updating a non-existent event"""
        if not self.auth_token:
            self.log_result("Events Update Nonexistent", False, "No auth token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        fake_id = "507f1f77bcf86cd799439011"  # Valid ObjectId format but doesn't exist
        
        update_data = {"title": "Should Not Work"}
        
        try:
            response = requests.put(f"{self.base_url}/events/{fake_id}", json=update_data, headers=headers)
            
            if response.status_code == 404:
                self.log_result("Events Update Nonexistent", True, "Correctly returned 404 for non-existent event")
                return True
            else:
                self.log_result("Events Update Nonexistent", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("Events Update Nonexistent", False, f"Exception: {str(e)}")
        
        return False
    
    def test_events_delete(self):
        """Test deleting an event"""
        if not self.auth_token or not hasattr(self, 'created_event_id'):
            self.log_result("Events Delete", False, "No auth token or created event available")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = requests.delete(f"{self.base_url}/events/{self.created_event_id}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "deleted" in data["message"].lower():
                    self.log_result("Events Delete", True, "Event deleted successfully")
                    return True
                else:
                    self.log_result("Events Delete", False, "Unexpected response format")
            else:
                self.log_result("Events Delete", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Events Delete", False, f"Exception: {str(e)}")
        
        return False
    
    def test_events_delete_nonexistent(self):
        """Test deleting a non-existent event"""
        if not self.auth_token:
            self.log_result("Events Delete Nonexistent", False, "No auth token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        fake_id = "507f1f77bcf86cd799439011"  # Valid ObjectId format but doesn't exist
        
        try:
            response = requests.delete(f"{self.base_url}/events/{fake_id}", headers=headers)
            
            if response.status_code == 404:
                self.log_result("Events Delete Nonexistent", True, "Correctly returned 404 for non-existent event")
                return True
            else:
                self.log_result("Events Delete Nonexistent", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("Events Delete Nonexistent", False, f"Exception: {str(e)}")
        
        return False
    
    def test_invite_response_accept(self):
        """Test accepting an invite"""
        if not self.auth_token or not self.test_events:
            self.log_result("Invite Response Accept", False, "No auth token or events available")
            return False
        
        # Find an invite event from mock data
        invite_event = None
        for event in self.test_events:
            if event.get("is_invite") and event.get("invite_status") == "pending":
                invite_event = event
                break
        
        if not invite_event:
            self.log_result("Invite Response Accept", False, "No pending invite events found in mock data")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        response_data = {"status": "accepted"}
        
        try:
            response = requests.patch(f"{self.base_url}/events/{invite_event['id']}/respond", 
                                    json=response_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("invite_status") == "accepted":
                    self.log_result("Invite Response Accept", True, f"Invite accepted for event: {data['title']}")
                    return True
                else:
                    self.log_result("Invite Response Accept", False, "Invite status not updated correctly")
            else:
                self.log_result("Invite Response Accept", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Invite Response Accept", False, f"Exception: {str(e)}")
        
        return False
    
    def test_invite_response_decline(self):
        """Test declining an invite"""
        if not self.auth_token or not self.test_events:
            self.log_result("Invite Response Decline", False, "No auth token or events available")
            return False
        
        # Find another invite event from mock data
        invite_event = None
        for event in self.test_events:
            if event.get("is_invite") and event.get("invite_status") == "pending":
                invite_event = event
                break
        
        if not invite_event:
            self.log_result("Invite Response Decline", False, "No pending invite events found in mock data")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        response_data = {"status": "declined"}
        
        try:
            response = requests.patch(f"{self.base_url}/events/{invite_event['id']}/respond", 
                                    json=response_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("invite_status") == "declined":
                    self.log_result("Invite Response Decline", True, f"Invite declined for event: {data['title']}")
                    return True
                else:
                    self.log_result("Invite Response Decline", False, "Invite status not updated correctly")
            else:
                self.log_result("Invite Response Decline", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Invite Response Decline", False, f"Exception: {str(e)}")
        
        return False
    
    def test_invite_response_non_invite(self):
        """Test responding to a non-invite event"""
        if not self.auth_token or not self.test_events:
            self.log_result("Invite Response Non-Invite", False, "No auth token or events available")
            return False
        
        # Find a non-invite event
        non_invite_event = None
        for event in self.test_events:
            if not event.get("is_invite"):
                non_invite_event = event
                break
        
        if not non_invite_event:
            self.log_result("Invite Response Non-Invite", False, "No non-invite events found")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        response_data = {"status": "accepted"}
        
        try:
            response = requests.patch(f"{self.base_url}/events/{non_invite_event['id']}/respond", 
                                    json=response_data, headers=headers)
            
            if response.status_code == 404:
                self.log_result("Invite Response Non-Invite", True, "Correctly rejected response to non-invite event")
                return True
            else:
                self.log_result("Invite Response Non-Invite", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("Invite Response Non-Invite", False, f"Exception: {str(e)}")
        
        return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print(f"🚀 Starting Comprehensive Backend API Testing")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Authentication Tests
        print("\n📝 AUTHENTICATION TESTS")
        print("-" * 30)
        self.test_auth_register_valid()
        self.test_auth_register_duplicate()
        self.test_auth_register_invalid()
        self.test_auth_login_valid()
        self.test_auth_login_invalid()
        
        # Calendar Sources Tests
        print("\n📅 CALENDAR SOURCES TESTS")
        print("-" * 30)
        self.test_calendar_sources_authenticated()
        self.test_calendar_sources_unauthenticated()
        
        # Events Tests
        print("\n📋 EVENTS CRUD TESTS")
        print("-" * 30)
        self.test_events_get_all()
        self.test_events_get_filtered()
        self.test_events_get_unauthenticated()
        self.test_events_create()
        self.test_events_create_unauthenticated()
        self.test_events_update()
        self.test_events_update_nonexistent()
        self.test_events_delete()
        self.test_events_delete_nonexistent()
        
        # Invite Response Tests
        print("\n✉️ INVITE RESPONSE TESTS")
        print("-" * 30)
        self.test_invite_response_accept()
        self.test_invite_response_decline()
        self.test_invite_response_non_invite()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        total_tests = self.results["passed"] + self.results["failed"]
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        
        if self.results["failed"] > 0:
            print(f"\n🔍 FAILED TESTS:")
            for error in self.results["errors"]:
                print(f"   • {error}")
        
        success_rate = (self.results["passed"] / total_tests * 100) if total_tests > 0 else 0
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("🎉 Excellent! Backend APIs are working well.")
        elif success_rate >= 70:
            print("⚠️  Good, but some issues need attention.")
        else:
            print("🚨 Critical issues found. Backend needs fixes.")
        
        return success_rate >= 70

if __name__ == "__main__":
    tester = CalendarAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
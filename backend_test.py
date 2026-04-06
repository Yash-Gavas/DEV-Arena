#!/usr/bin/env python3
"""
DEV-Arena Backend API Testing Suite
Tests all backend endpoints for the AI-powered technical interview platform
"""

import requests
import sys
import json
from datetime import datetime

class DEVArenaAPITester:
    def __init__(self, base_url="https://dsa-interview-prep-3.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = "test_session_dev_arena_2026"
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.session_token}'
        }
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, check_response=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=self.headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=self.headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=self.headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                
                # Additional response checks
                if check_response and response.status_code == 200:
                    try:
                        resp_data = response.json()
                        check_result = check_response(resp_data)
                        if not check_result:
                            success = False
                            print(f"❌ Response validation failed")
                            self.failed_tests.append(f"{name} - Response validation failed")
                    except Exception as e:
                        print(f"⚠️  Response check error: {e}")
                        
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.status_code >= 400:
                    try:
                        error_detail = response.json()
                        print(f"   Error: {error_detail}")
                    except:
                        print(f"   Error: {response.text}")
                self.failed_tests.append(f"{name} - Status {response.status_code}")

            return success, response.json() if response.status_code == 200 else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"{name} - Exception: {str(e)}")
            return False, {}

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION ENDPOINTS")
        print("="*50)
        
        # Test get current user
        self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200,
            check_response=lambda r: "user_id" in r and "email" in r
        )

    def test_problems_endpoints(self):
        """Test DSA problems endpoints"""
        print("\n" + "="*50)
        print("TESTING DSA PROBLEMS ENDPOINTS")
        print("="*50)
        
        # Test list problems
        success, response = self.run_test(
            "List Problems (Default)",
            "GET",
            "problems",
            200,
            check_response=lambda r: "problems" in r and "total" in r and isinstance(r["problems"], list)
        )
        
        if success and response:
            total_problems = response.get("total", 0)
            print(f"   📊 Total problems in database: {total_problems}")
            if total_problems >= 15000:
                print(f"✅ Database has {total_problems} problems (meets 15000+ requirement)")
            else:
                print(f"⚠️  Database has only {total_problems} problems (expected 15000+)")
        
        # Test problems metadata
        self.run_test(
            "Get Problems Metadata",
            "GET",
            "problems/meta",
            200,
            check_response=lambda r: all(k in r for k in ["topics", "patterns", "companies", "difficulties"])
        )
        
        # Test filtering by topic
        self.run_test(
            "Filter Problems by Topic (Arrays)",
            "GET",
            "problems?topic=Arrays",
            200,
            check_response=lambda r: "problems" in r and isinstance(r["problems"], list)
        )
        
        # Test filtering by pattern
        self.run_test(
            "Filter Problems by Pattern (Two Pointers)",
            "GET",
            "problems?pattern=Two+Pointers",
            200,
            check_response=lambda r: "problems" in r and isinstance(r["problems"], list)
        )
        
        # Test filtering by difficulty
        self.run_test(
            "Filter Problems by Difficulty (Hard)",
            "GET",
            "problems?difficulty=Hard",
            200,
            check_response=lambda r: "problems" in r and isinstance(r["problems"], list)
        )
        
        # Test pagination
        self.run_test(
            "Problems Pagination",
            "GET",
            "problems?page=2&limit=10",
            200,
            check_response=lambda r: "problems" in r and "page" in r and r["page"] == 2
        )

    def test_resources_endpoints(self):
        """Test resources endpoints"""
        print("\n" + "="*50)
        print("TESTING RESOURCES ENDPOINTS")
        print("="*50)
        
        success, response = self.run_test(
            "List Resources",
            "GET",
            "resources",
            200,
            check_response=lambda r: "resources" in r and isinstance(r["resources"], list)
        )
        
        if success and response:
            resources_count = len(response.get("resources", []))
            print(f"   📊 Total resources: {resources_count}")
            if resources_count >= 6:
                print(f"✅ Found {resources_count} CS resources (meets requirement)")
            else:
                print(f"⚠️  Found only {resources_count} resources (expected 6 CS subjects)")

    def test_sql_endpoints(self):
        """Test SQL playground endpoints"""
        print("\n" + "="*50)
        print("TESTING SQL PLAYGROUND ENDPOINTS")
        print("="*50)
        
        # Test SQL schema
        success, response = self.run_test(
            "Get SQL Schema",
            "GET",
            "sql/schema",
            200,
            check_response=lambda r: "tables" in r and isinstance(r["tables"], list)
        )
        
        if success and response:
            tables_count = len(response.get("tables", []))
            print(f"   📊 SQL tables available: {tables_count}")
            if tables_count >= 4:
                print(f"✅ Found {tables_count} SQL tables (meets requirement)")
            else:
                print(f"⚠️  Found only {tables_count} tables (expected 4)")
        
        # Test valid SQL query
        self.run_test(
            "Execute Valid SQL Query",
            "POST",
            "sql/execute",
            200,
            data={"query": "SELECT * FROM employees LIMIT 5"},
            check_response=lambda r: "columns" in r and "rows" in r and isinstance(r["rows"], list)
        )
        
        # Test invalid SQL query (should be rejected)
        self.run_test(
            "Reject Dangerous SQL Query",
            "POST",
            "sql/execute",
            400,
            data={"query": "DROP TABLE employees"}
        )

    def test_profile_endpoints(self):
        """Test profile endpoints"""
        print("\n" + "="*50)
        print("TESTING PROFILE ENDPOINTS")
        print("="*50)
        
        # Test get profile
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "profile",
            200,
            check_response=lambda r: "user_id" in r and "email" in r
        )
        
        # Test update profile
        self.run_test(
            "Update User Profile",
            "PUT",
            "profile",
            200,
            data={
                "bio": "Test bio for automated testing",
                "college": "Test University",
                "target_role": "Software Engineer"
            },
            check_response=lambda r: "user_id" in r
        )

    def test_chatbot_endpoint(self):
        """Test DSA chatbot endpoint"""
        print("\n" + "="*50)
        print("TESTING DSA CHATBOT ENDPOINT")
        print("="*50)
        
        self.run_test(
            "DSA Chatbot Query",
            "POST",
            "chatbot",
            200,
            data={
                "message": "What is the time complexity of binary search?",
                "context": "Learning about search algorithms"
            },
            check_response=lambda r: "response" in r and isinstance(r["response"], str) and len(r["response"]) > 10
        )

    def test_interview_endpoints(self):
        """Test AI interview endpoints"""
        print("\n" + "="*50)
        print("TESTING AI INTERVIEW ENDPOINTS")
        print("="*50)
        
        # Test list interviews
        self.run_test(
            "List User Interviews",
            "GET",
            "interviews",
            200,
            check_response=lambda r: "interviews" in r and isinstance(r["interviews"], list)
        )
        
        # Test start interview
        success, response = self.run_test(
            "Start New Interview",
            "POST",
            "interviews/start",
            200,
            data={
                "role": "Software Engineer",
                "jd": "Full-stack developer position requiring strong DSA skills"
            },
            check_response=lambda r: "interview" in r and "messages" in r
        )
        
        if success and response:
            interview_id = response.get("interview", {}).get("interview_id")
            if interview_id:
                print(f"   📝 Created interview: {interview_id}")
                
                # Test send message to interview
                self.run_test(
                    "Send Interview Message",
                    "POST",
                    f"interviews/{interview_id}/message",
                    200,
                    data={"content": "I'm ready to start the interview"},
                    check_response=lambda r: "user_message" in r and "ai_message" in r
                )

    def test_code_evaluation(self):
        """Test code evaluation endpoint"""
        print("\n" + "="*50)
        print("TESTING CODE EVALUATION")
        print("="*50)
        
        # First get a problem to test with
        success, problems_response = self.run_test(
            "Get Problem for Code Evaluation",
            "GET",
            "problems?limit=1",
            200
        )
        
        if success and problems_response and problems_response.get("problems"):
            problem_id = problems_response["problems"][0].get("problem_id")
            if problem_id:
                self.run_test(
                    "Evaluate Code Submission",
                    "POST",
                    "code/evaluate",
                    200,
                    data={
                        "problem_id": problem_id,
                        "code": "def solution(nums):\n    return sorted(nums)",
                        "language": "python"
                    },
                    check_response=lambda r: "passed" in r and "score" in r and "feedback" in r
                )

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting DEV-Arena Backend API Testing")
        print(f"🌐 Base URL: {self.base_url}")
        print(f"🔑 Using test session token: {self.session_token}")
        
        # Run all test suites
        self.test_auth_endpoints()
        self.test_problems_endpoints()
        self.test_resources_endpoints()
        self.test_sql_endpoints()
        self.test_profile_endpoints()
        self.test_chatbot_endpoint()
        self.test_interview_endpoints()
        self.test_code_evaluation()
        
        # Print final results
        print("\n" + "="*60)
        print("FINAL TEST RESULTS")
        print("="*60)
        print(f"📊 Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"✅ Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed tests ({len(self.failed_tests)}):")
            for i, failed_test in enumerate(self.failed_tests, 1):
                print(f"   {i}. {failed_test}")
        else:
            print("\n🎉 All tests passed!")
        
        return self.tests_passed == self.tests_run

def main():
    tester = DEVArenaAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
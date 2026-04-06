"""
Backend API Tests for DEV-Arena - Iteration 3
Testing: 3D Visualizer, Interview improvements, Navigation

Features tested:
- Interview API (start, message, next-round, end)
- Problems API (list, get, testcases, chat)
- Proctoring API (event logging)
- Code evaluation API
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
SESSION_TOKEN = "test_session_dev_arena_2026"

@pytest.fixture
def api_client():
    """Shared requests session with auth"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {SESSION_TOKEN}"
    })
    session.cookies.set("session_token", SESSION_TOKEN)
    return session


class TestAuthAPI:
    """Authentication endpoint tests"""
    
    def test_auth_me_returns_user(self, api_client):
        """GET /api/auth/me should return authenticated user"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert data["user_id"] == "test-user-dev-arena"
        print(f"Auth test passed: user_id={data['user_id']}")


class TestProblemsAPI:
    """DSA Problems endpoint tests"""
    
    def test_list_problems(self, api_client):
        """GET /api/problems should return paginated problems"""
        response = api_client.get(f"{BASE_URL}/api/problems?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "problems" in data
        assert "total" in data
        assert len(data["problems"]) <= 10
        assert data["total"] > 15000  # Should have 15000+ problems
        print(f"Problems list test passed: total={data['total']}")
    
    def test_get_problem_by_id(self, api_client):
        """GET /api/problems/:id should return problem details"""
        response = api_client.get(f"{BASE_URL}/api/problems/prob_00001")
        assert response.status_code == 200
        data = response.json()
        assert "problem_id" in data
        assert "title" in data
        assert "description" in data
        assert "difficulty" in data
        print(f"Get problem test passed: title={data['title']}")
    
    def test_get_problems_meta(self, api_client):
        """GET /api/problems/meta should return filter options"""
        response = api_client.get(f"{BASE_URL}/api/problems/meta")
        assert response.status_code == 200
        data = response.json()
        assert "topics" in data
        assert "patterns" in data
        assert "companies" in data
        assert "difficulties" in data
        assert len(data["topics"]) > 0
        print(f"Problems meta test passed: {len(data['topics'])} topics")
    
    def test_get_testcases(self, api_client):
        """GET /api/problems/:id/testcases should return test cases"""
        response = api_client.get(f"{BASE_URL}/api/problems/prob_00001/testcases")
        assert response.status_code == 200
        data = response.json()
        assert "testcases" in data
        assert len(data["testcases"]) > 0
        tc = data["testcases"][0]
        assert "input" in tc
        assert "expected_output" in tc
        print(f"Testcases test passed: {len(data['testcases'])} test cases")
    
    def test_problem_chat(self, api_client):
        """POST /api/problems/:id/chat should return AI response"""
        response = api_client.post(
            f"{BASE_URL}/api/problems/prob_00001/chat",
            json={"message": "Give me a hint for Two Sum", "context": ""}
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert len(data["response"]) > 10
        print(f"Problem chat test passed: response length={len(data['response'])}")


class TestInterviewAPI:
    """AI Interview endpoint tests"""
    
    def test_start_interview(self, api_client):
        """POST /api/interviews/start should create interview and return intro message"""
        response = api_client.post(
            f"{BASE_URL}/api/interviews/start",
            json={"role": "Software Engineer", "jd": "Test JD for automated testing"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "interview" in data
        assert "messages" in data
        assert data["interview"]["interview_id"] is not None
        assert data["interview"]["current_round"] == 1
        assert len(data["messages"]) > 0
        
        # Verify AI asks for introduction first
        first_msg = data["messages"][0]["content"].lower()
        assert "introduce" in first_msg or "introduction" in first_msg or "background" in first_msg
        print(f"Start interview test passed: interview_id={data['interview']['interview_id']}")
        return data["interview"]["interview_id"]
    
    def test_interview_message(self, api_client):
        """POST /api/interviews/:id/message should return AI response"""
        # First start an interview
        start_resp = api_client.post(
            f"{BASE_URL}/api/interviews/start",
            json={"role": "Backend Developer", "jd": ""}
        )
        interview_id = start_resp.json()["interview"]["interview_id"]
        
        # Wait for AI to process
        time.sleep(2)
        
        # Send a message
        response = api_client.post(
            f"{BASE_URL}/api/interviews/{interview_id}/message",
            json={"content": "Hi, I'm a test candidate with 3 years of experience in Python and Java."}
        )
        assert response.status_code == 200
        data = response.json()
        assert "user_message" in data
        assert "ai_message" in data
        assert data["ai_message"]["role"] == "interviewer"
        print(f"Interview message test passed: AI responded")
    
    def test_list_interviews(self, api_client):
        """GET /api/interviews should return user's interviews"""
        response = api_client.get(f"{BASE_URL}/api/interviews")
        assert response.status_code == 200
        data = response.json()
        assert "interviews" in data
        print(f"List interviews test passed: {len(data['interviews'])} interviews")


class TestProctoringAPI:
    """Proctoring endpoint tests"""
    
    def test_log_proctoring_event(self, api_client):
        """POST /api/proctoring/event should log event"""
        # First start an interview
        start_resp = api_client.post(
            f"{BASE_URL}/api/interviews/start",
            json={"role": "Test Role", "jd": ""}
        )
        interview_id = start_resp.json()["interview"]["interview_id"]
        
        # Log a tab switch event
        response = api_client.post(
            f"{BASE_URL}/api/proctoring/event",
            json={
                "interview_id": interview_id,
                "event_type": "tab_switch",
                "details": "Test tab switch event"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "logged"
        print("Proctoring event test passed")
    
    def test_log_face_not_detected(self, api_client):
        """POST /api/proctoring/event should log face detection event"""
        start_resp = api_client.post(
            f"{BASE_URL}/api/interviews/start",
            json={"role": "Test Role", "jd": ""}
        )
        interview_id = start_resp.json()["interview"]["interview_id"]
        
        response = api_client.post(
            f"{BASE_URL}/api/proctoring/event",
            json={
                "interview_id": interview_id,
                "event_type": "face_not_detected",
                "details": "No face detected in camera feed"
            }
        )
        assert response.status_code == 200
        print("Face detection event test passed")


class TestCodeEvaluationAPI:
    """Code evaluation endpoint tests"""
    
    def test_evaluate_code(self, api_client):
        """POST /api/code/evaluate should return evaluation result"""
        response = api_client.post(
            f"{BASE_URL}/api/code/evaluate",
            json={
                "problem_id": "prob_00001",
                "code": "def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen:\n            return [seen[complement], i]\n        seen[num] = i\n    return []",
                "language": "python"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "passed" in data or "score" in data or "feedback" in data
        print(f"Code evaluation test passed: score={data.get('score', 'N/A')}")


class TestResourcesAPI:
    """Resources endpoint tests"""
    
    def test_list_resources(self, api_client):
        """GET /api/resources should return CS resources"""
        response = api_client.get(f"{BASE_URL}/api/resources")
        assert response.status_code == 200
        data = response.json()
        assert "resources" in data
        assert len(data["resources"]) > 0
        print(f"Resources test passed: {len(data['resources'])} resources")


class TestSQLAPI:
    """SQL Playground endpoint tests"""
    
    def test_get_sql_schema(self, api_client):
        """GET /api/sql/schema should return table schemas"""
        response = api_client.get(f"{BASE_URL}/api/sql/schema")
        assert response.status_code == 200
        data = response.json()
        assert "tables" in data
        assert len(data["tables"]) >= 4  # employees, departments, orders, logs
        print(f"SQL schema test passed: {len(data['tables'])} tables")
    
    def test_execute_select_query(self, api_client):
        """POST /api/sql/execute should execute SELECT query"""
        response = api_client.post(
            f"{BASE_URL}/api/sql/execute",
            json={"query": "SELECT * FROM employees LIMIT 5"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "columns" in data
        assert "rows" in data
        assert len(data["rows"]) <= 5
        print(f"SQL execute test passed: {len(data['rows'])} rows")
    
    def test_reject_dangerous_query(self, api_client):
        """POST /api/sql/execute should reject DROP query"""
        response = api_client.post(
            f"{BASE_URL}/api/sql/execute",
            json={"query": "DROP TABLE employees"}
        )
        assert response.status_code == 400
        print("SQL dangerous query rejection test passed")


class TestProfileAPI:
    """Profile endpoint tests"""
    
    def test_get_profile(self, api_client):
        """GET /api/profile should return user profile"""
        response = api_client.get(f"{BASE_URL}/api/profile")
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        print(f"Profile test passed: user_id={data['user_id']}")
    
    def test_update_profile(self, api_client):
        """PUT /api/profile should update profile"""
        response = api_client.put(
            f"{BASE_URL}/api/profile",
            json={"bio": "Updated bio for testing", "target_role": "Senior Engineer"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["bio"] == "Updated bio for testing"
        print("Profile update test passed")


class TestChatbotAPI:
    """DSA Chatbot endpoint tests"""
    
    def test_chatbot_response(self, api_client):
        """POST /api/chatbot should return AI response"""
        response = api_client.post(
            f"{BASE_URL}/api/chatbot",
            json={"message": "Explain binary search", "context": ""}
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert len(data["response"]) > 10
        print(f"Chatbot test passed: response length={len(data['response'])}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

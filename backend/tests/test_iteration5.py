"""
Iteration 5 Backend Tests
Tests for:
1. Custom question visualizer endpoint (/api/visualize/question)
2. Interview start/message/next-round APIs
3. Proctoring event logging
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TOKEN = "test_session_dev_arena_2026"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}


class TestCustomQuestionVisualizer:
    """Tests for POST /api/visualize/question endpoint"""
    
    def test_visualize_question_returns_200(self):
        """Test that visualize question endpoint returns 200"""
        response = requests.post(
            f"{BASE_URL}/api/visualize/question",
            headers=HEADERS,
            json={"message": "Given an array [2,7,11,15] and target 9, find two numbers that add up to target"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_visualize_question_returns_data_structure(self):
        """Test that response contains data_structure field"""
        response = requests.post(
            f"{BASE_URL}/api/visualize/question",
            headers=HEADERS,
            json={"message": "Reverse a linked list"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "data_structure" in data, "Response should contain data_structure"
        assert data["data_structure"] in ["array", "linkedlist", "binarytree", "stack", "graph"], f"Invalid data_structure: {data['data_structure']}"
    
    def test_visualize_question_returns_steps(self):
        """Test that response contains steps array"""
        response = requests.post(
            f"{BASE_URL}/api/visualize/question",
            headers=HEADERS,
            json={"message": "Find maximum element in array [5,3,8,1,9]"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "steps" in data, "Response should contain steps"
        assert isinstance(data["steps"], list), "Steps should be a list"
        if len(data["steps"]) > 0:
            step = data["steps"][0]
            assert "step" in step, "Step should have step number"
            assert "title" in step, "Step should have title"
            assert "description" in step, "Step should have description"
    
    def test_visualize_question_returns_complexity(self):
        """Test that response contains complexity info"""
        response = requests.post(
            f"{BASE_URL}/api/visualize/question",
            headers=HEADERS,
            json={"message": "Binary search in sorted array"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "complexity" in data, "Response should contain complexity"
        assert "time" in data["complexity"], "Complexity should have time"
        assert "space" in data["complexity"], "Complexity should have space"
    
    def test_visualize_question_returns_data_array(self):
        """Test that response contains data array for 3D visualization"""
        response = requests.post(
            f"{BASE_URL}/api/visualize/question",
            headers=HEADERS,
            json={"message": "Sort array [5,2,8,1,9] using bubble sort"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data, "Response should contain data array"
        assert isinstance(data["data"], list), "Data should be a list"


class TestInterviewAPIs:
    """Tests for interview-related endpoints"""
    
    @pytest.fixture(scope="class")
    def interview_id(self):
        """Create an interview and return its ID"""
        response = requests.post(
            f"{BASE_URL}/api/interviews/start",
            headers=HEADERS,
            json={"role": "Test Engineer", "jd": "Testing interview APIs"}
        )
        assert response.status_code == 200, f"Failed to start interview: {response.text}"
        data = response.json()
        return data["interview"]["interview_id"]
    
    def test_start_interview_returns_interview_object(self):
        """Test that start interview returns interview object"""
        response = requests.post(
            f"{BASE_URL}/api/interviews/start",
            headers=HEADERS,
            json={"role": "Software Engineer", "jd": ""}
        )
        assert response.status_code == 200
        data = response.json()
        assert "interview" in data, "Response should contain interview"
        assert "interview_id" in data["interview"], "Interview should have interview_id"
        assert "current_round" in data["interview"], "Interview should have current_round"
        assert data["interview"]["current_round"] == 1, "Initial round should be 1"
        assert data["interview"]["status"] == "active", "Status should be active"
    
    def test_start_interview_returns_initial_message(self):
        """Test that start interview returns AI's initial message"""
        response = requests.post(
            f"{BASE_URL}/api/interviews/start",
            headers=HEADERS,
            json={"role": "Frontend Developer", "jd": "React experience required"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "messages" in data, "Response should contain messages"
        assert len(data["messages"]) > 0, "Should have at least one message"
        assert data["messages"][0]["role"] == "interviewer", "First message should be from interviewer"
        assert len(data["messages"][0]["content"]) > 50, "Message should have substantial content"
    
    def test_get_interview_returns_interview_and_messages(self, interview_id):
        """Test that get interview returns interview and messages"""
        response = requests.get(
            f"{BASE_URL}/api/interviews/{interview_id}",
            headers=HEADERS
        )
        assert response.status_code == 200
        data = response.json()
        assert "interview" in data, "Response should contain interview"
        assert "messages" in data, "Response should contain messages"
        assert data["interview"]["interview_id"] == interview_id
    
    def test_send_message_returns_user_and_ai_message(self, interview_id):
        """Test that sending message returns both user and AI message"""
        response = requests.post(
            f"{BASE_URL}/api/interviews/{interview_id}/message",
            headers=HEADERS,
            json={"content": "Hello, I'm a test candidate with 3 years of experience."}
        )
        assert response.status_code == 200
        data = response.json()
        assert "user_message" in data, "Response should contain user_message"
        assert "ai_message" in data, "Response should contain ai_message"
        assert data["user_message"]["role"] == "candidate"
        assert data["ai_message"]["role"] == "interviewer"
    
    def test_next_round_increments_round(self, interview_id):
        """Test that next round increments the round number"""
        # Get current round
        get_resp = requests.get(f"{BASE_URL}/api/interviews/{interview_id}", headers=HEADERS)
        current_round = get_resp.json()["interview"]["current_round"]
        
        if current_round < 4:
            response = requests.post(
                f"{BASE_URL}/api/interviews/{interview_id}/next-round",
                headers=HEADERS
            )
            assert response.status_code == 200
            data = response.json()
            assert data["current_round"] == current_round + 1, "Round should increment"
            assert "message" in data, "Should return transition message"
    
    def test_list_interviews_returns_array(self):
        """Test that list interviews returns array"""
        response = requests.get(f"{BASE_URL}/api/interviews", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "interviews" in data, "Response should contain interviews"
        assert isinstance(data["interviews"], list), "Interviews should be a list"


class TestProctoringAPI:
    """Tests for proctoring event logging"""
    
    @pytest.fixture(scope="class")
    def interview_id(self):
        """Create an interview for proctoring tests"""
        response = requests.post(
            f"{BASE_URL}/api/interviews/start",
            headers=HEADERS,
            json={"role": "Proctoring Test", "jd": ""}
        )
        return response.json()["interview"]["interview_id"]
    
    def test_log_proctoring_event_tab_switch(self, interview_id):
        """Test logging tab switch event"""
        response = requests.post(
            f"{BASE_URL}/api/proctoring/event",
            headers=HEADERS,
            json={
                "interview_id": interview_id,
                "event_type": "tab_switch",
                "details": "Tab switch detected at test time"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "logged"
    
    def test_log_proctoring_event_face_detection(self, interview_id):
        """Test logging face detection event"""
        response = requests.post(
            f"{BASE_URL}/api/proctoring/event",
            headers=HEADERS,
            json={
                "interview_id": interview_id,
                "event_type": "face_not_detected",
                "details": "Face not detected for 5 seconds"
            }
        )
        assert response.status_code == 200


class TestAuthRequired:
    """Tests that endpoints require authentication"""
    
    def test_visualize_question_requires_auth(self):
        """Test that visualize question requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/visualize/question",
            headers={"Content-Type": "application/json"},
            json={"message": "test"}
        )
        assert response.status_code == 401
    
    def test_interviews_start_requires_auth(self):
        """Test that starting interview requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/interviews/start",
            headers={"Content-Type": "application/json"},
            json={"role": "test"}
        )
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

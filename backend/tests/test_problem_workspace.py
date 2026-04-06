"""
Backend API tests for ProblemWorkspace feature
Tests: Problems list, Problem detail, Test cases, Problem chat, Code evaluation
"""
import pytest
import requests
import os

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


class TestProblemsAPI:
    """Tests for /api/problems endpoints"""
    
    def test_problems_list_loads(self, api_client):
        """GET /api/problems returns problems list with pagination"""
        response = api_client.get(f"{BASE_URL}/api/problems?page=1&limit=50")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "problems" in data
        assert "total" in data
        assert "pages" in data
        assert data["total"] > 15000, f"Expected 15k+ problems, got {data['total']}"
        assert len(data["problems"]) <= 50
        print(f"✓ Problems list: {data['total']} total problems, {len(data['problems'])} returned")
    
    def test_problems_meta(self, api_client):
        """GET /api/problems/meta returns filter options"""
        response = api_client.get(f"{BASE_URL}/api/problems/meta")
        assert response.status_code == 200
        
        data = response.json()
        assert "topics" in data
        assert "patterns" in data
        assert "companies" in data
        assert "difficulties" in data
        assert len(data["topics"]) > 0
        assert len(data["patterns"]) > 0
        print(f"✓ Problems meta: {len(data['topics'])} topics, {len(data['patterns'])} patterns")
    
    def test_problems_filter_by_topic(self, api_client):
        """GET /api/problems with topic filter"""
        response = api_client.get(f"{BASE_URL}/api/problems?topic=Arrays")
        assert response.status_code == 200
        
        data = response.json()
        if data["problems"]:
            for p in data["problems"][:5]:
                assert p["topic"] == "Arrays", f"Expected topic Arrays, got {p['topic']}"
        print(f"✓ Topic filter: {data['total']} Arrays problems")
    
    def test_problems_filter_by_difficulty(self, api_client):
        """GET /api/problems with difficulty filter"""
        response = api_client.get(f"{BASE_URL}/api/problems?difficulty=Easy")
        assert response.status_code == 200
        
        data = response.json()
        if data["problems"]:
            for p in data["problems"][:5]:
                assert p["difficulty"] == "Easy"
        print(f"✓ Difficulty filter: {data['total']} Easy problems")
    
    def test_problems_search(self, api_client):
        """GET /api/problems with search query"""
        response = api_client.get(f"{BASE_URL}/api/problems?search=Two%20Sum")
        assert response.status_code == 200
        
        data = response.json()
        assert data["total"] >= 0
        print(f"✓ Search 'Two Sum': {data['total']} results")


class TestProblemDetail:
    """Tests for /api/problems/{problem_id}"""
    
    def test_get_problem_prob_00001(self, api_client):
        """GET /api/problems/prob_00001 returns problem details"""
        response = api_client.get(f"{BASE_URL}/api/problems/prob_00001")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "problem_id" in data
        assert "title" in data
        assert "description" in data
        assert "difficulty" in data
        assert data["problem_id"] == "prob_00001"
        print(f"✓ Problem detail: {data['title']} ({data['difficulty']})")
    
    def test_get_problem_not_found(self, api_client):
        """GET /api/problems/nonexistent returns 404"""
        response = api_client.get(f"{BASE_URL}/api/problems/nonexistent_problem_xyz")
        assert response.status_code == 404
        print("✓ Problem not found returns 404")


class TestTestCases:
    """Tests for /api/problems/{problem_id}/testcases"""
    
    def test_get_testcases_prob_00001(self, api_client):
        """GET /api/problems/prob_00001/testcases returns test cases"""
        response = api_client.get(f"{BASE_URL}/api/problems/prob_00001/testcases")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "testcases" in data
        assert isinstance(data["testcases"], list)
        
        if data["testcases"]:
            tc = data["testcases"][0]
            assert "input" in tc
            assert "expected_output" in tc
            print(f"✓ Test cases: {len(data['testcases'])} test cases for prob_00001")
        else:
            print("✓ Test cases endpoint works (no cached test cases yet)")
    
    def test_get_testcases_not_found(self, api_client):
        """GET /api/problems/nonexistent/testcases returns 404"""
        response = api_client.get(f"{BASE_URL}/api/problems/nonexistent_xyz/testcases")
        assert response.status_code == 404
        print("✓ Test cases for nonexistent problem returns 404")


class TestProblemChat:
    """Tests for /api/problems/{problem_id}/chat"""
    
    def test_problem_chat_basic(self, api_client):
        """POST /api/problems/prob_00001/chat returns AI response"""
        payload = {
            "message": "Give me a hint for this problem",
            "context": ""
        }
        response = api_client.post(f"{BASE_URL}/api/problems/prob_00001/chat", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "response" in data
        assert len(data["response"]) > 10, "Expected non-empty AI response"
        print(f"✓ Problem chat: Got AI response ({len(data['response'])} chars)")
    
    def test_problem_chat_with_context(self, api_client):
        """POST /api/problems/prob_00001/chat with conversation context"""
        payload = {
            "message": "What's the time complexity?",
            "context": "user: How do I solve this?\nassistant: You can use a hash map approach."
        }
        response = api_client.post(f"{BASE_URL}/api/problems/prob_00001/chat", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        print("✓ Problem chat with context works")
    
    def test_problem_chat_not_found(self, api_client):
        """POST /api/problems/nonexistent/chat returns 404"""
        payload = {"message": "test", "context": ""}
        response = api_client.post(f"{BASE_URL}/api/problems/nonexistent_xyz/chat", json=payload)
        assert response.status_code == 404
        print("✓ Problem chat for nonexistent problem returns 404")


class TestCodeEvaluation:
    """Tests for /api/code/evaluate"""
    
    def test_code_evaluate_python(self, api_client):
        """POST /api/code/evaluate with Python code"""
        payload = {
            "problem_id": "prob_00001",
            "code": "def solution(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target-n], i]\n        seen[n] = i\n    return []",
            "language": "python"
        }
        response = api_client.post(f"{BASE_URL}/api/code/evaluate", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "passed" in data or "feedback" in data
        print(f"✓ Code evaluation: passed={data.get('passed')}, score={data.get('score')}")
    
    def test_code_evaluate_javascript(self, api_client):
        """POST /api/code/evaluate with JavaScript code"""
        payload = {
            "problem_id": "prob_00001",
            "code": "function solution(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    if (map.has(target - nums[i])) return [map.get(target - nums[i]), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}",
            "language": "javascript"
        }
        response = api_client.post(f"{BASE_URL}/api/code/evaluate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "passed" in data or "feedback" in data
        print(f"✓ JavaScript evaluation: passed={data.get('passed')}")
    
    def test_code_evaluate_problem_not_found(self, api_client):
        """POST /api/code/evaluate with nonexistent problem returns 404"""
        payload = {
            "problem_id": "nonexistent_xyz",
            "code": "print('hello')",
            "language": "python"
        }
        response = api_client.post(f"{BASE_URL}/api/code/evaluate", json=payload)
        assert response.status_code == 404
        print("✓ Code evaluation for nonexistent problem returns 404")


class TestAuthRequired:
    """Tests that endpoints require authentication"""
    
    def test_testcases_requires_auth(self):
        """GET /api/problems/{id}/testcases requires auth"""
        response = requests.get(f"{BASE_URL}/api/problems/prob_00001/testcases")
        assert response.status_code == 401
        print("✓ Test cases endpoint requires auth")
    
    def test_problem_chat_requires_auth(self):
        """POST /api/problems/{id}/chat requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/problems/prob_00001/chat",
            json={"message": "test", "context": ""}
        )
        assert response.status_code == 401
        print("✓ Problem chat endpoint requires auth")
    
    def test_code_evaluate_requires_auth(self):
        """POST /api/code/evaluate requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/code/evaluate",
            json={"problem_id": "prob_00001", "code": "test", "language": "python"}
        )
        assert response.status_code == 401
        print("✓ Code evaluate endpoint requires auth")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

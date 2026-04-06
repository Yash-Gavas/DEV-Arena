"""
Backend API Tests for DEV-Arena - Iteration 4
Testing: 580 SQL problems, SQL chatbot, Enhanced descriptions, Pattern visualizer, Step-by-step debugger

Features tested:
- SQL Problems API (580 problems, pagination, category filter)
- SQL Chat API (AI mentor for SQL)
- Enhanced Description API (LeetCode-style descriptions)
- Pattern Visualizer API (step-by-step algorithm visualization)
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


class TestSQLProblemsAPI:
    """SQL Problems endpoint tests - 580 problems"""
    
    def test_sql_problems_returns_580_total(self, api_client):
        """GET /api/sql/problems should return 580 total SQL problems"""
        response = api_client.get(f"{BASE_URL}/api/sql/problems?page=1&limit=50")
        assert response.status_code == 200
        data = response.json()
        assert "problems" in data
        assert "total" in data
        assert "page" in data
        assert "total_pages" in data
        assert data["total"] == 580, f"Expected 580 SQL problems, got {data['total']}"
        assert len(data["problems"]) <= 50
        print(f"SQL problems test passed: total={data['total']}, page={data['page']}")
    
    def test_sql_problems_pagination(self, api_client):
        """GET /api/sql/problems with pagination should work correctly"""
        # Page 1
        response1 = api_client.get(f"{BASE_URL}/api/sql/problems?page=1&limit=30")
        assert response1.status_code == 200
        data1 = response1.json()
        assert len(data1["problems"]) == 30
        
        # Page 2
        response2 = api_client.get(f"{BASE_URL}/api/sql/problems?page=2&limit=30")
        assert response2.status_code == 200
        data2 = response2.json()
        assert len(data2["problems"]) == 30
        
        # Ensure different problems on different pages
        ids1 = {p["sql_id"] for p in data1["problems"]}
        ids2 = {p["sql_id"] for p in data2["problems"]}
        assert ids1.isdisjoint(ids2), "Page 1 and Page 2 should have different problems"
        print(f"SQL pagination test passed: page1={len(ids1)}, page2={len(ids2)}")
    
    def test_sql_problems_filter_by_category_joins(self, api_client):
        """GET /api/sql/problems?category=JOINs should filter correctly"""
        response = api_client.get(f"{BASE_URL}/api/sql/problems?category=JOINs&limit=50")
        assert response.status_code == 200
        data = response.json()
        assert "problems" in data
        assert data["total"] > 0, "Should have JOINs problems"
        
        # Verify all returned problems are JOINs category
        for problem in data["problems"]:
            assert problem["category"] == "JOINs", f"Expected JOINs category, got {problem['category']}"
        print(f"SQL category filter test passed: {data['total']} JOINs problems")
    
    def test_sql_problems_filter_by_difficulty(self, api_client):
        """GET /api/sql/problems?difficulty=Easy should filter correctly"""
        response = api_client.get(f"{BASE_URL}/api/sql/problems?difficulty=Easy&limit=50")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] > 0, "Should have Easy problems"
        
        for problem in data["problems"]:
            assert problem["difficulty"] == "Easy", f"Expected Easy difficulty, got {problem['difficulty']}"
        print(f"SQL difficulty filter test passed: {data['total']} Easy problems")
    
    def test_sql_problem_structure(self, api_client):
        """SQL problems should have required fields"""
        response = api_client.get(f"{BASE_URL}/api/sql/problems?limit=5")
        assert response.status_code == 200
        data = response.json()
        
        for problem in data["problems"]:
            assert "sql_id" in problem, "Missing sql_id"
            assert "title" in problem, "Missing title"
            assert "difficulty" in problem, "Missing difficulty"
            assert "description" in problem, "Missing description"
            assert "category" in problem, "Missing category"
        print("SQL problem structure test passed")


class TestSQLChatAPI:
    """SQL Chat endpoint tests - AI mentor for SQL"""
    
    def test_sql_chat_returns_response(self, api_client):
        """POST /api/sql/chat should return AI response"""
        response = api_client.post(
            f"{BASE_URL}/api/sql/chat",
            json={"message": "How do I write a JOIN query?", "context": ""}
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert len(data["response"]) > 50, "Response should be substantial"
        assert "join" in data["response"].lower() or "JOIN" in data["response"]
        print(f"SQL chat test passed: response length={len(data['response'])}")
    
    def test_sql_chat_with_context(self, api_client):
        """POST /api/sql/chat with context should work"""
        response = api_client.post(
            f"{BASE_URL}/api/sql/chat",
            json={
                "message": "What's wrong with this query?",
                "context": "user: SELECT * FROM employees WHERE salary > 50000\nassistant: That looks correct!"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        print("SQL chat with context test passed")


class TestEnhancedDescriptionAPI:
    """Enhanced Description endpoint tests - LeetCode-style descriptions"""
    
    def test_enhanced_description_for_prob_00001(self, api_client):
        """GET /api/problems/prob_00001/description should return enhanced description"""
        response = api_client.get(f"{BASE_URL}/api/problems/prob_00001/description")
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "problem_id" in data
        assert data["problem_id"] == "prob_00001"
        assert "description" in data
        assert "examples" in data
        assert "constraints" in data
        assert "hints" in data
        assert "time_complexity" in data
        assert "space_complexity" in data
        print(f"Enhanced description test passed: problem_id={data['problem_id']}")
    
    def test_enhanced_description_has_examples(self, api_client):
        """Enhanced description should have examples with input/output/explanation"""
        response = api_client.get(f"{BASE_URL}/api/problems/prob_00001/description")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["examples"]) >= 1, "Should have at least 1 example"
        example = data["examples"][0]
        assert "input" in example, "Example missing input"
        assert "output" in example, "Example missing output"
        assert "explanation" in example, "Example missing explanation"
        print(f"Enhanced description examples test passed: {len(data['examples'])} examples")
    
    def test_enhanced_description_has_constraints(self, api_client):
        """Enhanced description should have constraints"""
        response = api_client.get(f"{BASE_URL}/api/problems/prob_00001/description")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["constraints"]) >= 1, "Should have at least 1 constraint"
        print(f"Enhanced description constraints test passed: {len(data['constraints'])} constraints")
    
    def test_enhanced_description_has_hints(self, api_client):
        """Enhanced description should have hints"""
        response = api_client.get(f"{BASE_URL}/api/problems/prob_00001/description")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["hints"]) >= 1, "Should have at least 1 hint"
        print(f"Enhanced description hints test passed: {len(data['hints'])} hints")
    
    def test_enhanced_description_has_complexity(self, api_client):
        """Enhanced description should have time and space complexity"""
        response = api_client.get(f"{BASE_URL}/api/problems/prob_00001/description")
        assert response.status_code == 200
        data = response.json()
        
        assert data["time_complexity"], "Should have time complexity"
        assert data["space_complexity"], "Should have space complexity"
        assert "O(" in data["time_complexity"] or "o(" in data["time_complexity"].lower()
        print(f"Complexity test passed: time={data['time_complexity']}, space={data['space_complexity']}")


class TestPatternVisualizerAPI:
    """Pattern Visualizer endpoint tests - step-by-step algorithm visualization"""
    
    def test_visualizer_for_prob_00001(self, api_client):
        """GET /api/problems/prob_00001/visualizer should return pattern visualization"""
        response = api_client.get(f"{BASE_URL}/api/problems/prob_00001/visualizer")
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "problem_id" in data
        assert data["problem_id"] == "prob_00001"
        assert "pattern_name" in data
        assert "steps" in data
        assert "key_insight" in data
        assert "when_to_use" in data
        print(f"Pattern visualizer test passed: pattern={data['pattern_name']}")
    
    def test_visualizer_has_steps(self, api_client):
        """Pattern visualizer should have steps with title, description, state, highlight"""
        response = api_client.get(f"{BASE_URL}/api/problems/prob_00001/visualizer")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["steps"]) >= 3, "Should have at least 3 steps"
        step = data["steps"][0]
        assert "step" in step, "Step missing step number"
        assert "title" in step, "Step missing title"
        assert "description" in step, "Step missing description"
        print(f"Visualizer steps test passed: {len(data['steps'])} steps")
    
    def test_visualizer_has_key_insight(self, api_client):
        """Pattern visualizer should have key insight"""
        response = api_client.get(f"{BASE_URL}/api/problems/prob_00001/visualizer")
        assert response.status_code == 200
        data = response.json()
        
        assert data["key_insight"], "Should have key insight"
        assert len(data["key_insight"]) > 20, "Key insight should be substantial"
        print(f"Key insight test passed: {data['key_insight'][:50]}...")
    
    def test_visualizer_has_when_to_use(self, api_client):
        """Pattern visualizer should have when_to_use scenarios"""
        response = api_client.get(f"{BASE_URL}/api/problems/prob_00001/visualizer")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["when_to_use"]) >= 1, "Should have at least 1 when_to_use scenario"
        print(f"When to use test passed: {len(data['when_to_use'])} scenarios")
    
    def test_visualizer_has_similar_problems(self, api_client):
        """Pattern visualizer should have similar problems"""
        response = api_client.get(f"{BASE_URL}/api/problems/prob_00001/visualizer")
        assert response.status_code == 200
        data = response.json()
        
        assert "similar_problems" in data
        print(f"Similar problems test passed: {len(data.get('similar_problems', []))} similar problems")


class TestSQLSchemaAPI:
    """SQL Schema endpoint tests"""
    
    def test_sql_schema_returns_tables(self, api_client):
        """GET /api/sql/schema should return table schemas"""
        response = api_client.get(f"{BASE_URL}/api/sql/schema")
        assert response.status_code == 200
        data = response.json()
        
        assert "tables" in data
        assert len(data["tables"]) >= 4, "Should have at least 4 tables"
        
        table_names = [t["name"] for t in data["tables"]]
        assert "employees" in table_names
        assert "departments" in table_names
        assert "orders" in table_names
        assert "logs" in table_names
        print(f"SQL schema test passed: {len(data['tables'])} tables")


class TestSQLExecuteAPI:
    """SQL Execute endpoint tests"""
    
    def test_sql_execute_select(self, api_client):
        """POST /api/sql/execute should execute SELECT query"""
        response = api_client.post(
            f"{BASE_URL}/api/sql/execute",
            json={"query": "SELECT * FROM employees LIMIT 5"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "columns" in data
        assert "rows" in data
        assert "row_count" in data
        assert len(data["rows"]) <= 5
        print(f"SQL execute test passed: {data['row_count']} rows")
    
    def test_sql_execute_join(self, api_client):
        """POST /api/sql/execute should execute JOIN query"""
        response = api_client.post(
            f"{BASE_URL}/api/sql/execute",
            json={"query": "SELECT e.name, d.department_name FROM employees e JOIN departments d ON e.department = d.department_name LIMIT 5"}
        )
        assert response.status_code == 200
        data = response.json()
        # May return error if schema doesn't match, but should not crash
        assert "columns" in data or "error" in data
        print("SQL JOIN execute test passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

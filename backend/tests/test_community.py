"""
Test Community Features - Iteration 6
Tests: Community posts CRUD, likes, comments, stats, filtering
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
SESSION_TOKEN = "test_session_dev_arena_2026"

@pytest.fixture
def auth_headers():
    """Auth headers with test session token"""
    return {
        "Authorization": f"Bearer {SESSION_TOKEN}",
        "Content-Type": "application/json"
    }

class TestCommunityStats:
    """Test GET /api/community/stats"""
    
    def test_stats_returns_200(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/community/stats", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_stats_has_required_fields(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/community/stats", headers=auth_headers)
        data = response.json()
        assert "total" in data, "Missing 'total' field"
        assert "experiences" in data, "Missing 'experiences' field"
        assert "reviews" in data, "Missing 'reviews' field"
        assert "avg_rating" in data, "Missing 'avg_rating' field"
    
    def test_stats_values_are_numbers(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/community/stats", headers=auth_headers)
        data = response.json()
        assert isinstance(data["total"], int), "total should be int"
        assert isinstance(data["experiences"], int), "experiences should be int"
        assert isinstance(data["reviews"], int), "reviews should be int"
        assert isinstance(data["avg_rating"], (int, float)), "avg_rating should be number"
    
    def test_stats_requires_auth(self):
        response = requests.get(f"{BASE_URL}/api/community/stats")
        assert response.status_code == 401, "Should require authentication"


class TestCommunityPostsList:
    """Test GET /api/community/posts"""
    
    def test_list_posts_returns_200(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/community/posts", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_list_posts_has_pagination(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/community/posts", headers=auth_headers)
        data = response.json()
        assert "posts" in data, "Missing 'posts' field"
        assert "total" in data, "Missing 'total' field"
        assert "page" in data, "Missing 'page' field"
        assert "total_pages" in data, "Missing 'total_pages' field"
    
    def test_list_posts_filter_by_experience(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/community/posts?type=experience", headers=auth_headers)
        data = response.json()
        assert response.status_code == 200
        for post in data["posts"]:
            assert post["type"] == "experience", f"Expected experience, got {post['type']}"
    
    def test_list_posts_filter_by_review(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/community/posts?type=review", headers=auth_headers)
        data = response.json()
        assert response.status_code == 200
        for post in data["posts"]:
            assert post["type"] == "review", f"Expected review, got {post['type']}"
    
    def test_list_posts_sort_by_newest(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/community/posts?sort=newest", headers=auth_headers)
        data = response.json()
        assert response.status_code == 200
        # Verify posts are sorted by created_at descending
        if len(data["posts"]) > 1:
            for i in range(len(data["posts"]) - 1):
                assert data["posts"][i]["created_at"] >= data["posts"][i+1]["created_at"], "Posts not sorted by newest"
    
    def test_list_posts_sort_by_popular(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/community/posts?sort=popular", headers=auth_headers)
        data = response.json()
        assert response.status_code == 200
        # Verify posts are sorted by likes_count descending
        if len(data["posts"]) > 1:
            for i in range(len(data["posts"]) - 1):
                assert data["posts"][i]["likes_count"] >= data["posts"][i+1]["likes_count"], "Posts not sorted by popularity"
    
    def test_post_has_author_info(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/community/posts", headers=auth_headers)
        data = response.json()
        if data["posts"]:
            post = data["posts"][0]
            assert "author" in post, "Missing author field"
            assert "name" in post["author"], "Missing author name"
    
    def test_post_has_liked_by_me_field(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/community/posts", headers=auth_headers)
        data = response.json()
        if data["posts"]:
            post = data["posts"][0]
            assert "liked_by_me" in post, "Missing liked_by_me field"
            assert isinstance(post["liked_by_me"], bool), "liked_by_me should be boolean"


class TestCommunityPostCreate:
    """Test POST /api/community/posts"""
    
    def test_create_experience_post(self, auth_headers):
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "type": "experience",
            "company": f"TEST_Company_{unique_id}",
            "role": "Software Engineer",
            "title": f"TEST_Experience Post {unique_id}",
            "content": "This is a test experience post content.",
            "difficulty": "Medium",
            "result": "Selected",
            "tags": ["test", "automation"]
        }
        response = requests.post(f"{BASE_URL}/api/community/posts", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "post_id" in data, "Missing post_id in response"
        assert data["type"] == "experience"
        assert data["company"] == payload["company"]
        assert data["title"] == payload["title"]
        assert data["difficulty"] == "Medium"
        assert data["result"] == "Selected"
        return data["post_id"]
    
    def test_create_review_post_with_rating(self, auth_headers):
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "type": "review",
            "title": f"TEST_Review Post {unique_id}",
            "content": "This is a test review post content.",
            "rating": 4,
            "tags": ["test", "review"]
        }
        response = requests.post(f"{BASE_URL}/api/community/posts", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "post_id" in data
        assert data["type"] == "review"
        assert data["rating"] == 4
        return data["post_id"]
    
    def test_create_post_requires_auth(self):
        payload = {
            "type": "experience",
            "title": "Test",
            "content": "Test content"
        }
        response = requests.post(f"{BASE_URL}/api/community/posts", json=payload)
        assert response.status_code == 401, "Should require authentication"
    
    def test_created_post_appears_in_list(self, auth_headers):
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "type": "experience",
            "company": f"TEST_VerifyCompany_{unique_id}",
            "role": "Test Role",
            "title": f"TEST_Verify Post {unique_id}",
            "content": "Verify this post appears in list.",
            "difficulty": "Easy",
            "result": "Pending",
            "tags": ["verify"]
        }
        create_response = requests.post(f"{BASE_URL}/api/community/posts", json=payload, headers=auth_headers)
        assert create_response.status_code == 200
        post_id = create_response.json()["post_id"]
        
        # Verify post appears in list
        list_response = requests.get(f"{BASE_URL}/api/community/posts", headers=auth_headers)
        data = list_response.json()
        post_ids = [p["post_id"] for p in data["posts"]]
        assert post_id in post_ids, "Created post not found in list"


class TestCommunityLike:
    """Test POST /api/community/posts/{post_id}/like"""
    
    def test_like_toggle_on(self, auth_headers):
        # First create a post to like
        unique_id = uuid.uuid4().hex[:8]
        create_payload = {
            "type": "experience",
            "title": f"TEST_Like Post {unique_id}",
            "content": "Post to test like functionality."
        }
        create_response = requests.post(f"{BASE_URL}/api/community/posts", json=create_payload, headers=auth_headers)
        post_id = create_response.json()["post_id"]
        
        # Like the post
        like_response = requests.post(f"{BASE_URL}/api/community/posts/{post_id}/like", headers=auth_headers)
        assert like_response.status_code == 200, f"Expected 200, got {like_response.status_code}"
        data = like_response.json()
        assert "liked" in data, "Missing 'liked' field"
        assert "likes_count" in data, "Missing 'likes_count' field"
        assert data["liked"] == True, "Should be liked after first toggle"
        assert data["likes_count"] >= 1, "likes_count should be at least 1"
    
    def test_like_toggle_off(self, auth_headers):
        # Create a post
        unique_id = uuid.uuid4().hex[:8]
        create_payload = {
            "type": "experience",
            "title": f"TEST_Unlike Post {unique_id}",
            "content": "Post to test unlike functionality."
        }
        create_response = requests.post(f"{BASE_URL}/api/community/posts", json=create_payload, headers=auth_headers)
        post_id = create_response.json()["post_id"]
        
        # Like then unlike
        requests.post(f"{BASE_URL}/api/community/posts/{post_id}/like", headers=auth_headers)
        unlike_response = requests.post(f"{BASE_URL}/api/community/posts/{post_id}/like", headers=auth_headers)
        data = unlike_response.json()
        assert data["liked"] == False, "Should be unliked after second toggle"
    
    def test_like_nonexistent_post(self, auth_headers):
        response = requests.post(f"{BASE_URL}/api/community/posts/nonexistent_post_id/like", headers=auth_headers)
        assert response.status_code == 404, "Should return 404 for nonexistent post"


class TestCommunityComment:
    """Test POST /api/community/posts/{post_id}/comment"""
    
    def test_add_comment(self, auth_headers):
        # Create a post to comment on
        unique_id = uuid.uuid4().hex[:8]
        create_payload = {
            "type": "experience",
            "title": f"TEST_Comment Post {unique_id}",
            "content": "Post to test comment functionality."
        }
        create_response = requests.post(f"{BASE_URL}/api/community/posts", json=create_payload, headers=auth_headers)
        post_id = create_response.json()["post_id"]
        
        # Add comment
        comment_payload = {"content": f"Test comment {unique_id}"}
        comment_response = requests.post(f"{BASE_URL}/api/community/posts/{post_id}/comment", json=comment_payload, headers=auth_headers)
        assert comment_response.status_code == 200, f"Expected 200, got {comment_response.status_code}"
        data = comment_response.json()
        assert "comment_id" in data, "Missing comment_id"
        assert "content" in data, "Missing content"
        assert "author_name" in data, "Missing author_name"
        assert "created_at" in data, "Missing created_at"
        assert data["content"] == comment_payload["content"]
    
    def test_comment_appears_in_post(self, auth_headers):
        # Create a post
        unique_id = uuid.uuid4().hex[:8]
        create_payload = {
            "type": "experience",
            "title": f"TEST_CommentVerify Post {unique_id}",
            "content": "Post to verify comment appears."
        }
        create_response = requests.post(f"{BASE_URL}/api/community/posts", json=create_payload, headers=auth_headers)
        post_id = create_response.json()["post_id"]
        
        # Add comment
        comment_content = f"Verify comment {unique_id}"
        comment_payload = {"content": comment_content}
        requests.post(f"{BASE_URL}/api/community/posts/{post_id}/comment", json=comment_payload, headers=auth_headers)
        
        # Verify comment appears in post list
        list_response = requests.get(f"{BASE_URL}/api/community/posts", headers=auth_headers)
        posts = list_response.json()["posts"]
        target_post = next((p for p in posts if p["post_id"] == post_id), None)
        assert target_post is not None, "Post not found in list"
        assert target_post["comments_count"] >= 1, "comments_count should be at least 1"
        comment_contents = [c["content"] for c in target_post.get("comments", [])]
        assert comment_content in comment_contents, "Comment not found in post"
    
    def test_comment_nonexistent_post(self, auth_headers):
        comment_payload = {"content": "Test comment"}
        response = requests.post(f"{BASE_URL}/api/community/posts/nonexistent_post_id/comment", json=comment_payload, headers=auth_headers)
        assert response.status_code == 404, "Should return 404 for nonexistent post"


class TestInterviewRound2SQL:
    """Test that Interview Round 2 includes SQL questions in system prompt"""
    
    def test_round2_guidelines_include_sql(self):
        """Verify ROUND_GUIDELINES[2] mentions SQL queries"""
        # This is a code review test - we verify the server.py has SQL in round 2
        import re
        with open('/app/backend/server.py', 'r') as f:
            content = f.read()
        
        # Find ROUND_GUIDELINES definition
        match = re.search(r'ROUND_GUIDELINES\s*=\s*\{[^}]+2:\s*"""([^"]+)"""', content, re.DOTALL)
        assert match, "Could not find ROUND_GUIDELINES[2] in server.py"
        round2_content = match.group(1)
        
        # Verify SQL is mentioned
        assert "SQL" in round2_content.upper(), "Round 2 guidelines should mention SQL"
        assert "query" in round2_content.lower() or "queries" in round2_content.lower(), "Round 2 should mention SQL queries"


class TestAuthRequired:
    """Test that community endpoints require authentication"""
    
    def test_stats_requires_auth(self):
        response = requests.get(f"{BASE_URL}/api/community/stats")
        assert response.status_code == 401
    
    def test_posts_list_requires_auth(self):
        response = requests.get(f"{BASE_URL}/api/community/posts")
        assert response.status_code == 401
    
    def test_create_post_requires_auth(self):
        response = requests.post(f"{BASE_URL}/api/community/posts", json={"type": "experience", "title": "Test", "content": "Test"})
        assert response.status_code == 401
    
    def test_like_requires_auth(self):
        response = requests.post(f"{BASE_URL}/api/community/posts/some_id/like")
        assert response.status_code == 401
    
    def test_comment_requires_auth(self):
        response = requests.post(f"{BASE_URL}/api/community/posts/some_id/comment", json={"content": "Test"})
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

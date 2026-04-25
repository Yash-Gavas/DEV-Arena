"""Iteration 7 tests:
- DELETE /api/community/posts/{post_id} (own/others/non-existent)
- POST/GET community posts include user_id
- Interview prompts contain BRUTALLY HONEST instructions
- AIInterview frontend showIDE for round 1 OR 2
"""
import os
import re
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://dsa-interview-prep-3.preview.emergentagent.com").rstrip("/")
TEST_TOKEN = "test_session_dev_arena_2026"
TEST_USER_ID = "test-user-dev-arena"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {TEST_TOKEN}",
    })
    return s


# ------------------- Community: create + user_id -------------------
class TestCommunityCreateUserId:
    def test_create_post_has_user_id(self, client):
        payload = {
            "type": "experience",
            "title": "TEST_iter7_user_id",
            "content": "Testing user_id presence",
            "company": "TestCo",
            "role": "SWE",
            "difficulty": "Medium",
            "result": "Selected",
            "tags": ["TEST_iter7"],
        }
        r = client.post(f"{BASE_URL}/api/community/posts", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "post_id" in data
        assert data.get("user_id") == TEST_USER_ID
        # cleanup
        client.delete(f"{BASE_URL}/api/community/posts/{data['post_id']}")

    def test_list_posts_have_user_id(self, client):
        r = client.get(f"{BASE_URL}/api/community/posts?limit=5")
        assert r.status_code == 200
        posts = r.json().get("posts", [])
        assert isinstance(posts, list)
        if posts:
            assert "user_id" in posts[0]


# ------------------- Community: DELETE post -------------------
class TestCommunityDelete:
    def test_delete_own_post(self, client):
        create = client.post(f"{BASE_URL}/api/community/posts", json={
            "type": "review", "title": "TEST_iter7_delete_own",
            "content": "Will be deleted", "rating": 4, "tags": []
        })
        assert create.status_code == 200
        pid = create.json()["post_id"]

        d = client.delete(f"{BASE_URL}/api/community/posts/{pid}")
        assert d.status_code == 200, d.text
        body = d.json()
        assert body.get("deleted") is True

        # verify gone via list (delete endpoint not returning 404 path required)
        listing = client.get(f"{BASE_URL}/api/community/posts?limit=100").json()
        ids = [p["post_id"] for p in listing.get("posts", [])]
        assert pid not in ids

    def test_delete_nonexistent_returns_404(self, client):
        r = client.delete(f"{BASE_URL}/api/community/posts/nonexistent_post_id_xyz")
        assert r.status_code == 404, r.text

    def test_delete_others_post_returns_403(self, client):
        # Insert a post directly via Mongo with a different user_id
        from pymongo import MongoClient
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME")
        if not mongo_url or not db_name:
            pytest.skip("MONGO_URL/DB_NAME not present in test env")
        mc = MongoClient(mongo_url)
        db = mc[db_name]
        post_id = "post_TEST_iter7_others"
        db.community_posts.insert_one({
            "post_id": post_id,
            "user_id": "some-other-user-xyz",
            "type": "experience", "title": "TEST_iter7_others",
            "content": "owned by another user", "tags": [],
            "likes": [], "likes_count": 0, "comments": [], "comments_count": 0,
            "created_at": "2026-01-01T00:00:00+00:00",
        })
        try:
            r = client.delete(f"{BASE_URL}/api/community/posts/{post_id}")
            assert r.status_code == 403, r.text
        finally:
            db.community_posts.delete_one({"post_id": post_id})

    def test_delete_requires_auth(self, client):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        r = s.delete(f"{BASE_URL}/api/community/posts/anything")
        assert r.status_code in (401, 403)


# ------------------- Server-side prompt content (file inspection) -------------------
SERVER_PATH = "/app/backend/server.py"


def _server_text():
    with open(SERVER_PATH, "r") as f:
        return f.read()


class TestHonestPromptContent:
    def test_build_system_prompt_brutally_honest(self):
        text = _server_text()
        # System prompt section
        assert "BRUTALLY HONEST" in text
        assert "NOT a cheerleader" in text or "No participation trophies" in text
        assert "FAANG interviewer" in text
        # critical behavior rules
        assert "That's incorrect" in text or "That's wrong" in text or "say it is WRONG" in text
        assert "FORBIDDEN" in text  # bans generic praise

    def test_next_round_transition_honest_assessment(self):
        text = _server_text()
        # transition prompt
        assert "BRUTALLY HONEST assessment" in text
        assert "Strong / Adequate / Needs Improvement / Poor" in text

    def test_end_interview_report_honest(self):
        text = _server_text()
        assert "BRUTALLY HONEST interview evaluator" in text
        assert "below 40" in text  # low score guidance for poor performance
        assert "Do NOT inflate scores" in text


# ------------------- Frontend AIInterview IDE check (file inspection) -------------------
AIINTERVIEW_PATH = "/app/frontend/src/pages/AIInterview.jsx"


class TestAIInterviewIDE:
    def test_show_ide_round_1_or_2(self):
        with open(AIINTERVIEW_PATH, "r") as f:
            text = f.read()
        # showIDE setter checks round 1 OR 2
        assert re.search(r"setShowIDE\(\(round === 1 \|\| round === 2\)", text), \
            "showIDE useEffect should toggle for round 1 OR 2"
        # toggle button visible for currentRound 1 or 2
        assert "(currentRound === 1 || currentRound === 2)" in text, \
            "Toggle IDE button must be conditioned on currentRound 1 or 2"
        # data-testid present
        assert 'data-testid="toggle-ide-btn"' in text


# ------------------- Frontend Community delete UI (file inspection) -------------------
COMMUNITY_PATH = "/app/frontend/src/pages/Community.jsx"


class TestCommunityFrontendDelete:
    def test_delete_button_authored_only(self):
        with open(COMMUNITY_PATH, "r") as f:
            text = f.read()
        assert "Trash2" in text
        assert "isAuthor" in text
        assert "post.user_id === currentUserId" in text
        assert "delete-post-" in text  # data-testid prefix
        assert "/community/posts/" in text  # axios delete url

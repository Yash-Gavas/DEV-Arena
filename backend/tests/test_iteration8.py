"""Iteration 8 backend tests: profile/stats, badges/ranking, custom visualize endpoint."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://dsa-interview-prep-3.preview.emergentagent.com').rstrip('/')
TOKEN = "test_session_dev_arena_2026"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}


@pytest.fixture
def s():
    sess = requests.Session()
    sess.headers.update(HEADERS)
    return sess


# ==================== /api/profile/stats ====================
class TestProfileStats:
    def test_stats_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/profile/stats")
        assert r.status_code == 401

    def test_stats_returns_full_payload(self, s):
        r = s.get(f"{BASE_URL}/api/profile/stats")
        assert r.status_code == 200, r.text
        data = r.json()
        # Required top-level keys
        for key in ("xp", "rank", "streak", "badges", "stats"):
            assert key in data, f"missing key {key}"
        assert isinstance(data["xp"], int)
        assert isinstance(data["streak"], int)
        assert isinstance(data["badges"], list)
        assert isinstance(data["stats"], dict)

    def test_rank_object_structure(self, s):
        data = s.get(f"{BASE_URL}/api/profile/stats").json()
        rank = data["rank"]
        assert "name" in rank and "color" in rank
        assert rank["name"] in ["Novice", "Apprentice", "Warrior", "Expert", "Master", "Grandmaster"]
        # next can be None at Grandmaster
        assert "next" in rank
        if rank["next"]:
            assert "name" in rank["next"] and "xp_needed" in rank["next"]

    def test_badges_have_required_fields(self, s):
        data = s.get(f"{BASE_URL}/api/profile/stats").json()
        badges = data["badges"]
        assert len(badges) == 10, f"expected 10 badges, got {len(badges)}"
        ids = {b["id"] for b in badges}
        expected_ids = {"first_blood", "problem_solver_10", "century_100", "marathon_5",
                        "perfectionist", "community_star", "streak_7", "diverse_solver",
                        "sql_ace", "interviewer_10"}
        assert ids == expected_ids
        for b in badges:
            for k in ("id", "name", "desc", "icon", "color", "earned"):
                assert k in b, f"badge missing {k}"
            assert isinstance(b["earned"], bool)

    def test_stats_object_fields(self, s):
        data = s.get(f"{BASE_URL}/api/profile/stats").json()
        stats = data["stats"]
        for k in ("problems_solved", "interviews_completed", "community_posts",
                  "topics_covered", "max_interview_score", "sql_queries"):
            assert k in stats
            assert isinstance(stats[k], (int, float))

    def test_test_user_expected_state(self, s):
        """Per problem statement: test user has 160 XP, 'community_star' badge, 'Apprentice' rank."""
        data = s.get(f"{BASE_URL}/api/profile/stats").json()
        # Apprentice threshold is 100
        assert data["xp"] >= 100, f"xp={data['xp']} should be >= 100 for Apprentice"
        assert data["rank"]["name"] == "Apprentice", f"got {data['rank']['name']}"
        # community_star earned (>=5 posts requirement; user has 10 per problem statement)
        cs = next((b for b in data["badges"] if b["id"] == "community_star"), None)
        assert cs is not None and cs["earned"] is True, "community_star should be earned"


# ==================== Rank thresholds ====================
class TestRankLogic:
    def test_xp_consistency(self, s):
        """xp formula: interviews*100 + solved*20 + posts*5 + streak*10."""
        data = s.get(f"{BASE_URL}/api/profile/stats").json()
        st = data["stats"]
        expected = (st["interviews_completed"] * 100 + st["problems_solved"] * 20
                    + st["community_posts"] * 5 + data["streak"] * 10)
        assert data["xp"] == expected, f"xp mismatch: {data['xp']} vs {expected}"


# ==================== /api/visualize/question (3D viz AI) ====================
class TestCustomVisualize:
    def test_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/visualize/question", json={"message": "two sum"})
        assert r.status_code == 401


# ==================== Sanity: /api/profile and DELETE community still work ====================
class TestRegression:
    def test_profile_endpoint(self, s):
        r = s.get(f"{BASE_URL}/api/profile")
        assert r.status_code == 200
        assert r.json().get("user_id")

    def test_community_delete_still_enforces_ownership(self, s):
        r = s.delete(f"{BASE_URL}/api/community/posts/post_does_not_exist_xyz")
        assert r.status_code == 404

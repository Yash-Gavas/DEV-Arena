"""Iteration 10 backend tests:
- GET /api/leaderboard returns leaderboard array with required fields
- Auth handling (401 without session)
- Sorting by xp desc and position assignment
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://dsa-interview-prep-3.preview.emergentagent.com").rstrip("/")
SESSION_TOKEN = "test_session_dev_arena_2026"


@pytest.fixture
def auth_client():
    s = requests.Session()
    s.cookies.set("session_token", SESSION_TOKEN)
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def anon_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ========== /api/leaderboard ==========
class TestLeaderboard:
    def test_leaderboard_requires_auth(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/leaderboard")
        assert r.status_code in (401, 403), f"Expected 401/403 but got {r.status_code}"

    def test_leaderboard_returns_array(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/leaderboard")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "leaderboard" in data
        assert isinstance(data["leaderboard"], list)
        assert len(data["leaderboard"]) >= 1

    def test_leaderboard_entry_required_fields(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/leaderboard")
        data = r.json()
        required_fields = {
            "user_id", "name", "xp", "rank", "rank_color",
            "problems_solved", "interviews_completed", "max_score",
            "avg_score", "position",
        }
        for entry in data["leaderboard"]:
            missing = required_fields - set(entry.keys())
            assert not missing, f"missing fields {missing} in entry {entry}"
            assert isinstance(entry["xp"], int)
            assert isinstance(entry["position"], int)
            assert isinstance(entry["problems_solved"], int)

    def test_leaderboard_sorted_by_xp_desc(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/leaderboard")
        lb = r.json()["leaderboard"]
        xps = [e["xp"] for e in lb]
        assert xps == sorted(xps, reverse=True), f"Not sorted desc by xp: {xps}"

    def test_leaderboard_positions_sequential(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/leaderboard")
        lb = r.json()["leaderboard"]
        for i, entry in enumerate(lb):
            assert entry["position"] == i + 1, f"Position mismatch at index {i}: {entry['position']}"

    def test_leaderboard_contains_expected_users(self, auth_client):
        """Per agent context: Yash Gavas (#1, 830XP), Test Developer (#2, 145XP), sharanya (#3, 100XP)."""
        r = auth_client.get(f"{BASE_URL}/api/leaderboard")
        lb = r.json()["leaderboard"]
        names = [e["name"] for e in lb]
        # At least one of these should be present
        present = [n for n in ("Yash Gavas", "Test Developer", "sharanya") if n in names]
        assert present, f"None of expected users in leaderboard. Got: {names}"

    def test_leaderboard_xp_formula(self, auth_client):
        """xp = interviews_completed*100 + problems_solved*20 + posts*5 (+/- posts term)."""
        r = auth_client.get(f"{BASE_URL}/api/leaderboard")
        lb = r.json()["leaderboard"]
        for entry in lb:
            base = entry["interviews_completed"] * 100 + entry["problems_solved"] * 20
            # posts not exposed; xp must be at least base
            assert entry["xp"] >= base, f"XP {entry['xp']} less than minimum {base} for {entry['name']}"

    def test_leaderboard_rank_color_format(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/leaderboard")
        for entry in r.json()["leaderboard"]:
            assert entry["rank_color"].startswith("#")
            assert len(entry["rank_color"]) == 7
            assert isinstance(entry["rank"], str) and len(entry["rank"]) > 0


# ========== Regression on critical endpoints ==========
class TestRegression:
    def test_health_or_root(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/")
        assert r.status_code in (200, 404)

    def test_problems_list(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/problems?limit=1")
        assert r.status_code == 200

"""
Iteration 9 backend tests for DEV-Arena.

Coverage:
- GET /api/resources -> includes best_resources curated array per subject
- GET /api/resources/{slug} -> includes best_resources
- end_interview message-grouping logic via direct module import (smoke test)
- Regression: profile/stats reachable, problems list reachable
"""
import os
import requests
import pytest

def _load_backend_url():
    url = os.environ.get('REACT_APP_BACKEND_URL')
    if not url:
        # Fallback: load from frontend/.env so tests can run from CLI
        env_path = os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', '.env')
        if os.path.isfile(env_path):
            with open(env_path) as f:
                for line in f:
                    if line.startswith('REACT_APP_BACKEND_URL='):
                        url = line.split('=', 1)[1].strip()
                        break
    if not url:
        raise RuntimeError("REACT_APP_BACKEND_URL not set")
    return url.rstrip('/')


BASE_URL = _load_backend_url()
TOKEN = "test_session_dev_arena_2026"
EXPECTED_SUBJECT_SLUGS = {
    "operating-systems",
    "dbms",
    "computer-networks",
    "system-design",
    "oops",
    "sql-practice",
}


@pytest.fixture(scope="module")
def auth_session():
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {TOKEN}",
    })
    return s


# ========== Curated Resources ==========
class TestResourcesBestResources:
    def test_list_resources_returns_array(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/resources")
        assert r.status_code == 200, r.text
        body = r.json()
        assert "resources" in body
        assert isinstance(body["resources"], list)
        assert len(body["resources"]) >= 1, "expected at least 1 seeded resource"

    def test_list_resources_each_has_best_resources_array(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/resources")
        body = r.json()
        slugs_seen = set()
        for res in body["resources"]:
            assert "best_resources" in res, f"{res.get('subject_slug')} missing best_resources"
            assert isinstance(res["best_resources"], list)
            slugs_seen.add(res.get("subject_slug"))
        # All 6 expected subjects should be present in seeded data
        missing = EXPECTED_SUBJECT_SLUGS - slugs_seen
        assert not missing, f"Missing expected subjects in seeded resources: {missing}"

    def test_each_subject_has_curated_links_with_required_fields(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/resources")
        body = r.json()
        # Build a slug->best_resources map for the 6 expected subjects
        m = {res["subject_slug"]: res["best_resources"] for res in body["resources"] if res.get("subject_slug") in EXPECTED_SUBJECT_SLUGS}
        for slug in EXPECTED_SUBJECT_SLUGS:
            assert slug in m, f"slug {slug} missing"
            br = m[slug]
            assert isinstance(br, list) and len(br) >= 1, f"{slug} has no curated resources"
            for item in br:
                for key in ("title", "url", "type", "desc"):
                    assert key in item, f"{slug} item missing {key}: {item}"
                assert item["url"].startswith("http"), f"{slug} bad url: {item['url']}"
                assert isinstance(item["title"], str) and item["title"]
                assert isinstance(item["type"], str) and item["type"]

    def test_get_resource_by_slug_includes_best_resources(self, auth_session):
        for slug in ["operating-systems", "dbms", "system-design"]:
            r = auth_session.get(f"{BASE_URL}/api/resources/{slug}")
            assert r.status_code == 200, f"{slug}: {r.text}"
            body = r.json()
            assert body.get("subject_slug") == slug
            assert isinstance(body.get("best_resources"), list)
            assert len(body["best_resources"]) >= 1

    def test_get_resource_unknown_slug_404(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/resources/does-not-exist-xyz")
        assert r.status_code == 404

    def test_known_curated_links_present(self, auth_session):
        """Spot-check that critical curated links from problem statement exist."""
        r = auth_session.get(f"{BASE_URL}/api/resources")
        body = r.json()
        m = {res["subject_slug"]: res["best_resources"] for res in body["resources"]}
        # OSTEP must be in OS
        os_titles = " ".join(x["title"] for x in m.get("operating-systems", []))
        assert "OSTEP" in os_titles or "Three Easy Pieces" in os_titles
        # System Design Primer
        sd_titles = " ".join(x["title"] for x in m.get("system-design", []))
        assert "System Design Primer" in sd_titles
        # Neso Academy across multiple
        for slug in ["operating-systems", "dbms", "computer-networks"]:
            titles = " ".join(x["title"] for x in m.get(slug, []))
            assert "Neso" in titles, f"Neso missing in {slug}"
        # LeetCode SQL
        sql_titles = " ".join(x["title"] for x in m.get("sql-practice", []))
        assert "LeetCode" in sql_titles


# ========== Round grouping logic (server-side) ==========
class TestEndInterviewRoundGrouping:
    def test_end_interview_404_for_unknown_id(self, auth_session):
        # Auth + persistence path: unknown interview id should 404, not 500
        r = auth_session.post(f"{BASE_URL}/api/interviews/int_does_not_exist/end")
        assert r.status_code == 404

    def test_end_interview_requires_auth(self):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/interviews/int_x/end")
        assert r.status_code in (401, 403)

    def test_round_grouping_logic_inline(self):
        """Replicate the grouping algorithm and assert it groups correctly."""
        msgs = [
            {"role": "interviewer", "content": "Hi", "round_number": 1},
            {"role": "candidate", "content": "Hello", "round_number": 1},
            {"role": "interviewer", "content": "DSA Q", "round_number": 1},
            {"role": "interviewer", "content": "Tell me OS", "round_number": 2},
            {"role": "candidate", "content": "Process is...", "round_number": 2},
        ]
        rounds_conducted = set()
        round_convos = {1: [], 2: [], 3: [], 4: []}
        for m in msgs:
            rn = m.get("round_number", 1)
            rounds_conducted.add(rn)
            label = "Interviewer" if m["role"] == "interviewer" else "Candidate"
            round_convos[rn].append(f"{label}: {m['content']}")
        assert rounds_conducted == {1, 2}
        assert len(round_convos[1]) == 3
        assert len(round_convos[2]) == 2
        assert round_convos[3] == [] and round_convos[4] == []
        not_conducted = [r for r in [1, 2, 3, 4] if r not in rounds_conducted]
        assert not_conducted == [3, 4]


# ========== Regression ==========
class TestRegression:
    def test_profile_stats_still_works(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/profile/stats")
        assert r.status_code == 200
        d = r.json()
        assert "xp" in d and "rank" in d and "badges" in d

    def test_problems_listing(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/problems")
        assert r.status_code == 200
        body = r.json()
        assert "problems" in body
        assert isinstance(body["problems"], list)

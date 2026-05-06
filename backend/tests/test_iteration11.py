"""Iteration 11 tests: Custom SQL schema, PDF upload, code drafts/solved-ids, interview pdf fields."""
import os
import io
import pytest
import requests
from fpdf import FPDF

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://dsa-interview-prep-3.preview.emergentagent.com").rstrip("/")
SESSION_TOKEN = "test_session_dev_arena_2026"


@pytest.fixture(scope="module")
def auth_session():
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {SESSION_TOKEN}"})
    return s


@pytest.fixture(scope="module")
def pdf_file_bytes():
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=12)
    pdf.cell(200, 10, txt="Operating Systems Reference Material", ln=1)
    pdf.cell(200, 10, txt="Process vs Thread: A process has its own memory; threads share memory.", ln=1)
    pdf.cell(200, 10, txt="Deadlock requires four conditions: mutual exclusion, hold-and-wait, no preemption, circular wait.", ln=1)
    out = pdf.output(dest="S")
    if isinstance(out, str):
        out = out.encode("latin-1")
    return bytes(out)


# ================= SQL Custom Schema =================
class TestSQLCustomSchema:
    def test_sql_no_custom_schema_builtin_tables(self, auth_session):
        r = auth_session.post(f"{BASE_URL}/api/sql/execute", json={
            "query": "SELECT name, salary FROM employees WHERE department='Engineering' ORDER BY salary DESC LIMIT 3"
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert "error" not in data or not data.get("error")
        assert data.get("columns") == ["name", "salary"]
        assert data.get("row_count", 0) >= 3
        assert isinstance(data.get("rows"), list)
        # Top engineer should be Grace Lee 110000
        assert data["rows"][0][0] == "Grace Lee"

    def test_sql_with_custom_schema_create_and_query(self, auth_session):
        custom_schema = """
        CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price REAL, category TEXT);
        INSERT INTO products VALUES (1, 'Pen', 1.5, 'Stationery');
        INSERT INTO products VALUES (2, 'Notebook', 3.0, 'Stationery');
        INSERT INTO products VALUES (3, 'Headphones', 50, 'Electronics');
        """
        r = auth_session.post(f"{BASE_URL}/api/sql/execute", json={
            "query": "SELECT category, COUNT(*) as cnt, SUM(price) as total FROM products GROUP BY category ORDER BY category",
            "custom_schema": custom_schema
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert not data.get("error"), data
        assert data["columns"] == ["category", "cnt", "total"]
        rows = data["rows"]
        assert len(rows) == 2
        # Electronics first alphabetically
        assert rows[0][0] == "Electronics" and rows[0][1] == 1
        assert rows[1][0] == "Stationery" and rows[1][1] == 2

    def test_sql_custom_schema_alongside_builtin(self, auth_session):
        custom_schema = "CREATE TABLE xyz (id INTEGER, val TEXT); INSERT INTO xyz VALUES (1, 'hello');"
        # Query built-in employees while custom schema also applied
        r = auth_session.post(f"{BASE_URL}/api/sql/execute", json={
            "query": "SELECT COUNT(*) FROM employees",
            "custom_schema": custom_schema
        })
        assert r.status_code == 200
        data = r.json()
        assert not data.get("error")
        assert data["rows"][0][0] == 15

    def test_sql_invalid_custom_schema_returns_error_payload(self, auth_session):
        r = auth_session.post(f"{BASE_URL}/api/sql/execute", json={
            "query": "SELECT 1",
            "custom_schema": "CREATE TABEL bad_syntax (id INT);"
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("error"), "Expected error string for bad schema"
        assert "Schema error" in data["error"] or "syntax" in data["error"].lower()

    def test_sql_dangerous_pattern_blocked(self, auth_session):
        r = auth_session.post(f"{BASE_URL}/api/sql/execute", json={
            "query": "DROP DATABASE main"
        })
        assert r.status_code == 400

    def test_sql_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/sql/execute", json={"query": "SELECT 1"})
        assert r.status_code == 401


# ================= PDF Upload =================
class TestPDFUpload:
    def test_upload_valid_pdf(self, auth_session, pdf_file_bytes):
        files = {"file": ("test.pdf", pdf_file_bytes, "application/pdf")}
        # Use a clean session for multipart - don't override Content-Type
        s = requests.Session()
        s.headers.update({"Authorization": f"Bearer {SESSION_TOKEN}"})
        r = s.post(f"{BASE_URL}/api/upload/pdf", files=files)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "text" in data and "pages" in data and "filename" in data
        assert data["filename"] == "test.pdf"
        assert isinstance(data["pages"], int) and data["pages"] >= 1
        assert "Operating Systems" in data["text"] or "Process" in data["text"] or len(data["text"]) > 0

    def test_upload_non_pdf_rejected(self):
        s = requests.Session()
        s.headers.update({"Authorization": f"Bearer {SESSION_TOKEN}"})
        files = {"file": ("test.txt", b"hello world not a pdf", "text/plain")}
        r = s.post(f"{BASE_URL}/api/upload/pdf", files=files)
        assert r.status_code == 400
        assert "PDF" in r.json().get("detail", "")

    def test_upload_pdf_requires_auth(self, pdf_file_bytes):
        files = {"file": ("test.pdf", pdf_file_bytes, "application/pdf")}
        r = requests.post(f"{BASE_URL}/api/upload/pdf", files=files)
        assert r.status_code == 401


# ================= Interview with PDF =================
class TestInterviewWithPDF:
    def test_interview_start_accepts_pdf_fields(self, auth_session):
        # Just verify schema accepts fields - actual LLM call may take time, so we check the persisted interview
        r = auth_session.post(f"{BASE_URL}/api/interviews/start", json={
            "role": "SDE",
            "jd": "Test",
            "pdf_context": "OS concepts: process, thread, deadlock.",
            "restrict_to_pdf": True
        }, timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        iv = data["interview"]
        assert iv.get("pdf_context") == "OS concepts: process, thread, deadlock."
        assert iv.get("restrict_to_pdf") is True
        # cleanup - end this interview to avoid clutter
        try:
            auth_session.post(f"{BASE_URL}/api/interviews/{iv['interview_id']}/end", timeout=120)
        except Exception:
            pass


# ================= Code Drafts / Solved IDs =================
class TestCodePersistence:
    PROBLEM_ID = "prob_00001"

    def test_save_code_draft(self, auth_session):
        r = auth_session.post(f"{BASE_URL}/api/code/save", json={
            "problem_id": self.PROBLEM_ID,
            "code": "def two_sum(nums, target):\n    return []  # TEST_DRAFT",
            "language": "python"
        })
        assert r.status_code == 200, r.text
        assert r.json().get("saved") is True

    def test_get_code_draft(self, auth_session):
        # ensure saved first
        auth_session.post(f"{BASE_URL}/api/code/save", json={
            "problem_id": self.PROBLEM_ID,
            "code": "def two_sum(nums, target):\n    return []  # TEST_DRAFT_v2",
            "language": "python"
        })
        r = auth_session.get(f"{BASE_URL}/api/code/draft/{self.PROBLEM_ID}")
        assert r.status_code == 200
        data = r.json()
        assert data.get("draft") is not None
        assert "TEST_DRAFT_v2" in data["draft"]["code"]
        assert data["draft"]["language"] == "python"

    def test_get_code_draft_missing_returns_null_or_submission(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/code/draft/prob_nonexistent_xyz")
        assert r.status_code == 200
        # should return {"draft": None} when no draft and no submission
        data = r.json()
        assert "draft" in data

    def test_solved_ids_endpoint(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/submissions/solved-ids")
        assert r.status_code == 200
        data = r.json()
        assert "solved_ids" in data
        assert isinstance(data["solved_ids"], list)

    def test_code_save_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/code/save", json={
            "problem_id": "prob_00001", "code": "x=1", "language": "python"
        })
        assert r.status_code == 401

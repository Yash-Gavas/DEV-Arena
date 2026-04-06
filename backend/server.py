from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, json, httpx, sqlite3, re
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI()
api_router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# ==================== MODELS ====================
class InterviewCreate(BaseModel):
    role: str
    jd: Optional[str] = ""

class MessageCreate(BaseModel):
    content: str

class ProctoringEvent(BaseModel):
    interview_id: str
    event_type: str
    details: Optional[str] = ""

class ProfileUpdate(BaseModel):
    bio: Optional[str] = None
    college: Optional[str] = None
    target_role: Optional[str] = None
    name: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = ""

class CodeSubmission(BaseModel):
    problem_id: str
    code: str
    language: str

class SQLSubmission(BaseModel):
    sql_id: Optional[str] = ""
    query: str

# ==================== AUTH HELPER ====================
async def get_current_user(request: Request):
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ==================== AUTH ROUTES ====================
@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")
    async with httpx.AsyncClient() as http_client:
        auth_resp = await http_client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    if auth_resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    auth_data = auth_resp.json()
    email, name, picture = auth_data["email"], auth_data["name"], auth_data.get("picture", "")
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"email": email}, {"$set": {"name": name, "picture": picture}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id, "email": email, "name": name, "picture": picture,
            "bio": "", "college": "", "target_role": "",
            "interviews_completed": 0, "problems_solved": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    session_token = f"st_{uuid.uuid4().hex}"
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    response.set_cookie(key="session_token", value=session_token, httponly=True,
                        secure=True, samesite="none", path="/", max_age=7*24*60*60)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user

@api_router.get("/auth/me")
async def get_me(request: Request):
    return await get_current_user(request)

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/", secure=True, samesite="none")
    return {"message": "Logged out"}

# ==================== DSA PROBLEMS ====================
@api_router.get("/problems")
async def list_problems(
    topic: Optional[str] = None, pattern: Optional[str] = None,
    difficulty: Optional[str] = None, company: Optional[str] = None,
    search: Optional[str] = None, page: int = 1, limit: int = 50
):
    query = {}
    if topic: query["topic"] = topic
    if pattern: query["pattern"] = pattern
    if difficulty: query["difficulty"] = difficulty
    if company: query["companies"] = company
    if search: query["title"] = {"$regex": search, "$options": "i"}
    skip = (page - 1) * limit
    total = await db.dsa_problems.count_documents(query)
    problems = await db.dsa_problems.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    return {"problems": problems, "total": total, "page": page, "pages": max(1, (total + limit - 1) // limit)}

@api_router.get("/problems/meta")
async def get_problems_meta():
    topics = await db.dsa_problems.distinct("topic")
    patterns = await db.dsa_problems.distinct("pattern")
    raw_companies = await db.dsa_problems.distinct("companies")
    return {
        "topics": sorted([t for t in topics if t]),
        "patterns": sorted([p for p in patterns if p]),
        "companies": sorted([c for c in raw_companies if c]),
        "difficulties": ["Easy", "Medium", "Hard"]
    }

@api_router.get("/problems/{problem_id}")
async def get_problem(problem_id: str):
    problem = await db.dsa_problems.find_one({"problem_id": problem_id}, {"_id": 0})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem

# ==================== AI INTERVIEW ====================
ROUND_CONFIG = [
    {"round": 1, "name": "DSA & Coding", "desc": "Data Structures and Algorithms coding questions"},
    {"round": 2, "name": "Projects & Experience", "desc": "Discussion about projects, experience, and approach"},
    {"round": 3, "name": "Core CS Fundamentals", "desc": "OS, DBMS, CN, SQL - scenario-based questions"},
    {"round": 4, "name": "System Design", "desc": "System design and architecture discussion"}
]

ROUND_GUIDELINES = {
    1: "Ask algorithm/data structure problems. Present problems with input/output examples. Ask about complexity. Patterns: sliding window, two pointers, binary search, DFS/BFS, DP, greedy.",
    2: "Ask about their most impactful project. Probe technical decisions. Ask about challenges, teamwork, specific contributions.",
    3: "OS: Process vs Thread, Deadlock, Memory. DBMS: ACID, Normalization, Indexing. CN: TCP/UDP, HTTP, DNS. SQL: JOINs, optimization. Ask scenarios, not definitions.",
    4: "Ask to design a real system (URL shortener, chat, notification service). Probe scalability, availability, consistency, caching, API design, trade-offs."
}

def build_system_prompt(interview, messages, round_num):
    rc = ROUND_CONFIG[round_num - 1]
    prev_qs = [m["content"][:150] for m in messages if m["role"] == "interviewer"]
    history = "\n".join([f"{'Interviewer' if m['role']=='interviewer' else 'Candidate'}: {m['content']}" for m in messages[-16:]])
    return f"""You are Alex Chen, a Senior Technical Interviewer at a top tech company conducting a live, realistic interview.

Personality: Professional, friendly, encouraging but probing. Ask ONE question at a time. Follow up on incomplete answers.

Interview Context:
- Role: {interview.get('role', 'Software Engineer')}
- JD: {interview.get('jd', 'General SWE')[:500]}
- Round {round_num}: {rc['name']} - {rc['desc']}

Previously asked (DO NOT repeat):
{chr(10).join(f'- {q}' for q in prev_qs[-10:]) if prev_qs else 'None yet.'}

Conversation:
{history if history else 'Start of round.'}

Guidelines: {ROUND_GUIDELINES.get(round_num, '')}

Rules: ONE question. Never repeat. Be conversational. Use markdown for code."""

@api_router.post("/interviews/start")
async def start_interview(data: InterviewCreate, request: Request):
    user = await get_current_user(request)
    interview_id = f"int_{uuid.uuid4().hex[:12]}"
    interview = {
        "interview_id": interview_id, "user_id": user["user_id"],
        "role": data.role, "jd": data.jd or "", "current_round": 1,
        "status": "active", "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None, "report_id": None
    }
    await db.interviews.insert_one(interview)
    prev_interviews = await db.interview_messages.find(
        {"role": "interviewer"}, {"_id": 0, "content": 1}
    ).to_list(500)
    system_prompt = build_system_prompt(interview, [], 1)
    if prev_interviews:
        system_prompt += f"\n\nPrevious interviews - avoid these:\n" + "\n".join([f"- {m['content'][:80]}" for m in prev_interviews[-20:]])
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"iv_{interview_id}_r1",
                    system_message=system_prompt).with_model("anthropic", "claude-sonnet-4-5-20250929")
    ai_response = await chat.send_message(UserMessage(text="Start the interview. Introduce yourself and begin Round 1."))
    msg = {"message_id": f"msg_{uuid.uuid4().hex[:12]}", "interview_id": interview_id,
           "round_number": 1, "role": "interviewer", "content": ai_response,
           "timestamp": datetime.now(timezone.utc).isoformat()}
    await db.interview_messages.insert_one(msg)
    doc = await db.interviews.find_one({"interview_id": interview_id}, {"_id": 0})
    return {"interview": doc, "messages": [{"message_id": msg["message_id"], "role": msg["role"],
             "content": msg["content"], "round_number": msg["round_number"], "timestamp": msg["timestamp"]}]}

@api_router.post("/interviews/{interview_id}/message")
async def send_interview_message(interview_id: str, data: MessageCreate, request: Request):
    user = await get_current_user(request)
    interview = await db.interviews.find_one({"interview_id": interview_id, "user_id": user["user_id"]}, {"_id": 0})
    if not interview: raise HTTPException(status_code=404, detail="Interview not found")
    if interview["status"] != "active": raise HTTPException(status_code=400, detail="Interview not active")
    user_msg = {"message_id": f"msg_{uuid.uuid4().hex[:12]}", "interview_id": interview_id,
                "round_number": interview["current_round"], "role": "candidate",
                "content": data.content, "timestamp": datetime.now(timezone.utc).isoformat()}
    await db.interview_messages.insert_one(user_msg)
    all_msgs = await db.interview_messages.find({"interview_id": interview_id}, {"_id": 0}).sort("timestamp", 1).to_list(1000)
    system_prompt = build_system_prompt(interview, all_msgs, interview["current_round"])
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"iv_{interview_id}_msg_{uuid.uuid4().hex[:6]}",
                    system_message=system_prompt).with_model("anthropic", "claude-sonnet-4-5-20250929")
    ai_response = await chat.send_message(UserMessage(text=data.content))
    ai_msg = {"message_id": f"msg_{uuid.uuid4().hex[:12]}", "interview_id": interview_id,
              "round_number": interview["current_round"], "role": "interviewer",
              "content": ai_response, "timestamp": datetime.now(timezone.utc).isoformat()}
    await db.interview_messages.insert_one(ai_msg)
    return {
        "user_message": {"message_id": user_msg["message_id"], "role": "candidate", "content": data.content, "round_number": user_msg["round_number"], "timestamp": user_msg["timestamp"]},
        "ai_message": {"message_id": ai_msg["message_id"], "role": "interviewer", "content": ai_response, "round_number": ai_msg["round_number"], "timestamp": ai_msg["timestamp"]}
    }

@api_router.post("/interviews/{interview_id}/next-round")
async def next_round(interview_id: str, request: Request):
    user = await get_current_user(request)
    interview = await db.interviews.find_one({"interview_id": interview_id, "user_id": user["user_id"]}, {"_id": 0})
    if not interview: raise HTTPException(status_code=404, detail="Interview not found")
    if interview["current_round"] >= 4: raise HTTPException(status_code=400, detail="Already at final round")
    new_round = interview["current_round"] + 1
    await db.interviews.update_one({"interview_id": interview_id}, {"$set": {"current_round": new_round}})
    interview["current_round"] = new_round
    all_msgs = await db.interview_messages.find({"interview_id": interview_id}, {"_id": 0}).sort("timestamp", 1).to_list(1000)
    system_prompt = build_system_prompt(interview, all_msgs, new_round)
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"iv_{interview_id}_r{new_round}",
                    system_message=system_prompt).with_model("anthropic", "claude-sonnet-4-5-20250929")
    ai_response = await chat.send_message(UserMessage(text=f"Transition to Round {new_round}. Wrap up and ask first question."))
    ai_msg = {"message_id": f"msg_{uuid.uuid4().hex[:12]}", "interview_id": interview_id,
              "round_number": new_round, "role": "interviewer", "content": ai_response,
              "timestamp": datetime.now(timezone.utc).isoformat()}
    await db.interview_messages.insert_one(ai_msg)
    return {"current_round": new_round, "message": {"message_id": ai_msg["message_id"], "role": "interviewer",
            "content": ai_response, "round_number": new_round, "timestamp": ai_msg["timestamp"]}}

@api_router.post("/interviews/{interview_id}/end")
async def end_interview(interview_id: str, request: Request):
    user = await get_current_user(request)
    interview = await db.interviews.find_one({"interview_id": interview_id, "user_id": user["user_id"]}, {"_id": 0})
    if not interview: raise HTTPException(status_code=404, detail="Interview not found")
    all_msgs = await db.interview_messages.find({"interview_id": interview_id}, {"_id": 0}).sort("timestamp", 1).to_list(1000)
    proctoring = await db.proctoring_events.find({"interview_id": interview_id}, {"_id": 0}).to_list(100)
    convo = "\n".join([f"{'Interviewer' if m['role']=='interviewer' else 'Candidate'}: {m['content']}" for m in all_msgs])
    report_chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"rpt_{interview_id}",
        system_message='Evaluate interview. Return ONLY JSON: {"overall_score":<1-100>,"rounds":[{"round":1,"name":"DSA & Coding","score":<1-100>,"feedback":"<text>"},{"round":2,"name":"Projects & Experience","score":<1-100>,"feedback":"<text>"},{"round":3,"name":"Core CS Fundamentals","score":<1-100>,"feedback":"<text>"},{"round":4,"name":"System Design","score":<1-100>,"feedback":"<text>"}],"strengths":["<s1>","<s2>","<s3>"],"improvements":["<i1>","<i2>","<i3>"],"recommendation":"Strong Hire"|"Hire"|"Lean Hire"|"No Hire","detailed_feedback":"<2 paragraphs>"}'
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    report_resp = await report_chat.send_message(UserMessage(
        text=f"Role: {interview.get('role')}\nViolations: {len(proctoring)}\n\n{convo[:8000]}"))
    try:
        rt = report_resp.strip()
        if "```json" in rt: rt = rt.split("```json")[1].split("```")[0].strip()
        elif "```" in rt: rt = rt.split("```")[1].split("```")[0].strip()
        report_data = json.loads(rt)
    except Exception:
        report_data = {"overall_score": 65, "rounds": [{"round": i+1, "name": ROUND_CONFIG[i]["name"], "score": 65, "feedback": "Pending"} for i in range(4)],
                       "strengths": ["Good effort"], "improvements": ["More practice"], "recommendation": "Lean Hire", "detailed_feedback": report_resp}
    if len(proctoring) > 0:
        report_data["overall_score"] = max(0, report_data.get("overall_score", 65) - min(len(proctoring) * 5, 30))
        report_data["proctoring_violations"] = len(proctoring)
    report_id = f"rpt_{uuid.uuid4().hex[:12]}"
    report = {"report_id": report_id, "interview_id": interview_id, "user_id": user["user_id"],
              "role": interview.get("role", ""), **report_data, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.reports.insert_one(report)
    await db.interviews.update_one({"interview_id": interview_id},
        {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat(), "report_id": report_id}})
    await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"interviews_completed": 1}})
    report.pop("_id", None)
    return report

@api_router.get("/interviews")
async def list_interviews(request: Request):
    user = await get_current_user(request)
    return {"interviews": await db.interviews.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)}

@api_router.get("/interviews/{interview_id}")
async def get_interview(interview_id: str, request: Request):
    user = await get_current_user(request)
    interview = await db.interviews.find_one({"interview_id": interview_id, "user_id": user["user_id"]}, {"_id": 0})
    if not interview: raise HTTPException(status_code=404, detail="Interview not found")
    messages = await db.interview_messages.find({"interview_id": interview_id}, {"_id": 0}).sort("timestamp", 1).to_list(1000)
    return {"interview": interview, "messages": messages}

# ==================== REPORTS ====================
@api_router.get("/reports")
async def list_reports(request: Request):
    user = await get_current_user(request)
    return {"reports": await db.reports.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)}

@api_router.get("/reports/{report_id}")
async def get_report(report_id: str, request: Request):
    user = await get_current_user(request)
    report = await db.reports.find_one({"report_id": report_id, "user_id": user["user_id"]}, {"_id": 0})
    if not report: raise HTTPException(status_code=404, detail="Report not found")
    return report

# ==================== PROFILE ====================
@api_router.get("/profile")
async def get_profile(request: Request):
    return await get_current_user(request)

@api_router.put("/profile")
async def update_profile(data: ProfileUpdate, request: Request):
    user = await get_current_user(request)
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if update: await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
    return await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})

# ==================== PROCTORING ====================
@api_router.post("/proctoring/event")
async def log_proctoring_event(event: ProctoringEvent, request: Request):
    user = await get_current_user(request)
    await db.proctoring_events.insert_one({
        "event_id": f"evt_{uuid.uuid4().hex[:12]}", "interview_id": event.interview_id,
        "user_id": user["user_id"], "event_type": event.event_type,
        "details": event.details, "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return {"status": "logged"}

# ==================== RESOURCES ====================
@api_router.get("/resources")
async def list_resources():
    return {"resources": await db.resources.find({}, {"_id": 0}).to_list(100)}

@api_router.get("/resources/{subject_slug}")
async def get_resource(subject_slug: str):
    resource = await db.resources.find_one({"subject_slug": subject_slug}, {"_id": 0})
    if not resource: raise HTTPException(status_code=404, detail="Resource not found")
    return resource

# ==================== DSA CHATBOT ====================
@api_router.post("/chatbot")
async def dsa_chatbot(data: ChatRequest, request: Request):
    user = await get_current_user(request)
    system = """You are DEV-Arena's AI Mentor, an expert in Data Structures, Algorithms, and Computer Science.
You help users:
- Understand DSA concepts with clear explanations and examples
- Debug their code and suggest optimizations
- Explain time/space complexity
- Provide hints without giving away full solutions
- Guide through problem-solving approaches and patterns

Use markdown formatting. Include code examples when helpful. Be encouraging but rigorous."""
    if data.context:
        system += f"\n\nContext: {data.context}"
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"chat_{user['user_id']}_{uuid.uuid4().hex[:6]}",
                    system_message=system).with_model("anthropic", "claude-sonnet-4-5-20250929")
    response = await chat.send_message(UserMessage(text=data.message))
    return {"response": response}

# ==================== TEST CASES ====================
@api_router.get("/problems/{problem_id}/testcases")
async def get_testcases(problem_id: str, request: Request):
    await get_current_user(request)
    problem = await db.dsa_problems.find_one({"problem_id": problem_id}, {"_id": 0})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    cached = await db.testcases.find_one({"problem_id": problem_id}, {"_id": 0})
    if cached:
        return {"testcases": cached["testcases"]}
    system = f"""Generate test cases for this DSA problem. Return ONLY a JSON array of test case objects.
Each test case must have: "input" (string), "expected_output" (string), "explanation" (string, 1 sentence).
Generate exactly 3 test cases: 1 simple, 1 medium, 1 edge case.

Problem: {problem['title']}
Description: {problem['description']}
Difficulty: {problem['difficulty']}
Topic: {problem.get('topic','')}

Return ONLY valid JSON array, no markdown, no explanation outside the JSON."""
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"tc_{uuid.uuid4().hex[:8]}",
                    system_message=system).with_model("anthropic", "claude-sonnet-4-5-20250929")
    response = await chat.send_message(UserMessage(text="Generate test cases now."))
    try:
        rt = response.strip()
        if "```json" in rt: rt = rt.split("```json")[1].split("```")[0].strip()
        elif "```" in rt: rt = rt.split("```")[1].split("```")[0].strip()
        testcases = json.loads(rt)
        if not isinstance(testcases, list):
            testcases = [{"input": "N/A", "expected_output": "N/A", "explanation": "Auto-generated"}]
    except Exception:
        testcases = [{"input": "Example input", "expected_output": "Example output", "explanation": "Check the problem description for details"}]
    await db.testcases.update_one(
        {"problem_id": problem_id},
        {"$set": {"problem_id": problem_id, "testcases": testcases, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"testcases": testcases}

# ==================== PROBLEM CHATBOT (CONTEXTUAL) ====================
@api_router.post("/problems/{problem_id}/chat")
async def problem_chat(problem_id: str, data: ChatRequest, request: Request):
    user = await get_current_user(request)
    problem = await db.dsa_problems.find_one({"problem_id": problem_id}, {"_id": 0})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    system = f"""You are DEV-Arena's AI Mentor helping with a specific problem.

Problem: {problem['title']}
Difficulty: {problem['difficulty']}
Topic: {problem.get('topic','')}
Pattern: {problem.get('pattern','')}
Description: {problem['description']}

Rules:
- Give hints, not full solutions unless explicitly asked
- Explain approach step by step
- Use the specific problem context in your answers
- If user shares code, help debug it
- Explain time/space complexity when relevant
- Use markdown formatting with code blocks"""
    if data.context:
        system += f"\n\nConversation so far:\n{data.context}"
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"pchat_{user['user_id']}_{uuid.uuid4().hex[:6]}",
                    system_message=system).with_model("anthropic", "claude-sonnet-4-5-20250929")
    response = await chat.send_message(UserMessage(text=data.message))
    return {"response": response}

# ==================== CODE EVALUATION ====================
@api_router.post("/code/evaluate")
async def evaluate_code(data: CodeSubmission, request: Request):
    user = await get_current_user(request)
    problem = await db.dsa_problems.find_one({"problem_id": data.problem_id}, {"_id": 0})
    if not problem: raise HTTPException(status_code=404, detail="Problem not found")
    cached_tc = await db.testcases.find_one({"problem_id": data.problem_id}, {"_id": 0})
    tc_context = ""
    if cached_tc and cached_tc.get("testcases"):
        tc_context = "\n\nTest Cases to evaluate against:\n" + json.dumps(cached_tc["testcases"], indent=2)
    system = f"""You are a strict code evaluator. Evaluate the submitted code for the problem.

Problem: {problem['title']}
Description: {problem['description']}
Difficulty: {problem['difficulty']}
Topic: {problem.get('topic','')}
Pattern: {problem.get('pattern','')}{tc_context}

IMPORTANT: Actually trace through the code logic mentally for each test case. Determine if the code would produce the correct output.

Return ONLY valid JSON (no markdown):
{{"passed": true/false, "score": <0-100>, "time_complexity": "<O(...)>", "space_complexity": "<O(...)>", "feedback": "<detailed feedback>", "test_results": [{{"input": "<test input>", "expected": "<expected output>", "actual": "<what the code would produce>", "passed": true/false}}], "suggestions": ["<suggestion1>", "<suggestion2>"]}}"""
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"eval_{uuid.uuid4().hex[:8]}",
                    system_message=system).with_model("anthropic", "claude-sonnet-4-5-20250929")
    response = await chat.send_message(UserMessage(text=f"Language: {data.language}\n\nCode:\n```{data.language}\n{data.code}\n```"))
    try:
        rt = response.strip()
        if "```json" in rt: rt = rt.split("```json")[1].split("```")[0].strip()
        elif "```" in rt: rt = rt.split("```")[1].split("```")[0].strip()
        result = json.loads(rt)
    except Exception:
        result = {"passed": False, "score": 0, "feedback": response, "test_results": [], "suggestions": []}
    await db.submissions.insert_one({
        "submission_id": f"sub_{uuid.uuid4().hex[:12]}", "user_id": user["user_id"],
        "problem_id": data.problem_id, "code": data.code, "language": data.language,
        "result": result, "timestamp": datetime.now(timezone.utc).isoformat()
    })
    if result.get("passed"):
        await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"problems_solved": 1}})
    return result

# ==================== SQL PLAYGROUND ====================
def get_sql_db():
    """Create in-memory SQLite with sample data for SQL practice"""
    conn = sqlite3.connect(":memory:")
    cur = conn.cursor()
    cur.executescript("""
        CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, email TEXT, department TEXT, salary REAL, manager_id INTEGER, hire_date TEXT);
        INSERT INTO employees VALUES (1,'Alice Johnson','alice@company.com','Engineering',95000,NULL,'2020-01-15');
        INSERT INTO employees VALUES (2,'Bob Smith','bob@company.com','Engineering',85000,1,'2020-03-20');
        INSERT INTO employees VALUES (3,'Carol Williams','carol@company.com','Marketing',75000,NULL,'2019-06-10');
        INSERT INTO employees VALUES (4,'David Brown','david@company.com','Engineering',90000,1,'2021-02-01');
        INSERT INTO employees VALUES (5,'Eve Davis','eve@company.com','Marketing',70000,3,'2021-08-15');
        INSERT INTO employees VALUES (6,'Frank Miller','frank@company.com','Sales',80000,NULL,'2020-11-01');
        INSERT INTO employees VALUES (7,'Grace Lee','grace@company.com','Engineering',110000,1,'2018-04-20');
        INSERT INTO employees VALUES (8,'Henry Wilson','henry@company.com','Sales',65000,6,'2022-01-10');
        INSERT INTO employees VALUES (9,'Ivy Chen','ivy@company.com','Engineering',92000,1,'2021-05-15');
        INSERT INTO employees VALUES (10,'Jack Taylor','jack@company.com','Marketing',72000,3,'2022-03-01');
        INSERT INTO employees VALUES (11,'Karen Moore','karen@company.com','Sales',78000,6,'2021-09-20');
        INSERT INTO employees VALUES (12,'Leo Anderson','leo@company.com','Engineering',88000,7,'2022-06-01');
        INSERT INTO employees VALUES (13,'Mia Thomas','mia@company.com','Marketing',68000,3,'2023-01-15');
        INSERT INTO employees VALUES (14,'Noah Jackson','noah@company.com','Engineering',105000,7,'2019-08-20');
        INSERT INTO employees VALUES (15,'Olivia White','olivia@company.com','Sales',82000,6,'2020-12-01');

        CREATE TABLE departments (dept_id INTEGER PRIMARY KEY, department_name TEXT, budget REAL, location TEXT);
        INSERT INTO departments VALUES (1,'Engineering',500000,'San Francisco');
        INSERT INTO departments VALUES (2,'Marketing',200000,'New York');
        INSERT INTO departments VALUES (3,'Sales',300000,'Chicago');
        INSERT INTO departments VALUES (4,'HR',150000,'San Francisco');

        CREATE TABLE orders (order_id INTEGER PRIMARY KEY, employee_id INTEGER, product TEXT, amount REAL, order_date TEXT);
        INSERT INTO orders VALUES (1,1,'Laptop',1200,'2024-01-15');
        INSERT INTO orders VALUES (2,2,'Monitor',400,'2024-01-20');
        INSERT INTO orders VALUES (3,3,'Keyboard',80,'2024-02-01');
        INSERT INTO orders VALUES (4,1,'Mouse',50,'2024-02-10');
        INSERT INTO orders VALUES (5,4,'Laptop',1200,'2024-02-15');
        INSERT INTO orders VALUES (6,6,'Monitor',400,'2024-03-01');
        INSERT INTO orders VALUES (7,7,'Laptop',1200,'2024-03-10');
        INSERT INTO orders VALUES (8,2,'Keyboard',80,'2024-03-15');
        INSERT INTO orders VALUES (9,5,'Monitor',400,'2024-04-01');
        INSERT INTO orders VALUES (10,8,'Mouse',50,'2024-04-10');

        CREATE TABLE logs (id INTEGER PRIMARY KEY, num INTEGER);
        INSERT INTO logs VALUES (1,1); INSERT INTO logs VALUES (2,1); INSERT INTO logs VALUES (3,1);
        INSERT INTO logs VALUES (4,2); INSERT INTO logs VALUES (5,1); INSERT INTO logs VALUES (6,2);
        INSERT INTO logs VALUES (7,2); INSERT INTO logs VALUES (8,2);
    """)
    return conn

@api_router.post("/sql/execute")
async def execute_sql(data: SQLSubmission, request: Request):
    await get_current_user(request)
    # Sanitize - only allow SELECT
    query = data.query.strip()
    if not query.upper().startswith("SELECT"):
        raise HTTPException(status_code=400, detail="Only SELECT queries are allowed in the playground")
    # Block dangerous patterns
    dangerous = ["DROP", "DELETE", "INSERT", "UPDATE", "ALTER", "CREATE", "EXEC", "UNION.*DROP"]
    for d in dangerous:
        if re.search(d, query, re.IGNORECASE):
            raise HTTPException(status_code=400, detail=f"Query contains forbidden keyword: {d}")
    try:
        conn = get_sql_db()
        cur = conn.cursor()
        cur.execute(query)
        columns = [desc[0] for desc in cur.description] if cur.description else []
        rows = cur.fetchall()
        conn.close()
        return {"columns": columns, "rows": [list(r) for r in rows[:100]], "row_count": len(rows)}
    except Exception as e:
        return {"error": str(e), "columns": [], "rows": [], "row_count": 0}

@api_router.get("/sql/problems")
async def list_sql_problems(request: Request):
    await get_current_user(request)
    return {"problems": await db.sql_problems.find({}, {"_id": 0}).to_list(100)}

@api_router.get("/sql/schema")
async def get_sql_schema():
    return {"tables": [
        {"name": "employees", "columns": ["id INT PK", "name TEXT", "email TEXT", "department TEXT", "salary REAL", "manager_id INT", "hire_date TEXT"]},
        {"name": "departments", "columns": ["dept_id INT PK", "department_name TEXT", "budget REAL", "location TEXT"]},
        {"name": "orders", "columns": ["order_id INT PK", "employee_id INT FK", "product TEXT", "amount REAL", "order_date TEXT"]},
        {"name": "logs", "columns": ["id INT PK", "num INT"]},
    ]}

# ==================== SEED ====================
async def seed_database():
    count = await db.dsa_problems.count_documents({})
    if count < 10000:  # Re-seed if less than expected
        await db.dsa_problems.delete_many({})
        from seed_data import DSA_PROBLEMS, RESOURCES, SQL_PROBLEMS
        if DSA_PROBLEMS:
            # Insert in batches for large datasets
            batch_size = 1000
            for i in range(0, len(DSA_PROBLEMS), batch_size):
                await db.dsa_problems.insert_many(DSA_PROBLEMS[i:i+batch_size])
            logger.info(f"Seeded {len(DSA_PROBLEMS)} problems")
        await db.resources.delete_many({})
        if RESOURCES:
            await db.resources.insert_many(RESOURCES)
            logger.info(f"Seeded {len(RESOURCES)} resources")
        await db.sql_problems.delete_many({})
        if SQL_PROBLEMS:
            await db.sql_problems.insert_many(SQL_PROBLEMS)
            logger.info(f"Seeded {len(SQL_PROBLEMS)} SQL problems")
        await db.dsa_problems.create_index("problem_id", unique=True)
        await db.dsa_problems.create_index("topic")
        await db.dsa_problems.create_index("pattern")
        await db.dsa_problems.create_index("difficulty")
        await db.interviews.create_index("interview_id", unique=True)
        await db.interviews.create_index("user_id")
        await db.users.create_index("user_id", unique=True)
        await db.users.create_index("email", unique=True)
    else:
        logger.info(f"DB has {count} problems, skipping seed")

@app.on_event("startup")
async def startup():
    try: await seed_database()
    except Exception as e: logger.error(f"Seed error: {e}")

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"], allow_headers=["*"])

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

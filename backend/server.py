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

class CommunityPost(BaseModel):
    type: str  # "experience" or "review"
    company: Optional[str] = ""
    role: Optional[str] = ""
    title: str
    content: str
    rating: Optional[int] = None  # 1-5 for reviews
    difficulty: Optional[str] = ""  # Easy/Medium/Hard
    result: Optional[str] = ""  # Selected/Rejected/Pending
    tags: Optional[List[str]] = []

class CommentCreate(BaseModel):
    content: str

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
    {"round": 1, "name": "Introduction & DSA", "desc": "Self-introduction followed by Data Structures and Algorithms coding questions"},
    {"round": 2, "name": "Projects & Core Subjects", "desc": "Discussion about projects, experience, and core CS fundamentals"},
    {"round": 3, "name": "Managerial & System Design", "desc": "Behavioral questions and system design discussion"},
    {"round": 4, "name": "HR Round", "desc": "Cultural fit, career goals, and closing discussion"}
]

ROUND_GUIDELINES = {
    1: """CRITICAL: Start by introducing yourself briefly as Alex Chen, then IMMEDIATELY ask the candidate to introduce themselves - their background, education, experience, and what excites them about tech. 
After their introduction, transition to DSA. Ask algorithm/data structure problems with input/output examples. Ask about complexity. 
When presenting a coding problem, format it clearly with: Problem Title, Description, Examples (Input/Output), and Constraints. Tell the candidate to solve it in the code editor on the right.
Patterns: sliding window, two pointers, binary search, DFS/BFS, DP, greedy.""",
    2: """Ask about their most impactful project. Probe technical decisions, architecture choices. Ask about challenges, teamwork, specific contributions.
Then transition to Core CS: OS (Process vs Thread, Deadlock, Memory), DBMS (ACID, Normalization, Indexing), CN (TCP/UDP, HTTP, DNS).
IMPORTANT: You MUST also ask SQL queries. Give them a scenario with tables and ask them to write SQL. Examples:
- Write a query to find the second highest salary from employees table
- Write a query using JOIN to find employees and their department names
- Write a query to find duplicate emails using GROUP BY and HAVING
- Write a self-join query to find employees earning more than their managers
Ask at least 1-2 SQL questions during this round. Ask them to write the actual SQL query. Evaluate their query for correctness.""",
    3: """Behavioral/Managerial: Ask about handling conflicts, tight deadlines, leadership, mentoring. Use STAR format probing.
System Design: Ask to design a real system (URL shortener, chat app, notification service). Probe scalability, availability, consistency, caching, API design, trade-offs.""",
    4: """HR Round: Ask about career goals, why this company/role, salary expectations, relocation willingness, work-life balance views, strengths/weaknesses.
Be warm and conversational. Close the interview professionally, thank the candidate, and explain next steps."""
}

def build_system_prompt(interview, messages, round_num):
    rc = ROUND_CONFIG[round_num - 1]
    prev_qs = [m["content"][:150] for m in messages if m["role"] == "interviewer"]
    history = "\n".join([f"{'Interviewer' if m['role']=='interviewer' else 'Candidate'}: {m['content']}" for m in messages[-16:]])
    return f"""You are Alex Chen, a Senior Technical Interviewer at a top tech company conducting a live, realistic interview.

Personality: Professional but BRUTALLY HONEST. You are NOT a cheerleader. You give direct, candid, sometimes harsh feedback — exactly like a real FAANG interviewer.

CRITICAL BEHAVIOR RULES:
- If the candidate gives a WRONG answer, say it is WRONG immediately and clearly. Say "That's incorrect." or "No, that's wrong." then explain why. NEVER say "Good try" or "That's a reasonable attempt" for wrong answers.
- If the candidate cannot solve a DSA problem or writes buggy code, say directly: "This solution doesn't work. Let me point out the issues..." or "You weren't able to solve this one. The correct approach would be..."
- If the answer is PARTIALLY correct, say "You're partially right, but you're missing key parts..." — be specific about what's wrong.
- If the answer is VAGUE or hand-wavy, push back HARD: "That's too vague and wouldn't pass in a real interview" or "That explanation lacks depth — can you be more precise?"
- If the candidate doesn't know something, say "You don't seem to know this concept" or "This is a fundamental concept you should know for this role" — do NOT pretend it was okay.
- ONLY give genuine praise when the answer is truly correct AND well-explained. Generic encouragement like "Great!" for mediocre answers is FORBIDDEN.
- After pointing out errors, give ONE follow-up chance, then move on if they still struggle. Note that they struggled.
- Keep a MENTAL SCORECARD. If the candidate has been struggling with multiple questions, explicitly mention it: "You've had difficulty with the last few questions. Let's move on, but this is an area you need to work on."
- When wrapping up any topic or round, give an HONEST mini-assessment: "Your DSA skills need significant work" or "Your system design understanding is strong" — be truthful.
- NEVER use phrases like: "That's okay", "Don't worry about it", "Good effort though", "You're on the right track" — unless they genuinely are.
- Be like a real FAANG interviewer — respectful but DEMANDING. No participation trophies. No false encouragement.

Interview Context:
- Role: {interview.get('role', 'Software Engineer')}
- JD: {interview.get('jd', 'General SWE')[:500]}
- Round {round_num}: {rc['name']} - {rc['desc']}

Previously asked (DO NOT repeat):
{chr(10).join(f'- {q}' for q in prev_qs[-10:]) if prev_qs else 'None yet.'}

Conversation:
{history if history else 'Start of round.'}

Guidelines: {ROUND_GUIDELINES.get(round_num, '')}

Rules: ONE question at a time. Never repeat questions. Be conversational. Use markdown for code blocks. Be BRUTALLY HONEST about wrong answers — do NOT sugarcoat failure. If the candidate struggles, SAY SO DIRECTLY. This honest feedback is how candidates actually improve."""

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
    ai_response = await chat.send_message(UserMessage(text="Start the interview. Introduce yourself briefly, then ask the candidate to introduce themselves - their background, education, and experience. Do NOT start with technical questions yet."))
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
    round_names = {1: "Introduction & DSA", 2: "Projects & Core Subjects", 3: "Managerial & System Design", 4: "HR Round"}
    prev_round_name = round_names.get(new_round - 1, f"Round {new_round - 1}")
    transition_prompt = f"""We're transitioning from {prev_round_name} to Round {new_round}: {round_names.get(new_round, '')}.

IMPORTANT: Before starting the new round, give a BRIEF but BRUTALLY HONEST assessment of the candidate's performance in the previous round ({prev_round_name}). Be specific:
- If they struggled with DSA/coding, say so directly (e.g., "You had difficulty solving the coding problems" or "Your algorithm knowledge needs work")
- If their project discussion was shallow, call it out
- If they did well, acknowledge it genuinely
- Rate their performance as: Strong / Adequate / Needs Improvement / Poor

Then smoothly transition and ask the first question of the new round."""
    ai_response = await chat.send_message(UserMessage(text=transition_prompt))
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
        system_message='You are a BRUTALLY HONEST interview evaluator. Evaluate the candidate based on their ACTUAL performance, not effort. If they struggled, give LOW scores. If they gave wrong answers, reflect that. Do NOT inflate scores to be nice. A candidate who could not solve DSA problems should score below 40 in that round. Return ONLY JSON: {"overall_score":<1-100>,"rounds":[{"round":1,"name":"DSA & Coding","score":<1-100>,"feedback":"<honest text>"},{"round":2,"name":"Projects & Core Subjects","score":<1-100>,"feedback":"<honest text>"},{"round":3,"name":"Managerial & System Design","score":<1-100>,"feedback":"<honest text>"},{"round":4,"name":"HR Round","score":<1-100>,"feedback":"<honest text>"}],"strengths":["<s1>","<s2>","<s3>"],"improvements":["<i1>","<i2>","<i3>"],"recommendation":"Strong Hire"|"Hire"|"Lean Hire"|"No Hire","detailed_feedback":"<2 paragraphs of honest assessment>"}'
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

# ==================== BADGES & RANKING ====================
RANK_THRESHOLDS = [
    (0, "Novice", "#6B7280"),
    (100, "Apprentice", "#22C55E"),
    (500, "Warrior", "#3B82F6"),
    (1500, "Expert", "#A855F7"),
    (5000, "Master", "#F59E0B"),
    (15000, "Grandmaster", "#EF4444"),
]

BADGE_DEFS = [
    {"id": "first_blood", "name": "First Blood", "desc": "Complete your first interview", "icon": "zap", "color": "#EF4444"},
    {"id": "problem_solver_10", "name": "Problem Solver", "desc": "Solve 10 DSA problems", "icon": "code", "color": "#22C55E"},
    {"id": "century_100", "name": "Century", "desc": "Solve 100 DSA problems", "icon": "award", "color": "#F59E0B"},
    {"id": "marathon_5", "name": "Marathon Runner", "desc": "Complete 5 interviews", "icon": "brain", "color": "#3B82F6"},
    {"id": "perfectionist", "name": "Perfectionist", "desc": "Score 90+ on an interview", "icon": "star", "color": "#A855F7"},
    {"id": "community_star", "name": "Community Star", "desc": "Create 5 community posts", "icon": "users", "color": "#06B6D4"},
    {"id": "streak_7", "name": "Streak Master", "desc": "7-day activity streak", "icon": "flame", "color": "#F97316"},
    {"id": "diverse_solver", "name": "DSA Explorer", "desc": "Solve problems from 5+ topics", "icon": "compass", "color": "#EC4899"},
    {"id": "sql_ace", "name": "SQL Ace", "desc": "Execute 20 successful SQL queries", "icon": "database", "color": "#14B8A6"},
    {"id": "interviewer_10", "name": "Interview Veteran", "desc": "Complete 10 interviews", "icon": "shield", "color": "#8B5CF6"},
]

def get_rank(xp):
    rank_name, rank_color = "Novice", "#6B7280"
    for threshold, name, color in RANK_THRESHOLDS:
        if xp >= threshold:
            rank_name, rank_color = name, color
    next_rank = None
    for threshold, name, _ in RANK_THRESHOLDS:
        if xp < threshold:
            next_rank = {"name": name, "xp_needed": threshold}
            break
    return {"name": rank_name, "color": rank_color, "next": next_rank}

@api_router.get("/profile/stats")
async def get_profile_stats(request: Request):
    user = await get_current_user(request)
    uid = user["user_id"]

    # Count submissions
    total_solved = await db.submissions.count_documents({"user_id": uid, "result.passed": True})
    total_interviews = await db.interviews.count_documents({"user_id": uid, "status": "completed"})
    total_posts = await db.community_posts.count_documents({"user_id": uid})

    # Get distinct topics solved
    solved_subs = await db.submissions.find({"user_id": uid, "result.passed": True}, {"_id": 0, "problem_id": 1}).to_list(1000)
    solved_pids = list(set(s["problem_id"] for s in solved_subs))
    topics_solved = set()
    if solved_pids:
        probs = await db.dsa_problems.find({"problem_id": {"$in": solved_pids}}, {"_id": 0, "topic": 1}).to_list(1000)
        topics_solved = set(p.get("topic", "") for p in probs if p.get("topic"))

    # SQL query count
    sql_count = await db.submissions.count_documents({"user_id": uid, "language": "sql"})

    # Max interview score
    reports = await db.reports.find({"user_id": uid}, {"_id": 0, "overall_score": 1}).to_list(100)
    max_score = max((r.get("overall_score", 0) for r in reports), default=0)

    # Activity streak (check consecutive days with any activity)
    all_timestamps = []
    subs = await db.submissions.find({"user_id": uid}, {"_id": 0, "timestamp": 1}).to_list(5000)
    all_timestamps.extend([s["timestamp"] for s in subs if s.get("timestamp")])
    msgs = await db.interview_messages.find({"interview_id": {"$regex": "^int_"}, "role": "candidate"}, {"_id": 0, "timestamp": 1}).to_list(5000)
    all_timestamps.extend([m["timestamp"] for m in msgs if m.get("timestamp")])
    posts = await db.community_posts.find({"user_id": uid}, {"_id": 0, "created_at": 1}).to_list(1000)
    all_timestamps.extend([p["created_at"] for p in posts if p.get("created_at")])

    active_days = set()
    for ts in all_timestamps:
        try:
            d = datetime.fromisoformat(ts.replace("Z", "+00:00")) if isinstance(ts, str) else ts
            active_days.add(d.date())
        except Exception:
            pass

    streak = 0
    if active_days:
        today = datetime.now(timezone.utc).date()
        check = today
        while check in active_days:
            streak += 1
            check -= timedelta(days=1)

    # Calculate XP
    xp = total_interviews * 100 + total_solved * 20 + total_posts * 5 + streak * 10

    # Determine earned badges
    earned = []
    if total_interviews >= 1: earned.append("first_blood")
    if total_solved >= 10: earned.append("problem_solver_10")
    if total_solved >= 100: earned.append("century_100")
    if total_interviews >= 5: earned.append("marathon_5")
    if max_score >= 90: earned.append("perfectionist")
    if total_posts >= 5: earned.append("community_star")
    if streak >= 7: earned.append("streak_7")
    if len(topics_solved) >= 5: earned.append("diverse_solver")
    if sql_count >= 20: earned.append("sql_ace")
    if total_interviews >= 10: earned.append("interviewer_10")

    rank = get_rank(xp)
    badges = [
        {**b, "earned": b["id"] in earned}
        for b in BADGE_DEFS
    ]

    return {
        "xp": xp,
        "rank": rank,
        "streak": streak,
        "badges": badges,
        "stats": {
            "problems_solved": total_solved,
            "interviews_completed": total_interviews,
            "community_posts": total_posts,
            "topics_covered": len(topics_solved),
            "max_interview_score": max_score,
            "sql_queries": sql_count,
        }
    }

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
    category = request.query_params.get("category")
    difficulty = request.query_params.get("difficulty")
    page = int(request.query_params.get("page", 1))
    limit = int(request.query_params.get("limit", 50))
    query = {}
    if category and category != "all": query["category"] = category
    if difficulty and difficulty != "all": query["difficulty"] = difficulty
    total = await db.sql_problems.count_documents(query)
    problems = await db.sql_problems.find(query, {"_id": 0}).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"problems": problems, "total": total, "page": page, "total_pages": (total + limit - 1) // limit}

# ==================== SQL CHATBOT ====================
@api_router.post("/sql/chat")
async def sql_chat(data: ChatRequest, request: Request):
    user = await get_current_user(request)
    system = """You are DEV-Arena's SQL Mentor. Help users write and debug SQL queries.

Rules:
- Explain SQL concepts clearly with examples
- If user shares a query, analyze it for correctness and optimization
- Give hints first, full solutions only if asked
- Use markdown with SQL code blocks
- Reference the available tables: employees, departments, orders, logs
- Explain query execution order when relevant
- Point out common mistakes (GROUP BY missing, wrong JOIN type, etc.)"""
    if data.context:
        system += f"\n\nConversation:\n{data.context}"
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"sqlchat_{user['user_id']}_{uuid.uuid4().hex[:6]}",
                    system_message=system).with_model("anthropic", "claude-sonnet-4-5-20250929")
    response = await chat.send_message(UserMessage(text=data.message))
    return {"response": response}

# ==================== DSA ENHANCED DESCRIPTION ====================
@api_router.get("/problems/{problem_id}/description")
async def get_enhanced_description(problem_id: str, request: Request):
    await get_current_user(request)
    problem = await db.dsa_problems.find_one({"problem_id": problem_id}, {"_id": 0})
    if not problem: raise HTTPException(status_code=404, detail="Problem not found")
    cached = await db.enhanced_descriptions.find_one({"problem_id": problem_id}, {"_id": 0})
    if cached: return cached
    system = f"""Generate a detailed LeetCode-style problem description. Return ONLY valid JSON (no markdown wrapping).

Problem: {problem['title']}
Topic: {problem.get('topic','')}
Pattern: {problem.get('pattern','')}
Difficulty: {problem['difficulty']}
Short Description: {problem['description']}

CRITICAL: The JSON must be valid. Do NOT include markdown code blocks (```) inside JSON string values. Use plain text only in all string fields. Use single backticks for inline code like `nums`.

Return this exact JSON structure:
{{"problem_id": "{problem_id}", "description": "Full problem statement. Use plain text. For code formatting use single backticks only.", "examples": [{{"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]"}}], "constraints": ["1 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9"], "hints": ["Think about using a hash map", "Can you do it in one pass?"], "approach": "Use a hash map to store seen values and their indices", "time_complexity": "O(n)", "space_complexity": "O(n)"}}

Include 2-3 examples. NO triple backticks anywhere in the output."""
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"desc_{uuid.uuid4().hex[:8]}",
                    system_message=system).with_model("anthropic", "claude-sonnet-4-5-20250929")
    response = await chat.send_message(UserMessage(text="Generate now."))
    try:
        rt = response.strip()
        if "```json" in rt: rt = rt.split("```json")[1].split("```")[0].strip()
        elif "```" in rt: rt = rt.split("```")[1].split("```")[0].strip()
        # Clean any remaining triple backticks inside JSON strings
        import re
        rt = re.sub(r'```\w*\n', '', rt)
        rt = rt.replace('```', '')
        result = json.loads(rt)
        result["problem_id"] = problem_id
    except Exception as e:
        logger.error(f"Enhanced desc parse error: {e}. Raw first 300: {response[:300]}")
        # Try to extract what we can from the raw text
        result = {"problem_id": problem_id, "description": problem["description"], "examples": [], "constraints": [], "hints": [], "approach": "", "time_complexity": "", "space_complexity": ""}
    await db.enhanced_descriptions.update_one({"problem_id": problem_id}, {"$set": result}, upsert=True)
    return result

# ==================== DSA PATTERN VISUALIZER ====================
@api_router.get("/problems/{problem_id}/visualizer")
async def get_pattern_visualizer(problem_id: str, request: Request):
    await get_current_user(request)
    problem = await db.dsa_problems.find_one({"problem_id": problem_id}, {"_id": 0})
    if not problem: raise HTTPException(status_code=404, detail="Problem not found")
    cached = await db.pattern_visualizations.find_one({"problem_id": problem_id}, {"_id": 0})
    if cached: return cached
    system = f"""Generate a step-by-step visual trace of the algorithm for this problem. Return ONLY valid JSON.

Problem: {problem['title']}
Topic: {problem.get('topic','')}
Pattern: {problem.get('pattern','')}
Description: {problem['description']}

Return this exact JSON:
{{"problem_id": "{problem_id}", "pattern_name": "{problem.get('pattern','')}", "pattern_explanation": "<1-2 sentence explanation of the pattern>", "steps": [{{"step": 1, "title": "<short step title>", "description": "<what happens in this step>", "state": "<visual representation of data state, e.g. array with pointers>", "highlight": "<what changed>"}}], "key_insight": "<the core insight of this algorithm>", "when_to_use": ["<scenario1>", "<scenario2>"], "similar_problems": ["<problem1>", "<problem2>"]}}

Use a SIMPLE example input. Show 5-8 steps max. Make each step clear enough that a beginner can follow. Use arrows and pointers in the state field like: [2, 7, 11, 15] i=0, j=3 -> or left=0, right=7"""
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"viz_{uuid.uuid4().hex[:8]}",
                    system_message=system).with_model("anthropic", "claude-sonnet-4-5-20250929")
    response = await chat.send_message(UserMessage(text="Generate now."))
    try:
        rt = response.strip()
        if "```json" in rt: rt = rt.split("```json")[1].split("```")[0].strip()
        elif "```" in rt: rt = rt.split("```")[1].split("```")[0].strip()
        result = json.loads(rt)
        result["problem_id"] = problem_id
    except Exception:
        result = {"problem_id": problem_id, "pattern_name": problem.get("pattern",""), "steps": [], "key_insight": "", "when_to_use": [], "similar_problems": []}
    await db.pattern_visualizations.update_one({"problem_id": problem_id}, {"$set": result}, upsert=True)
    return result

@api_router.get("/sql/schema")
async def get_sql_schema():
    return {"tables": [
        {"name": "employees", "columns": ["id INT PK", "name TEXT", "email TEXT", "department TEXT", "salary REAL", "manager_id INT", "hire_date TEXT"]},
        {"name": "departments", "columns": ["dept_id INT PK", "department_name TEXT", "budget REAL", "location TEXT"]},
        {"name": "orders", "columns": ["order_id INT PK", "employee_id INT FK", "product TEXT", "amount REAL", "order_date TEXT"]},
        {"name": "logs", "columns": ["id INT PK", "num INT"]},
    ]}

# ==================== CUSTOM QUESTION VISUALIZER ====================
@api_router.post("/visualize/question")
async def visualize_custom_question(data: ChatRequest, request: Request):
    await get_current_user(request)
    system = """You are a DSA algorithm visualizer. Given a coding problem, generate a 3D-compatible visualization showing how the algorithm works step by step.

Return ONLY valid JSON. NO triple backticks inside strings. Use plain text only.

Return this structure:
{"data_structure": "array|linkedlist|binarytree|stack|graph", "title": "Algorithm Name", "data": [values as numbers], "steps": [{"step": 1, "title": "step title", "description": "what happens", "active_indices": [0,1], "state": "visual state text showing pointers and values", "highlight": "key observation"}], "explanation": "overall algorithm explanation", "complexity": {"time": "O(?)", "space": "O(?)"}}

Rules:
- Choose the most relevant data_structure for the problem
- data must be an array of numbers (for graph use node indices [0,1,2,...])
- active_indices shows which elements are currently being processed
- state should use ASCII art like: [2, 7, 11, 15] with i=0, j=3 pointing at elements
- Keep steps to 5-8 max
- Use a simple example input to demonstrate"""
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"cviz_{uuid.uuid4().hex[:8]}",
                    system_message=system).with_model("anthropic", "claude-sonnet-4-5-20250929")
    response = await chat.send_message(UserMessage(text=f"Visualize this problem:\n{data.message}"))
    try:
        rt = response.strip()
        if "```json" in rt: rt = rt.split("```json")[1].split("```")[0].strip()
        elif "```" in rt: rt = rt.split("```")[1].split("```")[0].strip()
        rt = re.sub(r'```\w*\n', '', rt)
        rt = rt.replace('```', '')
        result = json.loads(rt)
    except Exception as e:
        logger.error(f"Custom viz parse error: {e}")
        result = {"data_structure": "array", "title": "Visualization", "data": [1,2,3,4,5], "steps": [{"step": 1, "title": "Parse error", "description": response[:500], "active_indices": [], "state": "", "highlight": ""}], "explanation": response[:300], "complexity": {"time": "?", "space": "?"}}
    return result

# ==================== COMMUNITY ====================
@api_router.get("/community/posts")
async def list_community_posts(request: Request):
    user = await get_current_user(request)
    post_type = request.query_params.get("type", "all")
    page = int(request.query_params.get("page", 1))
    limit = int(request.query_params.get("limit", 20))
    sort = request.query_params.get("sort", "newest")
    query = {}
    if post_type and post_type != "all": query["type"] = post_type
    total = await db.community_posts.count_documents(query)
    sort_key = [("created_at", -1)] if sort == "newest" else [("likes_count", -1)]
    posts = await db.community_posts.find(query, {"_id": 0}).sort(sort_key).skip((page - 1) * limit).limit(limit).to_list(limit)
    # Attach user info
    for p in posts:
        u = await db.users.find_one({"user_id": p.get("user_id")}, {"_id": 0, "name": 1, "picture": 1})
        p["author"] = u or {"name": "Anonymous"}
        p["liked_by_me"] = user["user_id"] in p.get("likes", [])
    return {"posts": posts, "total": total, "page": page, "total_pages": (total + limit - 1) // limit}

@api_router.post("/community/posts")
async def create_community_post(data: CommunityPost, request: Request):
    user = await get_current_user(request)
    post = {
        "post_id": f"post_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "type": data.type,
        "company": data.company,
        "role": data.role,
        "title": data.title,
        "content": data.content,
        "rating": data.rating,
        "difficulty": data.difficulty,
        "result": data.result,
        "tags": data.tags or [],
        "likes": [],
        "likes_count": 0,
        "comments": [],
        "comments_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.community_posts.insert_one(post)
    del post["_id"]
    return post

@api_router.delete("/community/posts/{post_id}")
async def delete_community_post(post_id: str, request: Request):
    user = await get_current_user(request)
    post = await db.community_posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.get("user_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="You can only delete your own posts")
    await db.community_posts.delete_one({"post_id": post_id})
    return {"deleted": True}

@api_router.post("/community/posts/{post_id}/like")
async def toggle_like(post_id: str, request: Request):
    user = await get_current_user(request)
    post = await db.community_posts.find_one({"post_id": post_id})
    if not post: raise HTTPException(status_code=404, detail="Post not found")
    likes = post.get("likes", [])
    if user["user_id"] in likes:
        likes.remove(user["user_id"])
    else:
        likes.append(user["user_id"])
    await db.community_posts.update_one({"post_id": post_id}, {"$set": {"likes": likes, "likes_count": len(likes)}})
    return {"liked": user["user_id"] in likes, "likes_count": len(likes)}

@api_router.post("/community/posts/{post_id}/comment")
async def add_comment(post_id: str, data: CommentCreate, request: Request):
    user = await get_current_user(request)
    post = await db.community_posts.find_one({"post_id": post_id})
    if not post: raise HTTPException(status_code=404, detail="Post not found")
    comment = {
        "comment_id": f"cmt_{uuid.uuid4().hex[:8]}",
        "user_id": user["user_id"],
        "author_name": user.get("name", "Anonymous"),
        "content": data.content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.community_posts.update_one({"post_id": post_id}, {"$push": {"comments": comment}, "$inc": {"comments_count": 1}})
    return comment

@api_router.get("/community/stats")
async def community_stats(request: Request):
    await get_current_user(request)
    total = await db.community_posts.count_documents({})
    experiences = await db.community_posts.count_documents({"type": "experience"})
    reviews = await db.community_posts.count_documents({"type": "review"})
    pipeline = [{"$match": {"type": "review", "rating": {"$exists": True, "$ne": None}}}, {"$group": {"_id": None, "avg": {"$avg": "$rating"}}}]
    avg_result = await db.community_posts.aggregate(pipeline).to_list(1)
    avg_rating = round(avg_result[0]["avg"], 1) if avg_result else 0
    return {"total": total, "experiences": experiences, "reviews": reviews, "avg_rating": avg_rating}

# ==================== SEED ====================
async def seed_database():
    count = await db.dsa_problems.count_documents({})
    sql_count = await db.sql_problems.count_documents({})
    if count < 10000 or sql_count < 500:
        from seed_data import DSA_PROBLEMS, RESOURCES, SQL_PROBLEMS
        if count < 10000:
            await db.dsa_problems.delete_many({})
            if DSA_PROBLEMS:
                batch_size = 1000
                for i in range(0, len(DSA_PROBLEMS), batch_size):
                    await db.dsa_problems.insert_many(DSA_PROBLEMS[i:i+batch_size])
                logger.info(f"Seeded {len(DSA_PROBLEMS)} problems")
            await db.resources.delete_many({})
            if RESOURCES:
                await db.resources.insert_many(RESOURCES)
                logger.info(f"Seeded {len(RESOURCES)} resources")
        if sql_count < 500:
            await db.sql_problems.delete_many({})
            if SQL_PROBLEMS:
                await db.sql_problems.insert_many(SQL_PROBLEMS)
                logger.info(f"Seeded {len(SQL_PROBLEMS)} SQL problems")
        await db.dsa_problems.create_index("problem_id", unique=True)
        await db.dsa_problems.create_index("topic")
        await db.dsa_problems.create_index("pattern")
        await db.dsa_problems.create_index("difficulty")
        await db.sql_problems.create_index("sql_id", unique=True)
        await db.interviews.create_index("interview_id", unique=True)
        await db.interviews.create_index("user_id")
        await db.users.create_index("user_id", unique=True)
        await db.users.create_index("email", unique=True)
    else:
        logger.info(f"DB has {count} problems, {sql_count} SQL, skipping seed")

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

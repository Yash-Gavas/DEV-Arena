# DEV-Arena - Product Requirements Document

## Problem Statement
AI-powered technical interview platform with: real AI interviewer persona (Alex Chen), 15000+ DSA problems, LeetCode-style unified problem workspace with IDE + AI chatbot + test cases + pattern visualizer + step-by-step debugger, 580+ SQL playground with chatbot, 3D data structure visualizer, voice interview with auto-listen, proctored sessions with camera, user profiles, CS resources hub.

## Architecture
- Frontend: React 19 + Tailwind + Shadcn UI + Three.js (pure) + Monaco Editor
- Backend: FastAPI + MongoDB + aiosqlite
- AI: Claude Sonnet 4.5 via emergentintegrations
- Auth: Emergent Google OAuth + JWT sessions

## Core Features (Implemented)

### LeetCode-Style Problem Workspace (/problems/:id)
- [x] Enhanced LeetCode-style descriptions (examples, constraints, hints, approach, complexity)
- [x] AI-generated test cases per problem (cached in MongoDB)
- [x] Pattern Visualizer tab: pattern explanation, key insight, when to use, similar problems, algorithm steps with visual state
- [x] Step-by-Step Debugger tab: progress bar, prev/next navigation, step timeline, state visualization
- [x] 22 language Monaco editor
- [x] Problem-context-aware AI chatbot
- [x] LLM-powered code evaluation

### SQL Lab
- [x] 580 SQL problems across 14 categories
- [x] Category + difficulty filters with pagination
- [x] SQL Mentor AI chatbot
- [x] Live SQLite execution with results table
- [x] Schema reference sidebar

### AI Interview (4 Rounds)
- [x] R1: Introduction first, then DSA with split IDE
- [x] R2: Projects & Core Subjects
- [x] R3: Managerial & System Design
- [x] R4: HR Round
- [x] Brutally honest feedback (no sugarcoating wrong answers)
- [x] Voice auto-listen + AI speaking visualization
- [x] Camera proctoring + tab switch detection

### 3D Data Structure Visualizer
- [x] Pure Three.js (Array, LinkedList, BinaryTree, Stack, Graph)
- [x] Traverse animation, OrbitControls

### Other
- [x] 15,068 DSA problems with filters
- [x] Google OAuth + JWT auth
- [x] CS Resources hub
- [x] User profiles
- [x] DEV-Arena branding

## Prioritized Backlog
### P0
- Badges & Ranking system (XP, streaks, levels)
- 3D moving background components

### P1
- Enhanced face detection (MediaPipe)
- Downloadable code with README
- Problem bookmarking + solving history
- Company-specific interview tracks

### P2
- RAG for textbooks
- Collaborative mock interviews
- Mobile responsive improvements

## Key API Endpoints
- GET /api/problems/{id}/description — Enhanced LeetCode-style description
- GET /api/problems/{id}/visualizer — Pattern steps visualization
- GET /api/problems/{id}/testcases — AI-generated test cases
- POST /api/problems/{id}/chat — Problem chatbot
- POST /api/code/evaluate — LLM code evaluation
- GET /api/sql/problems — 580 SQL problems with filters
- POST /api/sql/chat — SQL Mentor chatbot
- POST /api/sql/execute — Execute SQL
- POST /api/interviews/start — Start interview
- POST /api/interviews/{id}/message — Send message

## DB Collections
users, user_sessions, dsa_problems, sql_problems, testcases, submissions, enhanced_descriptions, pattern_visualizations, interviews, interview_messages, reports, proctoring_events, resources

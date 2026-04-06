# DEV-Arena - Product Requirements Document

## Problem Statement
AI-powered technical interview platform with: real AI interviewer persona (Alex Chen), 15000+ DSA problems, LeetCode-style unified problem workspace with IDE + AI chatbot + test cases, SQL playground, 3D data structure visualizer, voice interview with auto-listen, proctored sessions with camera, user profiles, CS resources hub.

## Architecture
- Frontend: React 19 + Tailwind + Shadcn UI + Three.js (pure, no R3F) + Monaco Editor
- Backend: FastAPI + MongoDB + aiosqlite
- AI: Claude Sonnet 4.5 via emergentintegrations
- Auth: Emergent Google OAuth + JWT sessions

## Core Features (Implemented)

### Authentication
- [x] Google OAuth login via Emergent
- [x] JWT session management

### AI Interview System (4 Rounds)
- [x] R1: Introduction & DSA (AI introduces self, asks candidate intro, then coding)
- [x] R2: Projects & Core Subjects (OS, DBMS, CN, SQL)
- [x] R3: Managerial & System Design
- [x] R4: HR Round
- [x] Voice auto-listen (mic turns on after AI finishes speaking, auto-sends after pause)
- [x] AI speaking visualization (animated waveform bars + blue dot on avatar)
- [x] Split IDE panel during DSA round (chat left, Monaco editor right)
- [x] Camera proctoring (live video preview, face detection)
- [x] Tab switch detection with event logging
- [x] Interview reports with AI evaluation

### LeetCode-Style Problem Workspace
- [x] Unified `/problems/:id` route with resizable 3-panel layout
- [x] Left: Problem description, test cases (AI-generated + cached), results
- [x] Right Top: Monaco code editor with 22 language support
- [x] Right Bottom: Problem-context-aware AI chatbot for hints & debugging
- [x] LLM-powered code evaluation with test case results
- [x] Languages: Python, JavaScript, TypeScript, Java, C++, C, C#, Go, Rust, Ruby, PHP, Swift, Kotlin, Scala, R, Perl, Lua, Haskell, Dart, Elixir, Julia, MATLAB

### 3D Data Structure Visualizer
- [x] Pure Three.js implementation (vanilla, no R3F due to React 19.2 incompatibility)
- [x] Array, Linked List, Binary Tree, Stack, Graph visualizations
- [x] OrbitControls for rotate/zoom
- [x] Traverse animation highlighting elements sequentially
- [x] Text sprites using CanvasTexture

### Other Features
- [x] 15,068 DSA problems with filters (topic, difficulty, pattern, company, search)
- [x] SQL Playground with live SQLite execution
- [x] CS Resources hub (OS, DBMS, CN, System Design, OOPs, SQL)
- [x] User profiles with bio, college, target role
- [x] DEV-Arena branding (Emergent removed)
- [x] Updated Navbar: Dashboard, Interview, Problems, SQL Lab, 3D View, Resources

## Implementation Timeline

### April 6, 2026 - Phase 1 (MVP)
- Full-stack setup, 15k DSA seed, auth, basic pages

### April 6, 2026 - Phase 2 (LeetCode Workspace)
- Unified ProblemWorkspace, test cases endpoint, code evaluation, 22 languages
- All 18 tests passed

### April 6, 2026 - Phase 3 (Interview + Visualizer)
- Fixed 3D Visualizer (migrated to pure Three.js from R3F)
- Interview: intro-first flow, auto-listen voice, speaking visualization, split IDE, camera proctoring
- All 19 backend + full frontend tests passed

## Prioritized Backlog

### P0 (Next)
- Badges & Ranking system (XP, streaks, level-based badges on profile)
- 500+ SQL problems (currently 15)
- 3D moving background components on main pages

### P1
- Enhanced face detection (MediaPipe/face-api.js for multi-face/3rd person)
- Downloadable code with README for local setup
- Problem bookmarking and solving history/progress tracking
- Company-specific interview tracks

### P2
- RAG pipeline for textbook-based core subject questions
- Collaborative mock interviews
- Resume parser for JD matching
- Mobile responsive improvements

## Key API Endpoints
- Auth: POST /api/auth/session, GET /api/auth/me
- Problems: GET /api/problems, GET /api/problems/{id}, GET /api/problems/{id}/testcases
- Problem Chat: POST /api/problems/{id}/chat
- Code: POST /api/code/evaluate
- Interview: POST /api/interviews/start, POST /api/interviews/{id}/message, POST /api/interviews/{id}/next-round, POST /api/interviews/{id}/end
- SQL: POST /api/sql/execute, GET /api/sql/problems
- Proctoring: POST /api/proctoring/event
- Profile: GET/PUT /api/users/profile
- Resources: GET /api/resources

## DB Collections
users, user_sessions, dsa_problems, sql_problems, testcases, submissions, interviews, interview_messages, reports, proctoring_events, resources

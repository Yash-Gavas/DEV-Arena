# DEV-Arena - Product Requirements Document

## Problem Statement
AI-powered technical interview platform with: real AI interviewer persona, 15000+ DSA problems (topic/pattern/company wise), LeetCode-style unified problem workspace with IDE + AI chatbot + test cases, SQL playground, 3D data structure visualizer, voice interview, proctored sessions, user profiles with interview reports, CS resources hub.

## Architecture
- Frontend: React 19 + Tailwind + Shadcn UI + Three.js + Monaco Editor + react-resizable-panels
- Backend: FastAPI + MongoDB
- AI: Claude Sonnet 4.5 via emergentintegrations
- Auth: Emergent Google OAuth

## User Personas
1. **CS Students** - Preparing for campus placements
2. **Working Professionals** - Preparing for FAANG interviews
3. **Career Switchers** - Learning DSA from scratch

## Core Features (Implemented)
- [x] Google OAuth login
- [x] AI Interview (4 rounds: DSA, Projects, Core CS, System Design)
- [x] Voice interview (speech-to-text input, text-to-speech AI reading)
- [x] 15,068 DSA problems with topic/pattern/company/difficulty filters
- [x] **LeetCode-style ProblemWorkspace** (`/problems/:id`) - unified view with:
  - Split-pane layout: Description | Code Editor | AI Chatbot
  - 22 programming language support (Python, JS, TS, Java, C++, C, C#, Go, Rust, Ruby, PHP, Swift, Kotlin, Scala, R, Perl, Lua, Haskell, Dart, Elixir, Julia, MATLAB)
  - AI-generated test cases per problem (cached in DB)
  - LLM-powered code evaluation with test case results
  - Problem-context-aware AI chatbot for hints & debugging
- [x] SQL Playground with live SQLite execution
- [x] 3D Data Structure Visualizer (Array, LinkedList, Tree, Stack, Graph)
- [x] Tab switch proctoring
- [x] Interview reports with AI evaluation
- [x] User profiles with bio, college, target role
- [x] CS Resources hub (OS, DBMS, CN, System Design, OOPs, SQL)
- [x] Anti-repetition (questions never repeat per user)
- [x] DEV-Arena branding throughout

## What's Been Implemented

### April 6, 2026 (Phase 1 - MVP)
- Complete backend with 15+ API endpoints
- 15 frontend pages/components
- 15,068 DSA problems seeded
- 15 SQL practice problems
- 6 CS subject resources
- Voice controls (Web Speech API)
- Monaco code editor integration
- Three.js 3D visualizer

### April 6, 2026 (Phase 2 - LeetCode Workspace)
- Built unified ProblemWorkspace page replacing separate IDE and Chatbot pages
- Added `/api/problems/{id}/testcases` endpoint (LLM generates + caches test cases)
- Added `/api/problems/{id}/chat` endpoint (problem-context-aware chatbot)
- Enhanced `/api/code/evaluate` to use cached test cases for stricter evaluation
- 22 programming languages with Monaco editor templates
- Updated Navbar (removed IDE/Chatbot links, consolidated under Problems)
- Updated Dashboard quick actions
- All 18 tests passed (100% backend + frontend)

## Prioritized Backlog

### P0 (Next)
- Badges & Ranking system (user schema expansion, XP, streaks, profile badges)
- 3D moving components on frontend pages (React Three Fiber backgrounds)
- 500+ SQL problems (currently 15)

### P1
- Proctoring: Face detection via MediaPipe/face-api.js
- Downloadable code with README for local setup
- Company-specific interview tracks
- Problem bookmarking and progress tracking

### P2
- RAG pipeline for textbook-based core subject questions
- Collaborative mock interviews (peer-to-peer)
- Resume parser for JD matching
- More 3D data structure visualizations (Queue, Heap, Trie)
- Mobile responsive improvements

## Key API Endpoints
- `POST /api/auth/session` - Google OAuth session
- `GET /api/auth/me` - Current user
- `GET /api/problems` - List problems (filters, pagination)
- `GET /api/problems/{id}` - Single problem
- `GET /api/problems/{id}/testcases` - AI-generated test cases
- `POST /api/problems/{id}/chat` - Problem-specific AI chatbot
- `POST /api/code/evaluate` - LLM code evaluation
- `POST /api/interviews/start` - Start AI interview
- `POST /api/interviews/{id}/message` - Send interview message
- `POST /api/interviews/{id}/next-round` - Advance round
- `POST /api/interviews/{id}/end` - End + generate report
- `POST /api/sql/execute` - Execute SQL query
- `GET /api/sql/problems` - SQL problem list

## DB Collections
- `users` - user profiles
- `user_sessions` - auth sessions
- `dsa_problems` - 15k+ DSA problems
- `sql_problems` - SQL problems
- `testcases` - cached AI-generated test cases
- `submissions` - code submissions with results
- `interviews` - interview sessions
- `interview_messages` - conversation messages
- `reports` - interview evaluation reports
- `proctoring_events` - tab switch events
- `resources` - CS subject resources

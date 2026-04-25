# DEV-Arena - AI Interview Preparation Platform

## Product Overview
AI-powered interview preparation platform with 4-round mock interviews, 15,000+ DSA problems, 580 SQL questions, LeetCode-style IDE, 3D data structure visualization, badges/ranking, and community features.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI, Zustand, pure Three.js
- **Backend**: FastAPI, Motor (async MongoDB), aiosqlite
- **AI**: Claude Sonnet 4.5 via Emergent LLM Key
- **Auth**: Emergent-managed Google OAuth

## Core Features

### Implemented (All Working)
1. **AI Interview (4 Rounds)** - Proctored with camera, voice auto-listen, and split IDE
   - Round 1: Intro + DSA coding questions with IDE
   - Round 2: Projects, Core Subjects + SQL queries with IDE
   - Round 3: Managerial + System Design
   - Round 4: HR Round
   - **BRUTALLY HONEST** feedback - interviewer gives direct, critical assessment at each round transition and in final report
2. **ProblemWorkspace** - LeetCode-style unified IDE with problem description, multi-language editor (20+ languages), AI chatbot, pattern visualizer, step-by-step debugger
3. **SQL Playground** - 580 SQL problems with live query execution against sample DB, SQL chatbot
4. **3D Data Structure Visualizer** - Pure Three.js (NO React-Three-Fiber!)
   - Custom user input for Array, Linked List, Binary Tree, Stack, Graph
   - Direction arrows with cone arrowheads
   - HEAD/NULL/ROOT/L/R/next labels, PUSH/POP indicators
   - AI-powered question visualization
5. **Community Page** - Post experiences & reviews, like, comment, delete own posts
6. **Badges & Ranking System** - XP, streaks, 10 badges, 6 rank tiers (Novice→Grandmaster)
7. **Dashboard** - XP/rank display, earned badges preview, recent interviews
8. **Profile** - Full badges grid, XP progress bar, rank card, edit bio/college/target role

### DB Seeded
- 15,000+ DSA problems (topics, patterns, companies)
- 580 SQL problems (categories, difficulties)

## Architecture
```
/app/
├── backend/
│   ├── server.py          # FastAPI - all endpoints
│   ├── seed_data.py       # 15k DSA + 580 SQL seed
│   ├── tests/             # pytest test files
│   └── .env
├── frontend/
│   ├── src/pages/
│   │   ├── AIInterview.jsx
│   │   ├── ProblemWorkspace.jsx
│   │   ├── SQLPlayground.jsx
│   │   ├── DSAVisualizer.jsx    # Pure Three.js
│   │   ├── Community.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Profile.jsx
│   │   ├── DSAProblems.jsx
│   │   ├── InterviewReport.jsx
│   │   ├── Resources.jsx
│   │   └── LandingPage.jsx
│   └── package.json
└── memory/
    ├── PRD.md
    └── test_credentials.md
```

## API Endpoints
- Auth: POST /api/auth/session, GET /api/auth/me, POST /api/auth/logout
- Problems: GET /api/problems, GET /api/problems/{id}, GET /api/problems/{id}/description, GET /api/problems/{id}/testcases, POST /api/problems/{id}/chat
- Interview: POST /api/interviews/start, POST /api/interviews/{id}/message, POST /api/interviews/{id}/next-round, POST /api/interviews/{id}/end
- Reports: GET /api/reports, GET /api/reports/{id}
- Profile: GET /api/profile, PUT /api/profile, GET /api/profile/stats
- SQL: POST /api/sql/execute, GET /api/sql/problems, POST /api/sql/chat, GET /api/sql/schema
- Community: GET /api/community/posts, POST /api/community/posts, DELETE /api/community/posts/{id}, POST /api/community/posts/{id}/like, POST /api/community/posts/{id}/comment, GET /api/community/stats
- Code: POST /api/code/evaluate
- Visualize: POST /api/visualize/question

## Remaining Backlog
- **P1: 3D Moving Background Components** - Add subtle 3D animated backgrounds to Dashboard/Landing pages using pure Three.js
- **P2: Downloadable Code & README** - Create comprehensive README for local Docker/MongoDB setup
- **P3: RAG for Textbooks** - RAG pipeline for core subject interview questions using PDFs

## Critical Notes
- DO NOT USE React-Three-Fiber (crashes with React 19)
- server.py is ~1040 lines - consider modularizing in future
- All 3D must use pure three.js

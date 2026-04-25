# DEV-Arena - AI Interview Preparation Platform

## Product Overview
AI-powered interview preparation platform with 4-round mock interviews, 15,000+ DSA problems, 580 SQL questions, LeetCode-style IDE, 3D data structure visualization, badges/ranking, community, and curated CS resources.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI, Zustand, pure Three.js
- **Backend**: FastAPI, Motor (async MongoDB), aiosqlite
- **AI**: Claude Sonnet 4.5 via Emergent LLM Key
- **Auth**: Emergent-managed Google OAuth

## Core Features (All Working)

1. **AI Interview (4 Rounds)** - Proctored with camera, voice auto-listen, split IDE
   - Round 1: Intro + DSA coding (IDE visible)
   - Round 2: Projects, Core Subjects + SQL queries (IDE visible)
   - Round 3: Managerial + System Design
   - Round 4: HR Round
   - BRUTALLY HONEST feedback at each round transition
   - Round-wise structured report (grouped by actual round_number)

2. **ProblemWorkspace** - LeetCode-style unified IDE
   - Multi-language editor (22 languages), AI chatbot, pattern visualizer, debugger
   - **Time Complexity Comparison Graph** - visual bar chart comparing O(1) to O(n!)

3. **SQL Playground** - 580 SQL problems, live query execution, SQL chatbot

4. **3D Data Structure Visualizer** - Pure Three.js
   - Custom user input for Array, Linked List, Binary Tree, Stack, Graph
   - Direction arrows with cone arrowheads, HEAD/NULL/ROOT/L/R labels

5. **Community Page** - Post experiences & reviews, like, comment, delete own posts

6. **Badges & Ranking** - 10 badges, 6 rank tiers (Novice->Grandmaster), XP, streaks

7. **Dashboard** - XP/rank/streak display, earned badges, 3D grid background

8. **3D Moving Backgrounds** - Pure Three.js animated backgrounds
   - Landing page: Particle network with connecting lines
   - Dashboard: Floating grid
   - Features section: Node network

9. **Resources** - Curated best resources per subject (6 subjects)
   - OS, DBMS, CN, System Design, OOP, SQL Practice
   - Books, videos, articles, interactive tools, practice platforms

## API Endpoints
- Auth: /api/auth/session, /api/auth/me, /api/auth/logout
- Problems: /api/problems, /api/problems/{id}, /api/problems/{id}/description, /api/problems/{id}/testcases, /api/problems/{id}/chat
- Interview: /api/interviews/start, /api/interviews/{id}/message, /api/interviews/{id}/next-round, /api/interviews/{id}/end
- Reports: /api/reports, /api/reports/{id}
- Profile: /api/profile, PUT /api/profile, /api/profile/stats (badges/ranking)
- SQL: /api/sql/execute, /api/sql/problems, /api/sql/chat, /api/sql/schema
- Community: CRUD /api/community/posts, like, comment, stats
- Code: /api/code/evaluate
- Visualize: /api/visualize/question
- Resources: /api/resources (with curated best_resources)

## Remaining Backlog
- **P1: Downloadable Code & README** - Docker/local setup guide
- **P2: RAG for Textbooks** - RAG pipeline for core subjects using PDFs

## Critical Notes
- DO NOT USE React-Three-Fiber (crashes with React 19)
- server.py is ~1136 lines - modularization recommended
- Problem IDs use format prob_NNNNN

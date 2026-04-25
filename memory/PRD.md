# DEV-Arena - AI Interview Preparation Platform

## Product Overview
AI-powered interview preparation platform with 4-round mock interviews, 15,000+ DSA problems, 580 SQL questions, LeetCode-style IDE, 3D data structure visualization (9 types), badges/ranking, leaderboard, community, and curated resources.

## Tech Stack
- Frontend: React 19, Tailwind CSS, Shadcn UI, Zustand, pure Three.js, Monaco Editor
- Backend: FastAPI, Motor (async MongoDB), aiosqlite
- AI: Claude Sonnet 4.5 via Emergent LLM Key
- Auth: Emergent-managed Google OAuth

## Implemented Features (All Working)

1. **AI Interview (4 Rounds)** - Proctored, voice auto-listen, split IDE, brutally honest feedback
2. **ProblemWorkspace** - LeetCode-style IDE, 22 languages, AI chatbot, pattern visualizer, debugger, **LeetCode-style complexity curve chart**
3. **SQL Playground** - 580 problems, live query, SQL chatbot
4. **3D Visualizer** - 9 data structures: Array, Linked List, Binary Tree, Queue, Stack, Heap, Trie, Hash Map, Graph (custom user input + direction arrows)
5. **Community** - Post experiences/reviews, like, comment, delete own posts
6. **Badges & Ranking** - 10 badges, 6 rank tiers, XP, streaks
7. **Leaderboard** - Compare DSA ranking with other candidates (XP, solved, scores)
8. **3D Backgrounds** - Particles (landing), grid (dashboard), nodes (features)
9. **Resources** - Curated best resources per 6 CS subjects
10. **Dashboard** - XP/rank/streak, earned badges, recent interviews
11. **README** - Docker Compose + manual setup guide

## Remaining Backlog
- RAG for Textbooks (core subject PDFs)
- server.py modularization (~1171 lines)

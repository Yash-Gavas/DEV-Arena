# DEV-Arena - Product Requirements Document

## Problem Statement
AI-powered technical interview platform with: real AI interviewer persona, 15000+ DSA problems (topic/pattern/company wise), code IDE with AI evaluation, SQL playground, DSA chatbot mentor, 3D data structure visualizer, voice interview, proctored sessions, user profiles with interview reports, CS resources hub.

## Architecture
- Frontend: React 19 + Tailwind + Shadcn UI + Three.js + Monaco Editor
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
- [x] Code IDE with Monaco editor + AI evaluation
- [x] SQL Playground with live SQLite execution
- [x] DSA Chatbot Mentor (AI-powered)
- [x] 3D Data Structure Visualizer (Array, LinkedList, Tree, Stack, Graph)
- [x] Tab switch proctoring
- [x] Interview reports with AI evaluation
- [x] User profiles with bio, college, target role
- [x] CS Resources hub (OS, DBMS, CN, System Design, OOPs, SQL)
- [x] Anti-repetition (questions never repeat per user)
- [x] DEV-Arena branding throughout

## What's Been Implemented (April 6, 2026)
- Complete backend with 15+ API endpoints
- 15 frontend pages/components
- 15,068 DSA problems seeded
- 15 SQL practice problems
- 6 CS subject resources
- Voice controls (Web Speech API)
- Monaco code editor integration
- Three.js 3D visualizer

## Prioritized Backlog
### P0 (Next)
- RAG PDF upload for textbook-based questions
- Face detection proctoring (MediaPipe)
- Whisper detection for anti-cheating

### P1
- Leaderboard and streak/XP system
- Company-specific interview tracks
- Problem bookmarking and progress tracking
- More 3D data structure visualizations (Queue, Heap, Trie)

### P2
- Collaborative mock interviews (peer-to-peer)
- Resume parser for JD matching
- Code execution sandbox (Judge0)
- Mobile responsive improvements

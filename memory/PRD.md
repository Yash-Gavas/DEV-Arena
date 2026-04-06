# DEV-Arena - Product Requirements Document

## Problem Statement
AI-powered technical interview platform with: real AI interviewer, 15000+ DSA problems, LeetCode-style workspace with IDE + chatbot + test cases + pattern visualizer + debugger, 580+ SQL lab with chatbot, 3D visualizer with custom question input, voice interview with auto-listen, camera proctoring.

## Architecture
- Frontend: React 19 + Tailwind + Shadcn UI + Three.js (pure) + Monaco Editor
- Backend: FastAPI + MongoDB + aiosqlite
- AI: Claude Sonnet 4.5 via emergentintegrations
- Auth: Emergent Google OAuth + JWT sessions

## Core Features (All Implemented)

### AI Interview (4 Rounds)
- R1: Intro first, then DSA with split IDE
- R2: Projects & Core CS
- R3: Managerial & System Design
- R4: HR Round
- Brutally honest feedback
- Voice: auto-listen after AI speaks, live transcript banner, auto-send after 3s silence
- Camera: live video preview with proper ref timing
- Tab switch proctoring

### LeetCode-Style Problem Workspace (/problems/:id)
- Enhanced descriptions (examples, constraints, hints, approach, complexity)
- AI-generated test cases (cached)
- Pattern Visualizer tab (pattern name, insight, when-to-use, algorithm steps)
- Step-by-Step Debugger tab (progress bar, prev/next, step timeline)
- 22 language Monaco editor
- Problem-context AI chatbot
- LLM code evaluation

### SQL Lab
- 580 SQL problems, 14 categories
- Category + difficulty filters with pagination
- SQL Mentor AI chatbot
- Live SQLite execution

### 3D Data Structure Visualizer
- Pure Three.js: Array, LinkedList, BinaryTree, Stack, Graph
- Custom question input: paste any question, AI generates visualization with steps
- Traverse animation, OrbitControls

### Other
- 15,068 DSA problems with filters
- Google OAuth + JWT auth
- CS Resources hub
- User profiles
- DEV-Arena branding

## Prioritized Backlog
### P0
- Badges & Ranking system
- 3D moving background components

### P1
- Enhanced face detection (MediaPipe)
- Downloadable code with README
- Problem bookmarking + history

### P2
- RAG for textbooks
- Collaborative mock interviews
- Mobile responsive

## DB Collections
users, user_sessions, dsa_problems, sql_problems, testcases, submissions, enhanced_descriptions, pattern_visualizations, interviews, interview_messages, reports, proctoring_events, resources

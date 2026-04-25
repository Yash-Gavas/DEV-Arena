# DEV-Arena

### AI-Powered Technical Interview Preparation Platform

A full-stack web application that simulates real technical interviews using AI, provides 15,000+ DSA problems with a LeetCode-style IDE, 580 SQL challenges, interactive 3D data structure visualizations, a gamified badge & ranking system, community forums, and curated CS study resources.

---

## Table of Contents

- [Features Overview](#features-overview)
- [Tech Stack](#tech-stack)
- [Project Architecture](#project-architecture)
- [Frontend Pages & Components](#frontend-pages--components)
- [Backend API Reference](#backend-api-reference)
- [Database Schema](#database-schema)
- [Problem Bank](#problem-bank)
- [AI Integration](#ai-integration)
- [Badges & Ranking System](#badges--ranking-system)
- [3D Visualizer — Supported Data Structures](#3d-visualizer--supported-data-structures)
- [Curated Resources](#curated-resources)
- [Setup & Installation](#setup--installation)
  - [Docker Compose (Recommended)](#docker-compose-recommended)
  - [Manual Setup](#manual-setup)
- [Environment Variables](#environment-variables)
- [Screenshots](#screenshots)

---

## Features Overview

| # | Feature | Description |
|---|---------|-------------|
| 1 | **AI Mock Interview (4 Rounds)** | Proctored AI interviewer "Alex Chen" conducts 4 rounds: Intro & DSA, Projects & Core Subjects + SQL, Managerial & System Design, HR. Voice input with auto-listen, camera proctoring, tab-switch detection. Brutally honest feedback. |
| 2 | **LeetCode-Style Problem Workspace** | Split-pane IDE with problem description, 22 programming languages, AI-generated test cases, pattern visualizer, step-by-step debugger, contextual AI chatbot, and a LeetCode-style time complexity curve chart. |
| 3 | **SQL Playground** | 580 SQL problems across 10 categories. Live query execution against an in-memory SQLite database with `employees`, `departments`, `orders`, and `logs` tables. Dedicated SQL AI chatbot. |
| 4 | **3D Data Structure Visualizer** | Pure Three.js interactive 3D visualization for 9 data structures. Custom user input, direction arrows with cone arrowheads, labeled pointers (HEAD, NULL, ROOT, FRONT, REAR, TOP, etc.). AI-powered question-to-visualization. |
| 5 | **Badges & Ranking** | XP-based progression with 10 earnable badges and 6 rank tiers (Novice through Grandmaster). XP earned from interviews, problems solved, community posts, and activity streaks. |
| 6 | **Leaderboard** | Global ranking comparing all users by XP, problems solved, interview scores, and rank tier. Personal position card with stats. |
| 7 | **Community** | Share interview experiences and platform reviews. Like, comment, and delete your own posts. Filterable by type (experience/review), sortable by newest or most liked. |
| 8 | **Dashboard** | Personal command center showing XP, rank, streak, earned badges, quick action buttons, and recent interview history. Animated 3D floating grid background. |
| 9 | **Profile** | Full badge showcase grid, XP progress bar to next rank, edit bio/college/target role, interview history with scores. |
| 10 | **Curated CS Resources** | Hand-picked best books, video courses, articles, and practice platforms for 6 CS subjects. Color-coded resource type badges. |
| 11 | **3D Animated Backgrounds** | Pure Three.js animated backgrounds — particle network (Landing page), floating grid (Dashboard), node network (Features section). |
| 12 | **Interview Reports** | AI-generated evaluation grouped by round. Per-round scores, strengths, improvements, hire recommendation. Proctoring violation penalties. Unconducted rounds shown as N/A. |
| 13 | **Proctoring** | Camera feed with live preview. Tab-switch detection logged as violations. Violations deduct points from final report. |

---

## Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 19 | UI framework |
| Tailwind CSS | Utility-first styling |
| Shadcn/UI (Radix) | Component library (buttons, tabs, cards, dialogs, selects, progress bars, resizable panels) |
| Three.js | 3D data structure visualizations and animated backgrounds (pure JS, no React-Three-Fiber) |
| Monaco Editor | Code editor (same engine as VS Code) — 22 language support |
| React Router v7 | Client-side routing |
| Axios | HTTP client |
| React Markdown | Markdown rendering for AI responses |
| Zustand | Lightweight state management (auth context) |
| Lucide React | Icon library |
| Sonner | Toast notifications |
| react-resizable-panels | Split-pane layout for Problem Workspace |

### Backend
| Technology | Purpose |
|-----------|---------|
| FastAPI | Python async web framework |
| Motor | Async MongoDB driver |
| aiosqlite | In-memory SQLite for SQL Playground |
| Pydantic v2 | Request/response validation |
| emergentintegrations | AI LLM integration (Claude Sonnet 4.5) |
| httpx | Async HTTP client for OAuth |
| uvicorn | ASGI server |

### Database
| Technology | Purpose |
|-----------|---------|
| MongoDB | Primary database for users, problems, interviews, reports, community posts, submissions |
| SQLite (in-memory) | SQL Playground query execution sandbox |

### AI
| Model | Usage |
|-------|-------|
| Claude Sonnet 4.5 (Anthropic) | AI Interviewer personality, interview report generation, DSA chatbot, SQL chatbot, problem description enhancement, test case generation, pattern visualization, code evaluation |

### Authentication
| Provider | Method |
|----------|--------|
| Emergent-managed Google OAuth | Social login with Google account |

---

## Project Architecture

```
dev-arena/
|
+-- backend/
|   +-- server.py              # FastAPI application — all API endpoints
|   +-- seed_data.py           # 15,068 DSA problems + 580 SQL problems + 6 resource subjects
|   +-- requirements.txt       # Python dependencies (pip freeze)
|   +-- .env                   # Backend environment variables
|   +-- tests/                 # pytest test files (iteration 7-10)
|
+-- frontend/
|   +-- public/
|   +-- src/
|   |   +-- App.js             # React Router — all routes
|   |   +-- App.css            # Global styles + animations
|   |   +-- context/
|   |   |   +-- AuthContext.jsx # Auth state (login, logout, user, session)
|   |   +-- components/
|   |   |   +-- Navbar.jsx         # Main navigation bar (9 items + profile + logout)
|   |   |   +-- ProtectedRoute.jsx # Auth guard wrapper
|   |   |   +-- ThreeBackground.jsx# Reusable 3D animated backgrounds (3 variants)
|   |   |   +-- VoiceControls.jsx  # Speech recognition helpers
|   |   |   +-- ui/               # Shadcn UI components (30+ components)
|   |   +-- pages/
|   |   |   +-- LandingPage.jsx       # Public landing with 3D particle background
|   |   |   +-- AuthCallback.jsx      # Google OAuth callback handler
|   |   |   +-- Dashboard.jsx         # User dashboard (XP, rank, badges, interviews)
|   |   |   +-- AIInterview.jsx       # 4-round AI interview (voice, camera, IDE)
|   |   |   +-- InterviewReport.jsx   # Round-wise report with scores & feedback
|   |   |   +-- DSAProblems.jsx       # Problem listing (filters, search, pagination)
|   |   |   +-- ProblemWorkspace.jsx  # LeetCode-style IDE (editor, chatbot, visualizer, debugger, complexity graph)
|   |   |   +-- SQLPlayground.jsx     # SQL problem solver with live query execution
|   |   |   +-- DSAVisualizer.jsx     # 3D interactive visualizer (9 data structures)
|   |   |   +-- Community.jsx         # Community posts (experiences, reviews, likes, comments, delete)
|   |   |   +-- Leaderboard.jsx       # Global user ranking table
|   |   |   +-- Profile.jsx           # User profile (badges grid, XP bar, edit info)
|   |   |   +-- Resources.jsx         # Curated CS resources per subject
|   +-- package.json
|   +-- tailwind.config.js
|   +-- .env                   # Frontend environment variables
|
+-- docker-compose.yml         # Docker orchestration
+-- README.md                  # This file
+-- memory/
    +-- PRD.md                 # Product requirements document
    +-- test_credentials.md    # Test account credentials
```

---

## Frontend Pages & Components

### Pages (13 routes)

| Route | Page Component | Auth Required | Description |
|-------|---------------|:---:|-------------|
| `/` | `LandingPage` | No | Hero section with 3D particle background, feature cards with node network background, CTA |
| `/dashboard` | `Dashboard` | Yes | Welcome, XP/rank/streak stats, earned badges, quick actions, recent interviews. 3D grid background. |
| `/interview` | `AIInterview` | Yes | Interview setup — enter target role + optional JD. Starts 4-round AI interview. |
| `/interview/:id` | `AIInterview` | Yes | Active interview — chat with AI, voice input, camera proctoring, split IDE for DSA/SQL rounds. |
| `/reports/:id` | `InterviewReport` | Yes | Round-wise evaluation report with scores, strengths, improvements, recommendation. |
| `/problems` | `DSAProblems` | Yes | Problem bank — filter by topic (18), pattern (28), difficulty, company (30+). Search. Pagination. |
| `/problems/:id` | `ProblemWorkspace` | Yes | LeetCode-style split view: Description/Tests/Pattern/Debugger/Results tabs + Code Editor + AI Chatbot + Complexity Curve Chart. |
| `/sql` | `SQLPlayground` | Yes | SQL problem browser + live query editor + results table + schema reference + SQL chatbot. |
| `/visualizer` | `DSAVisualizer` | Yes | 9 DS type selector, custom data input, 3D Three.js canvas, AI question visualization, step-by-step animation. |
| `/community` | `Community` | Yes | Post/view interview experiences & reviews. Like, comment, delete own posts. Filter by type, sort by newest/popular. |
| `/leaderboard` | `Leaderboard` | Yes | Global ranking table (position, name, rank, XP, problems solved, interviews, best score). Personal rank card. |
| `/profile` | `Profile` | Yes | Avatar, rank card, XP progress bar, 10-badge grid (earned/locked), edit bio/college/target role, interview history. |
| `/resources` | `Resources` | Yes | 6-subject tabbed view. Each subject has curated "Best Resources" (books, videos, articles, practice sites) + Key Topics with concept tags. |

### Shared Components

| Component | File | Description |
|-----------|------|-------------|
| `Navbar` | `Navbar.jsx` | Fixed top nav. 9 items: Dashboard, Interview, Problems, SQL Lab, 3D View, Community, Ranks, Resources. Profile avatar + logout. Mobile hamburger menu. |
| `ProtectedRoute` | `ProtectedRoute.jsx` | Redirects to `/` if not authenticated. |
| `ThreeBackground` | `ThreeBackground.jsx` | Reusable Three.js animated background with 3 variants: `particles` (connected dots), `grid` (floating cubes), `nodes` (moving spheres with dynamic edges). |
| `ui/` | 30+ Shadcn components | button, card, badge, tabs, select, textarea, input, progress, resizable, dialog, toast (sonner), etc. |

---

## Backend API Reference

All endpoints are prefixed with `/api`.

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/session` | Exchange Google OAuth session_id for app session cookie |
| GET | `/auth/me` | Get current authenticated user |
| POST | `/auth/logout` | Clear session cookie |

### DSA Problems
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/problems` | List problems. Query: `topic`, `pattern`, `difficulty`, `company`, `search`, `page`, `limit` |
| GET | `/problems/meta` | Get all distinct topics, patterns, companies, difficulties |
| GET | `/problems/{id}` | Get single problem |
| GET | `/problems/{id}/description` | AI-enhanced LeetCode-style description (cached) |
| GET | `/problems/{id}/testcases` | AI-generated test cases (cached) |
| POST | `/problems/{id}/chat` | Contextual AI chatbot for the specific problem |
| GET | `/problems/{id}/visualizer` | AI-generated pattern visualization with steps (cached) |
| POST | `/code/evaluate` | AI code evaluation: pass/fail, score, complexity, feedback |

### AI Interview
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/interviews/start` | Start new 4-round interview. Body: `{ role, jd }` |
| POST | `/interviews/{id}/message` | Send candidate message, get AI response |
| POST | `/interviews/{id}/next-round` | Advance to next round (with honest previous-round assessment) |
| POST | `/interviews/{id}/end` | End interview, generate round-grouped AI report |
| GET | `/interviews` | List user's interviews |
| GET | `/interviews/{id}` | Get interview with all messages |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports` | List user's interview reports |
| GET | `/reports/{id}` | Get detailed report (per-round scores, feedback, recommendation) |

### Profile & Badges
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | Get current user profile |
| PUT | `/profile` | Update bio, college, target_role, name |
| GET | `/profile/stats` | Full stats: XP, rank, streak, 10 badges (earned/locked), solve counts |

### Leaderboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/leaderboard` | Global ranking: all users sorted by XP with position, rank, scores |

### SQL Playground
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sql/execute` | Execute SELECT query against in-memory SQLite. Returns columns + rows. |
| GET | `/sql/problems` | List SQL problems. Query: `category`, `difficulty`, `page`, `limit` |
| POST | `/sql/chat` | SQL AI chatbot |
| GET | `/sql/schema` | Get table schemas (employees, departments, orders, logs) |

### Community
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/community/posts` | List posts. Query: `type`, `page`, `limit`, `sort` |
| POST | `/community/posts` | Create post (experience or review) |
| DELETE | `/community/posts/{id}` | Delete own post (403 if not author) |
| POST | `/community/posts/{id}/like` | Toggle like |
| POST | `/community/posts/{id}/comment` | Add comment |
| GET | `/community/stats` | Community statistics (total, experiences, reviews, avg rating) |

### Proctoring
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/proctoring/event` | Log proctoring violation (tab_switch, etc.) |

### Resources
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/resources` | List all subjects with curated best resources |
| GET | `/resources/{slug}` | Get single subject with resources |

### Visualization
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/visualize/question` | AI-powered: turn a DSA question into a 3D visualization config |
| POST | `/chatbot` | General DSA AI chatbot |

---

## Database Schema

### MongoDB Collections

| Collection | Key Fields | Description |
|-----------|-----------|-------------|
| `users` | user_id, email, name, picture, bio, college, target_role, interviews_completed, problems_solved, created_at | User profiles |
| `user_sessions` | user_id, session_token, expires_at | Authentication sessions |
| `dsa_problems` | problem_id, title, description, difficulty, topic, pattern, companies[] | 15,068 DSA problems |
| `sql_problems` | sql_id, title, description, difficulty, category, hint, solution | 580 SQL problems |
| `interviews` | interview_id, user_id, role, jd, current_round, status, report_id | Interview sessions |
| `interview_messages` | message_id, interview_id, round_number, role, content, timestamp | Interview chat messages |
| `reports` | report_id, interview_id, user_id, overall_score, rounds[], strengths[], improvements[], recommendation, detailed_feedback | Interview evaluation reports |
| `submissions` | submission_id, user_id, problem_id, code, language, result{passed, score, feedback}, timestamp | Code submissions |
| `community_posts` | post_id, user_id, type, title, content, company, role, rating, difficulty, result, tags[], likes[], comments[], likes_count, comments_count | Community posts |
| `proctoring_events` | event_id, interview_id, user_id, event_type, details, timestamp | Proctoring violations |
| `testcases` | problem_id, testcases[] | AI-generated test cases (cached) |
| `enhanced_descriptions` | problem_id, description, examples[], constraints[], hints[], approach, time_complexity, space_complexity | Enhanced problem descriptions (cached) |
| `pattern_visualizations` | problem_id, pattern_name, steps[], key_insight, when_to_use[], similar_problems[] | Pattern visualizations (cached) |
| `resources` | subject_slug, subject, icon, color, topics[], interview_tips | CS subject resources |

### SQLite Tables (In-Memory — SQL Playground)

| Table | Columns | Rows |
|-------|---------|------|
| `employees` | id, name, email, department, salary, manager_id, hire_date | 15 |
| `departments` | dept_id, department_name, budget, location | 4 |
| `orders` | order_id, employee_id, product, amount, order_date | 10 |
| `logs` | id, num | 8 |

---

## Problem Bank

### DSA Problems — 15,068 total

**18 Topics:** Arrays, Backtracking, Binary Search, Bit Manipulation, Design, Dynamic Programming, Graphs, Greedy, Hash Maps, Heaps, Linked Lists, Math, Queues, Recursion, Sorting, Stacks, Strings, Trees

**28 Patterns:** BFS/DFS, Backtracking, Binary Search, Bitwise XOR, Cyclic Sort, Design, Divide and Conquer, Dynamic Programming, Fast & Slow Pointers, Greedy, Hash Map, In-place Reversal, K-way Merge, Matrix, Merge Intervals, Monotonic Stack, Prefix Sum, Sliding Window, Sorting, Stack, Subsets, Top K Elements, Topological Sort, Tree BFS, Tree DFS, Two Heaps, Two Pointers, Union Find

**3 Difficulty Levels:** Easy, Medium, Hard

**30+ Companies:** Adobe, Airbnb, Amazon, Apple, Bloomberg, ByteDance, Cisco, Databricks, DoorDash, Goldman Sachs, Google, Intel, LinkedIn, Lyft, Meta, Microsoft, Netflix, Nvidia, Oracle, PayPal, Pinterest, Salesforce, Samsung, Snap, Spotify, Stripe, Tesla, TikTok, Twitter/X, Uber, VMware, Yahoo

### SQL Problems — 580 total

**10 Categories:** Basic SELECT, WHERE Clause, Aggregate Functions, GROUP BY, HAVING, JOINs, Subqueries, Window Functions, NULL Handling, Advanced

**3 Difficulty Levels:** Easy, Medium, Hard

---

## AI Integration

All AI features use **Claude Sonnet 4.5** via the Emergent Universal LLM Key.

| Feature | How AI is Used |
|---------|----------------|
| AI Interviewer | Maintains interview personality "Alex Chen" with round-specific system prompts. Brutally honest feedback. Tracks previously asked questions to avoid repetition. |
| Report Generation | Conversations grouped by round_number. AI evaluates each round independently. Unconducted rounds marked as N/A. |
| Problem Descriptions | Generates LeetCode-style enhanced descriptions with examples, constraints, hints, approach, and complexity analysis. Cached in DB. |
| Test Case Generation | Creates 3 test cases per problem (simple, medium, edge case). Cached. |
| Code Evaluation | AI traces through submitted code against test cases. Returns pass/fail, score, complexity, detailed feedback, suggestions. |
| Pattern Visualization | Generates step-by-step algorithm trace with data state at each step. |
| DSA Chatbot | Context-aware chatbot per problem. Includes user's current code. Gives hints before full solutions. |
| SQL Chatbot | References available tables. Explains query execution, GROUP BY, JOINs, etc. |
| Question Visualization | Turns a pasted DSA question into a 3D-compatible visualization configuration. |

---

## Badges & Ranking System

### XP Formula
```
XP = (interviews_completed * 100) + (problems_solved * 20) + (community_posts * 5) + (streak_days * 10)
```

### 6 Rank Tiers

| Rank | XP Threshold | Color |
|------|-------------|-------|
| Novice | 0 | Gray |
| Apprentice | 100 | Green |
| Warrior | 500 | Blue |
| Expert | 1,500 | Purple |
| Master | 5,000 | Gold |
| Grandmaster | 15,000 | Red |

### 10 Badges

| Badge | Requirement | Icon |
|-------|------------|------|
| First Blood | Complete 1 interview | Zap |
| Problem Solver | Solve 10 DSA problems | Code |
| Century | Solve 100 DSA problems | Award |
| Marathon Runner | Complete 5 interviews | Brain |
| Perfectionist | Score 90+ on an interview | Star |
| Community Star | Create 5 community posts | Users |
| Streak Master | 7-day activity streak | Flame |
| DSA Explorer | Solve problems from 5+ topics | Compass |
| SQL Ace | Execute 20 SQL queries | Database |
| Interview Veteran | Complete 10 interviews | Shield |

---

## 3D Visualizer — Supported Data Structures

All visualizations use **pure Three.js** (not React-Three-Fiber) for React 19 compatibility.

| # | Data Structure | Input Format | Visual Features |
|---|---------------|-------------|-----------------|
| 1 | **Array** | `5, 3, 8, 1, 9` | 3D boxes with values and `[i]` indices. Direction arrows between elements. |
| 2 | **Linked List** | `1 -> 2 -> 3 -> 4` | Sphere nodes with "next" labeled arrows. HEAD pointer. NULL terminator. |
| 3 | **Binary Tree** | `10, 5, 15, 3, 7, null, 20` | Level-order tree with ROOT label. "L" and "R" edge labels. Arrow-tipped edges. |
| 4 | **Queue** | `10, 20, 30, 40, 50` | Horizontal boxes with FRONT/REAR pointers. ENQUEUE (green) and DEQUEUE (red) direction arrows. |
| 5 | **Stack** | `10, 20, 30, 40, 50` | Vertical boxes. TOP pointer arrow. PUSH (green down) and POP (red up) arrows. |
| 6 | **Heap (Min)** | `1, 3, 6, 5, 9, 8` | Complete binary tree. MIN root label. Parent-to-child arrows. |
| 7 | **Trie** | `cat, car, card, bat` | Prefix tree from words. Green `*` markers for word-ending nodes. Root node labeled "root". |
| 8 | **Hash Map** | `a:1, b:2, c:3` | Bucket array `[0]..[n]` with arrows to key:value nodes. "hash(key) % size" label. |
| 9 | **Graph** | `A-B, B-C, C-D, A-C` | Circular layout. Directed cone-tipped arrows between nodes. |

**Extra**: Paste any DSA question in the "AI Visualize" box and the AI generates a matching visualization with step-by-step algorithm animation.

---

## Curated Resources

Each of the 6 CS subjects includes 5-6 hand-picked resources:

| Subject | Resource Highlights |
|---------|-------------------|
| **Operating Systems** | OSTEP (free textbook), Neso Academy (60+ lectures), Gate Smashers, GeeksforGeeks OS, Javatpoint OS Tutorial |
| **DBMS** | CMU Database Systems Course (Andy Pavlo), Silberschatz textbook, Neso Academy DBMS, SQLBolt (interactive), Mode SQL Tutorial |
| **Computer Networks** | Kurose & Ross (Top-Down Approach + free lectures), Neso Academy CN, Ben Eater networking, Cloudflare Learning Center |
| **System Design** | System Design Primer (180k+ GitHub stars), DDIA (Kleppmann), ByteByteGo (Alex Xu), Gaurav Sen playlist, High Scalability blog |
| **OOP** | Head First Design Patterns, Refactoring Guru (visual patterns), Derek Banas patterns, SOLID Principles guide |
| **SQL Practice** | LeetCode SQL (200+ problems), HackerRank SQL, SQLZoo, W3Schools SQL, Use The Index Luke, StrataScratch (FAANG questions) |

---

## Setup & Installation

### Docker Compose (Recommended)

#### Prerequisites
- Docker Engine 20+
- Docker Compose v2+
- An Emergent LLM API Key (get one at [emergentagent.com](https://emergentagent.com) > Profile > Universal Key)

#### 1. Clone
```bash
git clone <your-repo-url>
cd dev-arena
```

#### 2. Configure environment

**`backend/.env`**
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=dev_arena
EMERGENT_LLM_KEY=your_emergent_llm_key_here
CORS_ORIGINS=http://localhost:3000
```

**`frontend/.env`**
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

#### 3. Create Docker files

**`docker-compose.yml`** (project root)
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh --quiet
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8001:8001"
    depends_on:
      mongodb:
        condition: service_healthy
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=dev_arena
      - EMERGENT_LLM_KEY=${EMERGENT_LLM_KEY}
      - CORS_ORIGINS=http://localhost:3000

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      - backend
    environment:
      - REACT_APP_BACKEND_URL=http://localhost:8001

volumes:
  mongo_data:
```

**`backend/Dockerfile`**
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
COPY . .

EXPOSE 8001
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

**`frontend/Dockerfile`**
```dockerfile
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN REACT_APP_BACKEND_URL=http://localhost:8001 yarn build

FROM node:20-alpine
RUN yarn global add serve
COPY --from=build /app/build /app/build

EXPOSE 3000
CMD ["serve", "-s", "/app/build", "-l", "3000"]
```

#### 4. Launch
```bash
# Set the LLM key for docker-compose
export EMERGENT_LLM_KEY=your_key_here

docker-compose up --build
```

#### 5. Access
| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8001/api |
| Swagger Docs | http://localhost:8001/docs |
| MongoDB | mongodb://localhost:27017 |

On first startup the backend auto-seeds 15,068 DSA problems, 580 SQL problems, and 6 resource subjects. This takes ~10 seconds.

---

### Manual Setup

#### Backend
```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate          # Windows

# Install dependencies
pip install -r requirements.txt
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

# Configure environment
cp .env.example .env
# Edit .env with your MONGO_URL, DB_NAME, EMERGENT_LLM_KEY

# Start MongoDB (if running locally)
mongod --dbpath /data/db &

# Run server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

#### Frontend
```bash
cd frontend

# Install dependencies
yarn install

# Configure environment
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env

# Run dev server
yarn start
```

The frontend opens at http://localhost:3000. Hot reload is enabled for both frontend and backend.

---

## Environment Variables

| Variable | Required | Location | Description |
|----------|:--------:|----------|-------------|
| `MONGO_URL` | Yes | backend/.env | MongoDB connection string. e.g., `mongodb://localhost:27017` or MongoDB Atlas URI |
| `DB_NAME` | Yes | backend/.env | Database name. Default: `dev_arena` |
| `EMERGENT_LLM_KEY` | Yes | backend/.env | Emergent Universal LLM Key for Claude Sonnet 4.5. Get from Profile > Universal Key on Emergent. |
| `CORS_ORIGINS` | No | backend/.env | Comma-separated allowed origins. Default: `*` |
| `REACT_APP_BACKEND_URL` | Yes | frontend/.env | Backend API base URL. e.g., `http://localhost:8001` |

---

## Interview Rounds Detail

| Round | Name | What is Tested | IDE Shown |
|:-----:|------|---------------|:---------:|
| 1 | Introduction & DSA | Self-introduction, then 2-3 algorithm/data structure coding problems with input/output examples. Complexity analysis. | Yes |
| 2 | Projects & Core Subjects + SQL | Project deep-dive, OS/DBMS/CN fundamentals, 1-2 SQL query questions with table scenarios. | Yes |
| 3 | Managerial & System Design | STAR-format behavioral questions, then design a real system (URL shortener, chat, etc.) | No |
| 4 | HR Round | Career goals, company fit, salary expectations, strengths/weaknesses. | No |

The AI interviewer (Alex Chen) is configured to be **brutally honest** — wrong answers are called out directly, and each round transition includes an honest assessment of the previous round's performance.

---

## Proctoring Mechanisms

| Mechanism | Implementation |
|-----------|---------------|
| Camera Feed | `getUserMedia` video stream displayed in floating PiP overlay. |
| Tab Switch Detection | `visibilitychange` event listener. Each switch logged to `/api/proctoring/event`. |
| Violation Penalty | Each proctoring violation deducts 5 points (max -30) from the final interview score. |
| Live Indicators | Green "Proctored" badge, red violation counter in interview header. |

---

## Programming Languages (Code Editor)

The Monaco Editor in ProblemWorkspace supports 22 languages:

Python, JavaScript, TypeScript, Java, C++, C, C#, Go, Rust, Ruby, PHP, Swift, Kotlin, Scala, R, Perl, Lua, Haskell, Dart, Elixir, Julia, MATLAB

---

## License

MIT

# DEV-Arena - AI Interview Preparation Platform

> AI-powered technical interview platform with 4-round mock interviews, 15,000+ DSA problems, 580 SQL questions, 3D visualizers, badges, and community features.

## Quick Start (Docker)

### Prerequisites
- Docker & Docker Compose
- A MongoDB instance (local or Atlas)
- Emergent LLM API Key (for AI features)

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd dev-arena
```

### 2. Set up environment variables

**Backend** (`backend/.env`):
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=dev_arena
EMERGENT_LLM_KEY=your_emergent_llm_key_here
CORS_ORIGINS=http://localhost:3000
```

**Frontend** (`frontend/.env`):
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 3. Run with Docker Compose

Create a `docker-compose.yml` in the project root:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8001:8001"
    depends_on:
      - mongodb
    env_file:
      - ./backend/.env
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=dev_arena

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      - backend
    env_file:
      - ./frontend/.env

volumes:
  mongo_data:
```

Create `backend/Dockerfile`:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
COPY . .
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

Create `frontend/Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build
RUN yarn global add serve
CMD ["serve", "-s", "build", "-l", "3000"]
```

### 4. Start everything
```bash
docker-compose up --build
```

The app will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001/api

## Manual Setup (Without Docker)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

# Set environment variables
export MONGO_URL=mongodb://localhost:27017
export DB_NAME=dev_arena
export EMERGENT_LLM_KEY=your_key_here

# Run
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend
```bash
cd frontend
yarn install
export REACT_APP_BACKEND_URL=http://localhost:8001
yarn start
```

## Features

| Feature | Description |
|---------|-------------|
| AI Interview | 4-round proctored mock interviews with voice input |
| Problem IDE | LeetCode-style workspace with 22 languages |
| SQL Playground | 580 SQL problems with live query execution |
| 3D Visualizer | Interactive 3D visualization for 9 data structures |
| Badges & Ranks | XP system with 10 badges and 6 rank tiers |
| Community | Share interview experiences and platform reviews |
| Leaderboard | Compare your DSA ranking with other users |
| Resources | Curated best study materials per CS subject |

## Tech Stack

- **Frontend**: React 19, Tailwind CSS, Shadcn UI, Three.js, Monaco Editor
- **Backend**: FastAPI, Motor (async MongoDB), aiosqlite
- **AI**: Claude Sonnet 4.5 (via Emergent LLM Key)
- **Auth**: Google OAuth (via Emergent)
- **Database**: MongoDB

## Database

The application auto-seeds on first startup:
- 15,000+ DSA problems (20 topics, 15 patterns, 50+ companies)
- 580 SQL problems (8 categories)
- CS resource materials (6 subjects)

## API Documentation

Once running, visit `http://localhost:8001/docs` for the interactive Swagger UI.

## Environment Variables

| Variable | Location | Description |
|----------|----------|-------------|
| `MONGO_URL` | backend/.env | MongoDB connection string |
| `DB_NAME` | backend/.env | Database name |
| `EMERGENT_LLM_KEY` | backend/.env | Emergent Universal LLM Key |
| `CORS_ORIGINS` | backend/.env | Allowed CORS origins |
| `REACT_APP_BACKEND_URL` | frontend/.env | Backend API URL |

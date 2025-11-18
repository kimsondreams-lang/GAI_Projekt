# GAI: Generative Autonomous Intelligence

A production-ready autonomous AI system: chat with memory, task queue, self-improvement via code generation in sandbox, SEO writer, affiliate validation, FTP publisher, analytics, and a modern web panel. Deployable to Railway.

## 🚀 Features
- **FastAPI backend** with Basic Auth (password via ENV)
- **Celery worker** with autonomous wake cycle (configurable in UI)
- **PostgreSQL + pgvector** ready schema (simple SQL migrations for MVP)
- **Redis** for task queue
- **Next.js + Tailwind** modern frontend with real-time updates
- **WebSocket support** for live chat and notifications
- **Advanced analytics** with interactive charts and metrics
- **Publications manager** with SEO optimization and content preview
- **Task management** with real-time status monitoring
- **Settings panel** with secure API key management
- **Sandbox-ready structure** for self-improvement (code generation + tests before deploy)
- **FTP publisher** with atomic deploy and sitemap updates
- **Dynamic model routing** (OpenAI, Anthropic, DeepSeek) with per-task selection
- **Advanced tools**: SEO Analyzer, Content Generator, ASIN Manager, Analytics Tracker

## Environment variables (Railway)
Set these for services (no secrets in code):
- GAI_PANEL_PASSWORD (e.g., claUDE098!)
- NEXT_PUBLIC_GAI_PANEL_PASSWORD (same as above for the web)
- DATABASE_URL (Postgres, e.g., postgres://user:pass@host:port/db)
- REDIS_URL (e.g., redis://host:port/0)
- FTP_HOST, FTP_USER, FTP_PASS
- FTP_BASE_DIR (e.g., public_html/kimsondreams/data/articles)
- OPENAI_API_KEY (optional)
- ANTHROPIC_API_KEY (optional)
- DEEPSEEK_API_KEY (optional)
- WAKE_CYCLE_MIN (default 5)
- COST_BUDGET_USD_PER_CYCLE (default 5)
- REQUIRE_APPROVAL_FOR_NEW_CATEGORIES (default false)
- BACKEND_URL (for web service to reach backend; set to backend public URL)

## Deploy to Railway (CLI)
1. railway login
2. railway init
3. Create three services (link each to its Dockerfile):
   - Backend: apps/backend (deploy/Dockerfile.backend)
   - Worker: apps/worker (deploy/Dockerfile.worker)
   - Web: apps/web (deploy/Dockerfile.web)
4. Add Postgres and Redis plugins
5. Set ENV per service (see above)
6. railway up

## Local development (docker-compose)
- docker-compose up --build
- Web UI: http://localhost:3000 (Basic Auth; password via NEXT_PUBLIC_GAI_PANEL_PASSWORD)
- Backend: http://localhost:8000
- Celery worker + beat run automatically

## 🌐 Modern Frontend Dashboard

The system now includes a **state-of-the-art Next.js dashboard** with:

### ✨ Key Features
- **Real-time WebSocket chat** with typing indicators and message history
- **Interactive analytics** with charts, graphs, and performance metrics
- **Advanced task management** with real-time status updates and filtering
- **Publication manager** with SEO optimization and content preview
- **Settings panel** with secure API key management
- **Agent control center** with start/stop/restart functionality
- **Responsive design** that works on desktop, tablet, and mobile

### 🎨 Modern UI/UX
- **Glassmorphism design** with backdrop blur and gradients
- **Smooth animations** and micro-interactions
- **Dark mode support** (automatic based on system preference)
- **Professional color scheme** with blue/purple gradients
- **Modern typography** and spacing system

### 📊 Analytics Dashboard
- **Interactive charts** using Recharts library
- **Real-time metrics** for page views, revenue, engagement
- **Traffic source analysis** with pie charts
- **Geographic data** visualization
- **Content performance** tracking
- **Time range selection** (1d, 7d, 30d, 90d)

### 🚀 Real-time Features
- **WebSocket integration** for live updates
- **Typing indicators** in chat
- **Live status monitoring** for agent and tasks
- **Auto-refresh** with configurable intervals
- **Connection status** indicators

## 🛠️ Deployment

### Railway Deployment
```bash
railway login
railway init
# Create three services:
# 1. Backend: apps/backend (deploy/Dockerfile.backend)
# 2. Worker: apps/worker (deploy/Dockerfile.worker)  
# 3. Web: apps/web (deploy/Dockerfile.web)
# Add Postgres and Redis plugins
# Set environment variables
railway up
```

### Szybki deploy przez GitHub (zalecane)
- W Railway włącz GitHub Integration dla repozytorium.
- Ustaw `Root Directory` na `GAI_Projekt` (to jest główny katalog projektu).
- Start Command: `python main.py` (zgodnie z `GAI_Projekt/railway.json`).
- Healthcheck: `GET /health` z timeout `30s`.
- Zmienna ENV: ustaw tylko `GAI_PANEL_PASSWORD` na silne hasło (DB/Redis nie są wymagane na start — healthcheck pokaże `skipped`).
- Po deployu sprawdź zdrowie: `curl https://<twoj-url>.railway.app/health` — oczekiwane `{"status":"healthy","services":{"database":"skipped","redis":"skipped"}}`.

### Ważne: GitHub Integration (Root Directory)
- Ustaw `Root Directory` na `GAI_Projekt` (główny katalog projektu w repo).
- Railway wykorzysta `railway.json` z buildpackiem Python, a backend uruchomi `python main.py`.
- Jeśli widzisz błąd typu "Railpack could not determine how to build the app", zwykle oznacza zły root — popraw na `GAI_Projekt`.

### Local Development
```bash
# Backend + Worker
docker-compose up --build

# Frontend (separate terminal)
cd apps/web && npm install && npm run dev

# Access:
# Web UI: http://localhost:3000
# Backend API: http://localhost:8000
```

## 📋 Environment Variables

### Required
- `GAI_PANEL_PASSWORD` - Basic auth password
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection

### Optional AI Providers
- `OPENAI_API_KEY` - For GPT models
- `ANTHROPIC_API_KEY` - For Claude models  
- `DEEPSEEK_API_KEY` - For DeepSeek models

### FTP Publishing
- `FTP_HOST`, `FTP_USER`, `FTP_PASS`
- `FTP_BASE_DIR` - Target directory for articles

### System Configuration
- `WAKE_CYCLE_MIN` - Agent wake cycle (default: 5)
- `COST_BUDGET_USD_PER_CYCLE` - Budget limit (default: 5)
- `BACKEND_URL` - Backend URL for frontend

## 🎯 Next Steps

1. **Set up API keys** for AI providers
2. **Configure FTP settings** for publishing
3. **Customize wake cycles** and budget limits
4. **Add your content** and start publishing
5. **Monitor analytics** and optimize performance

## 📈 System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js Web   │◄──►│   FastAPI API   │◄──►│  PostgreSQL   │
│   Dashboard     │    │   Backend       │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  WebSocket API  │    │   Celery Worker │    │  Redis Queue    │
│  Real-time Chat │    │  Task Execution │    │  Task Storage   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📝 Notes
- Model calls are stubbed for MVP to run without keys. Once keys are set, implement provider calls in packages/models/invoke.py.
- ASIN insertion currently uses a valid-format placeholder to keep pipeline functional; integrate a real ASIN discovery.
- Publisher deploys atomically to FTP and can update sitemap if integrated.
- Frontend includes demo data when backend is not available - it will automatically connect when backend is running.

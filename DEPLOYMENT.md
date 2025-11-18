# 🚀 GAI Agent - Complete Deployment Guide

This guide provides comprehensive instructions for deploying the GAI Agent system to production environments, including Railway, Docker, and manual deployment options.

## 📋 Prerequisites

Before starting the deployment, ensure you have:

### Required Software
- **Docker** and **Docker Compose** (for containerized deployment)
- **Node.js** 20+ and **npm** (for frontend development)
- **Python** 3.11+ (for local development)
- **Git** (for version control)

### Railway CLI (for Railway deployment)
```bash
npm install -g @railway/cli
railway login
```

### Optional Tools
- **PostgreSQL** client tools
- **Redis** client tools
- **curl** (for health checks)

## 🔧 Environment Configuration

### 1. Copy Environment Template
```bash
cp .env.example .env
```

### 2. Required Environment Variables

#### Security & Authentication
```bash
GAI_PANEL_PASSWORD=your_secure_password_here
NEXT_PUBLIC_GAI_PANEL_PASSWORD=your_secure_password_here
SECRET_KEY=your_super_secret_key_here_min_32_chars
```

#### Database Configuration
```bash
# Railway will provide these automatically
DATABASE_URL=postgres://user:password@host:port/database

# For local development
POSTGRES_USER=gai
POSTGRES_PASSWORD=your_secure_db_password
POSTGRES_DB=gai_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```

#### Redis Configuration
```bash
# Railway will provide these automatically
REDIS_URL=redis://host:port/database

# For local development
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### AI Model Providers (Optional)
```bash
OPENAI_API_KEY=sk-your_openai_api_key_here
ANTHROPIC_API_KEY=sk-ant-your_anthropic_api_key_here
DEEPSEEK_API_KEY=sk-your_deepseek_api_key_here
```

#### FTP Publishing (Optional)
```bash
FTP_HOST=your_ftp_host_here
FTP_USER=your_ftp_username_here
FTP_PASS=your_ftp_password_here
FTP_BASE_DIR=/public_html/content
```

## 🚂 Railway Deployment (Recommended)

### Quick Start
```bash
# Clone the repository
git clone https://github.com/your-username/GAI_Projekt.git
cd GAI_Projekt

# Run the automated deployment script
./scripts/deploy-production.sh
```

### Manual Railway Deployment

#### 1. Initialize Railway Project
```bash
railway init --name "gai-agent" --description "Generative Autonomous Intelligence System"
```

#### 2. Add PostgreSQL Database
```bash
railway add --plugin postgresql
```

#### 3. Add Redis Cache
```bash
railway add --plugin redis
```

#### 4. Deploy Backend Service
```bash
# Add backend service
railway add --service "gai-backend" --dockerfile "deploy/Dockerfile.backend"

# Set environment variables
railway variables set --service "gai-backend" \
    GAI_PANEL_PASSWORD="your_secure_password_here" \
    ENVIRONMENT="production" \
    LOG_LEVEL="INFO"
```

#### 5. Deploy Worker Service
```bash
# Add worker service
railway add --service "gai-worker" --dockerfile "deploy/Dockerfile.worker"

# Set environment variables
railway variables set --service "gai-worker" \
    WAKE_CYCLE_MIN="5" \
    COST_BUDGET_USD_PER_CYCLE="5.0" \
    ENVIRONMENT="production"
```

#### 6. Deploy Web Service
```bash
# Add web service
railway add --service "gai-web" --dockerfile "deploy/Dockerfile.web"

# Set environment variables
railway variables set --service "gai-web" \
    NODE_ENV="production" \
    NEXT_PUBLIC_GAI_PANEL_PASSWORD="your_secure_password_here"
```

#### 7. Configure Service Connections
```bash
# Get backend URL
BACKEND_URL=$(railway status --json | jq -r '.services[] | select(.name == "gai-backend") | .domain')

# Update web service with backend URL
railway variables set --service "gai-web" \
    BACKEND_URL="https://$BACKEND_URL" \
    WS_URL="wss://$BACKEND_URL"

# Update worker service
railway variables set --service "gai-worker" \
    BACKEND_URL="https://$BACKEND_URL"
```

#### 8. Deploy All Services
```bash
railway up
```

### GitHub Integration (3 Services) — Quick Setup

Zalecana, szybka konfiguracja przez GitHub dla trzech usług w monorepo. Użyj gotowych plików `railway.json` w `apps/backend`, `apps/web`, `apps/worker` oraz prostego buildpacka Python w root.

1) Backend (FastAPI)
- Root Directory: `GAI_Projekt` (lub `apps/backend` jeśli używasz Dockerfile)
- Build:
  - Buildpack Python: root `railway.json` (Python 3.11)
  - Alternatywnie: `apps/backend/Dockerfile`
- Start Command:
  - Buildpack: `python main.py`
  - Dockerfile: z `apps/backend/railway.json` — `python -m uvicorn main:app --host 0.0.0.0 --port $PORT --workers 2`
- Healthcheck: `GET /health`, timeout `30s`
- Minimalne ENV: `GAI_PANEL_PASSWORD`

2) Frontend (Next.js Dashboard)
- Root Directory: `apps/web`
- Build: `Dockerfile` (w `apps/web/Dockerfile`)
- Start Command: `npm start` (z `apps/web/railway.json`)
- Healthcheck: `GET /api/system/status`, timeout `30s`
- Minimalne ENV:
  - `NEXT_PUBLIC_GAI_PANEL_PASSWORD`
  - `BACKEND_URL` (URL backendu, np. `https://<backend-domain>`)

3) Worker (Celery)
- Root Directory: `apps/worker`
- Build: `Dockerfile` (w `apps/worker/Dockerfile`)
- Start Command: `python -m celery -A celery_app.celery worker --loglevel=INFO --concurrency=2`
- Healthcheck: brak endpointu HTTP (monitoruj status w logach)
- Minimalne ENV:
  - `REDIS_URL` (broker kolejki)
  - `DATABASE_URL` (jeśli worker zapisuje do DB)
  - `BACKEND_URL` (jeśli worker komunikuje się z API backendu)

Checklisty ENV per usługa
- Backend:
  - `GAI_PANEL_PASSWORD`
  - `DATABASE_URL` (Railway Postgres)
  - `REDIS_URL` (Railway Redis)
  - Opcjonalne: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY`
- Frontend:
  - `NEXT_PUBLIC_GAI_PANEL_PASSWORD`
  - `BACKEND_URL` (np. `https://gai-agent-backend.up.railway.app`)
- Worker:
  - `REDIS_URL`
  - `DATABASE_URL`
  - `BACKEND_URL`
  - Opcjonalne: klucze modeli

Szybkie kroki w Railway przez GitHub:
- Podłącz repo w Railway → GitHub Integration.
- Utwórz 3 serwisy:
  - `Backend` (Root `GAI_Projekt` lub `apps/backend`), ustaw Healthcheck i ENV.
  - `Frontend` (Root `apps/web`), ustaw `BACKEND_URL` i `NEXT_PUBLIC_GAI_PANEL_PASSWORD`.
  - `Worker` (Root `apps/worker`), ustaw `REDIS_URL`, `DATABASE_URL`, `BACKEND_URL`.
- Uruchom deploy, po rolloucie sprawdź:
  - `Backend`: `GET /health` zwraca `{"status":"ok"}`.
  - `Frontend`: `GET /api/system/status` zwraca statusy (`agent`, `tasks`, `system`).
  - `Worker`: logi zawierają `celery@... ready` i brak błędów połączeń do Redis/DB.

## 🐳 Docker Deployment

### Quick Start with Docker Compose
```bash
# Clone the repository
git clone https://github.com/your-username/GAI_Projekt.git
cd GAI_Projekt

# Run the local development setup
./scripts/dev-local.sh
```

### Manual Docker Deployment

#### 1. Build and Start Services
```bash
# Build all services
docker-compose -f deploy/docker-compose.yml build

# Start all services
docker-compose -f deploy/docker-compose.yml up -d

# Check service status
docker-compose -f deploy/docker-compose.yml ps
```

#### 2. Initialize Database
```bash
# Run database initialization
./scripts/migrate-database.sh init
```

#### 3. Check Service Health
```bash
# Backend health check
curl http://localhost:8000/health

# Frontend health check
curl http://localhost:3000
```

#### 4. View Logs
```bash
# View all logs
docker-compose -f deploy/docker-compose.yml logs -f

# View specific service logs
docker-compose -f deploy/docker-compose.yml logs -f backend
docker-compose -f deploy/docker-compose.yml logs -f worker
docker-compose -f deploy/docker-compose.yml logs -f web
```

#### 5. Stop Services
```bash
# Stop all services
docker-compose -f deploy/docker-compose.yml down

# Stop and remove volumes
docker-compose -f deploy/docker-compose.yml down -v
```

## 🔧 Manual Deployment

### Backend Deployment

#### 1. Set Up Python Environment
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
cd apps/backend
pip install -r requirements.txt
```

#### 2. Configure Environment
```bash
# Copy environment template
cp ../../.env.example .env
# Edit .env with your configuration
```

#### 3. Run Database Migrations
```bash
# Initialize database
python -c "from main import init_db; init_db()"
```

#### 4. Start Backend Server
```bash
# Development server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Production server
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Worker Deployment

#### 1. Set Up Python Environment
```bash
# Use the same virtual environment as backend
cd apps/worker
source ../../venv/bin/activate  # On Windows: ..\..\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

#### 2. Start Worker
```bash
# Start Celery worker and beat
celery -A celery_app.celery worker --loglevel=INFO &
celery -A celery_app.celery beat --loglevel=INFO &
```

### Frontend Deployment

#### 1. Set Up Node.js Environment
```bash
cd apps/web

# Install dependencies
npm install
```

#### 2. Configure Environment
```bash
# Create environment file
cp .env.local.example .env.local
# Edit .env.local with your configuration
```

#### 3. Build Frontend
```bash
# Development build
npm run dev

# Production build
npm run build
npm start
```

## 🧪 Testing Deployment

### Health Checks
```bash
# Backend health check
curl -f http://localhost:8000/health

# Frontend health check
curl -f http://localhost:3000/api/health

# Database connection test
curl -f http://localhost:8000/api/analytics/summary
```

### API Testing
```bash
# Test backend API
curl -X POST http://localhost:8000/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, GAI Agent!"}'

# Test task creation
curl -X POST http://localhost:8000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task",
    "description": "Test task description",
    "type": "content_generation",
    "priority": "medium"
  }'
```

### WebSocket Testing
```bash
# Test WebSocket connection (using websocat or similar)
echo '{"type": "message", "content": "Hello"}' | websocat ws://localhost:3000/api/ws/chat
```

## 🔒 Security Configuration

### Production Security Checklist
- [ ] Change default passwords
- [ ] Enable HTTPS/TLS
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Set up backup strategies
- [ ] Enable audit logging

### Environment Variables Security
- [ ] Never commit `.env` files to version control
- [ ] Use secrets management systems (Railway, Docker secrets, etc.)
- [ ] Rotate API keys regularly
- [ ] Use strong, unique passwords
- [ ] Enable 2FA where possible

## 📊 Monitoring & Maintenance

### Health Monitoring
```bash
# Check service health
curl -f http://your-domain.com/health

# Check database connectivity
curl -f http://your-domain.com/api/analytics/summary

# Monitor logs
tail -f /var/log/gai-agent/*.log
```

### Performance Monitoring
- Set up application monitoring (APM)
- Monitor database performance
- Track API response times
- Monitor memory and CPU usage
- Set up alerting for critical issues

### Backup Strategy
```bash
# Database backup
./scripts/migrate-database.sh backup

# Application backup
# Include: source code, uploads, logs, configuration
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check database status
docker-compose -f deploy/docker-compose.yml logs postgres

# Test connection
psql $DATABASE_URL -c "SELECT version();"
```

#### 2. Redis Connection Issues
```bash
# Check Redis status
docker-compose -f deploy/docker-compose.yml logs redis

# Test connection
redis-cli -u $REDIS_URL ping
```

#### 3. Backend Startup Issues
```bash
# Check backend logs
docker-compose -f deploy/docker-compose.yml logs backend

# Test backend health
curl -v http://localhost:8000/health
```

#### 4. Frontend Build Issues
```bash
# Check frontend logs
docker-compose -f deploy/docker-compose.yml logs web

# Rebuild frontend
cd apps/web && npm run build
```

#### 5. Worker Issues
```bash
# Check worker logs
docker-compose -f deploy/docker-compose.yml logs worker

# Test Celery
cd apps/worker && celery -A celery_app.celery inspect active
```

### Getting Help
- Check the [GitHub Issues](https://github.com/your-username/GAI_Projekt/issues)
- Review application logs
- Check system requirements
- Verify environment configuration

## 🎯 Next Steps

After successful deployment:

1. **Configure AI Providers**
   - Add your OpenAI, Anthropic, or DeepSeek API keys
   - Test model connectivity

2. **Set Up Publishing**
   - Configure FTP credentials
   - Test content publishing

3. **Customize Settings**
   - Adjust wake cycle intervals
   - Configure budget limits
   - Set up analytics tracking

4. **Monitor Performance**
   - Set up monitoring dashboards
   - Configure alerting
   - Review performance metrics

5. **Scale as Needed**
   - Add more workers
   - Configure load balancing
   - Set up CDN for static assets

## 📞 Support

For deployment support:
- Create an issue on GitHub
- Check the documentation
- Review logs and error messages
- Verify environment configuration

---

**🎉 Congratulations! Your GAI Agent system is now deployed and ready to use!**

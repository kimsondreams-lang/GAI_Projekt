import os
import asyncio
import redis
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.responses import JSONResponse
from sqlalchemy import text
from routers import chat, tasks, publications, settings, analytics
from packages.core_agent import start_agent, stop_agent, get_agent
from packages.memory.store import MemoryStore

app = FastAPI(title="GAI Backend - Autonomous Agent AI")
security = HTTPBasic()

# Globalna instancja agenta
agent_instance = None

async def get_agent_instance():
    """Pobierz instancję agenta"""
    global agent_instance
    if agent_instance is None:
        agent_instance = await start_agent()
    return agent_instance

def require_auth(credentials: HTTPBasicCredentials = Depends(security)):
    pwd = os.environ.get("GAI_PANEL_PASSWORD")
    if not pwd or credentials.password != pwd:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True

@app.on_event("startup")
async def startup_event():
    """Uruchom agenta przy starcie aplikacji"""
    global agent_instance
    try:
        agent_instance = await start_agent()
        print("✅ Autonomous Agent AI uruchomiony pomyślnie")
    except Exception as e:
        print(f"❌ Błąd uruchamiania agenta: {e}")
        # Nie przerywaj startu aplikacji, agent może być uruchomiony później

@app.on_event("shutdown")
async def shutdown_event():
    """Zatrzymaj agenta przy zamknięciu aplikacji"""
    global agent_instance
    if agent_instance:
        try:
            await stop_agent()
            print("✅ Autonomous Agent AI zatrzymany")
        except Exception as e:
            print(f"❌ Błąd zatrzymywania agenta: {e}")

@app.get("/")
def read_root():
    return {"message": "GAI Agent Backend API", "version": "1.0.0"}

@app.get("/health")
def health_check():
    """Health check endpoint for monitoring and load balancers"""
    try:
        # Check database connection (skip if not configured)
        db_url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DATABASE_URL")
        if not db_url:
            db_status = "skipped"
        else:
            db_status = "healthy"
            try:
                # Minimal DB check via async manager if available
                from packages.memory.db import get_db_manager
                import asyncio
                loop = asyncio.get_event_loop()
                db_manager = loop.run_until_complete(get_db_manager())
                health = loop.run_until_complete(db_manager.health_check())
                if health.get("status") != "healthy":
                    db_status = f"unhealthy: {health.get('error','unknown')}"
            except Exception as e:
                db_status = f"unhealthy: {str(e)}"
        
        # Check Redis connection
        redis_url = os.getenv("REDIS_URL")
        if not redis_url:
            redis_status = "skipped"
        else:
            redis_status = "healthy"
            try:
                import redis
                redis_client = redis.from_url(redis_url)
                redis_client.ping()
            except Exception as e:
                redis_status = f"unhealthy: {str(e)}"
        
        # Overall status
        def is_ok(s: str) -> bool:
            return s in ("healthy", "skipped")
        overall_status = "healthy" if is_ok(db_status) and is_ok(redis_status) else "unhealthy"
        
        return {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "services": {
                "database": db_status,
                "redis": redis_status
            },
            "uptime": "running"
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            }
        )

@app.get("/agent/status")
async def agent_status():
    """Status autonomicznego agenta"""
    try:
        agent = await get_agent_instance()
        if agent:
            return await agent.get_status()
        return {"error": "Agent not initialized"}
    except Exception as e:
        return {"error": str(e)}

@app.post("/agent/start")
async def start_autonomous_agent(background_tasks: BackgroundTasks):
    """Uruchom autonomicznego agenta"""
    try:
        global agent_instance
        if agent_instance and agent_instance.is_running:
            return {"status": "Agent already running"}
        
        agent_instance = await start_agent()
        return {"status": "Agent started successfully", "agent_id": agent_instance.agent_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start agent: {str(e)}")

@app.post("/agent/stop")
async def stop_autonomous_agent():
    """Zatrzymaj autonomicznego agenta"""
    try:
        global agent_instance
        if agent_instance:
            await stop_agent()
            agent_instance = None
            return {"status": "Agent stopped successfully"}
        return {"status": "Agent not running"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop agent: {str(e)}")

app.include_router(chat.router, prefix="/chat", tags=["chat"], dependencies=[Depends(require_auth)])
app.include_router(tasks.router, prefix="/tasks", tags=["tasks"], dependencies=[Depends(require_auth)])
app.include_router(publications.router, prefix="/publications", tags=["publications"], dependencies=[Depends(require_auth)])
app.include_router(settings.router, prefix="/settings", tags=["settings"], dependencies=[Depends(require_auth)])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"], dependencies=[Depends(require_auth)])

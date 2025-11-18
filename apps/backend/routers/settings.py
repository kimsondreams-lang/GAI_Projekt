import os
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from packages.models.registry import get_registry
from packages.core_agent import get_agent

router = APIRouter()

class Keys(BaseModel):
    keys: Dict[str, str]

class Policy(BaseModel):
    policy: Dict[str, Any]

class AgentConfig(BaseModel):
    wake_cycle_interval_minutes: int = 30
    max_tasks_per_cycle: int = 10
    max_cost_per_cycle: float = 5.0
    min_budget_threshold: float = 10.0

@router.post("/models/keys")
def post_keys(k: Keys):
    """Ustaw klucze API dla modeli"""
    try:
        # Store keys in environment variables for now
        # In production, use a proper secrets management system
        for key, value in k.keys.items():
            os.environ[key] = value
        return {"ok": True, "message": "Klucze API zaktualizowane"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd ustawiania kluczy: {str(e)}")

@router.get("/models")
def get_models():
    """Pobierz konfigurację modeli"""
    try:
        return get_registry()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd pobierania konfiguracji: {str(e)}")

@router.post("/routing")
def post_policy(p: Policy):
    """Ustaw politykę routingu"""
    try:
        # Store routing policy in environment for now
        os.environ["ROUTING_POLICY"] = json.dumps(p.policy)
        return {"ok": True, "message": "Polityka routingu zaktualizowana"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd ustawiania polityki: {str(e)}")

@router.get("/routing")
def get_policy():
    """Pobierz politykę routingu"""
    try:
        policy = os.environ.get("ROUTING_POLICY", "{}")
        return json.loads(policy)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd pobierania polityki: {str(e)}")

@router.get("/agent/config")
async def get_agent_config():
    """Pobierz konfigurację agenta"""
    try:
        agent = await get_agent()
        if agent:
            return agent._get_config_summary()
        return {"error": "Agent not initialized"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd pobierania konfiguracji: {str(e)}")

@router.post("/agent/config")
async def update_agent_config(config: AgentConfig):
    """Zaktualizuj konfigurację agenta"""
    try:
        agent = await get_agent()
        if agent:
            agent.wake_cycle_interval = config.wake_cycle_interval_minutes
            agent.max_tasks_per_cycle = config.max_tasks_per_cycle
            agent.max_cost_per_cycle = config.max_cost_per_cycle
            agent.min_budget_threshold = config.min_budget_threshold
            return {"ok": True, "message": "Konfiguracja agenta zaktualizowana"}
        return {"error": "Agent not initialized"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd aktualizacji konfiguracji: {str(e)}")

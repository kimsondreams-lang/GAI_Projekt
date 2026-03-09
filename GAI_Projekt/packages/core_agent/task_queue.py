from typing import Dict, Any, Optional, List
import asyncio
from datetime import datetime
from packages.memory import get_memory_store
from packages.core_agent import get_agent

async def add_task(t_type: str, priority: int, budget_usd: float, payload: Dict[str, Any]) -> str:
    """Dodaj zadanie do systemu"""
    try:
        agent = await get_agent()
        if not agent or not agent.task_planner:
            raise Exception("Agent nie jest dostępny")
        
        task_data = {
            "id": f"queue_task_{int(datetime.utcnow().timestamp())}",
            "type": t_type,
            "title": f"Queue Task: {t_type}",
            "description": f"Task added via queue: {t_type}",
            "priority": priority,
            "estimated_cost": budget_usd,
            "estimated_duration": 30,
            "required_models": ["gpt-3.5-turbo"],
            "dependencies": [],
            "metadata": payload,
            "created_at": datetime.utcnow(),
            "scheduled_for": None,
            "status": "pending"
        }
        
        planned_tasks = await agent.task_planner.plan_tasks([task_data])
        return planned_tasks[0]["id"] if planned_tasks else ""
        
    except Exception as e:
        raise Exception(f"Błąd dodawania zadania: {str(e)}")

def add_task_sync(t_type: str, priority: int, budget_usd: float, payload: Dict[str, Any]) -> str:
    """Synchroniczna wersja dodawania zadania"""
    return asyncio.run(add_task(t_type, priority, budget_usd, payload))

async def list_tasks() -> List[Dict[str, Any]]:
    """Lista zadań w systemie"""
    try:
        memory_store = await get_memory_store()
        tasks = await memory_store.search_contexts(
            query="task_plan",
            context_type="system",
            limit=100
        )
        return tasks
    except Exception as e:
        print(f"Błąd listowania zadań: {e}")
        return []

def list_tasks_sync() -> List[Dict[str, Any]]:
    """Synchroniczna wersja listowania zadań"""
    return asyncio.run(list_tasks())

async def fetch_next_task() -> Optional[Dict[str, Any]]:
    """Pobierz następne zadanie do wykonania"""
    try:
        agent = await get_agent()
        if agent and agent.task_scheduler:
            return await agent.task_scheduler.get_next_scheduled_task()
        return None
    except Exception as e:
        print(f"Błąd pobierania zadania: {e}")
        return None

def fetch_next_task_sync() -> Optional[Dict[str, Any]]:
    """Synchroniczna wersja pobierania zadania"""
    return asyncio.run(fetch_next_task())

async def complete_task(tid: str, result: Dict[str, Any]):
    """Zakończ zadanie"""
    try:
        memory_store = await get_memory_store()
        await memory_store.store_context(
            context_type="system",
            context_key=f"task_completed_{tid}",
            title=f"Task Completed: {tid}",
            content=str(result),
            tags=["task_completed", "system"],
            importance_score=0.7,
            expires_in_days=30
        )
    except Exception as e:
        print(f"Błąd kończenia zadania: {e}")

def complete_task_sync(tid: str, result: Dict[str, Any]):
    """Synchroniczna wersja kończenia zadania"""
    asyncio.run(complete_task(tid, result))

async def fail_task(tid: str, error: str):
    """Zakończ zadanie z błędem"""
    try:
        memory_store = await get_memory_store()
        await memory_store.store_context(
            context_type="system",
            context_key=f"task_failed_{tid}",
            title=f"Task Failed: {tid}",
            content=f"Error: {error}",
            tags=["task_failed", "system", "error"],
            importance_score=0.8,
            expires_in_days=30
        )
    except Exception as e:
        print(f"Błąd oznaczania zadania jako nieudane: {e}")

def fail_task_sync(tid: str, error: str):
    """Synchroniczna wersja oznaczania zadania jako nieudane"""
    asyncio.run(fail_task(tid, error))

# Zachowaj kompatybilność wsteczną
add_task = add_task_sync
list_tasks = list_tasks_sync
fetch_next_task = fetch_next_task_sync
complete_task = complete_task_sync
fail_task = fail_task_sync

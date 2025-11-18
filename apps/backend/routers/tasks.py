from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
import time
from packages.core_agent import TaskPlanner, TaskType, TaskPriority, get_agent

router = APIRouter()

class NewTask(BaseModel):
    type: str
    title: str
    description: str
    priority: int = 3  # MEDIUM
    budget_usd: float = 1.0
    payload: Optional[Dict[str, Any]] = None

class TaskResponse(BaseModel):
    task_id: str
    status: str
    type: str
    title: str
    priority: int
    estimated_cost: float

@router.get("/", response_model=List[TaskResponse])
async def list_all():
    """Lista wszystkich zadań w systemie"""
    try:
        agent = await get_agent()
        if agent and agent.task_planner:
            # Zwróć informacje o zadaniach z pamięci
            memory_store = agent.memory_store
            if memory_store:
                # Pobierz ostatnie zadania z pamięci
                tasks = await memory_store.search_contexts(
                    query="task_plan",
                    context_type="system",
                    limit=50
                )
                return tasks
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd pobierania zadań: {str(e)}")

@router.post("/", response_model=Dict[str, Any])
async def create_task(t: NewTask):
    """Utwórz nowe zadanie w systemie"""
    try:
        agent = await get_agent()
        if not agent or not agent.task_planner:
            raise HTTPException(status_code=503, detail="Agent nie jest dostępny")
        
        # Przygotuj zadanie
        task_data = {
            "id": f"manual_task_{int(time.time())}",
            "type": TaskType[t.type.upper()] if t.type.upper() in TaskType.__members__ else TaskType.CONTENT_GENERATION,
            "title": t.title,
            "description": t.description,
            "priority": TaskPriority(t.priority) if 1 <= t.priority <= 5 else TaskPriority.MEDIUM,
            "estimated_cost": t.budget_usd,
            "estimated_duration": 30,  # domyślnie 30 minut
            "required_models": ["gpt-3.5-turbo"],
            "dependencies": [],
            "metadata": t.payload or {},
            "created_at": datetime.utcnow(),
            "scheduled_for": None,
            "status": "pending"
        }
        
        # Zaplanuj zadanie
        planned_tasks = await agent.task_planner.plan_tasks([task_data])
        
        if planned_tasks:
            return {
                "task_id": planned_tasks[0]["id"],
                "status": "planned",
                "type": planned_tasks[0]["type"].value,
                "title": planned_tasks[0]["title"],
                "priority": planned_tasks[0]["priority"].value,
                "estimated_cost": planned_tasks[0]["estimated_cost_usd"]
            }
        else:
            raise HTTPException(status_code=400, detail="Nie udało się zaplanować zadania")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd tworzenia zadania: {str(e)}")

@router.get("/status/{task_id}")
async def get_task_status(task_id: str):
    """Pobierz status konkretnego zadania"""
    try:
        agent = await get_agent()
        if not agent or not agent.memory_store:
            raise HTTPException(status_code=503, detail="Agent nie jest dostępny")
        
        # Szukaj zadania w pamięci
        task_data = await agent.memory_store.get_context(
            context_type="system",
            context_key=f"task_plan_{task_id}"
        )
        
        if task_data:
            return {
                "task_id": task_id,
                "status": "found",
                "data": task_data
            }
        else:
            # Sprawdź w wynikach wykonania
            execution_data = await agent.memory_store.get_context(
                context_type="system",
                context_key=f"execution_{task_id}"
            )
            
            if execution_data:
                return {
                    "task_id": task_id,
                    "status": "executed",
                    "data": execution_data
                }
            else:
                raise HTTPException(status_code=404, detail="Zadanie nie znalezione")
                
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd pobierania statusu: {str(e)}")

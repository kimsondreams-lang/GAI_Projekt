"""
Autonomiczny Agent AI z Wake Cycle dla GAI
Zawiera główną pętlę agenta, analizę stanu systemu i zarządzanie cyklem życia
"""

import asyncio
import logging
import json
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from enum import Enum
import traceback

# Importy z naszych systemów
from packages.models.invoke import ModelManager
from packages.memory import get_memory_store
from packages.core_agent.planner import TaskPlanner
from packages.core_agent.executor import TaskExecutor
from packages.core_agent.validator import TaskValidator
from packages.core_agent.budget import BudgetManager
from packages.core_agent.scheduler import TaskScheduler

logger = logging.getLogger(__name__)

class AgentState(Enum):
    """Stany agenta"""
    IDLE = "idle"
    PLANNING = "planning"
    EXECUTING = "executing"
    VALIDATING = "validating"
    SLEEPING = "sleeping"
    ERROR = "error"
    MAINTENANCE = "maintenance"

class WakeCyclePhase(Enum):
    """Fazy wake cycle"""
    SYSTEM_ANALYSIS = "system_analysis"
    TASK_PLANNING = "task_planning"
    EXECUTION = "execution"
    VALIDATION = "validation"
    LEARNING = "learning"
    SLEEP_PREP = "sleep_prep"

@dataclass
class SystemState:
    """Stan systemu"""
    timestamp: datetime
    agent_state: AgentState
    memory_stats: Dict[str, Any]
    model_availability: Dict[str, bool]
    budget_status: Dict[str, Any]
    active_tasks: int
    completed_tasks: int
    failed_tasks: int
    system_load: float
    last_wake_cycle: Optional[datetime]
    next_scheduled_wake: Optional[datetime]

@dataclass
class WakeCycleResult:
    """Wynik wake cycle"""
    cycle_id: str
    start_time: datetime
    end_time: datetime
    phase_results: Dict[str, Any]
    tasks_planned: int
    tasks_executed: int
    tasks_validated: int
    total_cost: float
    errors: List[str]
    status: str  # "success", "partial", "failed"

class AutonomousAgent:
    """
    Główny autonomiczny agent AI z wake cycle
    """
    
    def __init__(self):
        self.agent_id = "gai_autonomous_agent_v1"
        self.state = AgentState.IDLE
        self.model_manager = ModelManager()
        self.memory_store = None
        self.task_planner = TaskPlanner()
        self.task_executor = TaskExecutor()
        self.task_validator = TaskValidator()
        self.budget_manager = BudgetManager()
        self.task_scheduler = TaskScheduler()
        
        # Konfiguracja
        self.wake_cycle_interval = int(os.getenv("WAKE_CYCLE_INTERVAL_MINUTES", "30"))
        self.max_tasks_per_cycle = int(os.getenv("MAX_TASKS_PER_CYCLE", "10"))
        self.max_cost_per_cycle = float(os.getenv("MAX_COST_PER_CYCLE", "5.0"))
        self.min_budget_threshold = float(os.getenv("MIN_BUDGET_THRESHOLD", "10.0"))
        
        # Historia i monitoring
        self.wake_cycle_history: List[WakeCycleResult] = []
        self.current_cycle: Optional[WakeCycleResult] = None
        self.is_running = False
        self.last_system_analysis: Optional[SystemState] = None
        
        logger.info(f"AutonomousAgent zainicjalizowany: {self.agent_id}")
    
    async def initialize(self):
        """Inicjalizacja agenta"""
        logger.info("Inicjalizacja AutonomousAgent...")
        
        try:
            # Inicjalizacja systemu pamięci
            self.memory_store = await get_memory_store()
            logger.info("System pamięci zainicjalizowany")
            
            # Inicjalizacja komponentów
            await self.task_planner.initialize()
            await self.task_executor.initialize()
            await self.task_validator.initialize()
            await self.budget_manager.initialize()
            await self.task_scheduler.initialize()
            
            # Sprawdzenie budżetu
            budget_status = await self.budget_manager.get_budget_status()
            if budget_status["remaining_budget"] < self.min_budget_threshold:
                logger.warning(f"Niski budżet: {budget_status['remaining_budget']} USD")
            
            # Utworzenie konwersacji systemowej
            await self._create_system_conversation()
            
            logger.info("AutonomousAgent został pomyślnie zainicjalizowany")
            
        except Exception as e:
            logger.error(f"Błąd inicjalizacji AutonomousAgent: {e}")
            self.state = AgentState.ERROR
            raise
    
    async def _create_system_conversation(self):
        """Tworzenie konwersacji systemowej dla logów agenta"""
        try:
            conversation_id = await self.memory_store.create_conversation(
                title=f"System Agent: {self.agent_id}",
                metadata={
                    "type": "system_agent",
                    "agent_id": self.agent_id,
                    "created_at": datetime.utcnow().isoformat()
                }
            )
            
            # Zapis informacji o starcie
            await self.memory_store.append_message(
                conversation_id=conversation_id,
                role="system",
                content=f"AutonomousAgent {self.agent_id} uruchomiony",
                metadata={"event": "agent_start", "config": self._get_config_summary()}
            )
            
            logger.info(f"Utworzono konwersację systemową: {conversation_id}")
            
        except Exception as e:
            logger.warning(f"Nie można utworzyć konwersacji systemowej: {e}")
    
    def _get_config_summary(self) -> Dict[str, Any]:
        """Podsumowanie konfiguracji"""
        return {
            "wake_cycle_interval_minutes": self.wake_cycle_interval,
            "max_tasks_per_cycle": self.max_tasks_per_cycle,
            "max_cost_per_cycle": self.max_cost_per_cycle,
            "min_budget_threshold": self.min_budget_threshold
        }
    
    async def start(self):
        """Uruchomienie agenta"""
        if self.is_running:
            logger.warning("Agent jest już uruchomiony")
            return
        
        logger.info("Uruchamianie AutonomousAgent...")
        self.is_running = True
        self.state = AgentState.IDLE
        
        # Uruchomienie głównej pętli
        asyncio.create_task(self._main_loop())
        
        logger.info("AutonomousAgent uruchomiony pomyślnie")
    
    async def stop(self):
        """Zatrzymanie agenta"""
        logger.info("Zatrzymywanie AutonomousAgent...")
        self.is_running = False
        self.state = AgentState.IDLE
        
        # Zapisz stan przed zatrzymaniem
        await self._log_agent_event("agent_stop", {"reason": "user_request"})
        
        logger.info("AutonomousAgent zatrzymany")
    
    async def _main_loop(self):
        """Główna pętla agenta"""
        logger.info("Rozpoczęcie głównej pętli agenta")
        
        while self.is_running:
            try:
                # Sprawdzenie czy należy uruchomić wake cycle
                if await self._should_wake():
                    await self._wake_cycle()
                
                # Czekaj przed następnym sprawdzeniem
                await asyncio.sleep(60)  # Sprawdzaj co minutę
                
            except Exception as e:
                logger.error(f"Błąd w głównej pętli agenta: {e}")
                self.state = AgentState.ERROR
                await self._log_agent_event("main_loop_error", {"error": str(e)})
                await asyncio.sleep(300)  # Czekaj 5 minut po błędzie
    
    async def _should_wake(self) -> bool:
        """Sprawdzenie czy agent powinien się obudzić"""
        try:
            # Sprawdź harmonogram
            scheduled_wake = await self.task_scheduler.get_next_scheduled_task()
            if scheduled_wake and datetime.utcnow() >= scheduled_wake:
                return True
            
            # Sprawdź interwał wake cycle
            if not self.wake_cycle_history:
                return True  # Pierwszy wake cycle
            
            last_wake = self.wake_cycle_history[-1].start_time
            time_since_last_wake = datetime.utcnow() - last_wake
            
            return time_since_last_wake.total_seconds() >= (self.wake_cycle_interval * 60)
            
        except Exception as e:
            logger.error(f"Błąd sprawdzania warunków wake: {e}")
            return False
    
    async def _wake_cycle(self):
        """Główny wake cycle agenta"""
        logger.info("Rozpoczęcie wake cycle")
        self.state = AgentState.MAINTENANCE
        
        cycle_id = f"wake_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        start_time = datetime.utcnow()
        
        self.current_cycle = WakeCycleResult(
            cycle_id=cycle_id,
            start_time=start_time,
            end_time=start_time,
            phase_results={},
            tasks_planned=0,
            tasks_executed=0,
            tasks_validated=0,
            total_cost=0.0,
            errors=[],
            status="running"
        )
        
        try:
            # Faza 1: Analiza stanu systemu
            self.state = AgentState.MAINTENANCE
            system_state = await self._analyze_system_state()
            self.current_cycle.phase_results["system_analysis"] = asdict(system_state)
            
            # Sprawdzenie budżetu
            if system_state.budget_status["remaining_budget"] < self.min_budget_threshold:
                logger.warning("Budżet poniżej progu - ograniczam aktywność")
                await self._enter_sleep_mode("low_budget")
                return
            
            # Faza 2: Planowanie zadań
            self.state = AgentState.PLANNING
            planned_tasks = await self._plan_tasks(system_state)
            self.current_cycle.tasks_planned = len(planned_tasks)
            self.current_cycle.phase_results["task_planning"] = {
                "tasks_planned": len(planned_tasks),
                "tasks": [task.get("id", "unknown") for task in planned_tasks]
            }
            
            # Faza 3: Wykonywanie zadań
            self.state = AgentState.EXECUTING
            executed_tasks = await self._execute_tasks(planned_tasks)
            self.current_cycle.tasks_executed = len(executed_tasks)
            self.current_cycle.phase_results["task_execution"] = {
                "tasks_executed": len(executed_tasks),
                "results": executed_tasks
            }
            
            # Faza 4: Walidacja wyników
            self.state = AgentState.VALIDATING
            validated_tasks = await self._validate_tasks(executed_tasks)
            self.current_cycle.tasks_validated = len(validated_tasks)
            self.current_cycle.phase_results["task_validation"] = {
                "tasks_validated": len(validated_tasks),
                "validation_results": validated_tasks
            }
            
            # Faza 5: Uczenie się i optymalizacja
            await self._learning_phase()
            self.current_cycle.phase_results["learning"] = {"status": "completed"}
            
            # Zakończenie cycle
            self.current_cycle.end_time = datetime.utcnow()
            self.current_cycle.status = "success"
            self.current_cycle.total_cost = await self.budget_manager.get_cycle_cost()
            
            logger.info(f"Wake cycle zakończony sukcesem: {self.current_cycle.cycle_id}")
            
        except Exception as e:
            logger.error(f"Błąd w wake cycle: {e}")
            self.current_cycle.errors.append(str(e))
            self.current_cycle.status = "failed"
            self.current_cycle.end_time = datetime.utcnow()
            
            await self._log_agent_event("wake_cycle_error", {
                "cycle_id": cycle_id,
                "error": str(e),
                "traceback": traceback.format_exc()
            })
        
        finally:
            # Zapisz wyniki
            self.wake_cycle_history.append(self.current_cycle)
            await self._save_wake_cycle_results()
            
            # Przygotuj do snu
            await self._prepare_for_sleep()
            
            self.current_cycle = None
            self.state = AgentState.IDLE
    
    async def _analyze_system_state(self) -> SystemState:
        """Analiza aktualnego stanu systemu"""
        logger.info("Analiza stanu systemu...")
        
        try:
            # Statystyki pamięci
            memory_stats = await self.memory_store.get_memory_stats()
            
            # Dostępność modeli
            model_availability = {}
            for provider in self.model_manager.providers:
                try:
                    health = await self.model_manager.providers[provider].health_check()
                    model_availability[provider] = health.get("status") == "healthy"
                except:
                    model_availability[provider] = False
            
            # Status budżetu
            budget_status = await self.budget_manager.get_budget_status()
            
            # Statystyki zadań
            task_stats = await self.task_scheduler.get_task_statistics()
            
            # Oblicz obciążenie systemu
            system_load = self._calculate_system_load(memory_stats, model_availability)
            
            # Ostatnie wake cycles
            last_wake = self.wake_cycle_history[-1].start_time if self.wake_cycle_history else None
            
            # Następne zaplanowane wybudzenie
            next_wake = await self.task_scheduler.get_next_scheduled_task()
            
            system_state = SystemState(
                timestamp=datetime.utcnow(),
                agent_state=self.state,
                memory_stats=memory_stats,
                model_availability=model_availability,
                budget_status=budget_status,
                active_tasks=task_stats.get("active", 0),
                completed_tasks=task_stats.get("completed", 0),
                failed_tasks=task_stats.get("failed", 0),
                system_load=system_load,
                last_wake_cycle=last_wake,
                next_scheduled_wake=next_wake
            )
            
            # Zapisz analizę do pamięci
            await self._log_system_analysis(system_state)
            
            logger.info(f"Analiza systemu zakończona - load: {system_load:.2f}")
            return system_state
            
        except Exception as e:
            logger.error(f"Błąd analizy stanu systemu: {e}")
            raise
    
    def _calculate_system_load(self, memory_stats: Dict[str, Any], model_availability: Dict[str, bool]) -> float:
        """Obliczenie obciążenia systemu (0.0 - 1.0)"""
        load_factors = []
        
        # Obciążenie pamięci
        if "conversations" in memory_stats and memory_stats["conversations"] > 100:
            load_factors.append(0.3)
        
        # Dostępność modeli
        healthy_models = sum(1 for available in model_availability.values() if available)
        total_models = len(model_availability)
        model_load = 1.0 - (healthy_models / total_models) if total_models > 0 else 0.5
        load_factors.append(model_load * 0.4)
        
        # Aktywne zadania
        active_tasks = memory_stats.get("active_tasks", 0)
        if active_tasks > self.max_tasks_per_cycle:
            load_factors.append(0.3)
        
        return min(sum(load_factors), 1.0)
    
    async def _plan_tasks(self, system_state: SystemState) -> List[Dict[str, Any]]:
        """Planowanie zadań na podstawie stanu systemu"""
        logger.info("Planowanie zadań...")
        
        try:
            tasks = await self.task_planner.plan_tasks(
                system_state=system_state,
                max_tasks=self.max_tasks_per_cycle,
                max_cost=self.max_cost_per_cycle
            )
            
            logger.info(f"Zaplanowano {len(tasks)} zadań")
            return tasks
            
        except Exception as e:
            logger.error(f"Błąd planowania zadań: {e}")
            return []
    
    async def _execute_tasks(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Wykonywanie zaplanowanych zadań"""
        logger.info(f"Wykonywanie {len(tasks)} zadań...")
        
        try:
            results = await self.task_executor.execute_tasks(
                tasks=tasks,
                max_parallel=3,  # Maksymalnie 3 zadania równolegle
                timeout_per_task=300  # 5 minut na zadanie
            )
            
            logger.info(f"Wykonano {len(results)} zadań")
            return results
            
        except Exception as e:
            logger.error(f"Błąd wykonywania zadań: {e}")
            return []
    
    async def _validate_tasks(self, execution_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Walidacja wyników zadań"""
        logger.info(f"Walidacja {len(execution_results)} wyników...")
        
        try:
            validation_results = await self.task_validator.validate_tasks(
                execution_results=execution_results
            )
            
            logger.info(f"Zweryfikowano {len(validation_results)} wyników")
            return validation_results
            
        except Exception as e:
            logger.error(f"Błąd walidacji zadań: {e}")
            return []
    
    async def _learning_phase(self):
        """Faza uczenia się i optymalizacji"""
        logger.info("Faza uczenia się...")
        
        try:
            # Analiza wyników i optymalizacja
            if self.wake_cycle_history:
                last_cycles = self.wake_cycle_history[-5:]  # Ostatnie 5 cykli
                
                # Oblicz średnie metryki
                avg_success_rate = sum(1 for cycle in last_cycles if cycle.status == "success") / len(last_cycles)
                avg_cost = sum(cycle.total_cost for cycle in last_cycles) / len(last_cycles)
                avg_tasks = sum(cycle.tasks_executed for cycle in last_cycles) / len(last_cycles)
                
                # Optymalizuj parametry na podstawie historii
                if avg_success_rate < 0.7:
                    logger.warning("Niski wskaźnik sukcesu - rozważ zmianę strategii")
                
                if avg_cost > self.max_cost_per_cycle * 0.8:
                    logger.warning("Wysoki koszt - ograniczam liczbę zadań")
                    self.max_tasks_per_cycle = max(1, self.max_tasks_per_cycle - 1)
                
                logger.info(f"Uczenie się zakończone - success_rate: {avg_success_rate:.2f}, avg_cost: ${avg_cost:.4f}")
                
        except Exception as e:
            logger.error(f"Błąd fazy uczenia się: {e}")
    
    async def _enter_sleep_mode(self, reason: str):
        """Wejście w tryb uśpienia"""
        logger.info(f"Wchodzenie w tryb uśpienia: {reason}")
        self.state = AgentState.SLEEPING
        
        await self._log_agent_event("sleep_mode", {"reason": reason})
        
        # Oblicz czas następnego wybudzenia
        if reason == "low_budget":
            # Wbudzenie za 24h gdy budżet jest niski
            next_wake = datetime.utcnow() + timedelta(hours=24)
        else:
            # Standardowe wybudzenie
            next_wake = datetime.utcnow() + timedelta(minutes=self.wake_cycle_interval)
        
        await self.task_scheduler.schedule_wake(next_wake)
    
    async def _prepare_for_sleep(self):
        """Przygotowanie do snu"""
        logger.info("Przygotowanie do snu...")
        
        # Zapisz statystyki
        stats = {
            "total_wake_cycles": len(self.wake_cycle_history),
            "successful_cycles": sum(1 for cycle in self.wake_cycle_history if cycle.status == "success"),
            "failed_cycles": sum(1 for cycle in self.wake_cycle_history if cycle.status == "failed"),
            "total_cost": sum(cycle.total_cost for cycle in self.wake_cycle_history),
            "total_tasks": sum(cycle.tasks_executed for cycle in self.wake_cycle_history)
        }
        
        await self._log_agent_event("sleep_prep", stats)
        
        # Czyszczenie i optymalizacja
        await self._cleanup_resources()
        
        logger.info("Przygotowanie do snu zakończone")
    
    async def _cleanup_resources(self):
        """Czyszczenie zasobów"""
        try:
            # Ogranicz historię cykli
            if len(self.wake_cycle_history) > 100:
                self.wake_cycle_history = self.wake_cycle_history[-50:]
            
            # Zapisz ostateczny stan
            await self._save_final_state()
            
        except Exception as e:
            logger.error(f"Błąd czyszczenia zasobów: {e}")
    
    async def _save_wake_cycle_results(self):
        """Zapisywanie wyników wake cycle"""
        try:
            if not self.current_cycle:
                return
            
            cycle_data = asdict(self.current_cycle)
            
            await self.memory_store.store_context(
                context_type="system",
                context_key=f"wake_cycle_{self.current_cycle.cycle_id}",
                title=f"Wake Cycle: {self.current_cycle.cycle_id}",
                content=json.dumps(cycle_data, indent=2, default=str),
                tags=["wake_cycle", "system", "agent", self.current_cycle.status],
                importance_score=0.9,
                expires_in_days=30
            )
            
            logger.info(f"Zapisano wyniki wake cycle: {self.current_cycle.cycle_id}")
            
        except Exception as e:
            logger.error(f"Błąd zapisywania wyników wake cycle: {e}")
    
    async def _log_system_analysis(self, system_state: SystemState):
        """Logowanie analizy systemu"""
        try:
            await self.memory_store.store_context(
                context_type="system",
                context_key=f"system_analysis_{int(datetime.utcnow().timestamp())}",
                title="System Analysis",
                content=json.dumps(asdict(system_state), indent=2, default=str),
                tags=["system_analysis", "agent", "monitoring"],
                importance_score=0.8,
                expires_in_days=7
            )
            
        except Exception as e:
            logger.error(f"Błąd logowania analizy systemu: {e}")
    
    async def _log_agent_event(self, event_type: str, data: Dict[str, Any]):
        """Logowanie zdarzeń agenta"""
        try:
            await self.memory_store.store_context(
                context_type="system",
                context_key=f"agent_event_{event_type}_{int(datetime.utcnow().timestamp())}",
                title=f"Agent Event: {event_type}",
                content=json.dumps({
                    "event_type": event_type,
                    "timestamp": datetime.utcnow().isoformat(),
                    "agent_id": self.agent_id,
                    "data": data
                }, indent=2, default=str),
                tags=["agent_event", "system", event_type],
                importance_score=0.7,
                expires_in_days=30
            )
            
        except Exception as e:
            logger.error(f"Błąd logowania zdarzenia agenta: {e}")
    
    async def _save_final_state(self):
        """Zapisywanie końcowego stanu"""
        try:
            final_state = {
                "timestamp": datetime.utcnow().isoformat(),
                "agent_id": self.agent_id,
                "state": self.state.value,
                "total_wake_cycles": len(self.wake_cycle_history),
                "is_running": self.is_running,
                "memory_stats": await self.memory_store.get_memory_stats() if self.memory_store else {}
            }
            
            await self.memory_store.store_context(
                context_type="system",
                context_key=f"final_state_{int(datetime.utcnow().timestamp())}",
                title="Final Agent State",
                content=json.dumps(final_state, indent=2, default=str),
                tags=["final_state", "system", "agent"],
                importance_score=0.8,
                expires_in_days=30
            )
            
        except Exception as e:
            logger.error(f"Błąd zapisywania końcowego stanu: {e}")
    
    async def get_status(self) -> Dict[str, Any]:
        """Pobieranie statusu agenta"""
        try:
            return {
                "agent_id": self.agent_id,
                "state": self.state.value,
                "is_running": self.is_running,
                "wake_cycle_count": len(self.wake_cycle_history),
                "last_wake_cycle": self.wake_cycle_history[-1].start_time.isoformat() if self.wake_cycle_history else None,
                "current_cycle": asdict(self.current_cycle) if self.current_cycle else None,
                "total_tasks_completed": sum(cycle.tasks_executed for cycle in self.wake_cycle_history),
                "total_cost": sum(cycle.total_cost for cycle in self.wake_cycle_history),
                "config": self._get_config_summary()
            }
        except Exception as e:
            logger.error(f"Błąd pobierania statusu agenta: {e}")
            return {"error": str(e)}


# Globalna instancja agenta
_agent_instance: Optional[AutonomousAgent] = None

async def get_agent() -> Optional[AutonomousAgent]:
    """Pobieranie globalnej instancji agenta"""
    return _agent_instance

async def start_agent() -> AutonomousAgent:
    """Uruchomienie globalnej instancji agenta"""
    global _agent_instance
    
    if _agent_instance is None:
        _agent_instance = AutonomousAgent()
        await _agent_instance.initialize()
    
    if not _agent_instance.is_running:
        await _agent_instance.start()
    
    return _agent_instance

async def stop_agent():
    """Zatrzymanie globalnej instancji agenta"""
    global _agent_instance
    
    if _agent_instance is not None:
        await _agent_instance.stop()
        _agent_instance = None

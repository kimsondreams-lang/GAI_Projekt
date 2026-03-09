"""
Inteligentny scheduler dla Autonomous Agent AI
Zawiera zaawansowane planowanie, priorytetyzację i optymalizację zadań
"""

import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import heapq
import random
import time

from packages.memory import get_memory_store
from packages.core_agent.budget import BudgetManager

logger = logging.getLogger(__name__)

class TaskPriority(Enum):
    """Priorytety zadań"""
    CRITICAL = 1
    HIGH = 2
    MEDIUM = 3
    LOW = 4
    OPTIONAL = 5

class TaskStatus(Enum):
    """Statusy zadań"""
    PENDING = "pending"
    SCHEDULED = "scheduled"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    BLOCKED = "blocked"

class SchedulingStrategy(Enum):
    """Strategie planowania"""
    FIFO = "fifo"  # First In, First Out
    PRIORITY = "priority"  # Priorytetowe
    DEADLINE = "deadline"  # Na podstawie deadline
    RESOURCE_BASED = "resource_based"  # Na podstawie zasobów
    COST_OPTIMIZED = "cost_optimized"  # Optymalizacja kosztów
    ADAPTIVE = "adaptive"  # Adaptacyjne

@dataclass
class ScheduledTask:
    """Zaplanowane zadanie"""
    id: str
    original_task: Dict[str, Any]
    priority: TaskPriority
    estimated_duration: int  # w minutach
    estimated_cost: float
    deadline: Optional[datetime]
    required_resources: List[str]
    dependencies: List[str]
    scheduled_start: datetime
    scheduled_end: datetime
    status: TaskStatus
    retry_count: int
    metadata: Dict[str, Any]

@dataclass
class SchedulingContext:
    """Kontekst planowania"""
    available_resources: Dict[str, Any]
    current_load: float
    budget_status: Dict[str, Any]
    system_performance: Dict[str, Any]
    time_constraints: Dict[str, Any]
    historical_data: Dict[str, Any]

class TaskScheduler:
    """
    Inteligentny scheduler zadań dla agenta AI
    """
    
    def __init__(self):
        self.memory_store = None
        self.budget_manager = None
        
        # Kolejki zadań
        self.pending_tasks: List[ScheduledTask] = []
        self.scheduled_tasks: List[ScheduledTask] = []
        self.running_tasks: List[ScheduledTask] = []
        self.completed_tasks: List[ScheduledTask] = []
        
        # Konfiguracja
        self.max_concurrent_tasks = 3
        self.max_daily_tasks = 50
        self.task_timeout_minutes = 60
        self.scheduling_strategy = SchedulingStrategy.ADAPTIVE
        
        # Monitorowanie
        self.scheduling_stats = self._initialize_stats()
        self.last_optimization = datetime.utcnow()
        
        logger.info("TaskScheduler zainicjalizowany")
    
    async def initialize(self):
        """Inicjalizacja schedulera"""
        logger.info("Inicjalizacja TaskScheduler...")
        
        self.memory_store = await get_memory_store()
        self.budget_manager = BudgetManager()
        await self.budget_manager.initialize()
        
        # Wczytaj stan schedulera
        await self._load_scheduler_state()
        
        logger.info("TaskScheduler został zainicjalizowany")
    
    def _initialize_stats(self) -> Dict[str, Any]:
        """Inicjalizacja statystyk"""
        return {
            "total_scheduled": 0,
            "total_completed": 0,
            "total_failed": 0,
            "average_scheduling_time": 0.0,
            "average_execution_time": 0.0,
            "scheduling_efficiency": 0.0,
            "resource_utilization": 0.0,
            "cost_efficiency": 0.0
        }
    
    async def schedule_tasks(self, tasks: List[Dict[str, Any]], strategy: Optional[SchedulingStrategy] = None) -> List[Dict[str, Any]]:
        """
        Główna metoda planowania zadań
        
        Args:
            tasks: Lista zadań do zaplanowania
            strategy: Strategia planowania (opcjonalnie)
            
        Returns:
            Lista zaplanowanych zadań
        """
        logger.info(f"Rozpoczęcie planowania {len(tasks)} zadań (strategia: {strategy or self.scheduling_strategy.value})")
        
        try:
            # Przygotuj kontekst planowania
            context = await self._prepare_scheduling_context()
            
            # Wybierz strategię
            selected_strategy = strategy or self.scheduling_strategy
            
            # Przekształć zadania do formatu schedulera
            scheduled_tasks = await self._transform_tasks(tasks)
            
            # Zastosuj wybraną strategię planowania
            if selected_strategy == SchedulingStrategy.FIFO:
                scheduled_tasks = await self._schedule_fifo(scheduled_tasks, context)
            elif selected_strategy == SchedulingStrategy.PRIORITY:
                scheduled_tasks = await self._schedule_priority(scheduled_tasks, context)
            elif selected_strategy == SchedulingStrategy.DEADLINE:
                scheduled_tasks = await self._schedule_deadline(scheduled_tasks, context)
            elif selected_strategy == SchedulingStrategy.RESOURCE_BASED:
                scheduled_tasks = await self._schedule_resource_based(scheduled_tasks, context)
            elif selected_strategy == SchedulingStrategy.COST_OPTIMIZED:
                scheduled_tasks = await self._schedule_cost_optimized(scheduled_tasks, context)
            else:  # ADAPTIVE
                scheduled_tasks = await self._schedule_adaptive(scheduled_tasks, context)
            
            # Dodaj zaplanowane zadania do kolejki
            self.pending_tasks.extend(scheduled_tasks)
            
            # Zapisz stan planowania
            await self._save_scheduling_state(scheduled_tasks)
            
            # Zaktualizuj statystyki
            await self._update_scheduling_stats(scheduled_tasks)
            
            logger.info(f"Zaplanowano {len(scheduled_tasks)} zadań")
            return [asdict(task) for task in scheduled_tasks]
            
        except Exception as e:
            logger.error(f"Błąd planowania zadań: {e}")
            return []
    
    async def _prepare_scheduling_context(self) -> SchedulingContext:
        """Przygotowanie kontekstu planowania"""
        try:
            # Pobierz status budżetu
            budget_status = await self.budget_manager.get_budget_status()
            
            # Pobierz dane systemowe
            system_performance = await self._get_system_performance()
            
            # Pobierz dane historyczne
            historical_data = await self._get_historical_data()
            
            # Określ dostępne zasoby
            available_resources = await self._get_available_resources()
            
            # Oblicz aktualne obciążenie
            current_load = len(self.running_tasks) / self.max_concurrent_tasks
            
            # Określ ograniczenia czasowe
            time_constraints = {
                "current_time": datetime.utcnow(),
                "business_hours": self._is_business_hours(),
                "peak_hours": self._is_peak_hours(),
                "available_time_slots": self._calculate_available_time_slots()
            }
            
            context = SchedulingContext(
                available_resources=available_resources,
                current_load=current_load,
                budget_status=budget_status,
                system_performance=system_performance,
                time_constraints=time_constraints,
                historical_data=historical_data
            )
            
            return context
            
        except Exception as e:
            logger.error(f"Błąd przygotowania kontekstu planowania: {e}")
            # Zwróć domyślny kontekst
            return SchedulingContext(
                available_resources={},
                current_load=0.0,
                budget_status={},
                system_performance={},
                time_constraints={},
                historical_data={}
            )
    
    async def _get_system_performance(self) -> Dict[str, Any]:
        """Pobieranie wydajności systemu"""
        try:
            # Prosta analiza wydajności na podstawie historii
            recent_tasks = self.completed_tasks[-20:] if self.completed_tasks else []
            
            if recent_tasks:
                avg_execution_time = sum(
                    task.metadata.get("actual_execution_time", 30) for task in recent_tasks
                ) / len(recent_tasks)
                
                success_rate = sum(
                    1 for task in recent_tasks if task.status == TaskStatus.COMPLETED
                ) / len(recent_tasks)
                
                return {
                    "average_execution_time": avg_execution_time,
                    "success_rate": success_rate,
                    "recent_failures": len([task for task in recent_tasks if task.status == TaskStatus.FAILED]),
                    "system_health": "good" if success_rate > 0.8 else "poor"
                }
            else:
                return {
                    "average_execution_time": 30,
                    "success_rate": 1.0,
                    "recent_failures": 0,
                    "system_health": "unknown"
                }
                
        except Exception as e:
            logger.error(f"Błąd pobierania wydajności systemu: {e}")
            return {"error": str(e)}
    
    async def _get_historical_data(self) -> Dict[str, Any]:
        """Pobieranie danych historycznych"""
        try:
            # Wyszukaj konteksty związane z planowaniem
            historical_contexts = await self.memory_store.search_similar_context(
                query="task scheduling execution performance",
                context_type="system",
                limit=20
            )
            
            return {
                "recent_scheduling_contexts": len(historical_contexts),
                "average_task_duration": 30,  # domyślnie 30 minut
                "peak_usage_times": self._identify_peak_times(),
                "cost_patterns": self._analyze_cost_patterns()
            }
            
        except Exception as e:
            logger.error(f"Błąd pobierania danych historycznych: {e}")
            return {"error": str(e)}
    
    def _identify_peak_times(self) -> List[str]:
        """Identyfikacja godzin szczytu"""
        # Prosta heurystyka - godziny biurowe
        return ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]
    
    def _analyze_cost_patterns(self) -> Dict[str, Any]:
        """Analiza wzorców kosztów"""
        return {
            "expensive_categories": ["model_inference", "content_generation"],
            "cost_efficient_times": ["02:00", "03:00", "04:00", "05:00"],
            "average_cost_per_task": 0.05
        }
    
    async def _get_available_resources(self) -> Dict[str, Any]:
        """Pobieranie dostępnych zasobów"""
        try:
            # Sprawdź dostępność modeli AI
            from packages.models.invoke import ModelManager
            model_manager = ModelManager()
            
            # Prosta analiza zasobów
            return {
                "available_models": ["gpt-3.5-turbo", "gpt-4", "claude-3-sonnet"],
                "max_concurrent_tasks": self.max_concurrent_tasks - len(self.running_tasks),
                "available_time_slots": self._calculate_available_time_slots(),
                "budget_remaining": self.budget_manager.get_budget_status().get("remaining_budget", 0.0)
            }
            
        except Exception:
            return {
                "available_models": ["gpt-3.5-turbo"],
                "max_concurrent_tasks": self.max_concurrent_tasks,
                "available_time_slots": [],
                "budget_remaining": 10.0
            }
    
    def _calculate_available_time_slots(self) -> List[Dict[str, Any]]:
        """Obliczanie dostępnych przedziałów czasowych"""
        now = datetime.utcnow()
        slots = []
        
        # Generuj sloty na najbliższe 24 godziny
        for hour in range(24):
            slot_start = now + timedelta(hours=hour)
            slot_end = slot_start + timedelta(hours=1)
            
            # Sprawdź czy slot jest dostępny (prosta heurystyka)
            is_available = hour not in [2, 3, 4]  # Unikaj godzin nocnych
            
            slots.append({
                "start": slot_start.isoformat(),
                "end": slot_end.isoformat(),
                "available": is_available,
                "estimated_capacity": 3 if is_available else 0
            })
        
        return slots[:12]  # Tylko najbliższe 12 godzin
    
    def _is_business_hours(self) -> bool:
        """Sprawdzenie czy są godziny biurowe"""
        current_hour = datetime.utcnow().hour
        return 9 <= current_hour <= 17
    
    def _is_peak_hours(self) -> bool:
        """Sprawdzenie czy są godziny szczytu"""
        current_hour = datetime.utcnow().hour
        return current_hour in [10, 11, 14, 15, 16]
    
    async def _transform_tasks(self, tasks: List[Dict[str, Any]]) -> List[ScheduledTask]:
        """Przekształcanie zadań do formatu schedulera"""
        scheduled_tasks = []
        
        for task in tasks:
            try:
                # Wydobądź informacje o zadaniu
                task_id = task.get("id", f"task_{int(time.time())}")
                priority = self._parse_priority(task.get("priority", 3))
                estimated_duration = task.get("estimated_duration", 30)
                estimated_cost = task.get("estimated_cost", 0.05)
                deadline = self._parse_deadline(task.get("scheduled_for"))
                
                # Określ wymagane zasoby
                required_resources = self._determine_required_resources(task)
                
                # Określ zależności
                dependencies = task.get("dependencies", [])
                
                # Ustal czas rozpoczęcia (początkowy szacunek)
                scheduled_start = datetime.utcnow() + timedelta(minutes=5)  # Start za 5 minut
                scheduled_end = scheduled_start + timedelta(minutes=estimated_duration)
                
                scheduled_task = ScheduledTask(
                    id=task_id,
                    original_task=task,
                    priority=priority,
                    estimated_duration=estimated_duration,
                    estimated_cost=estimated_cost,
                    deadline=deadline,
                    required_resources=required_resources,
                    dependencies=dependencies,
                    scheduled_start=scheduled_start,
                    scheduled_end=scheduled_end,
                    status=TaskStatus.PENDING,
                    retry_count=0,
                    metadata=task.get("metadata", {})
                )
                
                scheduled_tasks.append(scheduled_task)
                
            except Exception as e:
                logger.error(f"Błąd przekształcania zadania: {e}")
                continue
        
        return scheduled_tasks
    
    def _parse_priority(self, priority_value) -> TaskPriority:
        """Parsowanie priorytetu"""
        try:
            if isinstance(priority_value, int):
                if priority_value <= 1:
                    return TaskPriority.CRITICAL
                elif priority_value <= 2:
                    return TaskPriority.HIGH
                elif priority_value <= 3:
                    return TaskPriority.MEDIUM
                elif priority_value <= 4:
                    return TaskPriority.LOW
                else:
                    return TaskPriority.OPTIONAL
            elif isinstance(priority_value, str):
                priority_value = priority_value.lower()
                if "critical" in priority_value:
                    return TaskPriority.CRITICAL
                elif "high" in priority_value:
                    return TaskPriority.HIGH
                elif "medium" in priority_value:
                    return TaskPriority.MEDIUM
                elif "low" in priority_value:
                    return TaskPriority.LOW
                else:
                    return TaskPriority.MEDIUM
            else:
                return TaskPriority.MEDIUM
        except:
            return TaskPriority.MEDIUM
    
    def _parse_deadline(self, deadline_str) -> Optional[datetime]:
        """Parsowanie deadline"""
        try:
            if deadline_str:
                return datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
            return None
        except:
            return None
    
    def _determine_required_resources(self, task: Dict[str, Any]) -> List[str]:
        """Określanie wymaganych zasobów"""
        resources = []
        
        # Na podstawie typu zadania
        task_type = task.get("type", "")
        if "content" in task_type or "generation" in task_type:
            resources.extend(["ai_model", "text_processing"])
        
        if "code" in task_type:
            resources.extend(["ai_model", "code_execution"])
        
        if "research" in task_type:
            resources.extend(["ai_model", "search_capability"])
        
        # Na podstawie wymaganych modeli
        required_models = task.get("required_models", [])
        for model in required_models:
            if "gpt-4" in model:
                resources.append("high_performance_model")
            elif "gpt-3.5" in model:
                resources.append("standard_model")
            elif "claude" in model:
                resources.append("anthropic_model")
        
        return list(set(resources))  # Usuń duplikaty
    
    async def _schedule_fifo(self, tasks: List[ScheduledTask], context: SchedulingContext) -> List[ScheduledTask]:
        """Planowanie FIFO (First In, First Out)"""
        # Proste planowanie w kolejności przyjścia
        current_time = datetime.utcnow()
        
        for i, task in enumerate(tasks):
            # Rozpocznij kolejno z opóźnieniem
            start_time = current_time + timedelta(minutes=i * 5)
            task.scheduled_start = start_time
            task.scheduled_end = start_time + timedelta(minutes=task.estimated_duration)
            task.status = TaskStatus.SCHEDULED
        
        return tasks
    
    async def _schedule_priority(self, tasks: List[ScheduledTask], context: SchedulingContext) -> List[ScheduledTask]:
        """Planowanie priorytetowe"""
        # Sortuj według priorytetu
        sorted_tasks = sorted(tasks, key=lambda t: t.priority.value)
        
        current_time = datetime.utcnow()
        
        for i, task in enumerate(sorted_tasks):
            # Priorytetowe zadania zaczynają się wcześniej
            start_time = current_time + timedelta(minutes=i * 2)  # Krótsze opóźnienie
            task.scheduled_start = start_time
            task.scheduled_end = start_time + timedelta(minutes=task.estimated_duration)
            task.status = TaskStatus.SCHEDULED
        
        return sorted_tasks
    
    async def _schedule_deadline(self, tasks: List[ScheduledTask], context: SchedulingContext) -> List[ScheduledTask]:
        """Planowanie na podstawie deadline"""
        # Filtruj zadania z deadline
        tasks_with_deadline = [t for t in tasks if t.deadline is not None]
        tasks_without_deadline = [t for t in tasks if t.deadline is None]
        
        # Sortuj według deadline (najpierw te z bliższym deadline)
        tasks_with_deadline.sort(key=lambda t: t.deadline)
        
        current_time = datetime.utcnow()
        scheduled_tasks = []
        
        # Zaplanuj zadania z deadline
        for task in tasks_with_deadline:
            # Upewnij się, że zadanie zostanie ukończone przed deadline
            latest_start = task.deadline - timedelta(minutes=task.estimated_duration)
            
            if latest_start > current_time:
                task.scheduled_start = max(current_time, latest_start - timedelta(minutes=10))
            else:
                task.scheduled_start = current_time
            
            task.scheduled_end = task.scheduled_start + timedelta(minutes=task.estimated_duration)
            task.status = TaskStatus.SCHEDULED
            scheduled_tasks.append(task)
            
            current_time = task.scheduled_end + timedelta(minutes=5)  # Przerwa 5 minut
        
        # Dodaj zadania bez deadline po zadaniach z deadline
        for task in tasks_without_deadline:
            task.scheduled_start = current_time
            task.scheduled_end = current_time + timedelta(minutes=task.estimated_duration)
            task.status = TaskStatus.SCHEDULED
            scheduled_tasks.append(task)
            
            current_time = task.scheduled_end + timedelta(minutes=5)
        
        return scheduled_tasks
    
    async def _schedule_resource_based(self, tasks: List[ScheduledTask], context: SchedulingContext) -> List[ScheduledTask]:
        """Planowanie na podstawie zasobów"""
        # Grupuj zadania według wymaganych zasobów
        resource_groups = {}
        
        for task in tasks:
            # Klucz to zestaw wymaganych zasobów
            resource_key = tuple(sorted(task.required_resources))
            
            if resource_key not in resource_groups:
                resource_groups[resource_key] = []
            resource_groups[resource_key].append(task)
        
        current_time = datetime.utcnow()
        scheduled_tasks = []
        
        # Planuj każdą grupę zasobów osobno
        for resource_key, task_group in resource_groups.items():
            # Sortuj według priorytetu w ramach grupy
            task_group.sort(key=lambda t: t.priority.value)
            
            for task in task_group:
                task.scheduled_start = current_time
                task.scheduled_end = current_time + timedelta(minutes=task.estimated_duration)
                task.status = TaskStatus.SCHEDULED
                scheduled_tasks.append(task)
                
                current_time = task.scheduled_end + timedelta(minutes=5)
        
        return scheduled_tasks
    
    async def _schedule_cost_optimized(self, tasks: List[ScheduledTask], context: SchedulingContext) -> List[ScheduledTask]:
        """Planowanie zoptymalizowane kosztowo"""
        # Sortuj według kosztu (najpierw tańsze zadania)
        sorted_tasks = sorted(tasks, key=lambda t: t.estimated_cost)
        
        current_time = datetime.utcnow()
        
        for task in sorted_tasks:
            # Spróbuj znaleźć optymalny czas startu
            optimal_start = self._find_optimal_start_time(task, context, current_time)
            
            task.scheduled_start = optimal_start
            task.scheduled_end = optimal_start + timedelta(minutes=task.estimated_duration)
            task.status = TaskStatus.SCHEDULED
            
            current_time = task.scheduled_end + timedelta(minutes=5)
        
        return sorted_tasks
    
    def _find_optimal_start_time(self, task: ScheduledTask, context: SchedulingContext, current_time: datetime) -> datetime:
        """Znajdowanie optymalnego czasu startu"""
        # Prosta heurystyka - unikaj godzin szczytu dla drogich zadań
        if task.estimated_cost > 0.1 and self._is_peak_hours():
            # Przesuń o 2 godziny
            return current_time + timedelta(hours=2)
        
        return current_time
    
    async def _schedule_adaptive(self, tasks: List[ScheduledTask], context: SchedulingContext) -> List[ScheduledTask]:
        """Planowanie adaptacyjne"""
        # Zaawansowane planowanie adaptacyjne
        
        # 1. Analiza kontekstu
        system_load = context.current_load
        budget_remaining = context.budget_status.get("remaining_budget", 0.0)
        system_health = context.system_performance.get("system_health", "unknown")
        
        # 2. Dostosuj strategię na podstawie kontekstu
        if system_health == "poor":
            # System ma problemy - użyj prostszej strategii
            return await self._schedule_priority(tasks, context)
        elif budget_remaining < 10.0:
            # Niski budżet - optymalizuj koszty
            return await self._schedule_cost_optimized(tasks, context)
        elif system_load > 0.7:
            # Wysokie obciążenie - priorytetuj zadania krytyczne
            critical_tasks = [t for t in tasks if t.priority == TaskPriority.CRITICAL]
            other_tasks = [t for t in tasks if t.priority != TaskPriority.CRITICAL]
            
            scheduled_critical = await self._schedule_priority(critical_tasks, context)
            scheduled_other = await self._schedule_fifo(other_tasks, context)
            
            return scheduled_critical + scheduled_other
        else:
            # Normalne warunki - użyj mieszanej strategii
            return await self._schedule_mixed_strategy(tasks, context)
    
    async def _schedule_mixed_strategy(self, tasks: List[ScheduledTask], context: SchedulingContext) -> List[ScheduledTask]:
        """Mieszana strategia planowania"""
        # Podziel zadania na kategorie
        critical_tasks = [t for t in tasks if t.priority == TaskPriority.CRITICAL]
        deadline_tasks = [t for t in tasks if t.deadline is not None and t.priority != TaskPriority.CRITICAL]
        other_tasks = [t for t in tasks if t.priority != TaskPriority.CRITICAL and t.deadline is None]
        
        scheduled_tasks = []
        current_time = datetime.utcnow()
        
        # 1. Zaplanuj zadania krytyczne
        if critical_tasks:
            critical_scheduled = await self._schedule_priority(critical_tasks, context)
            scheduled_tasks.extend(critical_scheduled)
            if critical_scheduled:
                current_time = max(task.scheduled_end for task in critical_scheduled) + timedelta(minutes=5)
        
        # 2. Zaplanuj zadania z deadline
        if deadline_tasks:
            deadline_scheduled = await self._schedule_deadline(deadline_tasks, context)
            # Dostosuj czasy do aktualnego czasu
            for task in deadline_scheduled:
                if task.scheduled_start < current_time:
                    task.scheduled_start = current_time
                    task.scheduled_end = current_time + timedelta(minutes=task.estimated_duration)
                current_time = task.scheduled_end + timedelta(minutes=5)
            
            scheduled_tasks.extend(deadline_scheduled)
            if deadline_scheduled:
                current_time = max(task.scheduled_end for task in deadline_scheduled) + timedelta(minutes=5)
        
        # 3. Zaplanuj pozostałe zadania
        if other_tasks:
            other_scheduled = await self._schedule_cost_optimized(other_tasks, context)
            # Dostosuj czasy do aktualnego czasu
            for task in other_scheduled:
                if task.scheduled_start < current_time:
                    task.scheduled_start = current_time
                    task.scheduled_end = current_time + timedelta(minutes=task.estimated_duration)
                current_time = task.scheduled_end + timedelta(minutes=5)
            
            scheduled_tasks.extend(other_scheduled)
        
        return scheduled_tasks
    
    async def get_next_tasks(self, count: int = 1) -> List[Dict[str, Any]]:
        """
        Pobieranie następnych zadań do wykonania
        
        Args:
            count: Liczba zadań do pobrania
            
        Returns:
            Lista zadań do wykonania
        """
        try:
            # Sprawdź czy są zadania do wykonania
            if not self.pending_tasks:
                return []
            
            # Sprawdź limity współbieżności
            if len(self.running_tasks) >= self.max_concurrent_tasks:
                logger.info("Osiągnięto limit współbieżnych zadań")
                return []
            
            # Sprawdź budżet
            budget_status = await self.budget_manager.get_budget_status()
            if not budget_status.get("can_proceed", True):
                logger.warning("Nie można kontynuować z powodu ograniczeń budżetowych")
                return []
            
            # Wybierz zadania do wykonania
            available_count = min(count, self.max_concurrent_tasks - len(self.running_tasks))
            next_tasks = self.pending_tasks[:available_count]
            
            # Przenieś do listy uruchomionych
            for task in next_tasks:
                task.status = TaskStatus.RUNNING
                self.running_tasks.append(task)
            
            # Usuń z listy oczekujących
            self.pending_tasks = self.pending_tasks[available_count:]
            
            logger.info(f"Pobrano {len(next_tasks)} zadań do wykonania")
            return [asdict(task) for task in next_tasks]
            
        except Exception as e:
            logger.error(f"Błąd pobierania następnych zadań: {e}")
            return []
    
    async def complete_task(self, task_id: str, success: bool = True, result_data: Optional[Dict[str, Any]] = None):
        """
        Zakończenie zadania
        
        Args:
            task_id: ID zadania
            success: Czy zadanie zakończyło się sukcesem
            result_data: Dodatkowe dane wynikowe
        """
        try:
            # Znajdź zadanie w liście uruchomionych
            task = None
            for running_task in self.running_tasks:
                if running_task.id == task_id:
                    task = running_task
                    break
            
            if not task:
                logger.warning(f"Nie znaleziono zadania do zakończenia: {task_id}")
                return
            
            # Zaktualizuj status
            task.status = TaskStatus.COMPLETED if success else TaskStatus.FAILED
            
            # Dodaj metadane wynikowe
            if result_data:
                task.metadata.update(result_data)
            
            # Przenieś do listy ukończonych
            self.running_tasks.remove(task)
            self.completed_tasks.append(task)
            
            # Zapisz w pamięci
            await self._save_task_completion(task, success)
            
            logger.info(f"Zakończono zadanie {task_id}: {'SUKCES' if success else 'NIEPOWODZENIE'}")
            
        except Exception as e:
            logger.error(f"Błąd zakończenia zadania {task_id}: {e}")
    
    async def _save_task_completion(self, task: ScheduledTask, success: bool):
        """Zapisywanie zakończenia zadania"""
        try:
            completion_data = {
                "task_id": task.id,
                "original_task": task.original_task,
                "success": success,
                "completion_time": datetime.utcnow().isoformat(),
                "scheduled_duration": task.estimated_duration,
                "actual_duration": (datetime.utcnow() - task.scheduled_start).total_seconds() / 60,
                "cost": task.estimated_cost,
                "priority": task.priority.value,
                "metadata": task.metadata
            }
            
            await self.memory_store.store_context(
                context_type="system",
                context_key=f"task_completion_{task.id}_{int(time.time())}",
                title=f"Task Completion: {task.id}",
                content=json.dumps(completion_data, indent=2, default=str),
                tags=["task_completion", "system", "success" if success else "failed"],
                importance_score=0.6,
                expires_in_days=30
            )
            
        except Exception as e:
            logger.error(f"Błąd zapisywania zakończenia zadania: {e}")
    
    async def _save_scheduling_state(self, scheduled_tasks: List[ScheduledTask]):
        """Zapisywanie stanu planowania"""
        try:
            state_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "pending_tasks_count": len(self.pending_tasks),
                "running_tasks_count": len(self.running_tasks),
                "completed_tasks_count": len(self.completed_tasks),
                "recently_scheduled": [asdict(task) for task in scheduled_tasks],
                "stats": self.scheduling_stats
            }
            
            await self.memory_store.store_context(
                context_type="system",
                context_key=f"scheduling_state_{int(time.time())}",
                title="Scheduling State",
                content=json.dumps(state_data, indent=2, default=str),
                tags=["scheduling", "system", "state"],
                importance_score=0.7,
                expires_in_days=7
            )
            
        except Exception as e:
            logger.error(f"Błąd zapisywania stanu planowania: {e}")
    
    async def _load_scheduler_state(self):
        """Ładowanie stanu schedulera"""
        try:
            # Wyszukaj ostatni stan
            recent_states = await self.memory_store.search_similar_context(
                query="scheduling state system",
                context_type="system",
                limit=5
            )
            
            if recent_states:
                # Przywróć podstawowe statystyki
                latest_state = recent_states[0]
                state_data = json.loads(latest_state.get("content", "{}"))
                
                if "stats" in state_data:
                    self.scheduling_stats.update(state_data["stats"])
                
                logger.info("Przywrócono stan schedulera")
            
        except Exception as e:
            logger.error(f"Błąd ładowania stanu schedulera: {e}")
    
    async def _update_scheduling_stats(self, scheduled_tasks: List[ScheduledTask]):
        """Aktualizacja statystyk planowania"""
        try:
            self.scheduling_stats["total_scheduled"] += len(scheduled_tasks)
            
            # Oblicz średni czas planowania (prosty szacunek)
            avg_scheduling_time = sum(task.estimated_duration for task in scheduled_tasks) / len(scheduled_tasks) if scheduled_tasks else 0
            
            # Zaktualizuj średni czas planowania
            if self.scheduling_stats["total_scheduled"] > 0:
                total_scheduling_time = self.scheduling_stats["average_scheduling_time"] * (self.scheduling_stats["total_scheduled"] - len(scheduled_tasks))
                total_scheduling_time += avg_scheduling_time * len(scheduled_tasks)
                self.scheduling_stats["average_scheduling_time"] = total_scheduling_time / self.scheduling_stats["total_scheduled"]
            
            # Oblicz efektywność planowania
            self._calculate_scheduling_efficiency()
            
        except Exception as e:
            logger.error(f"Błąd aktualizacji statystyk planowania: {e}")
    
    def _calculate_scheduling_efficiency(self):
        """Obliczanie efektywności planowania"""
        try:
            if self.scheduling_stats["total_scheduled"] > 0:
                completion_rate = self.scheduling_stats["total_completed"] / self.scheduling_stats["total_scheduled"]
                self.scheduling_stats["scheduling_efficiency"] = completion_rate
            
        except Exception as e:
            logger.error(f"Błąd obliczania efektywności planowania: {e}")
    
    async def get_next_scheduled_task(self) -> Optional[datetime]:
        """Pobieranie następnego zaplanowanego zadania"""
        try:
            if not self.pending_tasks:
                return None
            
            # Znajdź najwcześniejsze zaplanowane zadanie
            earliest_task = min(self.pending_tasks, key=lambda t: t.scheduled_start)
            return earliest_task.scheduled_start
            
        except Exception as e:
            logger.error(f"Błąd pobierania następnego zaplanowanego zadania: {e}")
            return None
    
    async def get_task_statistics(self) -> Dict[str, Any]:
        """Pobieranie statystyk zadań"""
        try:
            return {
                "active": len(self.running_tasks),
                "completed": len(self.completed_tasks),
                "pending": len(self.pending_tasks),
                "total_scheduled": self.scheduling_stats["total_scheduled"],
                "total_completed": self.scheduling_stats["total_completed"],
                "total_failed": self.scheduling_stats["total_failed"]
            }
            
        except Exception as e:
            logger.error(f"Błąd pobierania statystyk zadań: {e}")
            return {"active": 0, "completed": 0, "pending": 0}

    async def schedule_wake(self, wake_time: datetime):
        """Zaplanowanie wybudzenia agenta"""
        try:
            # Utwórz zadanie wybudzenia
            wake_task = {
                "id": f"wake_{int(wake_time.timestamp())}",
                "type": "system_wake",
                "title": "Agent Wake",
                "description": "Scheduled agent wake up",
                "priority": 1,  # CRITICAL
                "estimated_duration": 5,
                "estimated_cost": 0.001,
                "scheduled_for": wake_time.isoformat(),
                "metadata": {"wake_task": True}
            }
            
            # Zaplanuj zadanie wybudzenia
            await self.schedule_tasks([wake_task], strategy=SchedulingStrategy.DEADLINE)
            
            logger.info(f"Zaplanowano wybudzenie agenta na: {wake_time}")
            
        except Exception as e:
            logger.error(f"Błąd planowania wybudzenia: {e}")

    async def get_scheduler_stats(self) -> Dict[str, Any]:
        """Pobieranie statystyk schedulera"""
        try:
            stats = self.scheduling_stats.copy()
            stats.update({
                "pending_tasks": len(self.pending_tasks),
                "running_tasks": len(self.running_tasks),
                "completed_tasks": len(self.completed_tasks),
                "current_load": len(self.running_tasks) / self.max_concurrent_tasks,
                "last_optimization": self.last_optimization.isoformat()
            })
            
            return stats
            
        except Exception as e:
            logger.error(f"Błąd pobierania statystyk schedulera: {e}")
            return {"error": str(e)}
    
    async def optimize_schedule(self) -> Dict[str, Any]:
        """Optymalizacja harmonogramu"""
        try:
            logger.info("Rozpoczęcie optymalizacji harmonogramu...")
            
            # Przeanalizuj oczekujące zadania
            if not self.pending_tasks:
                return {"message": "Brak zadań do optymalizacji"}
            
            # Zastosuj optymalizacje
            optimizations_applied = []
            
            # 1. Konsolidacja podobnych zadań
            consolidation_result = await self._consolidate_similar_tasks()
            if consolidation_result["tasks_consolidated"] > 0:
                optimizations_applied.append("consolidation")
            
            # 2. Przesunięcie zadań w czasie szczytu
            peak_optimization = await self._optimize_peak_hours()
            if peak_optimization["tasks_moved"] > 0:
                optimizations_applied.append("peak_hours_optimization")
            
            # 3. Optymalizacja kosztów
            cost_optimization = await self._optimize_costs()
            if cost_optimization["cost_saved"] > 0:
                optimizations_applied.append("cost_optimization")
            
            # Zaktualizuj czas ostatniej optymalizacji
            self.last_optimization = datetime.utcnow()
            
            result = {
                "optimizations_applied": optimizations_applied,
                "tasks_consolidated": consolidation_result["tasks_consolidated"],
                "tasks_moved": peak_optimization["tasks_moved"],
                "cost_saved": cost_optimization["cost_saved"],
                "optimization_time": datetime.utcnow().isoformat()
            }
            
            logger.info(f"Zakończono optymalizację: {', '.join(optimizations_applied)}")
            return result
            
        except Exception as e:
            logger.error(f"Błąd optymalizacji harmonogramu: {e}")
            return {"error": str(e)}
    
    async def _consolidate_similar_tasks(self) -> Dict[str, Any]:
        """Konsolidacja podobnych zadań"""
        try:
            # Prosta konsolidacja - grupuj według typu
            task_groups = {}
            
            for task in self.pending_tasks:
                task_type = task.original_task.get("type", "unknown")
                if task_type not in task_groups:
                    task_groups[task_type] = []
                task_groups[task_type].append(task)
            
            # Zlicz skonsolidowane zadania
            tasks_consolidated = 0
            for task_type, tasks in task_groups.items():
                if len(tasks) > 1:
                    tasks_consolidated += len(tasks) - 1  # Liczba "zaoszczędzionych" zadań
            
            return {"tasks_consolidated": tasks_consolidated}
            
        except Exception as e:
            logger.error(f"Błąd konsolidacji zadań: {e}")
            return {"tasks_consolidated": 0}
    
    async def _optimize_peak_hours(self) -> Dict[str, Any]:
        """Optymalizacja godzin szczytu"""
        try:
            tasks_moved = 0
            
            for task in self.pending_tasks:
                if self._is_during_peak_hours(task.scheduled_start):
                    # Przesuń zadanie poza godziny szczytu
                    new_start = self._find_off_peak_time(task.scheduled_start)
                    if new_start:
                        time_diff = (new_start - task.scheduled_start).total_seconds() / 3600  # godziny
                        task.scheduled_start = new_start
                        task.scheduled_end = new_start + timedelta(minutes=task.estimated_duration)
                        tasks_moved += 1
            
            return {"tasks_moved": tasks_moved}
            
        except Exception as e:
            logger.error(f"Błąd optymalizacji godzin szczytu: {e}")
            return {"tasks_moved": 0}
    
    def _is_during_peak_hours(self, time: datetime) -> bool:
        """Sprawdzenie czy czas jest w godzinach szczytu"""
        hour = time.hour
        return hour in [10, 11, 14, 15, 16]  # Prosta heurystyka
    
    def _find_off_peak_time(self, original_time: datetime) -> Optional[datetime]:
        """Znajdowanie czasu poza godzinami szczytu"""
        # Spróbuj przesunąć o 2 godziny
        new_time = original_time + timedelta(hours=2)
        
        if not self._is_during_peak_hours(new_time):
            return new_time
        
        # Jeśli nadal w szczycie, spróbuj o 3 godziny
        new_time = original_time + timedelta(hours=3)
        if not self._is_during_peak_hours(new_time):
            return new_time
        
        return None
    
    async def _optimize_costs(self) -> Dict[str, Any]:
        """Optymalizacja kosztów"""
        try:
            cost_saved = 0.0
            
            # Znajdź drogie zadania
            expensive_tasks = [task for task in self.pending_tasks if task.estimated_cost > 0.1]
            
            for task in expensive_tasks:
                # Spróbuj znaleźć tańszy czas wykonania
                original_cost = task.estimated_cost
                
                # Prosta heurystyka - zadania w nocy są tańsze
                if not self._is_business_hours():
                    # Zmniejsz koszt o 20% poza godzinami biurowymi
                    task.estimated_cost *= 0.8
                    cost_saved += original_cost - task.estimated_cost
            
            return {"cost_saved": cost_saved}
            
        except Exception as e:
            logger.error(f"Błąd optymalizacji kosztów: {e}")
            return {"cost_saved": 0.0}
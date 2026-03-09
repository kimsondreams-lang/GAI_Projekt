"""
Autonomous Agent AI - Główny moduł agenta autonomicznego

Ten moduł zawiera wszystkie komponenty potrzebne do działania
w pełni autonomicznego agenta AI z wake cycle, planowaniem zadań,
budżetowaniem i inteligentnym wykonywaniem.
"""

from .loop import AutonomousAgent, get_agent, start_agent, stop_agent, AgentState, WakeCyclePhase
from .planner import TaskPlanner, TaskType, TaskPriority, TaskStatus
from .executor import TaskExecutor, ExecutionStatus, ExecutionResult
from .validator import TaskValidator, ValidationStatus, ValidationType, ValidationResult
from .budget import BudgetManager, BudgetAlertLevel, ExpenseCategory
from .scheduler import TaskScheduler, TaskPriority as SchedulerPriority, SchedulingStrategy

__all__ = [
    # Główny agent
    'AutonomousAgent',
    'get_agent',
    'start_agent', 
    'stop_agent',
    'AgentState',
    'WakeCyclePhase',
    
    # Planer zadań
    'TaskPlanner',
    'TaskType',
    'TaskPriority',
    'TaskStatus',
    
    # Executor zadań
    'TaskExecutor',
    'ExecutionStatus',
    'ExecutionResult',
    
    # Walidator zadań
    'TaskValidator',
    'ValidationStatus',
    'ValidationType',
    'ValidationResult',
    
    # Manager budżetu
    'BudgetManager',
    'BudgetAlertLevel',
    'ExpenseCategory',
    
    # Scheduler
    'TaskScheduler',
    'SchedulerPriority',
    'SchedulingStrategy'
]

__version__ = "1.0.0"
__author__ = "GAI Agent"
__description__ = "W pełni autonomiczny agent AI z zaawansowanym planowaniem i budżetowaniem"
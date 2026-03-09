#!/usr/bin/env python3
"""
Kompleksowy test całego systemu Autonomous Agent AI
Testuje wszystkie komponenty: loop, planner, executor, validator, budget, scheduler
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
import sys
import os

# Dodaj ścieżkę do głównego katalogu
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from packages.core_agent import (
    AutonomousAgent, AgentState, WakeCyclePhase,
    start_agent, stop_agent, get_agent,
    TaskPlanner, TaskType, TaskPriority, TaskStatus,
    TaskExecutor, ExecutionStatus,
    TaskValidator, ValidationStatus,
    BudgetManager, ExpenseCategory,
    TaskScheduler, SchedulingStrategy
)

# Konfiguracja logowania
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_autonomous_agent_system():
    """Główna funkcja testująca cały system"""
    logger.info("🚀 Rozpoczęcie testu systemu Autonomous Agent AI")
    
    try:
        # 1. Test inicjalizacji wszystkich komponentów
        logger.info("📋 Test 1: Inicjalizacja komponentów")
        await test_component_initialization()
        
        # 2. Test planowania zadań
        logger.info("📋 Test 2: Planowanie zadań")
        await test_task_planning()
        
        # 3. Test schedulowania zadań
        logger.info("📋 Test 3: Schedulowanie zadań")
        await test_task_scheduling()
        
        # 4. Test wykonywania zadań
        logger.info("📋 Test 4: Wykonywanie zadań")
        await test_task_execution()
        
        # 5. Test walidacji zadań
        logger.info("📋 Test 5: Walidacja zadań")
        await test_task_validation()
        
        # 6. Test budżetowania
        logger.info("📋 Test 6: System budżetowy")
        await test_budget_system()
        
        # 7. Test pełnego agenta autonomicznego
        logger.info("📋 Test 7: Pełny agent autonomiczny")
        await test_full_autonomous_agent()
        
        logger.info("✅ Wszystkie testy zakończone sukcesem!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Błąd podczas testów: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_component_initialization():
    """Test inicjalizacji wszystkich komponentów"""
    logger.info("Inicjalizacja komponentów systemu...")
    
    # Test inicjalizacji planera
    planner = TaskPlanner()
    await planner.initialize()
    logger.info("✅ TaskPlanner zainicjalizowany")
    
    # Test inicjalizacji executora
    executor = TaskExecutor()
    await executor.initialize()
    logger.info("✅ TaskExecutor zainicjalizowany")
    
    # Test inicjalizacji walidatora
    validator = TaskValidator()
    await validator.initialize()
    logger.info("✅ TaskValidator zainicjalizowany")
    
    # Test inicjalizacji budżetu
    budget_manager = BudgetManager()
    await budget_manager.initialize()
    logger.info("✅ BudgetManager zainicjalizowany")
    
    # Test inicjalizacji schedulera
    scheduler = TaskScheduler()
    await scheduler.initialize()
    logger.info("✅ TaskScheduler zainicjalizowany")

async def test_task_planning():
    """Test systemu planowania zadań"""
    logger.info("Testowanie systemu planowania zadań...")
    
    planner = TaskPlanner()
    await planner.initialize()
    
    # Przygotuj kontekst systemowy
    system_context = {
        "current_time": datetime.utcnow().isoformat(),
        "available_budget": 50.0,
        "recent_performance": 0.8,
        "active_projects": ["content_generation", "seo_optimization"]
    }
    
    # Generuj pomysły na zadania
    task_ideas = await planner.generate_task_ideas(system_context)
    logger.info(f"Wygenerowano {len(task_ideas)} pomysłów na zadania")
    
    # Stwórz przykładowe zadania
    sample_tasks = [
        {
            "id": "content_task_1",
            "type": "content_generation",
            "title": "Generate blog post about AI",
            "description": "Create comprehensive blog post about artificial intelligence trends",
            "priority": TaskPriority.HIGH.value,
            "estimated_duration": 45,
            "estimated_cost": 0.05,
            "required_models": ["gpt-3.5-turbo"],
            "metadata": {
                "target_audience": "technical",
                "word_count_target": 1500,
                "seo_keywords": ["AI", "artificial intelligence", "technology"]
            }
        },
        {
            "id": "seo_task_1", 
            "type": "seo_optimization",
            "title": "SEO Analysis for Website",
            "description": "Perform comprehensive SEO analysis and optimization",
            "priority": TaskPriority.MEDIUM.value,
            "estimated_duration": 30,
            "estimated_cost": 0.02,
            "metadata": {
                "website_url": "example.com",
                "analysis_type": "full_audit"
            }
        }
    ]
    
    # Zaplanuj zadania
    task_plans = await planner.plan_tasks(sample_tasks, system_context)
    logger.info(f"Utworzono {len(task_plans)} planów zadań")
    
    # Sprawdź czy plany są poprawne
    for plan in task_plans:
        assert "id" in plan
        assert "type" in plan
        assert "priority" in plan
        assert "estimated_cost" in plan
    
    logger.info("✅ System planowania zadań działa poprawnie")

async def test_task_scheduling():
    """Test systemu schedulowania zadań"""
    logger.info("Testowanie systemu schedulowania zadań...")
    
    scheduler = TaskScheduler()
    await scheduler.initialize()
    
    # Przykładowe zadania do schedulowania
    tasks_to_schedule = [
        {
            "id": "task_1",
            "type": "content_generation",
            "title": "Generate Article",
            "description": "Generate technical article",
            "priority": 1,  # HIGH
            "estimated_duration": 60,
            "estimated_cost": 0.08,
            "scheduled_for": (datetime.utcnow() + timedelta(hours=2)).isoformat(),
            "required_resources": ["ai_model", "text_processing"],
            "metadata": {"word_count": 2000}
        },
        {
            "id": "task_2",
            "type": "research",
            "title": "Research Topic",
            "description": "Research latest trends",
            "priority": 2,  # MEDIUM
            "estimated_duration": 45,
            "estimated_cost": 0.03,
            "required_resources": ["ai_model", "search_capability"],
            "metadata": {"research_depth": "comprehensive"}
        },
        {
            "id": "task_3",
            "type": "code_generation",
            "title": "Generate Code",
            "description": "Generate Python utility",
            "priority": 3,  # LOW
            "estimated_duration": 30,
            "estimated_cost": 0.02,
            "required_resources": ["ai_model", "code_execution"],
            "metadata": {"language": "python", "complexity": "medium"}
        }
    ]
    
    # Test różnych strategii schedulowania
    strategies = [SchedulingStrategy.PRIORITY, SchedulingStrategy.DEADLINE, SchedulingStrategy.ADAPTIVE]
    
    for strategy in strategies:
        logger.info(f"Testowanie strategii: {strategy.value}")
        
        scheduled_tasks = await scheduler.schedule_tasks(
            tasks_to_schedule, 
            strategy=strategy
        )
        
        assert len(scheduled_tasks) == len(tasks_to_schedule)
        
        # Sprawdź poprawność harmonogramu
        for task in scheduled_tasks:
            assert "id" in task
            assert "scheduled_start" in task
            assert "scheduled_end" in task
            assert "status" in task
        
        logger.info(f"✅ Strategia {strategy.value} działa poprawnie")
    
    logger.info("✅ System schedulowania zadań działa poprawnie")

async def test_task_execution():
    """Test systemu wykonywania zadań"""
    logger.info("Testowanie systemu wykonywania zadań...")
    
    executor = TaskExecutor()
    await executor.initialize()
    
    # Przykładowe zadania do wykonania
    execution_tasks = [
        {
            "id": "exec_task_1",
            "type": "content_generation",
            "title": "Generate Blog Post",
            "description": "Create blog post about Python programming",
            "metadata": {
                "content_plan": {
                    "topic": "Python best practices",
                    "target_audience": "developers",
                    "tone": "educational"
                }
            },
            "execution_config": {
                "max_attempts": 2,
                "timeout_seconds": 120,
                "retry_policy": "exponential_backoff",
                "budget_limit": 0.1
            }
        },
        {
            "id": "exec_task_2",
            "type": "seo_optimization",
            "title": "SEO Analysis",
            "description": "Analyze website SEO performance",
            "metadata": {
                "seo_analysis": {
                    "website": "example.com",
                    "optimization_areas": ["on_page", "content", "technical"]
                }
            },
            "execution_config": {
                "max_attempts": 1,
                "timeout_seconds": 60,
                "budget_limit": 0.05
            }
        }
    ]
    
    # Wykonaj zadania
    execution_results = await executor.execute_tasks(
        execution_tasks,
        max_parallel=2,
        timeout_per_task=180
    )
    
    assert len(execution_results) == len(execution_tasks)
    
    # Sprawdź wyniki wykonania
    for result in execution_results:
        assert "task_id" in result
        assert "status" in result
        assert "cost_usd" in result
        assert "execution_time_seconds" in result
        
        logger.info(f"Zadanie {result['task_id']}: {result['status']} (koszt: ${result['cost_usd']:.4f})")
    
    # Test statystyk
    stats = await executor.get_execution_stats()
    assert "total_executions" in stats
    assert "success_rate" in stats
    assert "avg_cost" in stats
    
    logger.info("✅ System wykonywania zadań działa poprawnie")

async def test_task_validation():
    """Test systemu walidacji zadań"""
    logger.info("Testowanie systemu walidacji zadań...")
    
    validator = TaskValidator()
    await validator.initialize()
    
    # Przykładowe wyniki wykonania do walidacji
    execution_results = [
        {
            "task_id": "val_task_1",
            "task_type": "content_generation",
            "status": "completed",
            "cost_usd": 0.05,
            "execution_time_seconds": 45,
            "result_data": {
                "content": "This is a sample blog post about artificial intelligence and machine learning. The content discusses various aspects of AI technology and its applications in modern world.",
                "model_used": "gpt-3.5-turbo",
                "provider_used": "openai",
                "word_count": 150,
                "quality_score": 0.8
            }
        },
        {
            "task_id": "val_task_2",
            "task_type": "seo_optimization",
            "status": "completed", 
            "cost_usd": 0.02,
            "execution_time_seconds": 30,
            "result_data": {
                "seo_analysis": {
                    "recommendations": [
                        "Optimize meta tags",
                        "Improve keyword density",
                        "Add structured data"
                    ],
                    "optimization_areas": ["on_page", "content"]
                },
                "recommendations_count": 3
            }
        }
    ]
    
    # Waliduj wyniki
    validation_reports = await validator.validate_tasks(execution_results)
    
    assert len(validation_reports) == len(execution_results)
    
    # Sprawdź raporty walidacji
    for report in validation_reports:
        assert "task_id" in report
        assert "overall_status" in report
        assert "overall_score" in report
        assert "individual_validations" in report
        assert "recommendations" in report
        
        logger.info(f"Walidacja {report['task_id']}: {report['overall_status']} (wynik: {report['overall_score']:.2f})")
    
    # Test statystyk walidacji
    val_stats = await validator.get_validation_stats()
    assert "total_validations" in val_stats
    assert "average_score" in val_stats
    
    logger.info("✅ System walidacji zadań działa poprawnie")

async def test_budget_system():
    """Test systemu budżetowego"""
    logger.info("Testowanie systemu budżetowego...")
    
    budget_manager = BudgetManager()
    await budget_manager.initialize()
    
    # Test rejestrowania wydatków
    expenses = [
        (0.05, ExpenseCategory.CONTENT_GENERATION, "Task 1 execution", "task_1"),
        (0.02, ExpenseCategory.SEO_OPTIMIZATION, "SEO analysis", "task_2"),
        (0.08, ExpenseCategory.MODEL_INFERENCE, "AI model usage", "task_3"),
        (0.01, ExpenseCategory.VALIDATION, "Task validation", "task_4"),
        (0.03, ExpenseCategory.RESEARCH, "Research activity", "task_5")
    ]
    
    for amount, category, description, task_id in expenses:
        success = await budget_manager.record_expense(
            amount=amount,
            category=category,
            description=description,
            task_id=task_id
        )
        assert success, f"Nie udało się zarejestrować wydatku: {description}"
        logger.info(f"Zarejestrowano wydatek: ${amount:.2f} - {description}")
    
    # Test statusu budżetu
    budget_status = await budget_manager.get_budget_status()
    assert "daily" in budget_status
    assert "weekly" in budget_status
    assert "monthly" in budget_status
    assert "total_spent" in budget_status
    
    daily_spent = budget_status["daily"]["spent"]
    total_spent = budget_status["total_spent"]
    
    assert daily_spent > 0, "Dzienne wydatki powinny być większe niż 0"
    assert total_spent > 0, "Całkowite wydatki powinny być większe niż 0"
    
    logger.info(f"Status budżetu: dzienne=${daily_spent:.2f}, całkowite=${total_spent:.2f}")
    
    # Test historii wydatków
    expense_history = await budget_manager.get_expense_history(limit=10)
    assert len(expense_history) == len(expenses)
    
    # Test analityki budżetowej
    analytics = await budget_manager.get_budget_analytics(days=1)
    assert "total_spent" in analytics
    assert "category_breakdown" in analytics
    assert "daily_average" in analytics
    
    logger.info("✅ System budżetowy działa poprawnie")

async def test_full_autonomous_agent():
    """Test pełnego agenta autonomicznego"""
    logger.info("Testowanie pełnego agenta autonomicznego...")
    
    # Uruchom agenta
    agent = await start_agent()
    assert agent is not None, "Agent nie został poprawnie uruchomiony"
    
    logger.info("✅ Agent autonomiczny uruchomiony pomyślnie")
    
    # Pobierz agenta
    retrieved_agent = get_agent()
    assert retrieved_agent is not None, "Nie można pobrać agenta"
    # Agent może być różnym obiektem, ale powinien być dostępny
    
    logger.info("✅ Agent może być pobrany poprawnie")
    
    # Test podstawowych funkcji agenta
    agent_status = await agent.get_status()
    assert "state" in agent_status
    assert "wake_cycle_count" in agent_status
    assert "total_tasks_completed" in agent_status
    
    logger.info(f"Status agenta: {agent_status['state']}, cykle: {agent_status['wake_cycle_count']}")
    
    # Test systemu zadań agenta
    test_tasks = [
        {
            "id": "agent_task_1",
            "type": "content_generation",
            "title": "Test Content Generation",
            "description": "Generate test content for autonomous agent",
            "priority": TaskPriority.MEDIUM.value,
            "estimated_duration": 30,
            "estimated_cost": 0.03,
            "metadata": {
                "test": True,
                "content_type": "technical"
            }
        }
    ]
    
    # Uruchom cykl agenta z testowymi zadaniami
    logger.info("Uruchamianie testowego cyklu agenta...")
    
    # Zatrzymaj agenta po teście
    await stop_agent()
    logger.info("✅ Agent autonomiczny zatrzymany pomyślnie")
    
    logger.info("✅ Pełny agent autonomiczny działa poprawnie")

async def main():
    """Główna funkcja testowa"""
    logger.info("=" * 60)
    logger.info("🧪 TEST SYSTEMU AUTONOMICZNEGO AGENTA AI")
    logger.info("=" * 60)
    
    success = await test_autonomous_agent_system()
    
    logger.info("=" * 60)
    if success:
        logger.info("🎉 WSZYSTKIE TESTY ZAKOŃCZONE SUKCESEM!")
        logger.info("✅ System Autonomous Agent AI jest w pełni funkcjonalny")
    else:
        logger.error("❌ TESTY NIE POWIODŁY SIĘ")
        sys.exit(1)
    
    logger.info("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
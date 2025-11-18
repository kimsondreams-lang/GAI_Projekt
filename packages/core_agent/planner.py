"""
Zaawansowany planer zadań dla Autonomous Agent AI
Zawiera inteligentne planowanie zadań, generowanie treści, SEO i optymalizację
"""

import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum
import time
import random
import re

from packages.models.invoke import ModelManager
from packages.memory import get_memory_store
from packages.core_agent.budget import BudgetManager

logger = logging.getLogger(__name__)

class TaskType(Enum):
    """Typy zadań"""
    CONTENT_GENERATION = "content_generation"
    SEO_OPTIMIZATION = "seo_optimization"
    RESEARCH = "research"
    ANALYSIS = "analysis"
    CODE_GENERATION = "code_generation"
    TESTING = "testing"
    DEPLOYMENT = "deployment"
    MONITORING = "monitoring"
    MAINTENANCE = "maintenance"
    PUBLISHING = "publishing"
    AMAZON_INTEGRATION = "amazon_integration"
    ANALYTICS = "analytics"

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
    PLANNED = "planned"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class Task:
    """Zadanie do wykonania"""
    id: str
    type: TaskType
    title: str
    description: str
    priority: TaskPriority
    estimated_cost: float
    estimated_duration: int  # w minutach
    required_models: List[str]
    dependencies: List[str]
    metadata: Dict[str, Any]
    created_at: datetime
    scheduled_for: Optional[datetime]
    status: TaskStatus
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

@dataclass
class ContentTask:
    """Zadanie generowania treści"""
    topic: str
    content_type: str  # "article", "blog_post", "documentation", "social_media"
    target_audience: str
    keywords: List[str]
    tone: str  # "professional", "casual", "technical", "creative"
    length_target: int  # target word count
    seo_requirements: Dict[str, Any]
    research_context: Optional[str] = None

@dataclass
class SEOTask:
    """Zadanie SEO"""
    url: str
    current_metrics: Dict[str, Any]
    target_improvements: Dict[str, Any]
    competitor_analysis: bool
    keyword_research: bool
    technical_seo: bool

class TaskPlanner:
    """
    Zaawansowany planer zadań dla agenta AI
    """
    
    def __init__(self):
        self.model_manager = ModelManager()
        self.memory_store = None
        self.budget_manager = None
        self.task_templates = self._load_task_templates()
        self.content_strategies = self._load_content_strategies()
        
        logger.info("TaskPlanner zainicjalizowany")
    
    async def initialize(self):
        """Inicjalizacja planera"""
        logger.info("Inicjalizacja TaskPlanner...")
        
        self.memory_store = await get_memory_store()
        self.budget_manager = BudgetManager()
        await self.budget_manager.initialize()
        
        logger.info("TaskPlanner został zainicjalizowany")
    
    def _load_task_templates(self) -> Dict[str, Any]:
        """Ładowanie szablonów zadań"""
        return {
            "content_generation": {
                "description": "Generate high-quality content based on research and SEO analysis",
                "estimated_cost": 0.05,
                "estimated_duration": 30,
                "required_models": ["gpt-4", "claude-3-sonnet"],
                "priority": TaskPriority.HIGH
            },
            "seo_optimization": {
                "description": "Analyze and optimize content for search engines",
                "estimated_cost": 0.02,
                "estimated_duration": 15,
                "required_models": ["gpt-3.5-turbo"],
                "priority": TaskPriority.MEDIUM
            },
            "research": {
                "description": "Research topics, competitors, and trends",
                "estimated_cost": 0.03,
                "estimated_duration": 20,
                "required_models": ["gpt-4", "claude-3-sonnet"],
                "priority": TaskPriority.HIGH
            },
            "code_generation": {
                "description": "Generate code for features and improvements",
                "estimated_cost": 0.04,
                "estimated_duration": 25,
                "required_models": ["deepseek-coder", "gpt-4"],
                "priority": TaskPriority.MEDIUM
            },
            "testing": {
                "description": "Test generated content and code",
                "estimated_cost": 0.01,
                "estimated_duration": 10,
                "required_models": ["gpt-3.5-turbo"],
                "priority": TaskPriority.MEDIUM
            },
            "deployment": {
                "description": "Deploy changes to production",
                "estimated_cost": 0.01,
                "estimated_duration": 5,
                "required_models": [],
                "priority": TaskPriority.CRITICAL
            }
        }
    
    def _load_content_strategies(self) -> Dict[str, Any]:
        """Ładowanie strategii content marketingu"""
        return {
            "blog_strategy": {
                "frequency": "2-3 posts per week",
                "content_types": ["how_to", "industry_insights", "case_studies", "tutorials"],
                "target_length": 1500,
                "seo_focus": True,
                "audience": "technical professionals"
            },
            "social_strategy": {
                "platforms": ["twitter", "linkedin", "reddit"],
                "frequency": "daily",
                "content_types": ["tips", "news", "questions", "showcase"],
                "target_length": 280,
                "engagement_focus": True
            },
            "documentation_strategy": {
                "types": ["api_docs", "tutorials", "guides", "faq"],
                "frequency": "weekly",
                "target_length": 2000,
                "clarity_focus": True,
                "technical_accuracy": True
            }
        }
    
    async def generate_task_ideas(self, system_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generowanie pomysłów na zadania na podstawie kontekstu systemowego"""
        logger.info("Generowanie pomysłów na zadania...")
        
        try:
            # Analiza kontekstu systemowego
            available_budget = system_context.get("available_budget", 10.0)
            recent_performance = system_context.get("recent_performance", 0.5)
            active_projects = system_context.get("active_projects", [])
            
            # Generuj pomysły na podstawie kontekstu
            task_ideas = []
            
            # Jeśli budżet jest wystarczający
            if available_budget > 5.0:
                task_ideas.extend([
                    {
                        "id": f"idea_{int(time.time())}_1",
                        "type": "content_generation",
                        "title": "Generate Technical Content",
                        "description": "Create comprehensive technical content",
                        "priority": TaskPriority.MEDIUM,
                        "estimated_cost": 0.05,
                        "estimated_duration": 45,
                        "rationale": "High budget allows for content generation"
                    },
                    {
                        "id": f"idea_{int(time.time())}_2", 
                        "type": "research",
                        "title": "Market Research",
                        "description": "Research current market trends",
                        "priority": TaskPriority.MEDIUM,
                        "estimated_cost": 0.03,
                        "estimated_duration": 30,
                        "rationale": "Research supports content strategy"
                    }
                ])
            
            # Jeśli wydajność jest dobra
            if recent_performance > 0.7:
                task_ideas.append({
                    "id": f"idea_{int(time.time())}_3",
                    "type": "optimization",
                    "title": "System Optimization",
                    "description": "Optimize system performance",
                    "priority": TaskPriority.LOW,
                    "estimated_cost": 0.02,
                    "estimated_duration": 20,
                    "rationale": "Good performance allows for optimization tasks"
                })
            
            # Na podstawie aktywnych projektów
            if "content_generation" in active_projects:
                task_ideas.append({
                    "id": f"idea_{int(time.time())}_4",
                    "type": "content_generation",
                    "title": "SEO Content Creation",
                    "description": "Create SEO-optimized content",
                    "priority": TaskPriority.HIGH,
                    "estimated_cost": 0.08,
                    "estimated_duration": 60,
                    "rationale": "Active content generation project"
                })
            
            if "seo_optimization" in active_projects:
                task_ideas.append({
                    "id": f"idea_{int(time.time())}_5",
                    "type": "seo_optimization",
                    "title": "SEO Analysis",
                    "description": "Analyze and improve SEO performance",
                    "priority": TaskPriority.MEDIUM,
                    "estimated_cost": 0.04,
                    "estimated_duration": 35,
                    "rationale": "Active SEO optimization project"
                })
            
            logger.info(f"Wygenerowano {len(task_ideas)} pomysłów na zadania")
            return task_ideas
            
        except Exception as e:
            logger.error(f"Błąd generowania pomysłów na zadania: {e}")
            return []
    async def _create_task_plan(self, task: Dict[str, Any], system_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Tworzenie szczegółowego planu zadania"""
        try:
            # Podstawowe informacje o zadaniu
            task_plan = task.copy()
            
            # Dodaj informacje o planowaniu
            task_plan["planned_at"] = datetime.utcnow().isoformat()
            task_plan["planning_metadata"] = {
                "system_context": system_context or {},
                "planning_version": "1.0",
                "planner_id": id(self)
            }
            
            # Ustal priorytet
            priority = task.get("priority", TaskPriority.MEDIUM)
            if isinstance(priority, str):
                priority = TaskPriority[priority.upper()]
            elif isinstance(priority, int):
                # Konwertuj liczbę na enum
                priority_map = {1: TaskPriority.CRITICAL, 2: TaskPriority.HIGH, 3: TaskPriority.MEDIUM, 4: TaskPriority.LOW, 5: TaskPriority.OPTIONAL}
                priority = priority_map.get(priority, TaskPriority.MEDIUM)
            
            task_plan["priority_value"] = priority.value
            
            # Oblicz szacowany koszt
            estimated_cost = task.get("estimated_cost", 0.05)
            task_plan["estimated_cost_usd"] = estimated_cost
            
            # Ustal czas trwania
            estimated_duration = task.get("estimated_duration", 30)
            task_plan["estimated_duration_minutes"] = estimated_duration
            
            # Określ wymagane zasoby
            task_type = task.get("type", "unknown")
            required_resources = self._determine_required_resources(task_type)
            task_plan["required_resources"] = required_resources
            
            # Określ zależności
            dependencies = task.get("dependencies", [])
            task_plan["dependencies"] = dependencies
            
            # Dodaj rekomendacje
            recommendations = self._generate_task_recommendations(task, system_context)
            task_plan["recommendations"] = recommendations
            
            return task_plan
            
        except Exception as e:
            logger.error(f"Błąd tworzenia planu zadania: {e}")
            return task  # Zwróć oryginalne zadanie w razie błędu
    
    def _determine_required_resources(self, task_type: str) -> List[str]:
        """Określanie wymaganych zasobów na podstawie typu zadania"""
        resource_mapping = {
            "content_generation": ["ai_model", "text_processing", "memory"],
            "seo_optimization": ["ai_model", "web_scraping", "analysis"],
            "research": ["ai_model", "search_capability", "memory"],
            "code_generation": ["ai_model", "code_execution", "memory"],
            "validation": ["ai_model", "analysis", "memory"],
            "system_analysis": ["memory", "logging"],
            "unknown": ["ai_model", "memory"]
        }
        
        return resource_mapping.get(task_type, resource_mapping["unknown"])
    
    def _generate_task_recommendations(self, task: Dict[str, Any], system_context: Optional[Dict[str, Any]]) -> List[str]:
        """Generowanie rekomendacji dla zadania"""
        recommendations = []
        
        try:
            task_type = task.get("type", "unknown")
            estimated_cost = task.get("estimated_cost", 0.05)
            
            # Rekomendacje na podstawie typu
            if task_type == "content_generation":
                recommendations.append("Use GPT-3.5-turbo for cost-effective content generation")
                recommendations.append("Consider word count limits for budget optimization")
            elif task_type == "seo_optimization":
                recommendations.append("Focus on high-impact SEO improvements first")
                recommendations.append("Analyze competitor strategies")
            
            # Rekomendacje na podstawie kosztu
            if estimated_cost > 0.1:
                recommendations.append("High-cost task - consider optimization")
            
            # Rekomendacje na podstawie kontekstu
            if system_context:
                budget = system_context.get("available_budget", 0)
                if budget < estimated_cost * 2:
                    recommendations.append("Low budget - consider postponing or finding alternatives")
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Błąd generowania rekomendacji: {e}")
            return ["Standard execution recommended"]
    
    async def _prioritize_tasks(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Priorytetyzacja zadań"""
        try:
            # Sortuj według priorytetu (niższa wartość = wyższy priorytet)
            return sorted(tasks, key=lambda t: t.get("priority_value", 3))
            
        except Exception as e:
            logger.error(f"Błąd priorytetyzacji zadań: {e}")
            return tasks
    
    async def _validate_budget_constraints(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Walidacja ograniczeń budżetowych"""
        try:
            # Pobierz status budżetu
            budget_status = await self.budget_manager.get_budget_status()
            remaining_budget = budget_status.get("remaining_budget", 0.0)
            
            # Filtruj zadania, które mieszczą się w budżecie
            valid_tasks = []
            total_cost = 0.0
            
            for task in tasks:
                task_cost = task.get("estimated_cost_usd", 0.05)
                
                if total_cost + task_cost <= remaining_budget:
                    valid_tasks.append(task)
                    total_cost += task_cost
                else:
                    logger.warning(f"Zadanie {task.get('id')} przekracza budżet - pomijam")
            
            logger.info(f"Zwalidowano {len(valid_tasks)} zadań w budżecie (${total_cost:.4f})")
            return valid_tasks
            
        except Exception as e:
            logger.error(f"Błąd walidacji budżetu: {e}")
            return tasks  # W razie błędu zwróć wszystkie zadania
    
    async def _save_task_plan(self, task_plan: Dict[str, Any], system_context: Optional[Dict[str, Any]] = None):
        """Zapisywanie planu zadania do pamięci"""
        try:
            task_id = task_plan.get("id", "unknown")
            
            # Dodaj kontekst systemowy do planu
            plan_with_context = task_plan.copy()
            if system_context:
                plan_with_context["system_context"] = system_context
            
            await self.memory_store.store_context(
                context_type="system",
                context_key=f"task_plan_{task_id}",
                title=f"Task Plan: {task_plan.get('title', 'Unknown')}",
                content=json.dumps(plan_with_context, indent=2, default=str),
                tags=["task_plan", "system", task_plan.get("type", "unknown")],
                importance_score=0.7,
                expires_in_days=7
            )
            
        except Exception as e:
            logger.error(f"Błąd zapisywania planu zadania: {e}")
    
    async def plan_tasks(self, tasks: List[Dict[str, Any]], system_context: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Główna metoda planowania zadań
        
        Args:
            tasks: Lista zadań do zaplanowania
            system_context: Opcjonalny kontekst systemowy
            
        Returns:
            Lista zaplanowanych zadań z dodatkowymi informacjami
        """
        logger.info(f"Rozpoczęcie planowania {len(tasks)} zadań...")
        
        try:
            planned_tasks = []
            
            for task in tasks:
                # Utwórz plan dla każdego zadania
                task_plan = await self._create_task_plan(task, system_context)
                planned_tasks.append(task_plan)
            
            # Priorytetyzacja
            prioritized_tasks = await self._prioritize_tasks(planned_tasks)
            
            # Walidacja budżetu
            budget_valid_tasks = await self._validate_budget_constraints(prioritized_tasks)
            
            # Zapisz plany w pamięci
            for task_plan in budget_valid_tasks:
                await self._save_task_plan(task_plan, system_context)
            
            logger.info(f"Zaplanowano {len(budget_valid_tasks)} zadań")
            return budget_valid_tasks
            
        except Exception as e:
            logger.error(f"Błąd planowania zadań: {e}")
            return []
        """
        Główna metoda planowania zadań
        
        Args:
            tasks: Lista zadań do zaplanowania
            system_context: Opcjonalny kontekst systemowy
            
        Returns:
            Lista zaplanowanych zadań z dodatkowymi informacjami
        """
        logger.info(f"Rozpoczęcie planowania {len(tasks)} zadań...")
        
        try:
            planned_tasks = []
            
            for task in tasks:
                # Utwórz plan dla każdego zadania
                task_plan = await self._create_task_plan(task, system_context)
                planned_tasks.append(task_plan)
            
            # Priorytetyzacja
            prioritized_tasks = await self._prioritize_tasks(planned_tasks)
            
            # Walidacja budżetu
            budget_valid_tasks = await self._validate_budget_constraints(prioritized_tasks)
            
            # Zapisz plany w pamięci
            for task_plan in budget_valid_tasks:
                await self._save_task_plan(task_plan)
            
            logger.info(f"Zaplanowano {len(budget_valid_tasks)} zadań")
            return budget_valid_tasks
            
        except Exception as e:
            logger.error(f"Błąd planowania zadań: {e}")
            return []
    
    async def _analyze_context(self, system_state: Dict[str, Any]) -> Dict[str, Any]:
        """Analiza kontekstu dla planowania"""
        logger.info("Analiza kontekstu systemowego...")
        
        try:
            # Analiza historii i trendów
            recent_contexts = await self.memory_store.get_recent_context(
                context_type="system",
                limit=20,
                include_content=True
            )
            
            # Analiza poprzednich zadań
            task_history = await self._analyze_task_history()
            
            # Analiza budżetu
            budget_status = system_state.get("budget_status", {})
            
            # Analiza dostępnych modeli
            model_availability = system_state.get("model_availability", {})
            
            # Trendy i wzorce
            trends = await self._identify_trends(recent_contexts)
            
            context = {
                "recent_system_activity": len(recent_contexts),
                "task_history_summary": task_history,
                "budget_constraints": budget_status,
                "available_models": [model for model, available in model_availability.items() if available],
                "identified_trends": trends,
                "system_load": system_state.get("system_load", 0.0),
                "recommendations": []
            }
            
            # Generowanie rekomendacji
            recommendations = await self._generate_recommendations(context)
            context["recommendations"] = recommendations
            
            logger.info("Analiza kontekstu zakończona")
            return context
            
        except Exception as e:
            logger.error(f"Błąd analizy kontekstu: {e}")
            return {"error": str(e)}
    
    async def _analyze_task_history(self) -> Dict[str, Any]:
        """Analiza historii zadań"""
        try:
            # Wyszukiwanie kontekstów związanych z zadaniami
            task_contexts = await self.memory_store.search_similar_context(
                query="task execution performance results",
                context_type="system",
                limit=10
            )
            
            summary = {
                "total_tasks_analyzed": len(task_contexts),
                "success_rate": 0.0,
                "avg_cost": 0.0,
                "common_task_types": [],
                "performance_insights": []
            }
            
            if task_contexts:
                # Prosta analiza sukcesu
                successful_tasks = sum(1 for ctx in task_contexts if "success" in ctx.get("content", "").lower())
                summary["success_rate"] = successful_tasks / len(task_contexts)
                
                # Ekstrakcja typów zadań
                for ctx in task_contexts:
                    content = ctx.get("content", "")
                    if "content_generation" in content:
                        summary["common_task_types"].append("content_generation")
                    if "seo_optimization" in content:
                        summary["common_task_types"].append("seo_optimization")
            
            return summary
            
        except Exception as e:
            logger.error(f"Błąd analizy historii zadań: {e}")
            return {"error": str(e)}
    
    async def _identify_trends(self, contexts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identyfikacja trendów z kontekstów"""
        trends = []
        
        try:
            # Prosta analiza trendów
            content_words = []
            for ctx in contexts:
                content = ctx.get("content", "").lower()
                words = re.findall(r'\b\w+\b', content)
                content_words.extend(words)
            
            # Liczenie częstotliwości słów
            word_freq = {}
            for word in content_words:
                if len(word) > 4:  # Tylko dłuższe słowa
                    word_freq[word] = word_freq.get(word, 0) + 1
            
            # Top 10 słów kluczowych
            top_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:10]
            
            for word, freq in top_words:
                trends.append({
                    "type": "keyword_trend",
                    "keyword": word,
                    "frequency": freq,
                    "significance": "high" if freq > 5 else "medium"
                })
            
            return trends
            
        except Exception as e:
            logger.error(f"Błąd identyfikacji trendów: {e}")
            return []
    
    async def _generate_recommendations(self, context: Dict[str, Any]) -> List[str]:
        """Generowanie rekomendacji na podstawie kontekstu"""
        recommendations = []
        
        try:
            # Rekomendacje na podstawie system load
            if context.get("system_load", 0) > 0.7:
                recommendations.append("Reduce task complexity due to high system load")
            
            # Rekomendacje na podstawie budżetu
            budget_constraints = context.get("budget_constraints", {})
            if budget_constraints.get("remaining_budget", 0) < 5.0:
                recommendations.append("Focus on low-cost, high-impact tasks")
            
            # Rekomendacje na podstawie dostępnych modeli
            available_models = context.get("available_models", [])
            if "gpt-4" not in available_models:
                recommendations.append("Use alternative models for complex tasks")
            
            # Rekomendacje na podstawie trendów
            trends = context.get("identified_trends", [])
            for trend in trends[:3]:  # Top 3 trendy
                if trend.get("significance") == "high":
                    recommendations.append(f"Create content about '{trend.get('keyword')}'")
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Błąd generowania rekomendacji: {e}")
            return []
    
    async def _generate_task_ideas(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generowanie pomysłów na zadania"""
        logger.info("Generowanie pomysłów na zadania...")
        
        try:
            # Użyj AI do wygenerowania pomysłów
            prompt = self._create_task_generation_prompt(context)
            
            response = await self.model_manager.amodel_infer(
                task="chat_general",
                messages=[{"role": "user", "content": prompt}],
                model="gpt-3.5-turbo",
                provider="openai"
            )
            
            ideas_content = response.get("content", "")
            ideas = self._parse_task_ideas(ideas_content)
            
            # Dodaj rekomendowane zadania
            recommendations = context.get("recommendations", [])
            for rec in recommendations:
                ideas.append({
                    "type": "recommended",
                    "title": rec,
                    "description": f"Recommended task: {rec}",
                    "priority": TaskPriority.MEDIUM
                })
            
            logger.info(f"Wygenerowano {len(ideas)} pomysłów na zadania")
            return ideas
            
        except Exception as e:
            logger.error(f"Błąd generowania pomysłów: {e}")
            # Fallback - podstawowe zadania
            return self._get_fallback_task_ideas()
    
    def _create_task_generation_prompt(self, context: Dict[str, Any]) -> str:
        """Tworzenie prompta do generowania zadań"""
        return f"""
        Based on the following system context, generate a list of specific, actionable tasks for an AI agent:
        
        System Context:
        - Available models: {', '.join(context.get('available_models', []))}
        - Budget constraints: {json.dumps(context.get('budget_constraints', {}))}
        - System load: {context.get('system_load', 0)}
        - Recent trends: {json.dumps(context.get('identified_trends', [])[:3])}
        - Recommendations: {json.dumps(context.get('recommendations', []))}
        
        Generate 10-15 specific tasks that would be valuable for:
        1. Content creation and marketing
        2. SEO optimization
        3. System improvements
        4. Research and analysis
        5. Code development
        
        For each task, provide:
        - Type (content_generation, seo_optimization, research, etc.)
        - Title
        - Description
        - Estimated priority (1-5, where 1 is highest)
        - Estimated cost in USD
        - Required models
        
        Format the response as a JSON array of task objects.
        """
    
    def _parse_task_ideas(self, content: str) -> List[Dict[str, Any]]:
        """Parsowanie pomysłów na zadania z odpowiedzi AI"""
        ideas = []
        
        try:
            # Spróbuj wydobyć JSON
            json_match = re.search(r'\[\s*\{.*\}\s*\]', content, re.DOTALL)
            if json_match:
                tasks_data = json.loads(json_match.group())
                for task_data in tasks_data:
                    ideas.append({
                        "type": task_data.get("type", "unknown"),
                        "title": task_data.get("title", "Untitled Task"),
                        "description": task_data.get("description", ""),
                        "priority": self._parse_priority(task_data.get("priority", 3)),
                        "estimated_cost": float(task_data.get("estimated_cost", 0.05)),
                        "required_models": task_data.get("required_models", [])
                    })
            
            # Jeśli nie udało się znaleźć JSON, parsuj tekstowo
            if not ideas:
                ideas = self._parse_text_task_ideas(content)
            
            return ideas
            
        except Exception as e:
            logger.error(f"Błąd parsowania pomysłów: {e}")
            return self._get_fallback_task_ideas()
    
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
    
    def _parse_text_task_ideas(self, content: str) -> List[Dict[str, Any]]:
        """Parsowanie tekstowych pomysłów"""
        ideas = []
        lines = content.split('\n')
        
        current_task = None
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Szukamy linii z nazwą zadania
            if any(keyword in line.lower() for keyword in ["task:", "generate", "create", "optimize", "research"]):
                if current_task:
                    ideas.append(current_task)
                
                current_task = {
                    "type": "content_generation",  # Default
                    "title": line.replace("Task:", "").replace("task:", "").strip(),
                    "description": line,
                    "priority": TaskPriority.MEDIUM,
                    "estimated_cost": 0.05,
                    "required_models": ["gpt-3.5-turbo"]
                }
            elif current_task:
                # Dodajemy opis do aktualnego zadania
                current_task["description"] += " " + line
        
        if current_task:
            ideas.append(current_task)
        
        return ideas[:10]  # Maksymalnie 10 zadań
    
    def _get_fallback_task_ideas(self) -> List[Dict[str, Any]]:
        """Podstawowe zadania fallback"""
        return [
            {
                "type": "content_generation",
                "title": "Generate blog post about AI trends",
                "description": "Create an engaging blog post about current AI trends and developments",
                "priority": TaskPriority.HIGH,
                "estimated_cost": 0.05,
                "required_models": ["gpt-3.5-turbo"]
            },
            {
                "type": "seo_optimization",
                "title": "Optimize existing content for SEO",
                "description": "Review and optimize recent content for better search engine visibility",
                "priority": TaskPriority.MEDIUM,
                "estimated_cost": 0.02,
                "required_models": ["gpt-3.5-turbo"]
            },
            {
                "type": "research",
                "title": "Research competitor content strategy",
                "description": "Analyze competitor content and identify opportunities",
                "priority": TaskPriority.MEDIUM,
                "estimated_cost": 0.03,
                "required_models": ["gpt-3.5-turbo"]
            }
        ]
    
    async def _prioritize_and_select_tasks(self, task_ideas: List[Dict[str, Any]], max_tasks: int, max_cost: float) -> List[Dict[str, Any]]:
        """Priorytetyzacja i selekcja zadań"""
        logger.info("Priorytetyzacja i selekcja zadań...")
        
        try:
            # Filtrowanie zadań zbyt drogich
            affordable_tasks = [
                task for task in task_ideas
                if task.get("estimated_cost", 0) <= max_cost / max_tasks
            ]
            
            # Sortowanie według priorytetu
            affordable_tasks.sort(key=lambda x: x.get("priority", TaskPriority.MEDIUM).value)
            
            # Selekcja najlepszych zadań
            selected_tasks = affordable_tasks[:max_tasks]
            
            # Oblicz całkowity koszt
            total_cost = sum(task.get("estimated_cost", 0) for task in selected_tasks)
            
            logger.info(f"Wybrano {len(selected_tasks)} zadań, całkowity koszt: ${total_cost:.4f}")
            return selected_tasks
            
        except Exception as e:
            logger.error(f"Błąd priorytetyzacji zadań: {e}")
            return task_ideas[:max_tasks]  # Fallback - pierwsze N zadań
    
    async def _create_detailed_tasks(self, selected_tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Tworzenie szczegółowych zadań"""
        logger.info("Tworzenie szczegółowych zadań...")
        
        detailed_tasks = []
        
        for task_data in selected_tasks:
            try:
                task = await self._create_single_task(task_data)
                detailed_tasks.append(asdict(task))
                
            except Exception as e:
                logger.error(f"Błąd tworzenia zadania {task_data.get('title', 'unknown')}: {e}")
                continue
        
        logger.info(f"Utworzono {len(detailed_tasks)} szczegółowych zadań")
        return detailed_tasks
    
    async def _create_single_task(self, task_data: Dict[str, Any]) -> Task:
        """Tworzenie pojedynczego zadania"""
        task_id = f"task_{datetime.utcnow().timestamp()}_{random.randint(1000, 9999)}"
        
        # Określenie typu zadania
        task_type = self._determine_task_type(task_data.get("type", "unknown"))
        
        # Utworzenie szczegółowego planu
        detailed_plan = await self._create_task_detailed_plan(task_data, task_type)
        
        task = Task(
            id=task_id,
            type=task_type,
            title=task_data.get("title", "Untitled Task"),
            description=detailed_plan.get("description", task_data.get("description", "")),
            priority=task_data.get("priority", TaskPriority.MEDIUM),
            estimated_cost=task_data.get("estimated_cost", 0.05),
            estimated_duration=detailed_plan.get("duration", 30),
            required_models=task_data.get("required_models", ["gpt-3.5-turbo"]),
            dependencies=detailed_plan.get("dependencies", []),
            metadata={
                **task_data.get("metadata", {}),
                "detailed_plan": detailed_plan,
                "original_data": task_data
            },
            created_at=datetime.utcnow(),
            scheduled_for=None,
            status=TaskStatus.PLANNED
        )
        
        return task
    
    def _determine_task_type(self, task_type_str: str) -> TaskType:
        """Określenie typu zadania"""
        try:
            return TaskType(task_type_str)
        except ValueError:
            # Fallback na podstawie nazwy
            task_type_str = task_type_str.lower()
            if "content" in task_type_str or "generate" in task_type_str:
                return TaskType.CONTENT_GENERATION
            elif "seo" in task_type_str or "optimization" in task_type_str:
                return TaskType.SEO_OPTIMIZATION
            elif "research" in task_type_str:
                return TaskType.RESEARCH
            elif "code" in task_type_str or "development" in task_type_str:
                return TaskType.CODE_GENERATION
            elif "test" in task_type_str:
                return TaskType.TESTING
            elif "deploy" in task_type_str:
                return TaskType.DEPLOYMENT
            elif "monitor" in task_type_str:
                return TaskType.MONITORING
            elif "publish" in task_type_str:
                return TaskType.PUBLISHING
            elif "amazon" in task_type_str or "asin" in task_type_str or "affiliate" in task_type_str:
                return TaskType.AMAZON_INTEGRATION
            elif "analytics" in task_type_str or "tracking" in task_type_str:
                return TaskType.ANALYTICS
            else:
                return TaskType.ANALYSIS
    
    async def _create_task_detailed_plan(self, task_data: Dict[str, Any], task_type: TaskType) -> Dict[str, Any]:
        """Tworzenie szczegółowego planu zadania"""
        
        if task_type == TaskType.CONTENT_GENERATION:
            return await self._create_content_task_plan(task_data)
        elif task_type == TaskType.SEO_OPTIMIZATION:
            return await self._create_seo_task_plan(task_data)
        elif task_type == TaskType.RESEARCH:
            return await self._create_research_task_plan(task_data)
        elif task_type == TaskType.CODE_GENERATION:
            return await self._create_code_task_plan(task_data)
        elif task_type == TaskType.PUBLISHING:
            return await self._create_publishing_task_plan(task_data)
        elif task_type == TaskType.AMAZON_INTEGRATION:
            return await self._create_amazon_task_plan(task_data)
        elif task_type == TaskType.ANALYTICS:
            return await self._create_analytics_task_plan(task_data)
        else:
            return await self._create_generic_task_plan(task_data)
    
    async def _create_content_task_plan(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Plan dla zadania generowania treści"""
        try:
            # Użyj AI do wygenerowania szczegółowego planu
            prompt = f"""
            Create a detailed content generation plan for: {task_data.get('title', '')}
            Description: {task_data.get('description', '')}
            
            Include:
            1. Step-by-step process
            2. Required research topics
            3. Content structure outline
            4. SEO keywords to include
            5. Target audience considerations
            6. Quality checkpoints
            7. Estimated time for each step
            
            Format as JSON with keys: steps, research_topics, structure, keywords, audience, checkpoints, duration
            """
            
            response = await self.model_manager.amodel_infer(
                task="chat_general",
                messages=[{"role": "user", "content": prompt}],
                model="gpt-3.5-turbo",
                provider="openai"
            )
            
            plan_content = response.get("content", "")
            
            # Parsuj plan
            try:
                plan = json.loads(plan_content)
            except:
                # Fallback - prosty plan
                plan = {
                    "steps": ["Research", "Outline", "Write", "Review", "Optimize"],
                    "research_topics": ["topic research"],
                    "structure": {"introduction": "20%", "body": "60%", "conclusion": "20%"},
                    "keywords": [],
                    "audience": "general",
                    "checkpoints": ["fact_check", "grammar_check", "seo_check"],
                    "duration": 45
                }
            
            return {
                "description": f"Content generation plan: {json.dumps(plan, indent=2)}",
                "duration": plan.get("duration", 45),
                "dependencies": [],
                "content_plan": plan
            }
            
        except Exception as e:
            logger.error(f"Błąd tworzenia planu content: {e}")
            return {
                "description": "Standard content generation process",
                "duration": 30,
                "dependencies": [],
                "content_plan": {}
            }
    
    async def _create_seo_task_plan(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Plan dla zadania SEO"""
        return {
            "description": "SEO optimization including keyword research, meta tags, content optimization",
            "duration": 20,
            "dependencies": [],
            "seo_plan": {
                "steps": ["Keyword analysis", "Meta optimization", "Content review", "Technical SEO"],
                "tools": ["SEO analyzer", "Keyword research"]
            }
        }
    
    async def _create_research_task_plan(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Plan dla zadania research"""
        return {
            "description": "Comprehensive research including competitor analysis, trend identification, data collection",
            "duration": 30,
            "dependencies": [],
            "research_plan": {
                "phases": ["Topic definition", "Source identification", "Data collection", "Analysis", "Reporting"],
                "methodology": "mixed_methods"
            }
        }
    
    async def _create_code_task_plan(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Plan dla zadania kodowania"""
        return {
            "description": "Code development with testing, documentation, and quality assurance",
            "duration": 40,
            "dependencies": ["requirements_analysis"],
            "code_plan": {
                "stages": ["Design", "Implementation", "Testing", "Documentation", "Review"],
                "quality_gates": ["unit_tests", "integration_tests", "code_review"]
            }
        }
    
    async def _create_generic_task_plan(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generyczny plan zadania"""
        return {
            "description": task_data.get("description", "Standard task execution"),
            "duration": 30,
            "dependencies": [],
            "generic_plan": {
                "approach": "systematic",
                "validation": "quality_assured"
            }
        }
    
    async def _create_publishing_task_plan(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Plan dla zadania publikacji"""
        return {
            "description": "Publish content to web platform with SEO optimization",
            "duration": 45,
            "dependencies": ["content_generation", "seo_optimization"],
            "publishing_plan": {
                "stages": ["Content preparation", "SEO finalization", "FTP upload", "Sitemap update", "Analytics tracking"],
                "backup_strategy": "enabled",
                "atomic_deployment": True,
                "quality_gates": ["content_review", "seo_check", "link_validation"]
            }
        }
    
    async def _create_amazon_task_plan(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Plan dla zadania integracji Amazon"""
        return {
            "description": "Amazon product research and affiliate link generation",
            "duration": 30,
            "dependencies": [],
            "amazon_plan": {
                "stages": ["Product search", "ASIN validation", "Affiliate link generation", "Link validation", "Market analysis"],
                "api_integration": "amazon_pa_api",
                "affiliate_tag": "kimsondreams-20",
                "cache_strategy": "enabled",
                "fallback_products": True
            }
        }
    
    async def _create_analytics_task_plan(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Plan dla zadania analityki"""
        return {
            "description": "Generate analytics dashboard and performance reports",
            "duration": 20,
            "dependencies": ["content_generation", "publishing"],
            "analytics_plan": {
                "stages": ["Data collection", "Metrics calculation", "Dashboard generation", "Report creation", "Insights extraction"],
                "tracking_services": ["google_analytics", "mixpanel", "internal_tracking"],
                "time_ranges": ["1d", "7d", "30d", "90d"],
                "metrics_focus": ["page_views", "conversions", "revenue", "engagement"]
            }
        }
    
    async def _schedule_tasks(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Harmonogramowanie zadań"""
        logger.info("Harmonogramowanie zadań...")
        
        try:
            scheduled_tasks = []
            current_time = datetime.utcnow()
            
            # Sortuj według priorytetu
            tasks.sort(key=lambda x: x.get("priority", 3))
            
            for i, task in enumerate(tasks):
                # Oblicz czas rozpoczęcia
                if i == 0:
                    start_time = current_time + timedelta(minutes=5)  # Start za 5 minut
                else:
                    prev_duration = tasks[i-1].get("estimated_duration", 30)
                    start_time = scheduled_tasks[i-1]["scheduled_for"] + timedelta(minutes=prev_duration + 5)
                
                task["scheduled_for"] = start_time
                scheduled_tasks.append(task)
            
            logger.info(f"Zaharmonogramowano {len(scheduled_tasks)} zadań")
            return scheduled_tasks
            
        except Exception as e:
            logger.error(f"Błąd harmonogramowania: {e}")
            return tasks  # Fallback - bez harmonogramu
    
    async def _save_task_plan(self, tasks: List[Dict[str, Any]], context: Dict[str, Any]):
        """Zapisywanie planu zadań"""
        try:
            plan_data = {
                "tasks": tasks,
                "context": context,
                "total_tasks": len(tasks),
                "total_estimated_cost": sum(task.get("estimated_cost", 0) for task in tasks),
                "total_estimated_duration": sum(task.get("estimated_duration", 30) for task in tasks)
            }
            
            await self.memory_store.store_context(
                context_type="system",
                context_key=f"task_plan_{datetime.utcnow().timestamp()}",
                title=f"Task Plan {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}",
                content=json.dumps(plan_data, indent=2, default=str),
                tags=["task_plan", "planning", "system"],
                importance_score=0.8,
                expires_in_days=7
            )
            
            logger.info("Plan zadań zapisany w pamięci")
            
        except Exception as e:
            logger.error(f"Błąd zapisywania planu zadań: {e}")
    
    # SPECJALIZOWANE METODY DLA RÓŻNYCH TYPIÓW ZADAŃ
    
    async def create_content_generation_task(self, content_task: ContentTask) -> Dict[str, Any]:
        """Tworzenie zadania generowania treści"""
        task_id = f"content_{datetime.utcnow().timestamp()}"
        
        # Generowanie szczegółowego planu treści
        content_plan = await self._generate_content_plan(content_task)
        
        return {
            "id": task_id,
            "type": TaskType.CONTENT_GENERATION,
            "title": f"Generate {content_task.content_type}: {content_task.topic[:50]}...",
            "description": f"Create {content_task.content_type} about '{content_task.topic}' for {content_task.target_audience}",
            "priority": TaskPriority.HIGH,
            "estimated_cost": 0.08,
            "estimated_duration": 60,
            "required_models": ["gpt-4", "claude-3-sonnet"],
            "dependencies": [],
            "metadata": {
                "content_task": asdict(content_task),
                "content_plan": content_plan,
                "seo_focus": content_task.seo_requirements
            },
            "created_at": datetime.utcnow(),
            "scheduled_for": None,
            "status": TaskStatus.PLANNED
        }
    
    async def _generate_content_plan(self, content_task: ContentTask) -> Dict[str, Any]:
        """Generowanie planu treści"""
        try:
            prompt = f"""
            Create a detailed content plan for:
            Topic: {content_task.topic}
            Content Type: {content_task.content_type}
            Target Audience: {content_task.target_audience}
            Keywords: {', '.join(content_task.keywords)}
            Tone: {content_task.tone}
            Length Target: {content_task.length_target} words
            SEO Requirements: {json.dumps(content_task.seo_requirements)}
            
            Provide:
            1. Detailed outline with sections
            2. Key points for each section
            3. SEO optimization suggestions
            4. Call-to-action recommendations
            5. Internal linking opportunities
            
            Format as structured JSON.
            """
            
            response = await self.model_manager.amodel_infer(
                task="chat_general",
                messages=[{"role": "user", "content": prompt}],
                model="gpt-3.5-turbo",
                provider="openai"
            )
            
            plan_content = response.get("content", "")
            
            try:
                plan = json.loads(plan_content)
            except:
                plan = {
                    "outline": ["Introduction", "Main Content", "Conclusion"],
                    "key_points": [],
                    "seo_suggestions": [],
                    "cta_recommendations": [],
                    "linking_opportunities": []
                }
            
            return plan
            
        except Exception as e:
            logger.error(f"Błąd generowania planu treści: {e}")
            return {"error": str(e)}
    
    async def create_seo_optimization_task(self, seo_task: SEOTask) -> Dict[str, Any]:
        """Tworzenie zadania SEO"""
        task_id = f"seo_{datetime.utcnow().timestamp()}"
        
        # Analiza SEO i rekomendacje
        seo_analysis = await self._analyze_seo_opportunities(seo_task)
        
        return {
            "id": task_id,
            "type": TaskType.SEO_OPTIMIZATION,
            "title": f"SEO Optimization: {seo_task.url}",
            "description": f"Optimize {seo_task.url} for better search engine performance",
            "priority": TaskPriority.MEDIUM,
            "estimated_cost": 0.03,
            "estimated_duration": 25,
            "required_models": ["gpt-3.5-turbo"],
            "dependencies": [],
            "metadata": {
                "seo_task": asdict(seo_task),
                "seo_analysis": seo_analysis,
                "optimization_areas": seo_analysis.get("optimization_areas", [])
            },
            "created_at": datetime.utcnow(),
            "scheduled_for": None,
            "status": TaskStatus.PLANNED
        }
    
    async def _analyze_seo_opportunities(self, seo_task: SEOTask) -> Dict[str, Any]:
        """Analiza możliwości SEO"""
        try:
            prompt = f"""
            Analyze SEO opportunities for:
            URL: {seo_task.url}
            Current Metrics: {json.dumps(seo_task.current_metrics)}
            Target Improvements: {json.dumps(seo_task.target_improvements)}
            Competitor Analysis: {seo_task.competitor_analysis}
            Keyword Research: {seo_task.keyword_research}
            Technical SEO: {seo_task.technical_seo}
            
            Provide specific recommendations for:
            1. On-page optimization
            2. Content improvements
            3. Technical fixes
            4. Link building opportunities
            5. Keyword optimization
            
            Format as actionable JSON recommendations.
            """
            
            response = await self.model_manager.amodel_infer(
                task="chat_general",
                messages=[{"role": "user", "content": prompt}],
                model="gpt-3.5-turbo",
                provider="openai"
            )
            
            analysis_content = response.get("content", "")
            
            try:
                analysis = json.loads(analysis_content)
            except:
                analysis = {
                    "on_page": ["Optimize title tags", "Improve meta descriptions"],
                    "content": ["Add more relevant content", "Improve keyword density"],
                    "technical": ["Fix page speed", "Improve mobile responsiveness"],
                    "link_building": ["Internal linking", "External outreach"],
                    "keywords": ["Research long-tail keywords", "Optimize for user intent"]
                }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Błąd analizy SEO: {e}")
            return {"error": str(e)}
    
    # METODY POMOCNICZE
    
    async def get_task_recommendations(self, context: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Pobieranie rekomendacji zadań na podstawie kontekstu"""
        try:
            # Wyszukiwanie podobnych kontekstów
            similar_contexts = await self.memory_store.search_similar_context(
                query=context,
                context_type="system",
                limit=10
            )
            
            # Generowanie rekomendacji na podstawie kontekstu
            prompt = f"""
            Based on this context: {context}
            And similar past contexts: {json.dumps([ctx.get('content', '') for ctx in similar_contexts[:3]])}
            
            Recommend {limit} specific tasks that would be valuable to perform.
            Consider:
            - What problems need solving
            - What opportunities exist
            - What would improve the system
            - What users might need
            
            Format as JSON array with task title, description, and priority.
            """
            
            response = await self.model_manager.amodel_infer(
                task="chat_general",
                messages=[{"role": "user", "content": prompt}],
                model="gpt-3.5-turbo",
                provider="openai"
            )
            
            recommendations_content = response.get("content", "")
            
            # Parsuj rekomendacje
            recommendations = self._parse_task_ideas(recommendations_content)
            
            return recommendations[:limit]
            
        except Exception as e:
            logger.error(f"Błąd generowania rekomendacji: {e}")
            return self._get_fallback_task_ideas()[:limit]

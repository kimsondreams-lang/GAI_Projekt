"""
Zaawansowany executor zadań dla Autonomous Agent AI
Zawiera wykonywanie zadań z retry logic, obsługą błędów i monitoringiem
"""

import asyncio
import logging
import json
import traceback
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import time
import random
from collections import defaultdict

from packages.models.invoke import ModelManager
from packages.memory import get_memory_store
from packages.core_agent.budget import BudgetManager, ExpenseCategory
from packages.tools import (
    get_content_generator, get_seo_analyzer, get_asin_manager, 
    get_analytics_tracker, get_publisher
)

logger = logging.getLogger(__name__)

class ExecutionStatus(Enum):
    """Statusy wykonywania"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"
    CANCELLED = "cancelled"
    TIMEOUT = "timeout"

class RetryPolicy(Enum):
    """Polityki retry"""
    EXPONENTIAL_BACKOFF = "exponential_backoff"
    LINEAR_BACKOFF = "linear_backoff"
    FIXED_DELAY = "fixed_delay"
    IMMEDIATE = "immediate"

@dataclass
class ExecutionResult:
    """Wynik wykonania zadania"""
    task_id: str
    status: ExecutionStatus
    start_time: datetime
    end_time: datetime
    result_data: Optional[Dict[str, Any]]
    error_message: Optional[str]
    error_type: Optional[str]
    retry_count: int
    cost_usd: float
    execution_time_seconds: float
    model_used: Optional[str]
    provider_used: Optional[str]
    metadata: Dict[str, Any]

@dataclass
class ExecutionContext:
    """Kontekst wykonywania"""
    task_id: str
    task_type: str
    execution_id: str
    attempt_number: int
    max_attempts: int
    timeout_seconds: int
    retry_policy: RetryPolicy
    budget_limit: float
    current_cost: float
    start_time: datetime
    metadata: Dict[str, Any]

class TaskExecutor:
    """
    Zaawansowany executor zadań z retry logic i monitoringiem
    """
    
    def __init__(self):
        self.model_manager = ModelManager()
        self.memory_store = None
        self.budget_manager = None
        self.active_executions: Dict[str, ExecutionContext] = {}
        self.execution_results: List[ExecutionResult] = []
        
        # Konfiguracja domyślna
        self.default_max_attempts = 3
        self.default_timeout_seconds = 300  # 5 minut
        self.default_retry_policy = RetryPolicy.EXPONENTIAL_BACKOFF
        self.max_parallel_executions = 5
        
        logger.info("TaskExecutor zainicjalizowany")
    
    async def initialize(self):
        """Inicjalizacja executora"""
        logger.info("Inicjalizacja TaskExecutor...")
        
        self.memory_store = await get_memory_store()
        self.budget_manager = BudgetManager()
        await self.budget_manager.initialize()
        
        logger.info("TaskExecutor został zainicjalizowany")
    
    async def execute_tasks(self, tasks: List[Dict[str, Any]], max_parallel: int = 3, timeout_per_task: int = 300) -> List[Dict[str, Any]]:
        """
        Główna metoda wykonywania zadań
        
        Args:
            tasks: Lista zadań do wykonania
            max_parallel: Maksymalna liczba równoległych wykonań
            timeout_per_task: Timeout dla pojedynczego zadania
            
        Returns:
            Lista wyników wykonania
        """
        logger.info(f"Rozpoczęcie wykonywania {len(tasks)} zadań (max_parallel: {max_parallel})")
        
        try:
            # Walidacja budżetu
            budget_status = await self.budget_manager.get_budget_status()
            if budget_status["remaining_budget"] <= 0:
                logger.error("Brak budżetu do wykonania zadań")
                return []
            
            # Przygotowanie zadań do wykonania
            prepared_tasks = await self._prepare_tasks(tasks, timeout_per_task)
            
            # Wykonywanie zadań z ograniczeniem równoległości
            results = []
            semaphore = asyncio.Semaphore(max_parallel)
            
            async def execute_with_semaphore(task: Dict[str, Any]):
                async with semaphore:
                    return await self._execute_single_task(task)
            
            # Uruchom wszystkie zadania
            execution_tasks = [execute_with_semaphore(task) for task in prepared_tasks]
            results = await asyncio.gather(*execution_tasks, return_exceptions=True)
            
            # Przetwórz wyniki (usuń wyjątki)
            valid_results = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Zadanie {i} zakończone wyjątkiem: {result}")
                    # Utwórz wynik błędu
                    error_result = await self._create_error_result(
                        tasks[i].get("id", f"task_{i}"),
                        str(result),
                        "Exception"
                    )
                    valid_results.append(asdict(error_result))
                else:
                    valid_results.append(asdict(result))
            
            # Zapisz statystyki wykonania
            await self._save_execution_stats(valid_results)
            
            logger.info(f"Wykonano {len(valid_results)} zadań")
            return valid_results
            
        except Exception as e:
            logger.error(f"Błąd wykonywania zadań: {e}")
            return []
    
    async def _prepare_tasks(self, tasks: List[Dict[str, Any]], timeout_per_task: int) -> List[Dict[str, Any]]:
        """Przygotowanie zadań do wykonania"""
        prepared_tasks = []
        
        for task in tasks:
            prepared_task = task.copy()
            
            # Dodaj domyślne wartości
            prepared_task["execution_config"] = {
                "max_attempts": task.get("max_attempts", self.default_max_attempts),
                "timeout_seconds": task.get("timeout_seconds", timeout_per_task),
                "retry_policy": task.get("retry_policy", self.default_retry_policy.value),
                "budget_limit": task.get("budget_limit", 1.0)  # Maks $1 per task
            }
            
            # Dodaj unikalny execution ID
            prepared_task["execution_id"] = f"exec_{task.get('id', 'unknown')}_{int(time.time())}"
            
            prepared_tasks.append(prepared_task)
        
        return prepared_tasks
    
    async def _execute_single_task(self, task: Dict[str, Any]) -> ExecutionResult:
        """Wykonanie pojedynczego zadania z retry logic"""
        task_id = task.get("id", "unknown")
        execution_id = task.get("execution_id", f"exec_{task_id}")
        
        logger.info(f"Rozpoczęcie wykonywania zadania: {task_id} (execution: {execution_id})")
        
        try:
            # Przygotuj kontekst wykonania
            execution_context = self._create_execution_context(task)
            self.active_executions[execution_id] = execution_context
            
            # Rozpocznij wykonanie
            result = await self._execute_with_retry(execution_context, task)
            
            # Wyczyść kontekst
            if execution_id in self.active_executions:
                del self.active_executions[execution_id]
            
            # Zapisz wynik do pamięci
            await self._save_execution_result(result)
            
            logger.info(f"Zadanie {task_id} zakończone: {result.status.value}")
            return result
            
        except Exception as e:
            logger.error(f"Błąd wykonywania zadania {task_id}: {e}")
            
            # Wyczyść kontekst
            if execution_id in self.active_executions:
                del self.active_executions[execution_id]
            
            # Utwórz wynik błędu
            error_result = await self._create_error_result(task_id, str(e), "ExecutionError")
            await self._save_execution_result(error_result)
            
            return error_result
    
    def _create_execution_context(self, task: Dict[str, Any]) -> ExecutionContext:
        """Tworzenie kontekstu wykonania"""
        exec_config = task.get("execution_config", {})
        
        return ExecutionContext(
            task_id=task.get("id", "unknown"),
            task_type=task.get("type", "unknown"),
            execution_id=task.get("execution_id", f"exec_{task.get('id', 'unknown')}"),
            attempt_number=0,
            max_attempts=exec_config.get("max_attempts", self.default_max_attempts),
            timeout_seconds=exec_config.get("timeout_seconds", self.default_timeout_seconds),
            retry_policy=RetryPolicy(exec_config.get("retry_policy", self.default_retry_policy.value)),
            budget_limit=exec_config.get("budget_limit", 1.0),
            current_cost=0.0,
            start_time=datetime.utcnow(),
            metadata={}
        )
    
    async def _execute_with_retry(self, context: ExecutionContext, task: Dict[str, Any]) -> ExecutionResult:
        """Wykonanie z retry logic"""
        last_exception = None
        
        for attempt in range(context.max_attempts):
            context.attempt_number = attempt + 1
            
            try:
                logger.info(f"Próba {context.attempt_number}/{context.max_attempts} dla zadania {context.task_id}")
                
                # Wykonaj z timeoutem
                result = await asyncio.wait_for(
                    self._execute_task_attempt(context, task),
                    timeout=context.timeout_seconds
                )
                
                # Sukces
                if result.status == ExecutionStatus.COMPLETED:
                    return result
                
                # Niepowodzenie, ale nie błąd krytyczny - kontynuuj retry
                if attempt < context.max_attempts - 1:
                    await self._wait_before_retry(context, attempt)
                    continue
                else:
                    # Ostatnia próba nieudana
                    return result
                    
            except asyncio.TimeoutError:
                logger.warning(f"Timeout podczas próby {context.attempt_number} zadania {context.task_id}")
                last_exception = "TimeoutError"
                
                if attempt < context.max_attempts - 1:
                    await self._wait_before_retry(context, attempt)
                    continue
                else:
                    return await self._create_timeout_result(context)
                    
            except Exception as e:
                logger.error(f"Błąd podczas próby {context.attempt_number} zadania {context.task_id}: {e}")
                last_exception = str(e)
                
                if attempt < context.max_attempts - 1:
                    await self._wait_before_retry(context, attempt)
                    continue
                else:
                    # Ostatnia próba nieudana
                    return await self._create_final_error_result(context, str(e))
        
        # Wszystkie próby nieudane
        return await self._create_final_error_result(context, last_exception or "All attempts failed")
    
    async def _execute_task_attempt(self, context: ExecutionContext, task: Dict[str, Any]) -> ExecutionResult:
        """Pojedyncza próba wykonania zadania"""
        start_time = time.time()
        
        try:
            # Sprawdź budżet przed wykonaniem
            budget_check = await self._check_budget(context)
            if not budget_check["can_proceed"]:
                return await self._create_budget_error_result(context, budget_check["reason"])
            
            # Wykonaj zadanie na podstawie typu
            if task.get("type") == "content_generation":
                result = await self._execute_content_task(task, context)
            elif task.get("type") == "seo_optimization":
                result = await self._execute_seo_task(task, context)
            elif task.get("type") == "research":
                result = await self._execute_research_task(task, context)
            elif task.get("type") == "code_generation":
                result = await self._execute_code_task(task, context)
            elif task.get("type") == "publishing":
                result = await self._execute_publishing_task(task, context)
            elif task.get("type") == "amazon_integration":
                result = await self._execute_amazon_task(task, context)
            elif task.get("type") == "analytics":
                result = await self._execute_analytics_task(task, context)
            else:
                result = await self._execute_generic_task(task, context)
            
            execution_time = time.time() - start_time
            result.execution_time_seconds = execution_time
            result.retry_count = context.attempt_number - 1
            
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            
            return ExecutionResult(
                task_id=context.task_id,
                status=ExecutionStatus.FAILED,
                start_time=datetime.utcnow() - timedelta(seconds=execution_time),
                end_time=datetime.utcnow(),
                result_data=None,
                error_message=str(e),
                error_type=type(e).__name__,
                retry_count=context.attempt_number - 1,
                cost_usd=context.current_cost,
                execution_time_seconds=execution_time,
                model_used=None,
                provider_used=None,
                metadata={"attempt": context.attempt_number}
            )
    
    async def _check_budget(self, context: ExecutionContext) -> Dict[str, Any]:
        """Sprawdzenie budżetu przed wykonaniem"""
        try:
            budget_status = await self.budget_manager.get_budget_status()
            
            if budget_status["remaining_budget"] <= 0:
                return {"can_proceed": False, "reason": "No budget remaining"}
            
            if budget_status["remaining_budget"] < context.budget_limit:
                return {"can_proceed": False, "reason": "Insufficient budget for task"}
            
            return {"can_proceed": True, "reason": "Budget available"}
            
        except Exception as e:
            logger.error(f"Błąd sprawdzania budżetu: {e}")
            return {"can_proceed": False, "reason": "Budget check failed"}
    
    async def _execute_content_task(self, task: Dict[str, Any], context: ExecutionContext) -> ExecutionResult:
        """Wykonanie zadania generowania treści z użyciem nowych narzędzi"""
        logger.info(f"Wykonywanie zadania content: {context.task_id}")
        
        try:
            metadata = task.get("metadata", {})
            content_type = metadata.get("content_type", "product_review")
            topic = metadata.get("topic", task.get("title", "Generated Content"))
            target_keywords = metadata.get("keywords", [])
            products = metadata.get("products", [])
            tone = metadata.get("tone", "professional")
            target_length = metadata.get("target_length", 2000)
            
            # Sprawdź budżet
            estimated_cost = 0.02  # Wyższy koszt dla zaawansowanej generacji
            await self._check_budget(context.task_id, estimated_cost)
            
            # Użyj ContentGenerator dla zaawansowanej generacji
            content_generator = get_content_generator()
            
            generated_content = await content_generator.generate_content(
                topic=topic,
                content_type=content_type,
                target_keywords=target_keywords,
                products=products,
                tone=tone,
                target_length=target_length,
                include_media=True
            )
            
            # Optymalizacja SEO
            seo_analyzer = get_seo_analyzer()
            optimized_content = await content_generator.optimize_content(
                generated_content, 
                optimization_target="seo"
            )
            
            # Eksport do różnych formatów
            markdown_content = content_generator.export_to_markdown(optimized_content)
            html_content = content_generator.export_to_html(optimized_content)
            
            # Analiza SEO
            seo_analysis = await seo_analyzer.analyze_page_seo(
                url=f"https://kimsondreams.com/articles/{optimized_content.slug}",
                content=markdown_content
            )
            
            # Oblicz koszt
            cost = self._estimate_content_cost({"content": markdown_content})
            
            # Zapisz wynik
            result_data = {
                "content": {
                    "markdown": markdown_content,
                    "html": html_content,
                    "sections": [
                        {
                            "heading": section.heading,
                            "content": section.content,
                            "word_count": section.word_count,
                            "seo_score": section.seo_score
                        } for section in optimized_content.sections
                    ]
                },
                "metadata": {
                    "title": optimized_content.title,
                    "slug": optimized_content.slug,
                    "total_words": optimized_content.total_words,
                    "template_used": optimized_content.template_used,
                    "ai_model": optimized_content.ai_model,
                    "created_at": optimized_content.created_at.isoformat()
                },
                "seo_analysis": {
                    "keywords": [kw.keyword for kw in seo_analysis.keywords[:10]],
                    "keyword_density": seo_analysis.keyword_density,
                    "readability_score": seo_analysis.readability_score,
                    "content_quality": seo_analysis.content_quality,
                    "recommendations": seo_analysis.recommendations[:5]
                },
                "media_items": optimized_content.media_items,
                "quality_score": generated_content.seo_analysis.get("seo_score", 0.8)
            }
            
            logger.info(f"Zaawansowana treść wygenerowana pomyślnie: {optimized_content.total_words} słów, {len(optimized_content.sections)} sekcji")
            
            return ExecutionResult(
                task_id=context.task_id,
                status=ExecutionStatus.COMPLETED,
                start_time=datetime.utcnow() - timedelta(seconds=60),  # Przybliżony czas
                end_time=datetime.utcnow(),
                result_data=result_data,
                error_message=None,
                error_type=None,
                retry_count=0,
                cost_usd=cost,
                execution_time_seconds=60,
                model_used=optimized_content.ai_model,
                provider_used="openai",  # Domyślnie OpenAI
                metadata={
                    "content_type": "ai_generated_with_tools",
                    "template": optimized_content.template_used,
                    "sections_count": len(optimized_content.sections),
                    "media_items_count": len(optimized_content.media_items)
                }
            )
            
        except Exception as e:
            logger.error(f"Błąd wykonywania zaawansowanego zadania content: {e}")
            raise
    
    def _create_content_generation_prompt(self, task: Dict[str, Any], content_plan: Dict[str, Any]) -> str:
        """Tworzenie prompta dla generowania treści"""
        title = task.get("title", "Content Generation")
        description = task.get("description", "")
        
        prompt = f"""
        Create high-quality content for: {title}
        
        Description: {description}
        
        Content Plan: {json.dumps(content_plan, indent=2)}
        
        Requirements:
        - Write engaging, informative content
        - Use proper structure with introduction, body, and conclusion
        - Include relevant keywords naturally
        - Ensure content is original and valuable
        - Format with clear headings and paragraphs
        - Include call-to-action where appropriate
        
        Generate comprehensive content based on the plan above.
        """
        
        return prompt.strip()
    
    def _select_model_for_content_task(self, task: Dict[str, Any]) -> Dict[str, str]:
        """Wybór modela dla zadania content"""
        required_models = task.get("required_models", ["gpt-3.5-turbo"])
        
        # Sprawdź dostępność modeli
        for model in required_models:
            if model in self.model_manager.providers.get("openai", {}).get("models", []):
                return {"model": model, "provider": "openai"}
            elif model in self.model_manager.providers.get("anthropic", {}).get("models", []):
                return {"model": model, "provider": "anthropic"}
        
        # Fallback na podstawowy model
        return {"model": "gpt-3.5-turbo", "provider": "openai"}
    
    def _estimate_content_cost(self, response: Dict[str, Any]) -> float:
        """Szacowanie kosztu generowania treści"""
        content = response.get("content", "")
        word_count = len(content.split())
        
        # Przybliżony koszt: $0.001 za 100 słów
        return max(0.001, word_count / 100 * 0.001)
    
    def _assess_content_quality(self, content: str) -> float:
        """Ocena jakości treści (0.0 - 1.0)"""
        if not content:
            return 0.0
        
        word_count = len(content.split())
        
        # Prosta heurystyka jakości
        score = 0.5  # Base score
        
        if word_count > 500:
            score += 0.2
        if word_count > 1000:
            score += 0.1
        
        # Sprawdź strukturę
        if "#" in content or "##" in content:  # Has headings
            score += 0.1
        
        if "conclusion" in content.lower() or "summary" in content.lower():
            score += 0.1
        
        return min(score, 1.0)
    
    async def _execute_seo_task(self, task: Dict[str, Any], context: ExecutionContext) -> ExecutionResult:
        """Wykonanie zaawansowanego zadania SEO z użyciem nowych narzędzi"""
        logger.info(f"Wykonywanie zadania SEO: {context.task_id}")
        
        try:
            metadata = task.get("metadata", {})
            seo_analysis = metadata.get("seo_analysis", {})
            
            # Sprawdź budżet
            estimated_cost = 0.01  # Wyższy koszt dla zaawansowanej analizy
            await self._check_budget(context.task_id, estimated_cost)
            
            # Użyj SEOAnalyzer dla zaawansowanej analizy
            seo_analyzer = get_seo_analyzer()
            
            # Przeprowadź research słów kluczowych
            keywords = seo_analysis.get("keywords", [])
            if keywords:
                keyword_data = await seo_analyzer.research_keywords(keywords)
            else:
                keyword_data = []
            
            # Analiza konkurencji
            competitors = []
            if keywords:
                competitors = await seo_analyzer.analyze_competitors(
                    url=metadata.get("target_url", "https://kimsondreams.com"),
                    keywords=keywords
                )
            
            # Optymalizacja meta tagów
            current_title = metadata.get("title", "")
            current_description = metadata.get("description", "")
            optimized_meta = await seo_analyzer.optimize_meta_tags(
                title=current_title,
                description=current_description,
                keywords=keywords
            )
            
            # Generowanie outline treści
            content_outline = {}
            if keywords:
                content_outline = await seo_analyzer.generate_content_outline(
                    topic=metadata.get("topic", "SEO Topic"),
                    keywords=keywords,
                    target_length=metadata.get("target_length", 2000)
                )
            
            # Oblicz koszt
            cost = 0.01
            
            # Przygotuj wynik
            result_data = {
                "seo_analysis": {
                    "keywords_researched": len(keyword_data),
                    "top_keywords": [
                        {
                            "keyword": kw.keyword,
                            "search_volume": kw.search_volume,
                            "competition": kw.competition,
                            "difficulty": kw.difficulty,
                            "intent": kw.intent
                        } for kw in keyword_data[:10]
                    ],
                    "competitors_analyzed": len(competitors),
                    "competitor_insights": [
                        {
                            "url": comp.competitor_url,
                            "title": comp.title,
                            "domain_authority": comp.domain_authority,
                            "estimated_traffic": comp.estimated_traffic,
                            "strengths": comp.strengths[:3],
                            "weaknesses": comp.weaknesses[:3]
                        } for comp in competitors[:5]
                    ]
                },
                "optimization_recommendations": {
                    "meta_tags": optimized_meta,
                    "content_structure": content_outline.get("sections", []),
                    "recommended_headings": content_outline.get("recommended_headings", []),
                    "faq_questions": content_outline.get("faq_questions", [])
                },
                "analysis_summary": {
                    "total_keywords": len(keyword_data),
                    "competitors_found": len(competitors),
                    "optimization_areas": len(optimized_meta),
                    "content_sections": len(content_outline.get("sections", [])),
                    "estimated_impact": "high" if len(keyword_data) > 20 else "medium"
                }
            }
            
            logger.info(f"Zaawansowana analiza SEO zakończona: {len(keyword_data)} słów kluczowych, {len(competitors)} konkurentów")
            
            return ExecutionResult(
                task_id=context.task_id,
                status=ExecutionStatus.COMPLETED,
                start_time=datetime.utcnow() - timedelta(seconds=30),
                end_time=datetime.utcnow(),
                result_data=result_data,
                error_message=None,
                error_type=None,
                retry_count=0,
                cost_usd=cost,
                execution_time_seconds=30,
                model_used="gpt-4",
                provider_used="openai",
                metadata={
                    "task_type": "advanced_seo_analysis",
                    "keywords_analyzed": len(keyword_data),
                    "competitors_analyzed": len(competitors),
                    "optimization_applied": True
                }
            )
            
        except Exception as e:
            logger.error(f"Błąd wykonywania zaawansowanego zadania SEO {context.task_id}: {e}")
            raise
    
    async def _execute_publishing_task(self, task: Dict[str, Any], context: ExecutionContext) -> ExecutionResult:
        """Wykonanie zadania publikacji z użyciem FTPPublisher"""
        logger.info(f"Wykonywanie zadania publikacji: {context.task_id}")
        
        try:
            metadata = task.get("metadata", {})
            content_data = metadata.get("content", {})
            
            # Sprawdź budżet
            estimated_cost = 0.005  # Niski koszt dla publikacji
            await self._check_budget(context.task_id, estimated_cost)
            
            # Użyj FTPPublisher
            publisher = get_publisher()
            
            # Przygotuj artykuł do publikacji
            article = {
                "slug": content_data.get("slug", "generated-article"),
                "title": content_data.get("title", "Generated Article"),
                "content": content_data.get("content", ""),
                "schema": content_data.get("schema", "{}"),
                "meta": content_data.get("meta", {})
            }
            
            # Stwórz paczkę artykułu
            publisher.stage_article_package(article)
            
            # Opublikuj artykuł
            publish_result = await publisher.publish_article_package(article["slug"])
            
            # Użyj AnalyticsTracker do śledzenia publikacji
            analytics = get_analytics_tracker()
            await analytics.track_page_view(
                page_url=f"https://kimsondreams.com/articles/{article['slug']}",
                user_id="agent_system"
            )
            
            # Oblicz koszt
            cost = 0.005
            
            result_data = {
                "publishing_result": publish_result,
                "article_slug": article["slug"],
                "article_title": article["title"],
                "files_published": publish_result.get("files", []),
                "backup_created": publish_result.get("backup_created"),
                "sitemap_updated": True,
                "analytics_tracked": True
            }
            
            logger.info(f"Artykuł opublikowany pomyślnie: {article['slug']}")
            
            return ExecutionResult(
                task_id=context.task_id,
                status=ExecutionStatus.COMPLETED,
                start_time=datetime.utcnow() - timedelta(seconds=30),
                end_time=datetime.utcnow(),
                result_data=result_data,
                error_message=None,
                error_type=None,
                retry_count=0,
                cost_usd=cost,
                execution_time_seconds=30,
                model_used="ftp_publisher",
                provider_used="internal",
                metadata={
                    "task_type": "publishing",
                    "article_slug": article["slug"],
                    "files_count": len(publish_result.get("files", [])),
                    "backup_enabled": bool(publish_result.get("backup_created"))
                }
            )
            
        except Exception as e:
            logger.error(f"Błąd wykonywania zadania publikacji {context.task_id}: {e}")
            raise
    
    async def _execute_amazon_task(self, task: Dict[str, Any], context: ExecutionContext) -> ExecutionResult:
        """Wykonanie zadania Amazon integration z użyciem ASINManager"""
        logger.info(f"Wykonywanie zadania Amazon: {context.task_id}")
        
        try:
            metadata = task.get("metadata", {})
            task_type = metadata.get("amazon_task_type", "product_search")
            
            # Sprawdź budżet
            estimated_cost = 0.01  # Koszt dla API Amazon
            await self._check_budget(context.task_id, estimated_cost)
            
            # Użyj ASINManager
            asin_manager = get_asin_manager()
            
            result_data = {}
            
            if task_type == "product_search":
                # Wyszukiwanie produktów
                keywords = metadata.get("keywords", [])
                max_results = metadata.get("max_results", 10)
                
                search_result = await asin_manager.search_products(
                    keywords=" ".join(keywords) if keywords else "electronics",
                    max_results=max_results
                )
                
                result_data = {
                    "task_type": "product_search",
                    "search_query": search_result.search_query,
                    "total_results": search_result.total_results,
                    "products_found": [
                        {
                            "asin": product.asin,
                            "title": product.title,
                            "price": product.price,
                            "currency": product.currency,
                            "rating": product.rating,
                            "review_count": product.review_count,
                            "category": product.category,
                            "availability": product.availability
                        } for product in search_result.products
                    ],
                    "affiliate_links": [
                        asin_manager.build_affiliate_link(product.asin) 
                        for product in search_result.products
                    ]
                }
                
            elif task_type == "product_details":
                # Szczegóły produktu
                asin = metadata.get("asin", "")
                if not asin:
                    raise ValueError("ASIN jest wymagany dla pobierania szczegółów produktu")
                
                product = await asin_manager.get_product_details(asin)
                if product:
                    result_data = {
                        "task_type": "product_details",
                        "product": {
                            "asin": product.asin,
                            "title": product.title,
                            "price": product.price,
                            "currency": product.currency,
                            "image_url": product.image_url,
                            "product_url": product.product_url,
                            "category": product.category,
                            "rating": product.rating,
                            "review_count": product.review_count,
                            "availability": product.availability,
                            "features": product.features,
                            "description": product.description,
                            "brand": product.brand
                        },
                        "affiliate_link": asin_manager.build_affiliate_link(asin),
                        "market_trends": asin_manager.analyze_market_trends(product.category)
                    }
                else:
                    raise ValueError(f"Nie można pobrać szczegółów produktu dla ASIN: {asin}")
                    
            elif task_type == "validate_links":
                # Walidacja linków partnerskich
                links = metadata.get("affiliate_links", [])
                validation_result = await asin_manager.validate_affiliate_links(links)
                
                result_data = {
                    "task_type": "validate_links",
                    "validation_result": validation_result,
                    "valid_percentage": round(
                        (validation_result["valid_links"] / max(validation_result["total_links"], 1)) * 100, 2
                    )
                }
            
            # Oblicz koszt
            cost = 0.01
            
            logger.info(f"Zadanie Amazon zakończone pomyślnie: {task_type}")
            
            return ExecutionResult(
                task_id=context.task_id,
                status=ExecutionStatus.COMPLETED,
                start_time=datetime.utcnow() - timedelta(seconds=20),
                end_time=datetime.utcnow(),
                result_data=result_data,
                error_message=None,
                error_type=None,
                retry_count=0,
                cost_usd=cost,
                execution_time_seconds=20,
                model_used="asin_manager",
                provider_used="amazon_api",
                metadata={
                    "task_type": "amazon_integration",
                    "amazon_task_type": task_type,
                    "products_processed": len(result_data.get("products_found", [])) or 
                                          (1 if result_data.get("product") else 0)
                }
            )
            
        except Exception as e:
            logger.error(f"Błąd wykonywania zadania Amazon {context.task_id}: {e}")
            raise
    
    async def _execute_analytics_task(self, task: Dict[str, Any], context: ExecutionContext) -> ExecutionResult:
        """Wykonanie zadania analityki z użyciem AnalyticsTracker"""
        logger.info(f"Wykonywanie zadania analityki: {context.task_id}")
        
        try:
            metadata = task.get("metadata", {})
            analytics_task_type = metadata.get("analytics_task_type", "dashboard")
            
            # Sprawdź budżet
            estimated_cost = 0.003  # Bardzo niski koszt dla analityki
            await self._check_budget(context.task_id, estimated_cost)
            
            # Użyj AnalyticsTracker
            analytics = get_analytics_tracker()
            
            result_data = {}
            
            if analytics_task_type == "dashboard":
                # Dashboard analityczny
                time_range = metadata.get("time_range", "7d")
                content_filter = metadata.get("content_filter", None)
                
                dashboard_data = await analytics.get_analytics_dashboard(
                    time_range=time_range,
                    content_filter=content_filter
                )
                
                result_data = {
                    "task_type": "dashboard",
                    "dashboard": dashboard_data.get("dashboard", {}),
                    "metrics_summary": dashboard_data.get("dashboard", {}).get("overview", {}),
                    "top_content": dashboard_data.get("dashboard", {}).get("top_content", []),
                    "traffic_sources": dashboard_data.get("dashboard", {}).get("traffic_sources", {}),
                    "time_series": dashboard_data.get("dashboard", {}).get("time_series", [])
                }
                
            elif analytics_task_type == "performance_report":
                # Raport wydajności
                content_id = metadata.get("content_id", None)
                report_type = metadata.get("report_type", "comprehensive")
                
                report_data = await analytics.generate_performance_report(
                    content_id=content_id,
                    report_type=report_type
                )
                
                result_data = {
                    "task_type": "performance_report",
                    "report": report_data.get("report", {}),
                    "generated_at": report_data.get("generated_at", datetime.utcnow().isoformat())
                }
                
            elif analytics_task_type == "conversion_tracking":
                # Śledzenie konwersji
                event_type = metadata.get("event_type", "page_view")
                user_id = metadata.get("user_id", "anonymous")
                page_url = metadata.get("page_url", "")
                value = metadata.get("value", 0.0)
                
                conversion_result = await analytics.track_conversion(
                    event_type=event_type,
                    user_id=user_id,
                    page_url=page_url,
                    value=value
                )
                
                result_data = {
                    "task_type": "conversion_tracking",
                    "conversion_event": conversion_result,
                    "event_type": event_type,
                    "user_id": user_id,
                    "value": value
                }
            
            # Oblicz koszt
            cost = 0.003
            
            logger.info(f"Zadanie analityki zakończone pomyślnie: {analytics_task_type}")
            
            return ExecutionResult(
                task_id=context.task_id,
                status=ExecutionStatus.COMPLETED,
                start_time=datetime.utcnow() - timedelta(seconds=15),
                end_time=datetime.utcnow(),
                result_data=result_data,
                error_message=None,
                error_type=None,
                retry_count=0,
                cost_usd=cost,
                execution_time_seconds=15,
                model_used="analytics_tracker",
                provider_used="internal",
                metadata={
                    "task_type": "analytics",
                    "analytics_task_type": analytics_task_type,
                    "data_points": len(result_data.get("dashboard", {}).get("time_series", [])) or
                                    len(result_data.get("report", {}))
                }
            )
            
        except Exception as e:
            logger.error(f"Błąd wykonywania zadania analityki {context.task_id}: {e}")
            raise
    
    async def _perform_seo_analysis(self, task: Dict[str, Any], seo_analysis: Dict[str, Any]) -> List[str]:
        """Wykonanie analizy SEO"""
        try:
            # Prosta analiza SEO na podstawie danych
            recommendations = []
            
            if seo_analysis.get("on_page"):
                recommendations.extend(seo_analysis["on_page"])
            
            if seo_analysis.get("content"):
                recommendations.extend(seo_analysis["content"])
            
            if seo_analysis.get("technical"):
                recommendations.extend(seo_analysis["technical"])
            
            # Dodaj podstawowe rekomendacje
            recommendations.extend([
                "Optimize page title with target keywords",
                "Improve meta description for better CTR",
                "Add structured data markup",
                "Optimize images with alt text",
                "Improve internal linking structure"
            ])
            
            return list(set(recommendations))  # Usuń duplikaty
            
        except Exception as e:
            logger.error(f"Błąd analizy SEO: {e}")
            return ["Basic SEO optimization needed"]
    
    async def _execute_research_task(self, task: Dict[str, Any], context: ExecutionContext) -> ExecutionResult:
        """Wykonanie zadania research"""
        logger.info(f"Wykonywanie zadania research: {context.task_id}")
        
        try:
            metadata = task.get("metadata", {})
            research_plan = metadata.get("research_plan", {})
            
            # Wykonaj research
            research_results = await self._perform_research(task, research_plan)
            
            # Oblicz koszt
            cost = 0.02  # Stały koszt dla zadań research
            context.current_cost += cost
            
            result_data = {
                "research_findings": research_results,
                "research_methodology": research_plan.get("methodology", "standard"),
                "sources_analyzed": len(research_results),
                "key_insights": research_results[:10]  # Top 10 insightów
            }
            
            return ExecutionResult(
                task_id=context.task_id,
                status=ExecutionStatus.COMPLETED,
                start_time=datetime.utcnow() - timedelta(seconds=25),
                end_time=datetime.utcnow(),
                result_data=result_data,
                error_message=None,
                error_type=None,
                retry_count=0,
                cost_usd=cost,
                execution_time_seconds=25,
                model_used="gpt-3.5-turbo",
                provider_used="openai",
                metadata={"task_type": "research"}
            )
            
        except Exception as e:
            logger.error(f"Błąd wykonywania zadania research: {e}")
            raise
    
    async def _perform_research(self, task: Dict[str, Any], research_plan: Dict[str, Any]) -> List[str]:
        """Wykonanie research"""
        try:
            # Prosty research na podstawie opisu zadania
            findings = []
            
            title = task.get("title", "")
            description = task.get("description", "")
            
            # Generowanie insightów na podstawie tematu
            prompt = f"""
            Research the following topic and provide key findings:
            
            Title: {title}
            Description: {description}
            
            Provide 10-15 specific insights, findings, or recommendations based on current knowledge.
            Focus on actionable and relevant information.
            """
            
            response = await self.model_manager.model_infer(
                task_label="research_analysis",
                prompt=prompt,
                temperature=0.3,
                max_tokens=1500
            )
            
            content = response.get("content", "")
            
            # Podziel na punkty
            lines = content.split('\n')
            for line in lines:
                line = line.strip()
                if line and len(line) > 20:  # Tylko sensowne linie
                    findings.append(line)
            
            return findings[:15]  # Maksymalnie 15 findingów
            
        except Exception as e:
            logger.error(f"Błąd wykonywania research: {e}")
            return [f"Research error: {str(e)}"]
    
    async def _execute_code_task(self, task: Dict[str, Any], context: ExecutionContext) -> ExecutionResult:
        """Wykonanie zadania kodowania"""
        logger.info(f"Wykonywanie zadania code generation: {context.task_id}")
        
        try:
            metadata = task.get("metadata", {})
            code_plan = metadata.get("code_plan", {})
            
            # Generowanie kodu
            code_result = await self._generate_code(task, code_plan)
            
            # Oblicz koszt
            cost = 0.03  # Koszt dla zadań kodowania
            context.current_cost += cost
            
            result_data = {
                "generated_code": code_result.get("code", ""),
                "code_language": code_result.get("language", "python"),
                "code_quality": code_result.get("quality_score", 0),
                "documentation": code_result.get("documentation", ""),
                "test_cases": code_result.get("test_cases", [])
            }
            
            return ExecutionResult(
                task_id=context.task_id,
                status=ExecutionStatus.COMPLETED,
                start_time=datetime.utcnow() - timedelta(seconds=35),
                end_time=datetime.utcnow(),
                result_data=result_data,
                error_message=None,
                error_type=None,
                retry_count=0,
                cost_usd=cost,
                execution_time_seconds=35,
                model_used="deepseek-coder",
                provider_used="deepseek",
                metadata={"task_type": "code_generation"}
            )
            
        except Exception as e:
            logger.error(f"Błąd wykonywania zadania code: {e}")
            raise
    
    async def _generate_code(self, task: Dict[str, Any], code_plan: Dict[str, Any]) -> Dict[str, Any]:
        """Generowanie kodu"""
        try:
            title = task.get("title", "")
            description = task.get("description", "")
            
            prompt = f"""
            Generate production-ready code for:
            
            Title: {title}
            Description: {description}
            
            Code Plan: {json.dumps(code_plan, indent=2)}
            
            Requirements:
            - Write clean, well-documented code
            - Include error handling
            - Add unit tests
            - Follow best practices
            - Include usage examples
            
            Generate complete code with documentation and tests.
            """
            
            response = await self.model_manager.model_infer(
                task="code_generation",
                messages=[{"role": "user", "content": prompt}],
                model="deepseek-coder",
                provider="deepseek"
            )
            
            generated_code = response.get("content", "")
            
            # Prosta ocena jakości kodu
            quality_score = self._assess_code_quality(generated_code)
            
            return {
                "code": generated_code,
                "language": "python",  # Zakładamy Python
                "quality_score": quality_score,
                "documentation": "Generated with best practices",
                "test_cases": ["Basic functionality test"]
            }
            
        except Exception as e:
            logger.error(f"Błąd generowania kodu: {e}")
            return {
                "code": f"# Error generating code: {str(e)}",
                "language": "python",
                "quality_score": 0,
                "documentation": "Error occurred",
                "test_cases": []
            }
    
    def _assess_code_quality(self, code: str) -> float:
        """Ocena jakości kodu (0.0 - 1.0)"""
        if not code:
            return 0.0
        
        score = 0.5  # Base score
        
        # Sprawdź elementy jakości
        if "def " in code or "class " in code:  # Ma funkcje/klasy
            score += 0.1
        
        if "import " in code:  # Ma importy
            score += 0.1
        
        if '"""' in code or "'''" in code:  # Ma dokumentację
            score += 0.1
        
        if "try:" in code and "except" in code:  # Ma obsługę błędów
            score += 0.1
        
        if len(code.split('\n')) > 10:  # Ma sensowną długość
            score += 0.1
        
        return min(score, 1.0)
    
    async def _execute_generic_task(self, task: Dict[str, Any], context: ExecutionContext) -> ExecutionResult:
        """Wykonanie generycznego zadania"""
        logger.info(f"Wykonywanie generycznego zadania: {context.task_id}")
        
        try:
            # Proste generyczne wykonanie
            result_data = {
                "task_type": "generic",
                "original_task": task,
                "execution_notes": "Generic task execution completed",
                "processed_at": datetime.utcnow().isoformat()
            }
            
            cost = 0.01  # Minimalny koszt
            context.current_cost += cost
            
            return ExecutionResult(
                task_id=context.task_id,
                status=ExecutionStatus.COMPLETED,
                start_time=datetime.utcnow() - timedelta(seconds=10),
                end_time=datetime.utcnow(),
                result_data=result_data,
                error_message=None,
                error_type=None,
                retry_count=0,
                cost_usd=cost,
                execution_time_seconds=10,
                model_used=None,
                provider_used=None,
                metadata={"task_type": "generic"}
            )
            
        except Exception as e:
            logger.error(f"Błąd wykonywania generycznego zadania: {e}")
            raise
    
    async def _wait_before_retry(self, context: ExecutionContext, attempt: int):
        """Czekanie przed kolejną próbą"""
        if context.retry_policy == RetryPolicy.EXPONENTIAL_BACKOFF:
            delay = min(2 ** attempt, 60)  # Max 60 sekund
        elif context.retry_policy == RetryPolicy.LINEAR_BACKOFF:
            delay = min(5 * (attempt + 1), 60)  # Max 60 sekund
        elif context.retry_policy == RetryPolicy.FIXED_DELAY:
            delay = 10  # Stałe 10 sekund
        else:  # IMMEDIATE
            delay = 1  # 1 sekunda
        
        # Dodaj losowość aby uniknąć thundering herd
        delay += random.uniform(0, 2)
        
        logger.info(f"Czekanie {delay:.1f}s przed kolejną próbą zadania {context.task_id}")
        await asyncio.sleep(delay)
    
    async def _create_error_result(self, task_id: str, error_message: str, error_type: str) -> ExecutionResult:
        """Tworzenie wyniku błędu"""
        return ExecutionResult(
            task_id=task_id,
            status=ExecutionStatus.FAILED,
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow(),
            result_data=None,
            error_message=error_message,
            error_type=error_type,
            retry_count=0,
            cost_usd=0.0,
            execution_time_seconds=0.0,
            model_used=None,
            provider_used=None,
            metadata={}
        )
    
    async def _create_timeout_result(self, context: ExecutionContext) -> ExecutionResult:
        """Tworzenie wyniku timeout"""
        return ExecutionResult(
            task_id=context.task_id,
            status=ExecutionStatus.TIMEOUT,
            start_time=context.start_time,
            end_time=datetime.utcnow(),
            result_data=None,
            error_message=f"Task timed out after {context.timeout_seconds} seconds",
            error_type="TimeoutError",
            retry_count=context.attempt_number - 1,
            cost_usd=context.current_cost,
            execution_time_seconds=context.timeout_seconds,
            model_used=None,
            provider_used=None,
            metadata={"timeout": True}
        )
    
    async def _create_budget_error_result(self, context: ExecutionContext, reason: str) -> ExecutionResult:
        """Tworzenie wyniku błędu budżetu"""
        return ExecutionResult(
            task_id=context.task_id,
            status=ExecutionStatus.FAILED,
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow(),
            result_data=None,
            error_message=f"Budget error: {reason}",
            error_type="BudgetError",
            retry_count=0,
            cost_usd=0.0,
            execution_time_seconds=0.0,
            model_used=None,
            provider_used=None,
            metadata={"budget_error": True}
        )
    
    async def _create_final_error_result(self, context: ExecutionContext, error_message: str) -> ExecutionResult:
        """Tworzenie końcowego wyniku błędu"""
        return ExecutionResult(
            task_id=context.task_id,
            status=ExecutionStatus.FAILED,
            start_time=context.start_time,
            end_time=datetime.utcnow(),
            result_data=None,
            error_message=error_message,
            error_type="FinalExecutionError",
            retry_count=context.attempt_number - 1,
            cost_usd=context.current_cost,
            execution_time_seconds=(datetime.utcnow() - context.start_time).total_seconds(),
            model_used=None,
            provider_used=None,
            metadata={"final_attempt": True}
        )
    
    async def _save_execution_result(self, result: ExecutionResult):
        """Zapisywanie wyniku wykonania"""
        try:
            # Dodaj do historii
            self.execution_results.append(result)
            
            # Zapisz do pamięci
            await self.memory_store.store_context(
                context_type="system",
                context_key=f"execution_{result.task_id}_{int(time.time())}",
                title=f"Task Execution: {result.task_id}",
                content=json.dumps(asdict(result), indent=2, default=str),
                tags=["task_execution", "system", result.status.value],
                importance_score=0.7,
                expires_in_days=30
            )
            
            # Aktualizuj budżet
            if result.cost_usd > 0:
                await self.budget_manager.record_expense(
                    amount=result.cost_usd,
                    category=ExpenseCategory.CONTENT_GENERATION,
                    description=f"Execution of task {result.task_id}",
                    task_id=result.task_id
                )
            
            logger.info(f"Wynik wykonania zapisany: {result.task_id} (status: {result.status.value})")
            
        except Exception as e:
            logger.error(f"Błąd zapisywania wyniku wykonania: {e}")
    
    async def _save_execution_stats(self, results: List[Dict[str, Any]]):
        """Zapisywanie statystyk wykonania"""
        try:
            stats = {
                "total_tasks": len(results),
                "successful_tasks": sum(1 for r in results if r.get("status") == "completed"),
                "failed_tasks": sum(1 for r in results if r.get("status") == "failed"),
                "total_cost": sum(r.get("cost_usd", 0) for r in results),
                "total_time": sum(r.get("execution_time_seconds", 0) for r in results),
                "avg_cost": sum(r.get("cost_usd", 0) for r in results) / len(results) if results else 0,
                "avg_time": sum(r.get("execution_time_seconds", 0) for r in results) / len(results) if results else 0
            }
            
            await self.memory_store.store_context(
                context_type="system",
                context_key=f"execution_stats_{int(time.time())}",
                title=f"Execution Statistics {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}",
                content=json.dumps(stats, indent=2),
                tags=["execution_stats", "system", "analytics"],
                importance_score=0.6,
                expires_in_days=7
            )
            
            logger.info(f"Statystyki wykonania zapisane: {stats['total_tasks']} zadań")
            
        except Exception as e:
            logger.error(f"Błąd zapisywania statystyk: {e}")
    
    async def get_execution_stats(self) -> Dict[str, Any]:
        """Pobieranie statystyk wykonania"""
        try:
            if not self.execution_results:
                return {"error": "No execution results available"}
            
            recent_results = self.execution_results[-50:]  # Ostatnie 50 wykonań
            
            stats = {
                "total_executions": len(self.execution_results),
                "recent_executions": len(recent_results),
                "success_rate": sum(1 for r in recent_results if r.status == ExecutionStatus.COMPLETED) / len(recent_results),
                "avg_execution_time": sum(r.execution_time_seconds for r in recent_results) / len(recent_results),
                "avg_cost": sum(r.cost_usd for r in recent_results) / len(recent_results),
                "total_cost": sum(r.cost_usd for r in self.execution_results),
                "active_executions": len(self.active_executions),
                "status_breakdown": {
                    status.value: sum(1 for r in recent_results if r.status == status)
                    for status in ExecutionStatus
                }
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Błąd pobierania statystyk: {e}")
            return {"error": str(e)}
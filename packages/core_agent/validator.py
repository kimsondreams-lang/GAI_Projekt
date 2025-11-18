"""
Zaawansowany walidator zadań dla Autonomous Agent AI
Zawiera walidację wyników, kontrolę jakości i kosztów
"""

import asyncio
import logging
import json
import re
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum

from packages.models.invoke import ModelManager
from packages.memory import get_memory_store
from packages.core_agent.budget import BudgetManager

logger = logging.getLogger(__name__)

class ValidationStatus(Enum):
    """Statusy walidacji"""
    PENDING = "pending"
    VALIDATING = "validating"
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"
    ERROR = "error"

class ValidationType(Enum):
    """Typy walidacji"""
    CONTENT_QUALITY = "content_quality"
    SEO_COMPLIANCE = "seo_compliance"
    CODE_QUALITY = "code_quality"
    COST_EFFECTIVENESS = "cost_effectiveness"
    TECHNICAL_ACCURACY = "technical_accuracy"
    COMPLETENESS = "completeness"
    ORIGINALITY = "originality"

@dataclass
class ValidationResult:
    """Wynik walidacji"""
    task_id: str
    validation_type: ValidationType
    status: ValidationStatus
    score: float  # 0.0 - 1.0
    feedback: str
    suggestions: List[str]
    issues: List[Dict[str, Any]]
    validation_data: Dict[str, Any]
    validator_model: Optional[str]
    cost_usd: float
    execution_time_seconds: float
    timestamp: datetime
    metadata: Dict[str, Any]

@dataclass
class TaskValidationReport:
    """Raport walidacji zadania"""
    task_id: str
    overall_status: ValidationStatus
    overall_score: float
    individual_validations: List[ValidationResult]
    recommendations: List[str]
    cost_analysis: Dict[str, Any]
    quality_summary: Dict[str, Any]
    timestamp: datetime
    metadata: Dict[str, Any]

class TaskValidator:
    """
    Zaawansowany walidator zadań dla agenta AI
    """
    
    def __init__(self):
        self.model_manager = ModelManager()
        self.memory_store = None
        self.budget_manager = None
        
        # Progi walidacji
        self.content_quality_threshold = 0.7
        self.seo_compliance_threshold = 0.6
        self.code_quality_threshold = 0.8
        self.cost_effectiveness_threshold = 0.5
        self.originality_threshold = 0.6
        
        # Konfiguracja walidacji
        self.validation_models = {
            "content_quality": "gpt-4",
            "seo_compliance": "gpt-3.5-turbo",
            "code_quality": "deepseek-coder",
            "technical_accuracy": "gpt-4"
        }
        
        logger.info("TaskValidator zainicjalizowany")
    
    async def initialize(self):
        """Inicjalizacja walidatora"""
        logger.info("Inicjalizacja TaskValidator...")
        
        self.memory_store = await get_memory_store()
        self.budget_manager = BudgetManager()
        await self.budget_manager.initialize()
        
        logger.info("TaskValidator został zainicjalizowany")
    
    async def validate_tasks(self, execution_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Główna metoda walidacji zadań
        
        Args:
            execution_results: Lista wyników wykonania zadań
            
        Returns:
            Lista raportów walidacji
        """
        logger.info(f"Rozpoczęcie walidacji {len(execution_results)} zadań...")
        
        try:
            validation_reports = []
            
            for result in execution_results:
                try:
                    report = await self._validate_single_task(result)
                    validation_reports.append(asdict(report))
                    
                except Exception as e:
                    logger.error(f"Błąd walidacji zadania {result.get('task_id', 'unknown')}: {e}")
                    # Utwórz raport błędu
                    error_report = await self._create_error_validation_report(result, str(e))
                    validation_reports.append(asdict(error_report))
            
            # Zapisz podsumowanie walidacji
            await self._save_validation_summary(validation_reports)
            
            logger.info(f"Zakończono walidację {len(validation_reports)} zadań")
            return validation_reports
            
        except Exception as e:
            logger.error(f"Błąd podczas walidacji zadań: {e}")
            return []
    
    async def _validate_single_task(self, execution_result: Dict[str, Any]) -> TaskValidationReport:
        """Walidacja pojedynczego zadania"""
        task_id = execution_result.get("task_id", "unknown")
        task_type = execution_result.get("task_type", "unknown")
        
        logger.info(f"Walidacja zadania: {task_id} (typ: {task_type})")
        
        try:
            # Określ typy walidacji na podstawie zadania
            validation_types = self._determine_validation_types(task_type)
            
            # Przeprowadź walidacje
            validation_results = []
            total_cost = 0.0
            
            for validation_type in validation_types:
                try:
                    result = await self._perform_validation(task_id, execution_result, validation_type)
                    validation_results.append(result)
                    total_cost += result.cost_usd
                    
                except Exception as e:
                    logger.error(f"Błąd walidacji {validation_type.value} dla zadania {task_id}: {e}")
                    error_result = await self._create_error_validation_result(task_id, validation_type, str(e))
                    validation_results.append(error_result)
            
            # Oblicz ogólny wynik
            overall_score = self._calculate_overall_score(validation_results)
            overall_status = self._determine_overall_status(validation_results)
            
            # Przygotuj rekomendacje
            recommendations = self._generate_recommendations(validation_results)
            
            # Analiza kosztów
            cost_analysis = await self._analyze_cost_effectiveness(execution_result, total_cost)
            
            # Podsumowanie jakości
            quality_summary = self._create_quality_summary(validation_results)
            
            report = TaskValidationReport(
                task_id=task_id,
                overall_status=overall_status,
                overall_score=overall_score,
                individual_validations=validation_results,
                recommendations=recommendations,
                cost_analysis=cost_analysis,
                quality_summary=quality_summary,
                timestamp=datetime.utcnow(),
                metadata={
                    "task_type": task_type,
                    "execution_status": execution_result.get("status"),
                    "validation_types": [vt.value for vt in validation_types]
                }
            )
            
            # Zapisz raport
            await self._save_validation_report(report)
            
            logger.info(f"Zakończono walidację zadania {task_id}: {overall_status.value} (score: {overall_score:.2f})")
            return report
            
        except Exception as e:
            logger.error(f"Błąd walidacji zadania {task_id}: {e}")
            return await self._create_error_validation_report(execution_result, str(e))
    
    def _determine_validation_types(self, task_type: str) -> List[ValidationType]:
        """Określenie typów walidacji na podstawie typu zadania"""
        validation_mapping = {
            "content_generation": [
                ValidationType.CONTENT_QUALITY,
                ValidationType.SEO_COMPLIANCE,
                ValidationType.ORIGINALITY,
                ValidationType.COMPLETENESS
            ],
            "seo_optimization": [
                ValidationType.SEO_COMPLIANCE,
                ValidationType.TECHNICAL_ACCURACY,
                ValidationType.COST_EFFECTIVENESS
            ],
            "research": [
                ValidationType.TECHNICAL_ACCURACY,
                ValidationType.COMPLETENESS,
                ValidationType.COST_EFFECTIVENESS
            ],
            "code_generation": [
                ValidationType.CODE_QUALITY,
                ValidationType.TECHNICAL_ACCURACY,
                ValidationType.COMPLETENESS
            ],
            "testing": [
                ValidationType.TECHNICAL_ACCURACY,
                ValidationType.COMPLETENESS
            ],
            "deployment": [
                ValidationType.TECHNICAL_ACCURACY,
                ValidationType.COMPLETENESS
            ],
            "monitoring": [
                ValidationType.TECHNICAL_ACCURACY,
                ValidationType.COST_EFFECTIVENESS
            ],
            "maintenance": [
                ValidationType.TECHNICAL_ACCURACY,
                ValidationType.COST_EFFECTIVENESS
            ]
        }
        
        return validation_mapping.get(task_type, [
            ValidationType.COMPLETENESS,
            ValidationType.COST_EFFECTIVENESS
        ])
    
    async def _perform_validation(self, task_id: str, execution_result: Dict[str, Any], validation_type: ValidationType) -> ValidationResult:
        """Wykonanie pojedynczej walidacji"""
        logger.info(f"Wykonywanie walidacji {validation_type.value} dla zadania {task_id}")
        
        start_time = datetime.utcnow()
        
        try:
            # Wybierz odpowiednią metodę walidacji
            if validation_type == ValidationType.CONTENT_QUALITY:
                result = await self._validate_content_quality(task_id, execution_result)
            elif validation_type == ValidationType.SEO_COMPLIANCE:
                result = await self._validate_seo_compliance(task_id, execution_result)
            elif validation_type == ValidationType.CODE_QUALITY:
                result = await self._validate_code_quality(task_id, execution_result)
            elif validation_type == ValidationType.COST_EFFECTIVENESS:
                result = await self._validate_cost_effectiveness(task_id, execution_result)
            elif validation_type == ValidationType.TECHNICAL_ACCURACY:
                result = await self._validate_technical_accuracy(task_id, execution_result)
            elif validation_type == ValidationType.COMPLETENESS:
                result = await self._validate_completeness(task_id, execution_result)
            elif validation_type == ValidationType.ORIGINALITY:
                result = await self._validate_originality(task_id, execution_result)
            else:
                result = await self._validate_generic(task_id, execution_result, validation_type)
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            result.execution_time_seconds = execution_time
            
            logger.info(f"Zakończono walidację {validation_type.value}: {result.status.value} (score: {result.score:.2f})")
            return result
            
        except Exception as e:
            logger.error(f"Błąd walidacji {validation_type.value} dla zadania {task_id}: {e}")
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            return ValidationResult(
                task_id=task_id,
                validation_type=validation_type,
                status=ValidationStatus.ERROR,
                score=0.0,
                feedback=f"Validation error: {str(e)}",
                suggestions=["Check validation logic"],
                issues=[{"type": "validation_error", "description": str(e)}],
                validation_data={},
                validator_model=None,
                cost_usd=0.0,
                execution_time_seconds=execution_time,
                timestamp=datetime.utcnow(),
                metadata={"error": True}
            )
    
    async def _validate_content_quality(self, task_id: str, execution_result: Dict[str, Any]) -> ValidationResult:
        """Walidacja jakości treści"""
        try:
            result_data = execution_result.get("result_data", {})
            content = result_data.get("content", "")
            
            if not content:
                return ValidationResult(
                    task_id=task_id,
                    validation_type=ValidationType.CONTENT_QUALITY,
                    status=ValidationStatus.FAILED,
                    score=0.0,
                    feedback="No content generated",
                    suggestions=["Generate meaningful content"],
                    issues=[{"type": "missing_content", "description": "No content found"}],
                    validation_data={},
                    validator_model=None,
                    cost_usd=0.0,
                    execution_time_seconds=0.0,
                    timestamp=datetime.utcnow(),
                    metadata={}
                )
            
            # Przygotuj prompt dla walidacji
            prompt = f"""
            Validate the following content for quality, engagement, and value:
            
            Content:
            {content[:2000]}...
            
            Evaluate:
            1. Content quality and readability (0-100)
            2. Engagement factor and interest level
            3. Value and usefulness to readers
            4. Structure and organization
            5. Grammar and language quality
            6. Call-to-action effectiveness
            
            Provide specific score (0-100) and detailed feedback with improvement suggestions.
            Format as JSON with: score, feedback, suggestions, issues
            """
            
            response = await self.model_manager.model_infer(
                task_label="content_validation",
                prompt=prompt,
                temperature=0.3,
                max_tokens=500
            )
            
            validation_content = response.get("content", "")
            
            # Parsuj wynik walidacji
            validation_data = self._parse_ai_validation(validation_content)
            
            score = validation_data.get("score", 50) / 100.0
            feedback = validation_data.get("feedback", "Content validation completed")
            suggestions = validation_data.get("suggestions", [])
            issues = validation_data.get("issues", [])
            
            # Określ status na podstawie wyniku
            if score >= self.content_quality_threshold:
                status = ValidationStatus.PASSED
            elif score >= self.content_quality_threshold * 0.7:
                status = ValidationStatus.WARNING
            else:
                status = ValidationStatus.FAILED
            
            # Oblicz koszt
            cost = self._estimate_validation_cost(response)
            
            return ValidationResult(
                task_id=task_id,
                validation_type=ValidationType.CONTENT_QUALITY,
                status=status,
                score=score,
                feedback=feedback,
                suggestions=suggestions,
                issues=issues,
                validation_data=validation_data,
                validator_model="gpt-3.5-turbo",
                cost_usd=cost,
                execution_time_seconds=0.0,  # Zostanie ustawione później
                timestamp=datetime.utcnow(),
                metadata={"content_length": len(content)}
            )
            
        except Exception as e:
            logger.error(f"Błąd walidacji jakości treści: {e}")
            raise
    
    async def _validate_seo_compliance(self, task_id: str, execution_result: Dict[str, Any]) -> ValidationResult:
        """Walidacja zgodności SEO"""
        try:
            result_data = execution_result.get("result_data", {})
            
            # Sprawdź czy są dane SEO
            seo_data = result_data.get("seo_analysis", {})
            content = result_data.get("content", "")
            
            if not seo_data and not content:
                return ValidationResult(
                    task_id=task_id,
                    validation_type=ValidationType.SEO_COMPLIANCE,
                    status=ValidationStatus.WARNING,
                    score=0.3,
                    feedback="No SEO data available for validation",
                    suggestions=["Include SEO analysis in task results"],
                    issues=[{"type": "missing_seo_data", "description": "No SEO information found"}],
                    validation_data={},
                    validator_model=None,
                    cost_usd=0.0,
                    execution_time_seconds=0.0,
                    timestamp=datetime.utcnow(),
                    metadata={}
                )
            
            # Analiza SEO
            seo_score = self._calculate_seo_score(content, seo_data)
            
            feedback = f"SEO compliance score: {seo_score:.2f}"
            suggestions = []
            issues = []
            
            if seo_score < self.seo_compliance_threshold:
                suggestions.extend([
                    "Optimize meta tags",
                    "Improve keyword density",
                    "Add structured data",
                    "Optimize headings structure"
                ])
                issues.append({
                    "type": "seo_optimization_needed",
                    "description": f"SEO score {seo_score:.2f} below threshold {self.seo_compliance_threshold}"
                })
            
            status = ValidationStatus.PASSED if seo_score >= self.seo_compliance_threshold else ValidationStatus.WARNING
            
            return ValidationResult(
                task_id=task_id,
                validation_type=ValidationType.SEO_COMPLIANCE,
                status=status,
                score=seo_score,
                feedback=feedback,
                suggestions=suggestions,
                issues=issues,
                validation_data={"seo_data": seo_data, "content_length": len(content)},
                validator_model=None,
                cost_usd=0.0,
                execution_time_seconds=0.0,
                timestamp=datetime.utcnow(),
                metadata={}
            )
            
        except Exception as e:
            logger.error(f"Błąd walidacji SEO: {e}")
            raise
    
    def _calculate_seo_score(self, content: str, seo_data: Dict[str, Any]) -> float:
        """Obliczenie wyniku SEO"""
        score = 0.5  # Base score
        
        try:
            # Sprawdź długość treści
            word_count = len(content.split())
            if word_count >= 300:
                score += 0.1
            if word_count >= 1000:
                score += 0.1
            
            # Sprawdź strukturę nagłówków
            if "#" in content:
                score += 0.1
            
            # Sprawdź obecność słów kluczowych w SEO danych
            if seo_data.get("keywords"):
                score += 0.1
            
            # Sprawdź rekomendacje SEO
            recommendations = seo_data.get("recommendations", [])
            if len(recommendations) > 0:
                score += 0.1
            
            return min(score, 1.0)
            
        except Exception:
            return 0.3
    
    async def _validate_code_quality(self, task_id: str, execution_result: Dict[str, Any]) -> ValidationResult:
        """Walidacja jakości kodu"""
        try:
            result_data = execution_result.get("result_data", {})
            code = result_data.get("generated_code", "")
            
            if not code:
                return ValidationResult(
                    task_id=task_id,
                    validation_type=ValidationType.CODE_QUALITY,
                    status=ValidationStatus.FAILED,
                    score=0.0,
                    feedback="No code generated",
                    suggestions=["Generate code for code quality validation"],
                    issues=[{"type": "missing_code", "description": "No code found"}],
                    validation_data={},
                    validator_model=None,
                    cost_usd=0.0,
                    execution_time_seconds=0.0,
                    timestamp=datetime.utcnow(),
                    metadata={}
                )
            
            # Przygotuj prompt dla walidacji kodu
            prompt = f"""
            Analyze the following code for quality, best practices, and potential issues:
            
            Code:
            ```python
            {code[:1500]}
            ```
            
            Evaluate:
            1. Code structure and organization (0-100)
            2. Error handling and robustness
            3. Documentation and comments
            4. Performance considerations
            5. Security best practices
            6. Testing considerations
            7. Maintainability and readability
            
            Provide specific score (0-100) and detailed feedback with improvement suggestions.
            Format as JSON with: score, feedback, suggestions, issues
            """
            
            response = await self.model_manager.model_infer(
                task_label="code_validation",
                prompt=prompt,
                temperature=0.3,
                max_tokens=800
            )
            
            validation_content = response.get("content", "")
            
            # Parsuj wynik walidacji
            validation_data = self._parse_ai_validation(validation_content)
            
            score = validation_data.get("score", 50) / 100.0
            feedback = validation_data.get("feedback", "Code quality validation completed")
            suggestions = validation_data.get("suggestions", [])
            issues = validation_data.get("issues", [])
            
            # Określ status na podstawie wyniku
            if score >= self.code_quality_threshold:
                status = ValidationStatus.PASSED
            elif score >= self.code_quality_threshold * 0.8:
                status = ValidationStatus.WARNING
            else:
                status = ValidationStatus.FAILED
            
            # Oblicz koszt
            cost = self._estimate_validation_cost(response)
            
            return ValidationResult(
                task_id=task_id,
                validation_type=ValidationType.CODE_QUALITY,
                status=status,
                score=score,
                feedback=feedback,
                suggestions=suggestions,
                issues=issues,
                validation_data=validation_data,
                validator_model="deepseek-coder",
                cost_usd=cost,
                execution_time_seconds=0.0,
                timestamp=datetime.utcnow(),
                metadata={"code_length": len(code)}
            )
            
        except Exception as e:
            logger.error(f"Błąd walidacji jakości kodu: {e}")
            raise
    
    async def _validate_cost_effectiveness(self, task_id: str, execution_result: Dict[str, Any]) -> ValidationResult:
        """Walidacja efektywności kosztowej"""
        try:
            result_data = execution_result.get("result_data", {})
            execution_cost = execution_result.get("cost_usd", 0.0)
            execution_time = execution_result.get("execution_time_seconds", 0.0)
            
            # Oblicz wynik efektywności kosztowej
            effectiveness_score = self._calculate_cost_effectiveness_score(
                execution_cost, execution_time, result_data
            )
            
            feedback = f"Cost effectiveness score: {effectiveness_score:.2f} (cost: ${execution_cost:.4f}, time: {execution_time:.1f}s)"
            suggestions = []
            issues = []
            
            if effectiveness_score < self.cost_effectiveness_threshold:
                suggestions.extend([
                    "Optimize execution time",
                    "Consider using more cost-effective models",
                    "Batch similar tasks for efficiency"
                ])
                issues.append({
                    "type": "cost_inefficiency",
                    "description": f"Cost effectiveness {effectiveness_score:.2f} below threshold {self.cost_effectiveness_threshold}"
                })
            
            # Sprawdź budżet
            budget_status = await self.budget_manager.get_budget_status()
            if budget_status["remaining_budget"] < execution_cost * 10:  # Zostaw margines
                suggestions.append("Monitor budget closely")
                issues.append({
                    "type": "budget_warning",
                    "description": "Low remaining budget"
                })
            
            status = ValidationStatus.PASSED if effectiveness_score >= self.cost_effectiveness_threshold else ValidationStatus.WARNING
            
            return ValidationResult(
                task_id=task_id,
                validation_type=ValidationType.COST_EFFECTIVENESS,
                status=status,
                score=effectiveness_score,
                feedback=feedback,
                suggestions=suggestions,
                issues=issues,
                validation_data={
                    "execution_cost": execution_cost,
                    "execution_time": execution_time,
                    "budget_status": budget_status
                },
                validator_model=None,
                cost_usd=0.0,
                execution_time_seconds=0.0,
                timestamp=datetime.utcnow(),
                metadata={}
            )
            
        except Exception as e:
            logger.error(f"Błąd walidacji efektywności kosztowej: {e}")
            raise
    
    def _calculate_cost_effectiveness_score(self, cost: float, time: float, result_data: Dict[str, Any]) -> float:
        """Obliczenie wyniku efektywności kosztowej"""
        score = 0.5  # Base score
        
        try:
            # Im niższy koszt i czas, tym lepiej
            if cost <= 0.01:
                score += 0.3
            elif cost <= 0.05:
                score += 0.2
            elif cost <= 0.1:
                score += 0.1
            
            if time <= 30:  # 30 sekund
                score += 0.2
            elif time <= 120:  # 2 minuty
                score += 0.1
            
            # Sprawdź jakość wyników
            if result_data:
                if "content" in result_data and len(result_data["content"]) > 100:
                    score += 0.1
                if "quality_score" in result_data and result_data["quality_score"] > 0.7:
                    score += 0.1
            
            return min(score, 1.0)
            
        except Exception:
            return 0.3
    
    async def _validate_technical_accuracy(self, task_id: str, execution_result: Dict[str, Any]) -> ValidationResult:
        """Walidacja dokładności technicznej"""
        try:
            result_data = execution_result.get("result_data", {})
            
            # Sprawdź czy są dane techniczne
            if not result_data:
                return ValidationResult(
                    task_id=task_id,
                    validation_type=ValidationType.TECHNICAL_ACCURACY,
                    status=ValidationStatus.WARNING,
                    score=0.3,
                    feedback="No technical data to validate",
                    suggestions=["Include technical validation in task execution"],
                    issues=[{"type": "missing_data", "description": "No result data found"}],
                    validation_data={},
                    validator_model=None,
                    cost_usd=0.0,
                    execution_time_seconds=0.0,
                    timestamp=datetime.utcnow(),
                    metadata={}
                )
            
            # Prosta walidacja techniczna
            technical_score = self._assess_technical_accuracy(result_data)
            
            feedback = f"Technical accuracy score: {technical_score:.2f}"
            suggestions = []
            issues = []
            
            if technical_score < 0.6:
                suggestions.extend([
                    "Review technical specifications",
                    "Validate against known standards",
                    "Cross-reference with documentation"
                ])
                issues.append({
                    "type": "technical_inaccuracy",
                    "description": f"Technical score {technical_score:.2f} below acceptable threshold"
                })
            
            status = ValidationStatus.PASSED if technical_score >= 0.6 else ValidationStatus.WARNING
            
            return ValidationResult(
                task_id=task_id,
                validation_type=ValidationType.TECHNICAL_ACCURACY,
                status=status,
                score=technical_score,
                feedback=feedback,
                suggestions=suggestions,
                issues=issues,
                validation_data={"result_data_keys": list(result_data.keys())},
                validator_model=None,
                cost_usd=0.0,
                execution_time_seconds=0.0,
                timestamp=datetime.utcnow(),
                metadata={}
            )
            
        except Exception as e:
            logger.error(f"Błąd walidacji dokładności technicznej: {e}")
            raise
    
    def _assess_technical_accuracy(self, result_data: Dict[str, Any]) -> float:
        """Ocena dokładności technicznej"""
        score = 0.5  # Base score
        
        try:
            # Sprawdź obecność kluczowych elementów
            if "code" in result_data and result_data["code"]:
                score += 0.2
            
            if "documentation" in result_data and result_data["documentation"]:
                score += 0.1
            
            if "test_cases" in result_data and result_data["test_cases"]:
                score += 0.1
            
            if "quality_score" in result_data and result_data["quality_score"] > 0.5:
                score += 0.1
            
            return min(score, 1.0)
            
        except Exception:
            return 0.3
    
    async def _validate_completeness(self, task_id: str, execution_result: Dict[str, Any]) -> ValidationResult:
        """Walidacja kompletności"""
        try:
            result_data = execution_result.get("result_data", {})
            
            # Sprawdź kompletność wyników
            completeness_score = self._assess_completeness(result_data)
            
            feedback = f"Completeness score: {completeness_score:.2f}"
            suggestions = []
            issues = []
            
            if completeness_score < 0.7:
                suggestions.extend([
                    "Include all required result fields",
                    "Add metadata and context",
                    "Provide detailed execution summary"
                ])
                issues.append({
                    "type": "incomplete_results",
                    "description": f"Results completeness {completeness_score:.2f} below expected threshold"
                })
            
            status = ValidationStatus.PASSED if completeness_score >= 0.7 else ValidationStatus.WARNING
            
            return ValidationResult(
                task_id=task_id,
                validation_type=ValidationType.COMPLETENESS,
                status=status,
                score=completeness_score,
                feedback=feedback,
                suggestions=suggestions,
                issues=issues,
                validation_data={"result_fields": list(result_data.keys())},
                validator_model=None,
                cost_usd=0.0,
                execution_time_seconds=0.0,
                timestamp=datetime.utcnow(),
                metadata={}
            )
            
        except Exception as e:
            logger.error(f"Błąd walidacji kompletności: {e}")
            raise
    
    def _assess_completeness(self, result_data: Dict[str, Any]) -> float:
        """Ocena kompletności wyników"""
        score = 0.5  # Base score
        
        try:
            # Sprawdź obecność kluczowych pól
            required_fields = ["content", "result", "data", "output"]
            for field in required_fields:
                if field in result_data and result_data[field]:
                    score += 0.1
                    break
            
            # Sprawdź metadane
            if "metadata" in result_data:
                score += 0.1
            
            # Sprawdź informacje o modelu
            if "model_used" in result_data or "provider_used" in result_data:
                score += 0.1
            
            # Sprawdź liczbę pól
            if len(result_data) >= 3:
                score += 0.1
            
            return min(score, 1.0)
            
        except Exception:
            return 0.3
    
    async def _validate_originality(self, task_id: str, execution_result: Dict[str, Any]) -> ValidationResult:
        """Walidacja oryginalności"""
        try:
            result_data = execution_result.get("result_data", {})
            content = result_data.get("content", "")
            
            if not content:
                return ValidationResult(
                    task_id=task_id,
                    validation_type=ValidationType.ORIGINALITY,
                    status=ValidationStatus.WARNING,
                    score=0.5,
                    feedback="No content to check for originality",
                    suggestions=["Generate original content"],
                    issues=[],
                    validation_data={},
                    validator_model=None,
                    cost_usd=0.0,
                    execution_time_seconds=0.0,
                    timestamp=datetime.utcnow(),
                    metadata={}
                )
            
            # Prosta ocena oryginalności
            originality_score = self._assess_originality(content)
            
            feedback = f"Originality score: {originality_score:.2f}"
            suggestions = []
            issues = []
            
            if originality_score < self.originality_threshold:
                suggestions.extend([
                    "Ensure content is original and not copied",
                    "Add unique insights and perspectives",
                    "Use original examples and case studies"
                ])
                issues.append({
                    "type": "low_originality",
                    "description": f"Content originality {originality_score:.2f} below threshold {self.originality_threshold}"
                })
            
            status = ValidationStatus.PASSED if originality_score >= self.originality_threshold else ValidationStatus.WARNING
            
            return ValidationResult(
                task_id=task_id,
                validation_type=ValidationType.ORIGINALITY,
                status=status,
                score=originality_score,
                feedback=feedback,
                suggestions=suggestions,
                issues=issues,
                validation_data={"content_length": len(content)},
                validator_model=None,
                cost_usd=0.0,
                execution_time_seconds=0.0,
                timestamp=datetime.utcnow(),
                metadata={}
            )
            
        except Exception as e:
            logger.error(f"Błąd walidacji oryginalności: {e}")
            raise
    
    def _assess_originality(self, content: str) -> float:
        """Ocena oryginalności treści"""
        score = 0.7  # Base score - zakładamy oryginalność
        
        try:
            # Proste heurystyki
            if len(content) < 100:
                score -= 0.2  # Krótkie treści mogą być mniej oryginalne
            
            if len(set(content.split())) / len(content.split()) < 0.5:
                score -= 0.2  # Dużo powtórzeń
            
            # Sprawdź różnorodność słów
            words = content.lower().split()
            unique_words = set(words)
            diversity_ratio = len(unique_words) / len(words) if words else 0
            
            if diversity_ratio > 0.7:
                score += 0.1
            elif diversity_ratio < 0.3:
                score -= 0.1
            
            return max(min(score, 1.0), 0.0)
            
        except Exception:
            return 0.5
    
    async def _validate_generic(self, task_id: str, execution_result: Dict[str, Any], validation_type: ValidationType) -> ValidationResult:
        """Generyczna walidacja"""
        return ValidationResult(
            task_id=task_id,
            validation_type=validation_type,
            status=ValidationStatus.PASSED,
            score=0.7,
            feedback=f"Generic validation for {validation_type.value}",
            suggestions=["Consider specific validation requirements"],
            issues=[],
            validation_data={},
            validator_model=None,
            cost_usd=0.0,
            execution_time_seconds=0.0,
            timestamp=datetime.utcnow(),
            metadata={"validation_type": "generic"}
        )
    
    def _parse_ai_validation(self, content: str) -> Dict[str, Any]:
        """Parsowanie wyniku walidacji z AI"""
        try:
            # Spróbuj znaleźć JSON w treści
            import json
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            
            # Fallback - proste parsowanie
            score = 50
            if "score" in content.lower():
                # Szukaj liczb
                numbers = re.findall(r'\d+', content)
                if numbers:
                    score = int(numbers[0])
            
            return {
                "score": score,
                "feedback": content[:200],
                "suggestions": ["Review content for improvements"],
                "issues": []
            }
            
        except Exception:
            return {
                "score": 50,
                "feedback": "Validation completed",
                "suggestions": [],
                "issues": []
            }
    
    def _estimate_validation_cost(self, response: Dict[str, Any]) -> float:
        """Szacowanie kosztu walidacji"""
        content = response.get("content", "")
        return max(0.001, len(content) / 1000 * 0.001)  # $0.001 per 1000 znaków
    
    def _calculate_overall_score(self, validation_results: List[ValidationResult]) -> float:
        """Obliczenie ogólnego wyniku"""
        if not validation_results:
            return 0.0
        
        scores = [result.score for result in validation_results]
        return sum(scores) / len(scores)
    
    def _determine_overall_status(self, validation_results: List[ValidationResult]) -> ValidationStatus:
        """Określenie ogólnego statusu"""
        if not validation_results:
            return ValidationStatus.ERROR
        
        # Sprawdź czy są błędy krytyczne
        if any(result.status == ValidationStatus.ERROR for result in validation_results):
            return ValidationStatus.ERROR
        
        # Sprawdź czy są nieudane walidacje
        if any(result.status == ValidationStatus.FAILED for result in validation_results):
            return ValidationStatus.FAILED
        
        # Sprawdź czy są ostrzeżenia
        if any(result.status == ValidationStatus.WARNING for result in validation_results):
            return ValidationStatus.WARNING
        
        # Jeśli wszystkie przeszły
        if all(result.status == ValidationStatus.PASSED for result in validation_results):
            return ValidationStatus.PASSED
        
        return ValidationStatus.PENDING
    
    def _generate_recommendations(self, validation_results: List[ValidationResult]) -> List[str]:
        """Generowanie rekomendacji na podstawie walidacji"""
        recommendations = []
        
        for result in validation_results:
            if result.status != ValidationStatus.PASSED:
                recommendations.extend(result.suggestions)
        
        # Dodaj ogólne rekomendacje
        if any(result.validation_type == ValidationType.COST_EFFECTIVENESS and result.score < 0.5 for result in validation_results):
            recommendations.append("Review cost optimization strategies")
        
        if any(result.validation_type == ValidationType.CONTENT_QUALITY and result.score < 0.7 for result in validation_results):
            recommendations.append("Improve content generation process")
        
        # Usuń duplikaty
        return list(set(recommendations))[:10]  # Maksymalnie 10 rekomendacji
    
    async def _analyze_cost_effectiveness(self, execution_result: Dict[str, Any], validation_cost: float) -> Dict[str, Any]:
        """Analiza efektywności kosztowej"""
        execution_cost = execution_result.get("cost_usd", 0.0)
        total_cost = execution_cost + validation_cost
        
        return {
            "execution_cost": execution_cost,
            "validation_cost": validation_cost,
            "total_cost": total_cost,
            "cost_breakdown": {
                "execution_percentage": (execution_cost / total_cost * 100) if total_cost > 0 else 0,
                "validation_percentage": (validation_cost / total_cost * 100) if total_cost > 0 else 0
            }
        }
    
    def _create_quality_summary(self, validation_results: List[ValidationResult]) -> Dict[str, Any]:
        """Tworzenie podsumowania jakości"""
        if not validation_results:
            return {"error": "No validation results"}
        
        scores_by_type = {}
        for result in validation_results:
            validation_type = result.validation_type.value
            if validation_type not in scores_by_type:
                scores_by_type[validation_type] = []
            scores_by_type[validation_type].append(result.score)
        
        quality_summary = {
            "overall_score": sum(result.score for result in validation_results) / len(validation_results),
            "scores_by_type": {
                vtype: sum(scores) / len(scores) if scores else 0.0
                for vtype, scores in scores_by_type.items()
            },
            "passed_validations": sum(1 for result in validation_results if result.status == ValidationStatus.PASSED),
            "failed_validations": sum(1 for result in validation_results if result.status == ValidationStatus.FAILED),
            "warning_validations": sum(1 for result in validation_results if result.status == ValidationStatus.WARNING),
            "total_issues": sum(len(result.issues) for result in validation_results)
        }
        
        return quality_summary
    
    async def _create_error_validation_report(self, execution_result: Dict[str, Any], error_message: str) -> TaskValidationReport:
        """Tworzenie raportu błędu walidacji"""
        return TaskValidationReport(
            task_id=execution_result.get("task_id", "unknown"),
            overall_status=ValidationStatus.ERROR,
            overall_score=0.0,
            individual_validations=[],
            recommendations=["Fix validation errors", "Check execution results"],
            cost_analysis={"error": error_message},
            quality_summary={"error": error_message},
            timestamp=datetime.utcnow(),
            metadata={"validation_error": error_message}
        )
    
    async def _create_error_validation_result(self, task_id: str, validation_type: ValidationType, error_message: str) -> ValidationResult:
        """Tworzenie wyniku błędu walidacji"""
        return ValidationResult(
            task_id=task_id,
            validation_type=validation_type,
            status=ValidationStatus.ERROR,
            score=0.0,
            feedback=f"Validation error: {error_message}",
            suggestions=["Check validation logic"],
            issues=[{"type": "validation_error", "description": error_message}],
            validation_data={},
            validator_model=None,
            cost_usd=0.0,
            execution_time_seconds=0.0,
            timestamp=datetime.utcnow(),
            metadata={"error": True}
        )
    
    async def _save_validation_report(self, report: TaskValidationReport):
        """Zapisywanie raportu walidacji"""
        try:
            await self.memory_store.store_context(
                context_type="system",
                context_key=f"validation_report_{report.task_id}_{int(datetime.utcnow().timestamp())}",
                title=f"Validation Report: {report.task_id}",
                content=json.dumps(asdict(report), indent=2, default=str),
                tags=["validation_report", "system", report.overall_status.value],
                importance_score=0.8,
                expires_in_days=30
            )
            
            logger.info(f"Raport walidacji zapisany: {report.task_id}")
            
        except Exception as e:
            logger.error(f"Błąd zapisywania raportu walidacji: {e}")
    
    async def _save_validation_summary(self, validation_reports: List[Dict[str, Any]]):
        """Zapisywanie podsumowania walidacji"""
        try:
            summary = {
                "total_tasks_validated": len(validation_reports),
                "validation_timestamp": datetime.utcnow().isoformat(),
                "overall_success_rate": 0.0,
                "average_score": 0.0,
                "status_breakdown": {},
                "total_validation_cost": 0.0,
                "recommendations_summary": []
            }
            
            if validation_reports:
                # Oblicz statystyki
                scores = [report.get("overall_score", 0.0) for report in validation_reports]
                summary["average_score"] = sum(scores) / len(scores) if scores else 0.0
                
                # Status breakdown
                status_counts = {}
                for report in validation_reports:
                    status = report.get("overall_status", "unknown")
                    status_counts[status] = status_counts.get(status, 0) + 1
                summary["status_breakdown"] = status_counts
                
                # Success rate
                passed_count = status_counts.get("passed", 0)
                summary["overall_success_rate"] = passed_count / len(validation_reports) if validation_reports else 0.0
                
                # Koszt walidacji
                total_cost = sum(
                    sum(val.get("cost_usd", 0.0) for val in report.get("individual_validations", []))
                    for report in validation_reports
                )
                summary["total_validation_cost"] = total_cost
                
                # Rekomendacje
                all_recommendations = []
                for report in validation_reports:
                    all_recommendations.extend(report.get("recommendations", []))
                summary["recommendations_summary"] = list(set(all_recommendations))[:10]
            
            # Przekonwertuj na słownik przed zapisem
            summary_dict = {
                "total_tasks_validated": summary["total_tasks_validated"],
                "validation_timestamp": summary["validation_timestamp"],
                "overall_success_rate": summary["overall_success_rate"],
                "average_score": summary["average_score"],
                "status_breakdown": summary["status_breakdown"],
                "total_validation_cost": summary["total_validation_cost"],
                "recommendations_summary": summary["recommendations_summary"],
                "type": "validation_summary"
            }
            
            await self.memory_store.store_context(
                context_type="system",
                context_key=f"validation_summary_{int(datetime.utcnow().timestamp())}",
                title=f"Validation Summary {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}",
                content=json.dumps(summary_dict, indent=2),
                tags=["validation_summary", "system", "analytics"],
                importance_score=0.8,
                expires_in_days=30
            )
            
            logger.info(f"Podsumowanie walidacji zapisane: {summary['total_tasks_validated']} zadań")
            
        except Exception as e:
            logger.error(f"Błąd zapisywania podsumowania walidacji: {e}")
    
    async def get_validation_stats(self) -> Dict[str, Any]:
        """Pobieranie statystyk walidacji"""
        try:
            # Wyszukaj ostatnie raporty walidacji
            recent_reports = await self.memory_store.search_similar_context(
                query="validation_summary system analytics",
                context_type="system",
                limit=10
            )
            
            if not recent_reports:
                return {
                    "total_validations": 0,
                    "average_score": 0.0,
                    "passed_validations": 0,
                    "failed_validations": 0,
                    "warning_validations": 0,
                    "error_validations": 0
                }
            
            # Przetwórz dane
            total_validations = 0
            total_score = 0.0
            passed_count = 0
            failed_count = 0
            warning_count = 0
            error_count = 0
            
            for report_data in recent_reports:
                try:
                    content = json.loads(report_data.get("content", "{}"))
                    if content.get("type") == "validation_summary":
                        total_validations += content.get("total_validations", 0)
                        total_score += content.get("average_score", 0) * content.get("total_validations", 0)
                        passed_count += content.get("passed_validations", 0)
                        failed_count += content.get("failed_validations", 0)
                        warning_count += content.get("warning_validations", 0)
                        error_count += content.get("error_validations", 0)
                except Exception as e:
                    logger.warning(f"Błąd przetwarzania raportu walidacji: {e}")
            
            # Oblicz średni wynik
            average_score = total_score / total_validations if total_validations > 0 else 0.0
            
            return {
                "total_validations": total_validations,
                "average_score": round(average_score, 2),
                "passed_validations": passed_count,
                "failed_validations": failed_count,
                "warning_validations": warning_count,
                "error_validations": error_count
            }
            
        except Exception as e:
            logger.error(f"Błąd pobierania statystyk walidacji: {e}")
            return {
                "total_validations": 0,
                "average_score": 0.0,
                "passed_validations": 0,
                "failed_validations": 0,
                "warning_validations": 0,
                "error_validations": 0
            }
            status_counts = {}
            
            for report in recent_reports:
                try:
                    content = json.loads(report.get("content", "{}"))
                    total_validations += content.get("total_tasks_validated", 0)
                    total_score += content.get("average_score", 0.0)
                    
                    for status, count in content.get("status_breakdown", {}).items():
                        status_counts[status] = status_counts.get(status, 0) + count
                        
                except Exception:
                    continue
            
            return {
                "total_validations": total_validations,
                "average_score": total_score / len(recent_reports) if recent_reports else 0.0,
                "status_breakdown": status_counts,
                "recent_reports": len(recent_reports),
                "validation_coverage": "active"
            }
            
        except Exception as e:
            logger.error(f"Błąd pobierania statystyk walidacji: {e}")
            return {"error": str(e)}

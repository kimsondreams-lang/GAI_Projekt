"""
Zaawansowany system zarządzania budżetem dla Autonomous Agent AI
Zawiera śledzenie kosztów, alerty i kontrolę wydatków
"""

import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import time

from packages.memory import get_memory_store

logger = logging.getLogger(__name__)

class BudgetAlertLevel(Enum):
    """Poziomy alertów budżetowych"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"

class ExpenseCategory(Enum):
    """Kategorie wydatków"""
    MODEL_INFERENCE = "model_inference"
    API_CALLS = "api_calls"
    CONTENT_GENERATION = "content_generation"
    SEO_OPTIMIZATION = "seo_optimization"
    RESEARCH = "research"
    VALIDATION = "validation"
    STORAGE = "storage"
    INFRASTRUCTURE = "infrastructure"
    MAINTENANCE = "maintenance"
    OTHER = "other"

@dataclass
class BudgetConfig:
    """Konfiguracja budżetu"""
    daily_budget: float
    weekly_budget: float
    monthly_budget: float
    emergency_reserve: float
    alert_thresholds: Dict[BudgetAlertLevel, float]
    max_single_expense: float
    expense_categories: List[ExpenseCategory]
    reset_time: str  # "00:00" dla dziennego resetu

@dataclass
class ExpenseRecord:
    """Rekord wydatku"""
    id: str
    timestamp: datetime
    amount: float
    category: ExpenseCategory
    description: str
    task_id: Optional[str]
    model_used: Optional[str]
    provider_used: Optional[str]
    metadata: Dict[str, Any]

@dataclass
class BudgetAlert:
    """Alert budżetowy"""
    id: str
    timestamp: datetime
    level: BudgetAlertLevel
    message: str
    current_spending: float
    budget_limit: float
    percentage_used: float
    recommendation: str
    acknowledged: bool

class BudgetManager:
    """
    Zaawansowany manager budżetu dla agenta AI
    """
    
    def __init__(self):
        self.memory_store = None
        self.config = self._load_default_config()
        self.expense_history: List[ExpenseRecord] = []
        self.active_alerts: List[BudgetAlert] = []
        self.budget_stats = self._initialize_stats()
        
        # Stan budżetu
        self.daily_spent = 0.0
        self.weekly_spent = 0.0
        self.monthly_spent = 0.0
        self.total_spent = 0.0
        self.last_reset = datetime.utcnow()
        
        logger.info("BudgetManager zainicjalizowany")
    
    async def initialize(self):
        """Inicjalizacja managera budżetu"""
        logger.info("Inicjalizacja BudgetManager...")
        
        self.memory_store = await get_memory_store()
        await self._load_budget_state()
        await self._check_budget_resets()
        
        logger.info("BudgetManager został zainicjalizowany")
    
    def _load_default_config(self) -> BudgetConfig:
        """Ładowanie domyślnej konfiguracji budżetu"""
        return BudgetConfig(
            daily_budget=10.0,  # $10 dziennie
            weekly_budget=50.0,  # $50 tygodniowo
            monthly_budget=200.0,  # $200 miesięcznie
            emergency_reserve=20.0,  # $20 rezerwa awaryjna
            alert_thresholds={
                BudgetAlertLevel.INFO: 0.5,      # 50% wykorzystania
                BudgetAlertLevel.WARNING: 0.75,   # 75% wykorzystania
                BudgetAlertLevel.CRITICAL: 0.9,  # 90% wykorzystania
                BudgetAlertLevel.EMERGENCY: 0.95  # 95% wykorzystania
            },
            max_single_expense=5.0,  # Maks $5 na pojedynczy wydatek
            expense_categories=list(ExpenseCategory),
            reset_time="00:00"
        )
    
    def _initialize_stats(self) -> Dict[str, Any]:
        """Inicjalizacja statystyk"""
        return {
            "total_expenses": 0,
            "total_categories": {},
            "daily_average": 0.0,
            "weekly_average": 0.0,
            "monthly_average": 0.0,
            "most_expensive_category": None,
            "most_expensive_task": None,
            "budget_efficiency": 0.0
        }
    
    async def record_expense(self, amount: float, category: ExpenseCategory, description: str, 
                           task_id: Optional[str] = None, model_used: Optional[str] = None,
                           provider_used: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Rejestrowanie wydatku
        
        Args:
            amount: Kwota wydatku w USD
            category: Kategoria wydatku
            description: Opis wydatku
            task_id: ID zadania związanego z wydatkiem
            model_used: Użyty model AI
            provider_used: Dostawca modelu
            metadata: Dodatkowe metadane
            
        Returns:
            True jeśli wydatek został zarejestrowany, False jeśli odrzucony
        """
        try:
            # Walidacja wydatku
            if not self._validate_expense(amount, category):
                logger.warning(f"Wydatek odrzucony: ${amount:.4f} dla {category.value}")
                return False
            
            # Sprawdź limity przed zarejestrowaniem
            if not await self._check_budget_limits(amount):
                logger.warning(f"Wydatek przekracza limity budżetowe: ${amount:.4f}")
                return False
            
            # Utwórz rekord wydatku
            expense = ExpenseRecord(
                id=f"exp_{int(time.time() * 1000)}",
                timestamp=datetime.utcnow(),
                amount=amount,
                category=category,
                description=description,
                task_id=task_id,
                model_used=model_used,
                provider_used=provider_used,
                metadata=metadata or {}
            )
            
            # Dodaj do historii
            self.expense_history.append(expense)
            
            # Aktualizuj statystyki
            await self._update_budget_stats(expense)
            
            # Zapisz w pamięci
            await self._save_expense_record(expense)
            
            # Sprawdź alerty
            await self._check_budget_alerts()
            
            logger.info(f"Zarejestrowano wydatek: ${amount:.4f} dla {category.value} (task: {task_id})")
            return True
            
        except Exception as e:
            logger.error(f"Błąd rejestrowania wydatku: {e}")
            return False
    
    def _validate_expense(self, amount: float, category: ExpenseCategory) -> bool:
        """Walidacja wydatku"""
        try:
            # Sprawdź minimalną wartość
            if amount <= 0:
                logger.warning(f"Nieprawidłowa kwota wydatku: ${amount}")
                return False
            
            # Sprawdź maksymalną pojedynczą wartość
            if amount > self.config.max_single_expense:
                logger.warning(f"Wydatek przekracza maksymalną pojedynczą wartość: ${amount} > ${self.config.max_single_expense}")
                return False
            
            # Sprawdź kategorię
            if category not in self.config.expense_categories:
                logger.warning(f"Nieznana kategoria wydatku: {category}")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Błąd walidacji wydatku: {e}")
            return False
    
    async def _check_budget_limits(self, proposed_amount: float) -> bool:
        """Sprawdzenie limitów budżetowych"""
        try:
            # Sprawdź dzienny limit
            projected_daily = self.daily_spent + proposed_amount
            if projected_daily > self.config.daily_budget:
                logger.warning(f"Przekroczenie dziennego budżetu: ${projected_daily:.4f} > ${self.config.daily_budget}")
                return False
            
            # Sprawdź tygodniowy limit
            projected_weekly = self.weekly_spent + proposed_amount
            if projected_weekly > self.config.weekly_budget:
                logger.warning(f"Przekroczenie tygodniowego budżetu: ${projected_weekly:.4f} > ${self.config.weekly_budget}")
                return False
            
            # Sprawdź miesięczny limit
            projected_monthly = self.monthly_spent + proposed_amount
            if projected_monthly > self.config.monthly_budget:
                logger.warning(f"Przekroczenie miesięcznego budżetu: ${projected_monthly:.4f} > ${self.config.monthly_budget}")
                return False
            
            # Sprawdź rezerwę awaryjną
            if self.total_spent + proposed_amount > (self.config.monthly_budget + self.config.emergency_reserve):
                logger.warning(f"Użycie rezerwy awaryjnej: ${self.total_spent + proposed_amount:.4f}")
                # Nie blokuj, tylko ostrzegaj
            
            return True
            
        except Exception as e:
            logger.error(f"Błąd sprawdzania limitów budżetowych: {e}")
            return False
    
    async def _update_budget_stats(self, expense: ExpenseRecord):
        """Aktualizacja statystyk budżetowych"""
        try:
            # Aktualizuj sumy
            self.daily_spent += expense.amount
            self.weekly_spent += expense.amount
            self.monthly_spent += expense.amount
            self.total_spent += expense.amount
            
            # Aktualizuj statystyki
            self.budget_stats["total_expenses"] += 1
            
            # Kategoria
            category_name = expense.category.value
            if category_name not in self.budget_stats["total_categories"]:
                self.budget_stats["total_categories"][category_name] = {
                    "count": 0,
                    "total_amount": 0.0,
                    "average_amount": 0.0
                }
            
            category_stats = self.budget_stats["total_categories"][category_name]
            category_stats["count"] += 1
            category_stats["total_amount"] += expense.amount
            category_stats["average_amount"] = category_stats["total_amount"] / category_stats["count"]
            
            # Najdroższa kategoria
            if not self.budget_stats["most_expensive_category"] or \
               category_stats["total_amount"] > self.budget_stats["total_categories"].get(
                   self.budget_stats["most_expensive_category"], {}).get("total_amount", 0):
                self.budget_stats["most_expensive_category"] = category_name
            
            # Najdroższe zadanie
            if expense.task_id:
                if not self.budget_stats["most_expensive_task"] or \
                   expense.amount > self.budget_stats.get("most_expensive_task_amount", 0):
                    self.budget_stats["most_expensive_task"] = expense.task_id
                    self.budget_stats["most_expensive_task_amount"] = expense.amount
            
            # Oblicz efektywność budżetową
            self._calculate_budget_efficiency()
            
        except Exception as e:
            logger.error(f"Błąd aktualizacji statystyk budżetowych: {e}")
    
    def _calculate_budget_efficiency(self):
        """Obliczenie efektywności budżetowej"""
        try:
            # Prosta miara efektywności: im więcej wykonanych zadań za mniejsze pieniądze, tym lepiej
            if self.budget_stats["total_expenses"] > 0:
                # Średni koszt na zadanie
                avg_cost_per_task = self.total_spent / self.budget_stats["total_expenses"]
                
                # Efektywność (im niższy średni koszt, tym wyższa efektywność)
                # Normalizuj do skali 0-1, zakładając optymalny koszt $0.01 na zadanie
                optimal_cost = 0.01
                efficiency = max(0.0, min(1.0, optimal_cost / max(avg_cost_per_task, optimal_cost)))
                
                self.budget_stats["budget_efficiency"] = efficiency
            
        except Exception as e:
            logger.error(f"Błąd obliczania efektywności budżetowej: {e}")
    
    async def _save_expense_record(self, expense: ExpenseRecord):
        """Zapisywanie rekordu wydatku"""
        try:
            await self.memory_store.store_context(
                context_type="system",
                context_key=f"expense_{expense.id}",
                title=f"Budget Expense: {expense.category.value}",
                content=json.dumps(asdict(expense), indent=2, default=str),
                tags=["budget", "expense", expense.category.value],
                importance_score=0.5,
                expires_in_days=90  # Zachowaj przez 3 miesiące
            )
            
        except Exception as e:
            logger.error(f"Błąd zapisywania rekordu wydatku: {e}")
    
    async def _save_budget_state(self):
        """Zapisywanie stanu budżetu"""
        try:
            budget_state = {
                "daily_spent": self.daily_spent,
                "weekly_spent": self.weekly_spent,
                "monthly_spent": self.monthly_spent,
                "total_spent": self.total_spent,
                "last_reset": self.last_reset.isoformat(),
                "config": asdict(self.config),
                "stats": self.budget_stats,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            await self.memory_store.store_context(
                context_type="system",
                context_key="budget_state",
                title="Budget State",
                content=json.dumps(budget_state, indent=2, default=str),
                tags=["budget", "state", "system"],
                importance_score=0.8,
                expires_in_days=365  # Zachowaj przez rok
            )
            
        except Exception as e:
            logger.error(f"Błąd zapisywania stanu budżetu: {e}")
    
    async def _load_budget_state(self):
        """Ładowanie stanu budżetu"""
        try:
            budget_context = await self.memory_store.get_context(
                context_key="budget_state",
                context_type="system"
            )
            
            if budget_context:
                budget_data = json.loads(budget_context.get("content", "{}"))
                
                # Przywróć stan
                self.daily_spent = budget_data.get("daily_spent", 0.0)
                self.weekly_spent = budget_data.get("weekly_spent", 0.0)
                self.monthly_spent = budget_data.get("monthly_spent", 0.0)
                self.total_spent = budget_data.get("total_spent", 0.0)
                
                last_reset_str = budget_data.get("last_reset")
                if last_reset_str:
                    self.last_reset = datetime.fromisoformat(last_reset_str)
                
                # Przywróć statystyki
                if "stats" in budget_data:
                    self.budget_stats.update(budget_data["stats"])
                
                logger.info(f"Przywrócono stan budżetu: dzienny=${self.daily_spent:.4f}, tygodniowy=${self.weekly_spent:.4f}, miesięczny=${self.monthly_spent:.4f}")
            
        except Exception as e:
            logger.error(f"Błąd ładowania stanu budżetu: {e}")
    
    async def _check_budget_resets(self):
        """Sprawdzenie resetów budżetowych"""
        try:
            now = datetime.utcnow()
            
            # Sprawdź czy należy zresetować dzienny budżet
            if self._should_reset_daily(now):
                await self._reset_daily_budget()
            
            # Sprawdź czy należy zresetować tygodniowy budżet
            if self._should_reset_weekly(now):
                await self._reset_weekly_budget()
            
            # Sprawdź czy należy zresetować miesięczny budżet
            if self._should_reset_monthly(now):
                await self._reset_monthly_budget()
            
        except Exception as e:
            logger.error(f"Błąd sprawdzania resetów budżetowych: {e}")
    
    def _should_reset_daily(self, now: datetime) -> bool:
        """Sprawdzenie czy należy zresetować dzienny budżet"""
        try:
            # Sprawdź czy minął dzień od ostatniego resetu
            time_since_reset = now - self.last_reset
            
            # Resetuj codziennie o północy
            if time_since_reset >= timedelta(days=1):
                return True
            
            return False
            
        except Exception:
            return False
    
    def _should_reset_weekly(self, now: datetime) -> bool:
        """Sprawdzenie czy należy zresetować tygodniowy budżet"""
        try:
            time_since_reset = now - self.last_reset
            
            # Resetuj co tydzień
            if time_since_reset >= timedelta(weeks=1):
                return True
            
            return False
            
        except Exception:
            return False
    
    def _should_reset_monthly(self, now: datetime) -> bool:
        """Sprawdzenie czy należy zresetować miesięczny budżet"""
        try:
            time_since_reset = now - self.last_reset
            
            # Resetuj co miesiąc (30 dni)
            if time_since_reset >= timedelta(days=30):
                return True
            
            return False
            
        except Exception:
            return False
    
    async def _reset_daily_budget(self):
        """Reset dziennego budżetu"""
        try:
            logger.info(f"Reset dziennego budżetu: ${self.daily_spent:.4f} → $0.00")
            self.daily_spent = 0.0
            self.last_reset = datetime.utcnow()
            
            # Zapisz stan
            await self._save_budget_state()
            
            # Wyślij alert o resecie
            await self._send_reset_alert("daily")
            
        except Exception as e:
            logger.error(f"Błąd resetu dziennego budżetu: {e}")
    
    async def _reset_weekly_budget(self):
        """Reset tygodniowego budżetu"""
        try:
            logger.info(f"Reset tygodniowego budżetu: ${self.weekly_spent:.4f} → $0.00")
            self.weekly_spent = 0.0
            
            # Zapisz stan
            await self._save_budget_state()
            
            # Wyślij alert o resecie
            await self._send_reset_alert("weekly")
            
        except Exception as e:
            logger.error(f"Błąd resetu tygodniowego budżetu: {e}")
    
    async def _reset_monthly_budget(self):
        """Reset miesięcznego budżetu"""
        try:
            logger.info(f"Reset miesięcznego budżetu: ${self.monthly_spent:.4f} → $0.00")
            self.monthly_spent = 0.0
            
            # Zapisz stan
            await self._save_budget_state()
            
            # Wyślij alert o resecie
            await self._send_reset_alert("monthly")
            
        except Exception as e:
            logger.error(f"Błąd resetu miesięcznego budżetu: {e}")
    
    async def _check_budget_alerts(self):
        """Sprawdzenie alertów budżetowych"""
        try:
            # Sprawdź progi alertów
            for alert_level, threshold in self.config.alert_thresholds.items():
                
                # Dla każdego poziomu budżetu
                budgets_to_check = [
                    ("daily", self.daily_spent, self.config.daily_budget),
                    ("weekly", self.weekly_spent, self.config.weekly_budget),
                    ("monthly", self.monthly_spent, self.config.monthly_budget)
                ]
                
                for budget_type, spent, limit in budgets_to_check:
                    percentage_used = spent / limit if limit > 0 else 0
                    
                    if percentage_used >= threshold:
                        # Sprawdź czy alert już istnieje
                        existing_alert = self._find_existing_alert(budget_type, alert_level)
                        
                        if not existing_alert:
                            await self._create_budget_alert(
                                budget_type, alert_level, spent, limit, percentage_used
                            )
            
        except Exception as e:
            logger.error(f"Błąd sprawdzania alertów budżetowych: {e}")
    
    def _find_existing_alert(self, budget_type: str, alert_level: BudgetAlertLevel) -> Optional[BudgetAlert]:
        """Znalezienie istniejącego alertu"""
        try:
            for alert in self.active_alerts:
                if (alert.message.startswith(f"{budget_type.title()} budget") and 
                    alert.level == alert_level and 
                    not alert.acknowledged):
                    return alert
            return None
            
        except Exception:
            return None
    
    async def _create_budget_alert(self, budget_type: str, alert_level: BudgetAlertLevel, 
                                   current_spending: float, budget_limit: float, percentage_used: float):
        """Tworzenie alertu budżetowego"""
        try:
            # Utwórz rekomendację
            recommendation = self._generate_budget_recommendation(budget_type, alert_level, percentage_used)
            
            alert = BudgetAlert(
                id=f"alert_{budget_type}_{alert_level.value}_{int(time.time())}",
                timestamp=datetime.utcnow(),
                level=alert_level,
                message=f"{budget_type.title()} budget {alert_level.value.title()}: {percentage_used:.1%} used (${current_spending:.2f}/${budget_limit:.2f})",
                current_spending=current_spending,
                budget_limit=budget_limit,
                percentage_used=percentage_used,
                recommendation=recommendation,
                acknowledged=False
            )
            
            self.active_alerts.append(alert)
            
            # Zapisz alert
            await self._save_budget_alert(alert)
            
            logger.warning(f"ALERT BUDŻETOWY: {alert.message}")
            
        except Exception as e:
            logger.error(f"Błąd tworzenia alertu budżetowego: {e}")
    
    def _generate_budget_recommendation(self, budget_type: str, alert_level: BudgetAlertLevel, percentage_used: float) -> str:
        """Generowanie rekomendacji budżetowej"""
        try:
            if alert_level == BudgetAlertLevel.INFO:
                return f"Monitor {budget_type} budget usage and optimize spending patterns."
            elif alert_level == BudgetAlertLevel.WARNING:
                return f"Consider reducing {budget_type} expenses or optimizing task execution."
            elif alert_level == BudgetAlertLevel.CRITICAL:
                return f"Urgently reduce {budget_type} spending. Prioritize essential tasks only."
            elif alert_level == BudgetAlertLevel.EMERGENCY:
                return f"EMERGENCY: Stop all non-critical {budget_type} expenses immediately."
            else:
                return "Review budget usage and adjust spending strategy."
                
        except Exception:
            return "Review budget usage."
    
    async def _save_budget_alert(self, alert: BudgetAlert):
        """Zapisywanie alertu budżetowego"""
        try:
            await self.memory_store.store_context(
                context_type="system",
                context_key=f"budget_alert_{alert.id}",
                title=f"Budget Alert: {alert.level.value.title()}",
                content=json.dumps(asdict(alert), indent=2, default=str),
                tags=["budget", "alert", alert.level.value, "system"],
                importance_score=0.9,
                expires_in_days=30
            )
            
        except Exception as e:
            logger.error(f"Błąd zapisywania alertu budżetowego: {e}")
    
    async def _send_reset_alert(self, budget_type: str):
        """Wysyłanie alertu o resecie budżetu"""
        try:
            alert = BudgetAlert(
                id=f"reset_{budget_type}_{int(time.time())}",
                timestamp=datetime.utcnow(),
                level=BudgetAlertLevel.INFO,
                message=f"{budget_type.title()} budget has been reset to $0.00",
                current_spending=0.0,
                budget_limit=getattr(self.config, f"{budget_type}_budget"),
                percentage_used=0.0,
                recommendation=f"{budget_type.title()} budget reset completed. New budget cycle started.",
                acknowledged=True  # Automatycznie potwierdzone
            )
            
            await self._save_budget_alert(alert)
            
            logger.info(f"Wysłano alert o resecie {budget_type} budżetu")
            
        except Exception as e:
            logger.error(f"Błąd wysyłania alertu o resecie: {e}")
    
    async def get_budget_status(self) -> Dict[str, Any]:
        """Pobieranie statusu budżetu"""
        try:
            # Sprawdź reset przed zwróceniem statusu
            await self._check_budget_resets()
            
            status = {
                "daily": {
                    "spent": self.daily_spent,
                    "budget": self.config.daily_budget,
                    "remaining": max(0, self.config.daily_budget - self.daily_spent),
                    "percentage_used": (self.daily_spent / self.config.daily_budget * 100) if self.config.daily_budget > 0 else 0
                },
                "weekly": {
                    "spent": self.weekly_spent,
                    "budget": self.config.weekly_budget,
                    "remaining": max(0, self.config.weekly_budget - self.weekly_spent),
                    "percentage_used": (self.weekly_spent / self.config.weekly_budget * 100) if self.config.weekly_budget > 0 else 0
                },
                "monthly": {
                    "spent": self.monthly_spent,
                    "budget": self.config.monthly_budget,
                    "remaining": max(0, self.config.monthly_budget - self.monthly_spent),
                    "percentage_used": (self.monthly_spent / self.config.monthly_budget * 100) if self.config.monthly_budget > 0 else 0
                },
                "total_spent": self.total_spent,
                "emergency_reserve": self.config.emergency_reserve,
                "remaining_budget": self.config.monthly_budget + self.config.emergency_reserve - self.total_spent,
                "last_reset": self.last_reset.isoformat(),
                "stats": self.budget_stats,
                "active_alerts": len([alert for alert in self.active_alerts if not alert.acknowledged]),
                "can_proceed": self._can_proceed_with_spending()
            }
            
            return status
            
        except Exception as e:
            logger.error(f"Błąd pobierania statusu budżetu: {e}")
            return {"error": str(e)}
    
    def _can_proceed_with_spending(self) -> bool:
        """Sprawdzenie czy można kontynuować wydatki"""
        try:
            # Sprawdź czy nie ma krytycznych alertów
            critical_alerts = [
                alert for alert in self.active_alerts 
                if not alert.acknowledged and 
                alert.level in [BudgetAlertLevel.CRITICAL, BudgetAlertLevel.EMERGENCY]
            ]
            
            return len(critical_alerts) == 0
            
        except Exception:
            return False
    
    async def get_expense_history(self, limit: int = 50, category: Optional[ExpenseCategory] = None) -> List[Dict[str, Any]]:
        """Pobieranie historii wydatków"""
        try:
            # Filtruj historię
            filtered_expenses = self.expense_history
            
            if category:
                filtered_expenses = [exp for exp in filtered_expenses if exp.category == category]
            
            # Zwróć ostatnie wydatki
            recent_expenses = filtered_expenses[-limit:] if limit > 0 else filtered_expenses
            
            # Konwertuj do słowników
            return [asdict(expense) for expense in recent_expenses]
            
        except Exception as e:
            logger.error(f"Błąd pobierania historii wydatków: {e}")
            return []
    
    async def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Pobieranie aktywnych alertów"""
        try:
            # Filtruj niepotwierdzone alerty
            unacknowledged_alerts = [alert for alert in self.active_alerts if not alert.acknowledged]
            
            # Posortuj według poziomu ważności
            unacknowledged_alerts.sort(key=lambda x: self._get_alert_priority(x.level), reverse=True)
            
            return [asdict(alert) for alert in unacknowledged_alerts]
            
        except Exception as e:
            logger.error(f"Błąd pobierania aktywnych alertów: {e}")
            return []
    
    def _get_alert_priority(self, level: BudgetAlertLevel) -> int:
        """Pobieranie priorytetu alertu"""
        priorities = {
            BudgetAlertLevel.EMERGENCY: 4,
            BudgetAlertLevel.CRITICAL: 3,
            BudgetAlertLevel.WARNING: 2,
            BudgetAlertLevel.INFO: 1
        }
        return priorities.get(level, 0)
    
    async def acknowledge_alert(self, alert_id: str) -> bool:
        """Potwierdzenie alertu"""
        try:
            for alert in self.active_alerts:
                if alert.id == alert_id and not alert.acknowledged:
                    alert.acknowledged = True
                    
                    # Zaktualizuj w pamięci
                    await self.memory_store.store_context(
                        context_type="system",
                        context_key=f"budget_alert_{alert_id}",
                        title=f"Budget Alert: {alert.level.value.title()} (Acknowledged)",
                        content=json.dumps(asdict(alert), indent=2, default=str),
                        tags=["budget", "alert", alert.level.value, "acknowledged"],
                        importance_score=0.4,
                        expires_in_days=30
                    )
                    
                    logger.info(f"Potwierdzono alert budżetowy: {alert_id}")
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Błąd potwierdzania alertu: {e}")
            return False
    
    async def get_budget_analytics(self, days: int = 30) -> Dict[str, Any]:
        """Pobieranie analityki budżetowej"""
        try:
            # Pobierz wydatki z ostatnich dni
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            recent_expenses = [
                exp for exp in self.expense_history 
                if exp.timestamp >= cutoff_date
            ]
            
            if not recent_expenses:
                return {"error": "No expense data available for the specified period"}
            
            # Oblicz analitykę
            total_amount = sum(exp.amount for exp in recent_expenses)
            daily_average = total_amount / days
            
            # Kategorie
            category_breakdown = {}
            for expense in recent_expenses:
                category = expense.category.value
                if category not in category_breakdown:
                    category_breakdown[category] = {
                        "count": 0,
                        "total": 0.0,
                        "percentage": 0.0
                    }
                
                category_breakdown[category]["count"] += 1
                category_breakdown[category]["total"] += expense.amount
            
            # Oblicz procenty
            for category_data in category_breakdown.values():
                category_data["percentage"] = (category_data["total"] / total_amount * 100) if total_amount > 0 else 0
            
            # Trendy
            trends = self._calculate_expense_trends(recent_expenses, days)
            
            analytics = {
                "period_days": days,
                "total_spent": total_amount,
                "daily_average": daily_average,
                "expense_count": len(recent_expenses),
                "category_breakdown": category_breakdown,
                "trends": trends,
                "most_expensive_day": self._find_most_expensive_day(recent_expenses),
                "least_expensive_day": self._find_least_expensive_day(recent_expenses),
                "efficiency_score": self.budget_stats.get("budget_efficiency", 0.0)
            }
            
            return analytics
            
        except Exception as e:
            logger.error(f"Błąd generowania analityki budżetowej: {e}")
            return {"error": str(e)}
    
    def _calculate_expense_trends(self, expenses: List[ExpenseRecord], days: int) -> Dict[str, Any]:
        """Obliczanie trendów wydatków"""
        try:
            if not expenses:
                return {"trend": "stable", "change_percentage": 0}
            
            # Podziel na pierwszą i drugą połowę okresu
            mid_point = len(expenses) // 2
            first_half = expenses[:mid_point]
            second_half = expenses[mid_point:]
            
            first_half_total = sum(exp.amount for exp in first_half)
            second_half_total = sum(exp.amount for exp in second_half)
            
            if first_half_total > 0:
                change_percentage = ((second_half_total - first_half_total) / first_half_total) * 100
            else:
                change_percentage = 0
            
            # Określ trend
            if abs(change_percentage) < 5:
                trend = "stable"
            elif change_percentage > 5:
                trend = "increasing"
            else:
                trend = "decreasing"
            
            return {
                "trend": trend,
                "change_percentage": change_percentage,
                "first_half_total": first_half_total,
                "second_half_total": second_half_total
            }
            
        except Exception:
            return {"trend": "unknown", "change_percentage": 0}
    
    def _find_most_expensive_day(self, expenses: List[ExpenseRecord]) -> Optional[Dict[str, Any]]:
        """Znajdowanie najdroższego dnia"""
        try:
            daily_totals = {}
            
            for expense in expenses:
                day_key = expense.timestamp.date().isoformat()
                if day_key not in daily_totals:
                    daily_totals[day_key] = 0.0
                daily_totals[day_key] += expense.amount
            
            if daily_totals:
                most_expensive_day = max(daily_totals.items(), key=lambda x: x[1])
                return {
                    "date": most_expensive_day[0],
                    "total": most_expensive_day[1]
                }
            
            return None
            
        except Exception:
            return None
    
    async def get_cycle_cost(self) -> float:
        """Pobieranie kosztu aktualnego cyklu (ostatnie 30 minut)"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(minutes=30)
            
            cycle_expenses = [
                exp for exp in self.expense_history 
                if exp.timestamp >= cutoff_time
            ]
            
            return sum(exp.amount for exp in cycle_expenses)
            
        except Exception as e:
            logger.error(f"Błąd pobierania kosztu cyklu: {e}")
            return 0.0

    def _find_least_expensive_day(self, expenses: List[ExpenseRecord]) -> Optional[Dict[str, Any]]:
        """Znajdowanie najtańszego dnia"""
        try:
            daily_totals = {}
            
            for expense in expenses:
                day_key = expense.timestamp.date().isoformat()
                if day_key not in daily_totals:
                    daily_totals[day_key] = 0.0
                daily_totals[day_key] += expense.amount
            
            if daily_totals:
                least_expensive_day = min(daily_totals.items(), key=lambda x: x[1])
                return {
                    "date": least_expensive_day[0],
                    "total": least_expensive_day[1]
                }
            
            return None
            
        except Exception:
            return None
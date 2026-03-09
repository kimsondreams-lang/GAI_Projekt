import os
import asyncio
import logging
from typing import Dict, Optional, Any, List
from datetime import datetime
import time
import json
from dataclasses import dataclass
from enum import Enum

# Import providerów
from .providers.openai_provider import OpenAIProvider
from .providers.anthropic_provider import AnthropicProvider
from .providers.deepseek_provider import DeepSeekProvider
from .registry import get_model_config, get_fallback_model
from .registry_advanced import (
    get_model_config as get_advanced_model_config,
    get_models_for_task,
    get_best_model_for_task,
    get_model_cost_estimate,
    ModelTier,
    ModelCapability
)

logger = logging.getLogger(__name__)

@dataclass
class ModelUsage:
    """Dane o użyciu modelu"""
    task_label: str
    provider: str
    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    execution_time: float
    success: bool
    timestamp: datetime
    error_message: Optional[str] = None
    model_attempt: int = 1
    retry_attempt: int = 0

@dataclass
class ProviderStatus:
    """Status providera"""
    provider: str
    status: str  # healthy, degraded, unhealthy
    error: Optional[str] = None
    last_check: Optional[datetime] = None
    models_available: int = 0

class ModelManager:
    """
    Główny menadżer modeli AI - zarządza wszystkimi providerami i obsługuje retry logic
    """
    
    def __init__(self):
        self.providers = {}
        self.usage_stats = []
        self.retry_config = {
            "max_retries": int(os.getenv("MAX_RETRIES", "3")),
            "retry_delay": float(os.getenv("RETRY_DELAY", "1.0")),
            "exponential_backoff": True,
            "max_delay": 60.0
        }
        self.cost_budget = float(os.getenv("COST_BUDGET_USD_PER_CYCLE", "5.0"))
        self.current_cost = 0.0
        self.max_cost_per_request = float(os.getenv("MAX_COST_PER_REQUEST", "1.0"))
        self._initialize_providers()
        
        logger.info(f"ModelManager initialized with retry config: {self.retry_config}")
        logger.info(f"Cost budget: ${self.cost_budget}, Max cost per request: ${self.max_cost_per_request}")
    
    def _initialize_providers(self):
        """Inicjalizacja wszystkich dostępnych providerów"""
        # OpenAI
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            try:
                self.providers["openai"] = OpenAIProvider(openai_key)
                logger.info("OpenAI provider initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI provider: {e}")
        else:
            logger.warning("OPENAI_API_KEY not found, OpenAI provider disabled")
        
        # Anthropic
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        if anthropic_key:
            try:
                self.providers["anthropic"] = AnthropicProvider(anthropic_key)
                logger.info("Anthropic provider initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Anthropic provider: {e}")
        else:
            logger.warning("ANTHROPIC_API_KEY not found, Anthropic provider disabled")
        
        # DeepSeek
        deepseek_key = os.getenv("DEEPSEEK_API_KEY")
        if deepseek_key:
            try:
                self.providers["deepseek"] = DeepSeekProvider(deepseek_key)
                logger.info("DeepSeek provider initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize DeepSeek provider: {e}")
        else:
            logger.warning("DEEPSEEK_API_KEY not found, DeepSeek provider disabled")
    
    async def model_infer(
        self, 
        task_label: str, 
        prompt: str, 
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> str:
        """
        Główna metoda do inferencji modelu z retry logic i fallback
        
        Args:
            task_label: Etykieta zadania (np. 'chat_general', 'content_generation')
            prompt: Treść promptu
            temperature: Temperatura generowania (opcjonalna)
            max_tokens: Maksymalna liczba tokenów (opcjonalna)
            system_prompt: System prompt (opcjonalny)
            **kwargs: Dodatkowe parametry
            
        Returns:
            Wygenerowany tekst
            
        Raises:
            Exception: Gdy wszystkie próby zakończą się niepowodzeniem
        """
        start_time = time.time()
        
        try:
            # Pobieranie konfiguracji modelu
            model_config = get_model_config(task_label)
            logger.info(f"Using model config for task {task_label}: {model_config}")
            
            # Próby z różnymi modelami (główny + fallback)
            models_to_try = [model_config]
            
            # Dodaj fallback models jeśli są dostępne
            for i in range(3):  # Maksymalnie 3 fallbacki
                try:
                    fallback_config = get_fallback_model(task_label, models_to_try[-1]["model_name"])
                    if fallback_config not in models_to_try:
                        models_to_try.append(fallback_config)
                except:
                    break
            
            # Próby z różnymi modelami
            for attempt, current_config in enumerate(models_to_try):
                provider_name = current_config["provider"]
                model_name = current_config["model_name"]
                
                if provider_name not in self.providers:
                    logger.warning(f"Provider {provider_name} not available, trying next model")
                    continue
                
                logger.info(f"Attempt {attempt + 1}: Using {provider_name}:{model_name} for task {task_label}")
                
                # Próby z retry logic
                for retry in range(self.retry_config["max_retries"]):
                    try:
                        # Przygotowanie parametrów
                        params = {
                            "prompt": prompt,
                            "model": model_name,
                            "temperature": temperature or current_config.get("temperature", 0.7),
                            "max_tokens": max_tokens or current_config.get("max_tokens", 1200),
                            **kwargs
                        }
                        
                        if system_prompt:
                            params["system_prompt"] = system_prompt
                        
                        # Wywołanie providera
                        provider = self.providers[provider_name]
                        
                        if asyncio.iscoroutinefunction(provider.generate_text):
                            result = await provider.generate_text(**params)
                        else:
                            result = provider.generate_text(**params)
                        
                        # Logowanie sukcesu
                        execution_time = time.time() - start_time
                        self._log_success(
                            task_label, provider_name, model_name, 
                            prompt, result, execution_time, attempt, retry
                        )
                        
                        return result
                        
                    except Exception as e:
                        logger.warning(
                            f"Attempt {retry + 1} failed for {provider_name}:{model_name} - {str(e)}"
                        )
                        
                        if retry < self.retry_config["max_retries"] - 1:
                            # Czekaj przed kolejną próbą
                            delay = self._calculate_retry_delay(retry)
                            logger.info(f"Retrying in {delay:.1f} seconds...")
                            await asyncio.sleep(delay)
                        else:
                            logger.error(f"All retries exhausted for {provider_name}:{model_name}")
            
            # Wszystkie modele zawiodły
            error_msg = f"All models failed for task {task_label}"
            logger.error(error_msg)
            self._log_failure(task_label, prompt, error_msg, time.time() - start_time)
            
            # Zwróć fallback response
            return self._get_fallback_response(task_label, prompt)
            
        except Exception as e:
            logger.error(f"Critical error in model_infer for {task_label}: {e}")
            self._log_failure(task_label, prompt, str(e), time.time() - start_time)
            return self._get_fallback_response(task_label, prompt)
    
    def _estimate_cost_for_task(self, task_label: str, prompt: str, max_tokens: Optional[int] = None) -> float:
        """Szacowanie kosztu dla zadania"""
        try:
            model_config = get_model_config(task_label)
            provider = model_config["provider"]
            model = model_config["model_name"]
            
            # Szacowanie tokenów
            input_tokens = len(prompt.split()) * 1.3
            output_tokens = max_tokens or model_config.get("max_tokens", 1000)
            
            return self._estimate_cost(provider, model, int(input_tokens), int(output_tokens))
        except Exception:
            return 0.01  # Domyślny koszt
    
    def _estimate_actual_cost(self, task_label: str, prompt: str, result: str) -> float:
        """Szacowanie rzeczywistego kosztu"""
        try:
            model_config = get_model_config(task_label)
            provider = model_config["provider"]
            model = model_config["model_name"]
            
            input_tokens = len(prompt.split()) * 1.3
            output_tokens = len(result.split()) * 1.3
            
            return self._estimate_cost(provider, model, int(input_tokens), int(output_tokens))
        except Exception:
            return 0.01  # Domyślny koszt
    
    def _get_budget_exceeded_response(self, task_label: str) -> str:
        """Odpowiedź gdy przekroczono budżet"""
        return f"Przepraszam, ale przekroczono dzienny budżet dla zadania '{task_label}'. Spróbuj ponownie później."
                        
                        if system_prompt:
                            params["system_prompt"] = system_prompt
                        
                        # Wywołanie providera
                        provider = self.providers[provider_name]
                        
                        if asyncio.iscoroutinefunction(provider.generate_text):
                            result = await provider.generate_text(**params)
                        else:
                            result = provider.generate_text(**params)
                        
                        # Logowanie sukcesu
                        execution_time = time.time() - start_time
                        self._log_success(
                            task_label, provider_name, model_name, 
                            prompt, result, execution_time, attempt, retry
                        )
                        
                        return result
                        
                    except Exception as e:
                        logger.warning(
                            f"Attempt {retry + 1} failed for {provider_name}:{model_name} - {str(e)}"
                        )
                        
                        if retry < self.retry_config["max_retries"] - 1:
                            # Czekaj przed kolejną próbą
                            delay = self._calculate_retry_delay(retry)
                            logger.info(f"Retrying in {delay:.1f} seconds...")
                            await asyncio.sleep(delay)
                        else:
                            logger.error(f"All retries exhausted for {provider_name}:{model_name}")
            
            # Wszystkie modele zawiodły
            error_msg = f"All models failed for task {task_label}"
            logger.error(error_msg)
            self._log_failure(task_label, prompt, error_msg, time.time() - start_time)
            
            # Zwróć fallback response
            return self._get_fallback_response(task_label, prompt)
            
        except Exception as e:
            logger.error(f"Critical error in model_infer for {task_label}: {e}")
            self._log_failure(task_label, prompt, str(e), time.time() - start_time)
            return self._get_fallback_response(task_label, prompt)
    
    def _calculate_retry_delay(self, retry_count: int) -> float:
        """Obliczanie opóźnienia przed retry"""
        if self.retry_config["exponential_backoff"]:
            delay = self.retry_config["retry_delay"] * (2 ** retry_count)
            return min(delay, self.retry_config["max_delay"])
        else:
            return self.retry_config["retry_delay"]
    
    def _log_success(
        self, task_label: str, provider: str, model: str, 
        prompt: str, result: str, execution_time: float, 
        model_attempt: int, retry_attempt: int
    ):
        """Logowanie udanej inferencji"""
        try:
            # Szacowanie kosztów
            input_tokens = len(prompt.split()) * 1.3  # Przybliżone
            output_tokens = len(result.split()) * 1.3
            
            estimated_cost = self._estimate_cost(provider, model, input_tokens, output_tokens)
            
            # TODO: Zaloguj do analityki gdy będzie dostępna
            logger.info(
                f"Model inference successful - Task: {task_label}, "
                f"Provider: {provider}, Model: {model}, "
                f"Time: {execution_time:.2f}s, "
                f"Cost: ${estimated_cost:.6f}, "
                f"Model attempt: {model_attempt + 1}, "
                f"Retry attempt: {retry_attempt + 1}"
            )
            
        except Exception as e:
            logger.error(f"Failed to log success: {e}")
    
    def _log_failure(
        self, task_label: str, prompt: str, error: str, execution_time: float
    ):
        """Logowanie nieudanej inferencji"""
        try:
            # TODO: Zaloguj do analityki gdy będzie dostępna
            logger.error(
                f"Model inference failed - Task: {task_label}, "
                f"Error: {error}, "
                f"Time: {execution_time:.2f}s"
            )
            
        except Exception as e:
            logger.error(f"Failed to log failure: {e}")
    
    def _estimate_cost(self, provider: str, model: str, input_tokens: int, output_tokens: int) -> float:
        """Szacowanie kosztu użycia modelu"""
        try:
            # Proste szacowanie na podstawie średnich cen
            cost_multipliers = {
                "openai": {
                    "gpt-4-turbo-preview": (0.01, 0.03),
                    "gpt-4": (0.03, 0.06),
                    "gpt-3.5-turbo": (0.0005, 0.0015),
                    "gpt-3.5-turbo-16k": (0.003, 0.004)
                },
                "anthropic": {
                    "claude-3-opus-20240229": (0.015, 0.075),
                    "claude-3-sonnet-20240229": (0.003, 0.015),
                    "claude-3-haiku-20240307": (0.00025, 0.00125),
                    "claude-2.1": (0.008, 0.024),
                    "claude-2.0": (0.008, 0.024)
                },
                "deepseek": {
                    "deepseek-chat": (0.00007, 0.00014),
                    "deepseek-coder": (0.00007, 0.00014)
                }
            }
            
            if provider in cost_multipliers and model in cost_multipliers[provider]:
                input_cost, output_cost = cost_multipliers[provider][model]
                return (input_tokens / 1000 * input_cost) + (output_tokens / 1000 * output_cost)
            else:
                # Domyślny koszt
                return (input_tokens + output_tokens) / 1000 * 0.01
                
        except Exception as e:
            logger.error(f"Cost estimation failed: {e}")
            return 0.0
    
    async def model_infer_advanced(
        self, 
        task_label: str, 
        prompt: str, 
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
        criteria: str = "balanced",  # quality, speed, cost, balanced
        max_cost: Optional[float] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Zaawansowana inferencja z inteligentnym wyborem modelu
        
        Args:
            task_label: Etykieta zadania
            prompt: Treść promptu
            temperature: Temperatura generowania (opcjonalna)
            max_tokens: Maksymalna liczba tokenów (opcjonalna)
            system_prompt: System prompt (opcjonalny)
            criteria: Kryterium wyboru modelu
            max_cost: Maksymalny koszt (opcjonalny)
            **kwargs: Dodatkowe parametry
            
        Returns:
            Dict z wynikiem i szczegółami
        """
        start_time = time.time()
        
        try:
            # Inteligentny wybór modelu
            model_key = get_best_model_for_task(task_label, criteria)
            model_config = get_advanced_model_config(model_key)
            
            if not model_config:
                raise ValueError(f"Nie znaleziono konfiguracji dla modelu: {model_key}")
            
            # Sprawdzenie kosztu
            if max_cost and model_config.cost_per_1k_input > max_cost:
                # Znajdź tańszy model
                cheaper_models = get_models_for_task(task_label, max_cost)
                if cheaper_models:
                    model_key = cheaper_models[0]
                    model_config = get_advanced_model_config(model_key)
                else:
                    return {
                        "success": False,
                        "result": f"Brak modeli w zadanym budżecie ${max_cost}",
                        "cost_usd": 0.0,
                        "budget_exceeded": True,
                        "execution_time": time.time() - start_time
                    }
            
            # Ustalenie providera
            provider_name = model_config.provider
            
            if provider_name not in self.providers:
                logger.warning(f"Provider {provider_name} nie jest dostępny, szukam alternatywy")
                # Szukaj alternatywnego providera dla tego samego modelu
                for fallback_key in model_config.fallback_models:
                    fallback_config = get_advanced_model_config(fallback_key)
                    if fallback_config and fallback_config.provider in self.providers:
                        model_key = fallback_key
                        model_config = fallback_config
                        provider_name = fallback_config.provider
                        break
                else:
                    return {
                        "success": False,
                        "result": "Brak dostępnych providerów",
                        "cost_usd": 0.0,
                        "provider_unavailable": True,
                        "execution_time": time.time() - start_time
                    }
            
            # Przygotowanie parametrów
            temperature = temperature or model_config.recommended_temperature
            max_tokens = max_tokens or min(1000, model_config.max_tokens)
            
            # Użycie odpowiedniego modelu w providerze
            provider = self.providers[provider_name]
            model_name = model_config.model_name
            
            logger.info(f"Using {provider_name}:{model_name} for task {task_label} with criteria {criteria}")
            
            # Wykonanie inferencji
            if asyncio.iscoroutinefunction(provider.generate_text):
                result = await provider.generate_text(
                    prompt=prompt,
                    model=model_name,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    system_prompt=system_prompt,
                    **kwargs
                )
            else:
                # Dla sync providerów
                result = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: provider.generate_text(
                        prompt=prompt,
                        model=model_name,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        system_prompt=system_prompt,
                        **kwargs
                    )
                )
            
            # Obliczenie kosztów
            execution_time = time.time() - start_time
            input_tokens = len(prompt.split()) * 1.3
            output_tokens = len(result.split()) * 1.3
            cost = get_model_cost_estimate(model_key, int(input_tokens), int(output_tokens))
            
            return {
                "success": True,
                "result": result,
                "model_used": model_key,
                "provider": provider_name,
                "model_name": model_name,
                "cost_usd": cost,
                "execution_time": execution_time,
                "input_tokens": int(input_tokens),
                "output_tokens": int(output_tokens),
                "criteria": criteria
            }
            
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"Advanced inference failed for {task_label}: {e}")
            
            return {
                "success": False,
                "result": self._get_fallback_response(task_label, prompt),
                "error": str(e),
                "cost_usd": 0.0,
                "execution_time": execution_time
            }
        """Generowanie fallback response gdy wszystkie modele zawiodą"""
        fallback_responses = {
            "chat_general": "Przepraszam, ale nie mogę teraz odpowiedzieć na Twoje pytanie. Spróbuj ponownie za chwilę.",
            "content_generation": "Przepraszam, ale nie mogę teraz wygenerować treści. Spróbuj ponownie później.",
            "code_generation": "Przepraszam, ale nie mogę teraz wygenerować kodu. Spróbuj ponownie później.",
            "seo_optimization": "Przepraszam, ale nie mogę teraz zoptymalizować treści. Spróbuj ponownie później.",
            "text_analysis": "Przepraszam, ale nie mogę teraz przeanalizować tekstu. Spróbuj ponownie później.",
            "default": "Przepraszam, ale napotkaliśmy techniczny problem. Spróbuj ponownie później."
        }
        
        return fallback_responses.get(task_label, fallback_responses["default"])
    
    async def generate_embedding(
        self, 
        text: str, 
        model: str = "text-embedding-ada-002",
        provider: str = "openai"
    ) -> List[float]:
        """Generowanie embeddingu"""
        try:
            if provider not in self.providers:
                raise ValueError(f"Provider {provider} not available for embeddings")
            
            provider_instance = self.providers[provider]
            
            if hasattr(provider_instance, 'generate_embedding'):
                if asyncio.iscoroutinefunction(provider_instance.generate_embedding):
                    return await provider_instance.generate_embedding(text, model)
                else:
                    return provider_instance.generate_embedding(text, model)
            else:
                raise ValueError(f"Provider {provider} does not support embeddings")
                
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            # Zwróć pusty embedding jako fallback
            return [0.0] * 1536
    
    async def health_check(self) -> Dict[str, Any]:
        """Sprawdzanie zdrowia wszystkich providerów"""
        results = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "providers": {}
        }
        
        for provider_name, provider in self.providers.items():
            try:
                if hasattr(provider, 'health_check'):
                    if asyncio.iscoroutinefunction(provider.health_check):
                        health = await provider.health_check()
                    else:
                        health = provider.health_check()
                    
                    results["providers"][provider_name] = health
                    
                    if health.get("status") != "healthy":
                        results["status"] = "degraded"
                        
            except Exception as e:
                logger.error(f"Health check failed for {provider_name}: {e}")
                results["providers"][provider_name] = {
                    "status": "unhealthy",
                    "error": str(e)
                }
                results["status"] = "unhealthy"
        
        return results
    
    def get_available_providers(self) -> List[str]:
        """Pobieranie listy dostępnych providerów"""
        return list(self.providers.keys())
    
    def get_available_models(self) -> List[str]:
        """Pobieranie listy wszystkich dostępnych modeli"""
        from .registry import list_available_models
        return list_available_models()
    
    async def cleanup(self):
        """Czyszczenie zasobów - zamykanie sesji HTTP"""
        for provider_name, provider in self.providers.items():
            try:
                if hasattr(provider, 'close') and asyncio.iscoroutinefunction(provider.close):
                    await provider.close()
                elif hasattr(provider, 'close'):
                    provider.close()
                logger.info(f"Closed provider: {provider_name}")
            except Exception as e:
                logger.error(f"Failed to close provider {provider_name}: {e}")
    
    def get_usage_stats(self) -> Dict[str, Any]:
        """Pobieranie statystyk użycia"""
        if not self.usage_stats:
            return {"total_usage": 0, "total_cost": 0.0, "success_rate": 0.0}
        
        total_usage = len(self.usage_stats)
        total_cost = sum(usage.cost_usd for usage in self.usage_stats)
        successful = sum(1 for usage in self.usage_stats if usage.success)
        success_rate = successful / total_usage if total_usage > 0 else 0.0
        
        return {
            "total_usage": total_usage,
            "total_cost": total_cost,
            "success_rate": success_rate,
            "budget_remaining": self.cost_budget - self.current_cost,
            "budget_used": self.current_cost,
            "recent_usage": [
                {
                    "task": usage.task_label,
                    "provider": usage.provider,
                    "model": usage.model,
                    "cost": usage.cost_usd,
                    "success": usage.success,
                    "timestamp": usage.timestamp.isoformat()
                }
                for usage in self.usage_stats[-10:]  # Ostatnie 10 użyć
            ]
        }
    
    def export_usage_report(self, filename: str = None) -> str:
        """Eksport szczegółowego raportu użycia"""
        if not filename:
            filename = f"model_usage_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        report = {
            "export_timestamp": datetime.utcnow().isoformat(),
            "total_usage": len(self.usage_stats),
            "total_cost": sum(usage.cost_usd for usage in self.usage_stats),
            "budget_config": {
                "total_budget": self.cost_budget,
                "used_budget": self.current_cost,
                "remaining_budget": self.cost_budget - self.current_cost
            },
            "usage_details": [
                {
                    "task_label": usage.task_label,
                    "provider": usage.provider,
                    "model": usage.model,
                    "input_tokens": usage.input_tokens,
                    "output_tokens": usage.output_tokens,
                    "cost_usd": usage.cost_usd,
                    "execution_time": usage.execution_time,
                    "success": usage.success,
                    "error_message": usage.error_message,
                    "timestamp": usage.timestamp.isoformat(),
                    "model_attempt": usage.model_attempt,
                    "retry_attempt": usage.retry_attempt
                }
                for usage in self.usage_stats
            ]
        }
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            logger.info(f"Usage report exported to {filename}")
            return filename
        except Exception as e:
            logger.error(f"Failed to export usage report: {e}")
            raise
    
    async def model_infer_with_budget(
        self, 
        task_label: str, 
        prompt: str, 
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Zaawansowana inferencja z kontrolą budżetu i szczegółowym monitoringiem
        
        Returns:
            Dict z wynikiem, kosztem, statystykami
        """
        start_time = time.time()
        
        # Sprawdzenie budżetu
        estimated_cost = self._estimate_cost_for_task(task_label, prompt, max_tokens)
        if self.current_cost + estimated_cost > self.cost_budget:
            logger.warning(f"Budget exceeded: current=${self.current_cost:.4f}, estimated=${estimated_cost:.4f}, budget=${self.cost_budget}")
            return {
                "success": False,
                "result": self._get_budget_exceeded_response(task_label),
                "cost_usd": 0.0,
                "budget_exceeded": True,
                "execution_time": time.time() - start_time
            }
        
        # Wykonanie inferencji
        try:
            result = await self.model_infer(
                task_label=task_label,
                prompt=prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                system_prompt=system_prompt,
                **kwargs
            )
            
            execution_time = time.time() - start_time
            actual_cost = self._estimate_actual_cost(task_label, prompt, result)
            self.current_cost += actual_cost
            
            # Logowanie użycia
            usage = ModelUsage(
                task_label=task_label,
                provider="unknown",  # Będzie uzupełnione w model_infer
                model="unknown",
                input_tokens=len(prompt.split()) * 1.3,
                output_tokens=len(result.split()) * 1.3,
                cost_usd=actual_cost,
                execution_time=execution_time,
                success=True,
                timestamp=datetime.utcnow()
            )
            self.usage_stats.append(usage)
            
            return {
                "success": True,
                "result": result,
                "cost_usd": actual_cost,
                "budget_remaining": self.cost_budget - self.current_cost,
                "execution_time": execution_time,
                "budget_exceeded": False
            }
            
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"Model inference failed: {e}")
            
            usage = ModelUsage(
                task_label=task_label,
                provider="none",
                model="none",
                input_tokens=len(prompt.split()) * 1.3,
                output_tokens=0,
                cost_usd=0.0,
                execution_time=execution_time,
                success=False,
                timestamp=datetime.utcnow(),
                error_message=str(e)
            )
            self.usage_stats.append(usage)
            
            return {
                "success": False,
                "result": self._get_fallback_response(task_label, prompt),
                "cost_usd": 0.0,
                "error": str(e),
                "execution_time": execution_time,
                "budget_exceeded": False
            }

# Globalna instancja ModelManager
model_manager = ModelManager()

# Wrapper dla zaawansowanej inferencji
async def amodel_infer_advanced(
    task_label: str, 
    prompt: str, 
    temperature: float = 0.5, 
    max_tokens: int = 1200,
    system_prompt: Optional[str] = None,
    criteria: str = "balanced",
    max_cost: Optional[float] = None,
    **kwargs
) -> Dict[str, Any]:
    """Asynchroniczny wrapper dla zaawansowanej model_infer"""
    return await model_manager.model_infer_advanced(
        task_label=task_label,
        prompt=prompt,
        temperature=temperature,
        max_tokens=max_tokens,
        system_prompt=system_prompt,
        criteria=criteria,
        max_cost=max_cost,
        **kwargs
    )

# Wrapper dla standardowej inferencji (backward compatibility)
async def amodel_infer(
    task_label: str, 
    prompt: str, 
    temperature: float = 0.5, 
    max_tokens: int = 1200,
    system_prompt: Optional[str] = None,
    **kwargs
) -> str:
    """Asynchroniczny wrapper dla standardowej model_infer"""
    result = await model_manager.model_infer(
        task_label=task_label,
        prompt=prompt,
        temperature=temperature,
        max_tokens=max_tokens,
        system_prompt=system_prompt,
        **kwargs
    )
    return result

# Synchroniczny wrapper dla standardowej inferencji
def model_infer(
    task_label: str, 
    prompt: str, 
    temperature: float = 0.5, 
    max_tokens: int = 1200,
    system_prompt: Optional[str] = None,
    **kwargs
) -> str:
    """Synchroniczny wrapper dla model_infer"""
    try:
        # Użyj istniejącego event loop lub stwórz nowy
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Jeśli loop już działa, użyj run_coroutine_threadsafe
            future = asyncio.run_coroutine_threadsafe(
                model_manager.model_infer(
                    task_label, prompt, temperature, max_tokens, system_prompt, **kwargs
                ),
                loop
            )
            return future.result(timeout=60)  # 60 sekund timeout
        else:
            # Jeśli loop nie działa, użyj run_until_complete
            return loop.run_until_complete(
                model_manager.model_infer(
                    task_label, prompt, temperature, max_tokens, system_prompt, **kwargs
                )
            )
    except RuntimeError:
        # Jeśli nie ma event loop, stwórz nowy
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(
                model_manager.model_infer(
                    task_label, prompt, temperature, max_tokens, system_prompt, **kwargs
                )
            )
        finally:
            loop.close()
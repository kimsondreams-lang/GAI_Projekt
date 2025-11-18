import os
import asyncio
import logging
from typing import Dict, Optional, Any, List
from datetime import datetime, timedelta
import time
import json
from dataclasses import dataclass
from enum import Enum
from collections import defaultdict

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
    Zaawansowany ModelManager z inteligentnym wyborem modeli,
    kontrolą budżetu i szczegółowym monitoringiem
    """

    def __init__(self, providers_config: Optional[Dict[str, Any]] = None):
        self.providers = {}
        self.provider_health = {}
        self.last_health_check = {}
        self.health_check_interval = timedelta(minutes=5)
        self.usage_stats = defaultdict(lambda: ModelUsage())
        self.lock = asyncio.Lock()

        if providers_config is None:
            providers_config = self._get_default_providers_config()

        proxies_str = os.getenv("PROXIES")
        proxies = None
        if proxies_str:
            try:
                proxies_dict = json.loads(proxies_str)
                if isinstance(proxies_dict, dict):
                    proxies = proxies_dict.get("https") or proxies_dict.get("http")
            except json.JSONDecodeError:
                logger.warning(f"Could not parse PROXIES environment variable: {proxies_str}")
                proxies = proxies_str

        if providers_config.get("openai"):
            config = providers_config["openai"]
            config.pop('proxies', None)
            if proxies:
                config['proxies'] = proxies
            self.add_provider("openai", OpenAIProvider(**config))

        if providers_config.get("anthropic"):
            config = providers_config["anthropic"]
            config.pop('proxies', None)
            if proxies:
                config['proxies'] = proxies
            self.add_provider("anthropic", AnthropicProvider(**config))

        if providers_config.get("deepseek"):
            config = providers_config["deepseek"]
            config.pop('proxies', None)
            if proxies:
                config['proxies'] = proxies
            self.add_provider("deepseek", DeepSeekProvider(**config))

    def _get_default_providers_config(self) -> Dict[str, Any]:
        config = {}
        if os.getenv("OPENAI_API_KEY"):
            config["openai"] = {"api_key": os.getenv("OPENAI_API_KEY")}
        if os.getenv("ANTHROPIC_API_KEY"):
            config["anthropic"] = {"api_key": os.getenv("ANTHROPIC_API_KEY")}
        if os.getenv("DEEPSEEK_API_KEY"):
            config["deepseek"] = {"api_key": os.getenv("DEEPSEEK_API_KEY")}
        return config

    def add_provider(self, name: str, provider: Any):
        self.providers[name] = provider
        self.provider_health[name] = ProviderStatus(provider=name, status="unknown")
        logger.info(f"Added provider: {name}")

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
                        }
                        
                        # Usuń 'proxies' z kwargs, aby uniknąć konfliktów
                        kwargs.pop('proxies', None)
                        params.update(kwargs)
                        
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
    
    def _get_fallback_response(self, task_label: str, prompt: str) -> str:
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
        """
        Generowanie embeddingu
        
        Args:
            text: Tekst do embeddingu
            model: Model do użycia
            provider: Provider do użycia
            
        Returns:
            Lista embeddingów
        """
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

# Usunięcie globalnej instancji model_manager

# Wrapper dla zaawansowanej inferencji
async def amodel_infer_advanced(
    model_manager: ModelManager,
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
    return await model_manager.model_infer(
        task_label=task_label,
        prompt=prompt,
        temperature=temperature,
        max_tokens=max_tokens,
        system_prompt=system_prompt,
        **kwargs
    )

# Wrapper dla standardowej inferencji (backward compatibility)
async def amodel_infer(
    model_manager: ModelManager,
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
    model_manager: ModelManager,
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

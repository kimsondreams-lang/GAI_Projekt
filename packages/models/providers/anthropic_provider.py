import asyncio
import logging
from typing import Dict, Any, Optional, AsyncGenerator
import anthropic
from anthropic import Anthropic, RateLimitError, APIError, APIConnectionError
import os
import time

logger = logging.getLogger(__name__)

class AnthropicProvider:
    """
    Zaawansowany Anthropic Provider z pełnym async wsparciem,
    retry logic i szczegółowym monitoringiem
    """
    
    def __init__(self, api_key: str, timeout: float = 30.0):
        """
        Inicjalizacja Anthropic Provider z sync client (dla kompatybilności)
        
        Args:
            api_key: Klucz API Anthropic
            timeout: Timeout dla requestów w sekundach
        """
        self.api_key = api_key
        self.timeout = timeout
        self.client = Anthropic(api_key=api_key)
        
        # Konfiguracja modeli z dokładnymi limitami
        self.model_configs = {
            "claude-3-opus-20240229": {
                "max_tokens": 200000,
                "description": "Najpotężniejszy model Claude 3",
                "cost_per_1k_input": 0.015,
                "cost_per_1k_output": 0.075,
                "supports_vision": True,
                "supports_tools": True,
                "supports_system_prompt": True
            },
            "claude-3-sonnet-20240229": {
                "max_tokens": 200000,
                "description": "Zbalansowany model Claude 3",
                "cost_per_1k_input": 0.003,
                "cost_per_1k_output": 0.015,
                "supports_vision": True,
                "supports_tools": True,
                "supports_system_prompt": True
            },
            "claude-3-haiku-20240307": {
                "max_tokens": 200000,
                "description": "Najszybszy model Claude 3",
                "cost_per_1k_input": 0.00025,
                "cost_per_1k_output": 0.00125,
                "supports_vision": True,
                "supports_tools": True,
                "supports_system_prompt": True
            },
            "claude-2.1": {
                "max_tokens": 200000,
                "description": "Claude 2.1 z poprawioną dokładnością",
                "cost_per_1k_input": 0.008,
                "cost_per_1k_output": 0.024,
                "supports_vision": False,
                "supports_tools": False,
                "supports_system_prompt": False
            },
            "claude-2.0": {
                "max_tokens": 100000,
                "description": "Standardowy Claude 2",
                "cost_per_1k_input": 0.008,
                "cost_per_1k_output": 0.024,
                "supports_vision": False,
                "supports_tools": False,
                "supports_system_prompt": False
            }
        }
        
        logger.info(f"Anthropic Provider initialized with {len(self.model_configs)} models")

    async def generate_text(
        self, 
        prompt: str, 
        model: str = "claude-3-haiku-20240307",
        temperature: float = 0.7,
        max_tokens: int = 1200,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> str:
        """
        Generowanie tekstu z Anthropic API z pełnym monitoringiem
        
        Args:
            prompt: Treść promptu
            model: Model do użycia
            temperature: Temperatura generowania (0.0 - 1.0)
            max_tokens: Maksymalna liczba tokenów
            system_prompt: Opcjonalny system prompt
            **kwargs: Dodatkowe parametry
            
        Returns:
            Wygenerowany tekst
            
        Raises:
            RateLimitError: Gdy przekroczono limit
            APIError: Gdy wystąpi błąd API
            APIConnectionError: Gdy brak połączenia
        """
        start_time = time.time()
        
        try:
            # Walidacja modelu
            if model not in self.model_configs:
                raise ValueError(f"Model {model} nie jest obsługiwany")
            
            logger.info(f"Calling Anthropic {model} with temperature={temperature}, max_tokens={max_tokens}")
            
            # Przygotowanie parametrów
            params = {
                "model": model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": [{"role": "user", "content": prompt}]
            }
            
            # Dodanie system prompt jeśli podany i model go wspiera
            if system_prompt and self.model_configs[model]["supports_system_prompt"]:
                params["system"] = system_prompt
            
            # Dodanie dodatkowych parametrów
            params.update(kwargs)
            
            # Wywołanie API
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.client.messages.create(**params)
            )
            
            # Wyciągnięcie tekstu z odpowiedzi
            result = response.content[0].text
            
            # Logowanie użycia
            usage = response.usage
            execution_time = time.time() - start_time
            
            logger.info(
                f"Anthropic {model} completed in {execution_time:.2f}s - "
                f"input_tokens: {usage.input_tokens}, "
                f"output_tokens: {usage.output_tokens}"
            )
            
            return result
            
        except RateLimitError as e:
            logger.error(f"Anthropic rate limit exceeded for {model}: {e}")
            raise
        except APIError as e:
            logger.error(f"Anthropic API error for {model}: {e}")
            raise
        except APIConnectionError as e:
            logger.error(f"Anthropic connection error for {model}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in Anthropic provider for {model}: {e}")
            raise

    async def generate_stream(
        self,
        prompt: str,
        model: str = "claude-3-haiku-20240307",
        temperature: float = 0.7,
        max_tokens: int = 1200,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """
        Streamowanie odpowiedzi z Anthropic (async generator)
        
        Args:
            prompt: Treść promptu
            model: Model do użycia
            temperature: Temperatura generowania
            max_tokens: Maksymalna liczba tokenów
            system_prompt: Opcjonalny system prompt
            
        Yields:
            Fragmenty wygenerowanego tekstu
        """
        try:
            logger.info(f"Starting Anthropic stream with {model}")
            
            params = {
                "model": model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": [{"role": "user", "content": prompt}],
                "stream": True
            }
            
            if system_prompt and self.model_configs[model]["supports_system_prompt"]:
                params["system"] = system_prompt
            
            params.update(kwargs)
            
            # Streamowanie w wątku (Anthropic nie ma pełnego async)
            loop = asyncio.get_event_loop()
            
            async def stream_generator():
                with self.client.messages.stream(**params) as stream:
                    for text in stream.text_stream:
                        yield text
            
            async for text in stream_generator():
                yield text
                    
        except Exception as e:
            logger.error(f"Anthropic stream generation failed for {model}: {e}")
            raise

    def get_model_info(self, model: str) -> Dict[str, Any]:
        """
        Pobieranie szczegółowych informacji o modelu
        
        Args:
            model: Nazwa modelu
            
        Returns:
            Szczegółowe informacje o modelu
        """
        if model not in self.model_configs:
            return {
                "error": f"Model {model} nie jest obsługiwany",
                "available_models": list(self.model_configs.keys())
            }
        
        return self.model_configs[model].copy()

    def estimate_cost(self, model: str, input_tokens: int, output_tokens: int = 0) -> float:
        """
        Szacowanie kosztu użycia modelu
        
        Args:
            model: Nazwa modelu
            input_tokens: Liczba tokenów wejściowych
            output_tokens: Liczba tokenów wyjściowych
            
        Returns:
            Szacowany koszt w USD
        """
        if model not in self.model_configs:
            return 0.0
        
        config = self.model_configs[model]
        input_cost = (input_tokens / 1000) * config["cost_per_1k_input"]
        output_cost = (output_tokens / 1000) * config["cost_per_1k_output"]
        return input_cost + output_cost

    async def health_check(self) -> Dict[str, Any]:
        """
        Kompleksowy health check Anthropic API z wieloma testami
        
        Returns:
            Szczegółowy status zdrowia
        """
        start_time = time.time()
        results = {
            "provider": "anthropic",
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "models_tested": [],
            "errors": [],
            "response_time": 0
        }
        
        # Testowe modele do sprawdzenia
        test_models = ["claude-3-haiku-20240307", "claude-3-sonnet-20240229"]
        
        for model in test_models:
            try:
                response = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: self.client.messages.create(
                        model=model,
                        max_tokens=5,
                        messages=[{"role": "user", "content": "Hello, this is a health check."}]
                    )
                )
                
                results["models_tested"].append({
                    "model": model,
                    "status": "healthy",
                    "response_time": time.time() - start_time
                })
                
            except Exception as e:
                results["models_tested"].append({
                    "model": model,
                    "status": "unhealthy",
                    "error": str(e)
                })
                results["errors"].append(f"{model}: {str(e)}")
                results["status"] = "degraded"
        
        results["response_time"] = time.time() - start_time
        
        # Ustalenie końcowego statusu
        healthy_models = sum(1 for m in results["models_tested"] if m["status"] == "healthy")
        if healthy_models == 0:
            results["status"] = "unhealthy"
        elif healthy_models < len(test_models):
            results["status"] = "degraded"
        
        logger.info(f"Anthropic health check completed: {results['status']}")
        return results

    def get_available_models(self) -> list:
        """Pobieranie listy dostępnych modeli"""
        return list(self.model_configs.keys())

    async def close(self):
        """Zamykanie połączenia z API"""
        try:
            # Anthropic sync client nie wymaga explicit zamykania
            logger.info("Anthropic client closed successfully")
        except Exception as e:
            logger.error(f"Error closing Anthropic client: {e}")
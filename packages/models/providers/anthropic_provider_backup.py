import asyncio
import logging
from typing import Dict, Any, Optional
import anthropic
from anthropic import AsyncAnthropic, RateLimitError, APIError, APIConnectionError
import os

logger = logging.getLogger(__name__)

class AnthropicProvider:
    def __init__(self, api_key: str):
        """
        Inicjalizacja Anthropic Provider z async client
        
        Args:
            api_key: Klucz API Anthropic
        """
        self.api_key = api_key
        self.client = AsyncAnthropic(api_key=api_key)
        
        # Konfiguracja modeli
        self.available_models = [
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229", 
            "claude-3-haiku-20240307",
            "claude-2.1",
            "claude-2.0"
        ]
        
        logger.info(f"Anthropic Provider initialized with models: {self.available_models}")

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
        Generowanie tekstu z Anthropic API (async)
        
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
        try:
            logger.info(f"Calling Anthropic {model} with temperature={temperature}, max_tokens={max_tokens}")
            
            # Przygotowanie parametrów
            params = {
                "model": model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": [{"role": "user", "content": prompt}]
            }
            
            # Dodanie system prompt jeśli podany
            if system_prompt:
                params["system"] = system_prompt
            
            # Dodanie dodatkowych parametrów
            params.update(kwargs)
            
            # Wywołanie API
            response = await self.client.messages.create(**params)
            
            # Wyciągnięcie tekstu z odpowiedzi
            result = response.content[0].text
            
            # Logowanie użycia
            usage = response.usage
            logger.info(
                f"Anthropic {model} completed - "
                f"input_tokens: {usage.input_tokens}, "
                f"output_tokens: {usage.output_tokens}"
            )
            
            return result
            
        except RateLimitError as e:
            logger.error(f"Anthropic rate limit exceeded: {e}")
            raise
        except APIError as e:
            logger.error(f"Anthropic API error: {e}")
            raise
        except APIConnectionError as e:
            logger.error(f"Anthropic connection error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in Anthropic provider: {e}")
            raise

    async def generate_stream(
        self,
        prompt: str,
        model: str = "claude-3-haiku-20240307",
        temperature: float = 0.7,
        max_tokens: int = 1200,
        system_prompt: Optional[str] = None,
        **kwargs
    ):
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
            
            if system_prompt:
                params["system"] = system_prompt
            
            params.update(kwargs)
            
            async with self.client.messages.stream(**params) as stream:
                async for text in stream.text_stream:
                    yield text
                    
        except Exception as e:
            logger.error(f"Anthropic stream generation failed: {e}")
            raise

    def get_model_info(self, model: str) -> Dict[str, Any]:
        """
        Pobieranie informacji o modelu
        
        Args:
            model: Nazwa modelu
            
        Returns:
            Informacje o modelu
        """
        model_info = {
            "claude-3-opus-20240229": {
                "max_tokens": 200000,
                "description": "Najpotężniejszy model Claude 3",
                "cost_per_1k_input": 0.015,
                "cost_per_1k_output": 0.075,
                "capabilities": ["text", "vision", "code", "analysis"]
            },
            "claude-3-sonnet-20240229": {
                "max_tokens": 200000,
                "description": "Zbalansowany model Claude 3",
                "cost_per_1k_input": 0.003,
                "cost_per_1k_output": 0.015,
                "capabilities": ["text", "vision", "code", "analysis"]
            },
            "claude-3-haiku-20240307": {
                "max_tokens": 200000,
                "description": "Najszybszy model Claude 3",
                "cost_per_1k_input": 0.00025,
                "cost_per_1k_output": 0.00125,
                "capabilities": ["text", "vision", "code"]
            },
            "claude-2.1": {
                "max_tokens": 200000,
                "description": "Claude 2.1 z poprawioną dokładnością",
                "cost_per_1k_input": 0.008,
                "cost_per_1k_output": 0.024,
                "capabilities": ["text", "code", "analysis"]
            },
            "claude-2.0": {
                "max_tokens": 100000,
                "description": "Standardowy Claude 2",
                "cost_per_1k_input": 0.008,
                "cost_per_1k_output": 0.024,
                "capabilities": ["text", "code", "analysis"]
            }
        }
        
        return model_info.get(model, {
            "max_tokens": 100000,
            "description": "Nieznany model",
            "cost_per_1k_input": 0.01,
            "cost_per_1k_output": 0.01,
            "capabilities": ["text"]
        })

    async def health_check(self) -> Dict[str, Any]:
        """
        Sprawdzanie dostępności Anthropic API
        
        Returns:
            Status zdrowia providera
        """
        try:
            # Proste testowe wywołanie
            response = await self.client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=5,
                messages=[{"role": "user", "content": "Hello, this is a health check."}]
            )
            
            return {
                "status": "healthy",
                "provider": "anthropic",
                "models_available": len(self.available_models),
                "last_check": asyncio.get_event_loop().time()
            }
            
        except Exception as e:
            logger.error(f"Anthropic health check failed: {e}")
            return {
                "status": "unhealthy",
                "provider": "anthropic",
                "error": str(e),
                "last_check": asyncio.get_event_loop().time()
            }
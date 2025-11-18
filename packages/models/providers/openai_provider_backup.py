import asyncio
import logging
from typing import Dict, Any, Optional
import openai
from openai import AsyncOpenAI, RateLimitError, APIError, APIConnectionError, APITimeoutError
import os

logger = logging.getLogger(__name__)

class OpenAIProvider:
    def __init__(self, api_key: str, organization: Optional[str] = None):
        """
        Inicjalizacja OpenAI Provider z async client
        
        Args:
            api_key: Klucz API OpenAI
            organization: Opcjonalny organization ID
        """
        self.api_key = api_key
        self.organization = organization
        self.client = AsyncOpenAI(api_key=api_key)
        
        # Konfiguracja modeli
        self.available_models = [
            "gpt-4-turbo-preview",
            "gpt-4",
            "gpt-3.5-turbo",
            "gpt-3.5-turbo-16k",
            "text-embedding-ada-002",
            "text-embedding-3-small",
            "text-embedding-3-large"
        ]
        
        logger.info(f"OpenAI Provider initialized with models: {self.available_models}")

    async def generate_text(
        self, 
        prompt: str, 
        model: str = "gpt-3.5-turbo",
        temperature: float = 0.7,
        max_tokens: int = 1200,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> str:
        """
        Generowanie tekstu z OpenAI API (async)
        
        Args:
            prompt: Treść promptu
            model: Model do użycia
            temperature: Temperatura generowania (0.0 - 2.0)
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
            logger.info(f"Calling OpenAI {model} with temperature={temperature}, max_tokens={max_tokens}")
            
            # Przygotowanie wiadomości
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            # Wywołanie API
            response = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )
            
            result = response.choices[0].message.content
            
            # Logowanie użycia
            usage = response.usage
            logger.info(
                f"OpenAI {model} completed - "
                f"prompt_tokens: {usage.prompt_tokens}, "
                f"completion_tokens: {usage.completion_tokens}, "
                f"total_tokens: {usage.total_tokens}"
            )
            
            return result
            
        except RateLimitError as e:
            logger.error(f"OpenAI rate limit exceeded: {e}")
            raise
        except APIError as e:
            logger.error(f"OpenAI API error: {e}")
            raise
        except APIConnectionError as e:
            logger.error(f"OpenAI connection error: {e}")
            raise
        except APITimeoutError as e:
            logger.error(f"OpenAI timeout error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in OpenAI provider: {e}")
            raise

    async def generate_embedding(
        self,
        text: str,
        model: str = "text-embedding-ada-002"
    ) -> list:
        """
        Generowanie embeddingu z OpenAI (async)
        
        Args:
            text: Tekst do embeddingu
            model: Model embeddingu
            
        Returns:
            Lista embeddingów
        """
        try:
            logger.info(f"Creating embedding with {model}")
            
            response = await self.client.embeddings.create(
                model=model,
                input=text
            )
            
            embedding = response.data[0].embedding
            logger.info(f"Embedding created - dimensions: {len(embedding)}")
            
            return embedding
            
        except Exception as e:
            logger.error(f"Embedding creation failed: {e}")
            raise

    async def generate_stream(
        self,
        prompt: str,
        model: str = "gpt-3.5-turbo",
        temperature: float = 0.7,
        max_tokens: int = 1200,
        system_prompt: Optional[str] = None,
        **kwargs
    ):
        """
        Streamowanie odpowiedzi z OpenAI (async generator)
        
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
            logger.info(f"Starting OpenAI stream with {model}")
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            stream = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
                **kwargs
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            logger.error(f"Stream generation failed: {e}")
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
            "gpt-4-turbo-preview": {
                "max_tokens": 128000,
                "description": "GPT-4 Turbo z najnowszymi ulepszeniami",
                "cost_per_1k_input": 0.01,
                "cost_per_1k_output": 0.03
            },
            "gpt-4": {
                "max_tokens": 8192,
                "description": "Standardowy GPT-4",
                "cost_per_1k_input": 0.03,
                "cost_per_1k_output": 0.06
            },
            "gpt-3.5-turbo": {
                "max_tokens": 4096,
                "description": "Szybki i wydajny model",
                "cost_per_1k_input": 0.0005,
                "cost_per_1k_output": 0.0015
            },
            "gpt-3.5-turbo-16k": {
                "max_tokens": 16384,
                "description": "GPT-3.5 Turbo z dłuższym kontekstem",
                "cost_per_1k_input": 0.003,
                "cost_per_1k_output": 0.004
            }
        }
        
        return model_info.get(model, {
            "max_tokens": 4096,
            "description": "Nieznany model",
            "cost_per_1k_input": 0.01,
            "cost_per_1k_output": 0.01
        })

    async def health_check(self) -> Dict[str, Any]:
        """
        Sprawdzanie dostępności OpenAI API
        
        Returns:
            Status zdrowia providera
        """
        try:
            # Proste testowe wywołanie
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "Hello, this is a health check."}],
                max_tokens=5
            )
            
            return {
                "status": "healthy",
                "provider": "openai",
                "models_available": len(self.available_models),
                "last_check": asyncio.get_event_loop().time()
            }
            
        except Exception as e:
            logger.error(f"OpenAI health check failed: {e}")
            return {
                "status": "unhealthy",
                "provider": "openai",
                "error": str(e),
                "last_check": asyncio.get_event_loop().time()
            }
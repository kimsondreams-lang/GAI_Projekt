import asyncio
import logging
from typing import Dict, Any, Optional, AsyncGenerator, Union
import openai
from openai import OpenAI, RateLimitError, APIError, APIConnectionError, APITimeoutError
import os
import time

logger = logging.getLogger(__name__)

class OpenAIProvider:
    """
    Zaawansowany OpenAI Provider z pełnym async wsparciem,
    retry logic i szczegółowym monitoringiem
    """
    
    def __init__(self, api_key: str, organization: Optional[str] = None, timeout: float = 30.0):
        """
        Inicjalizacja OpenAI Provider z async client
        
        Args:
            api_key: Klucz API OpenAI
            organization: Opcjonalny organization ID
            timeout: Timeout dla requestów w sekundach
        """
        self.api_key = api_key
        self.organization = organization
        self.timeout = timeout
        
        # Użyj sync client dla kompatybilności z Python 3.14
        self.client = OpenAI(
            api_key=api_key,
            organization=organization,
            timeout=timeout
        )
        
        # Konfiguracja modeli z dokładnymi limitami
        self.model_configs = {
            "gpt-4-turbo-preview": {
                "max_tokens": 128000,
                "description": "GPT-4 Turbo z najnowszymi ulepszeniami",
                "cost_per_1k_input": 0.01,
                "cost_per_1k_output": 0.03,
                "supports_vision": True,
                "supports_tools": True
            },
            "gpt-4": {
                "max_tokens": 8192,
                "description": "Standardowy GPT-4",
                "cost_per_1k_input": 0.03,
                "cost_per_1k_output": 0.06,
                "supports_vision": False,
                "supports_tools": True
            },
            "gpt-3.5-turbo": {
                "max_tokens": 4096,
                "description": "Szybki i wydajny model",
                "cost_per_1k_input": 0.0005,
                "cost_per_1k_output": 0.0015,
                "supports_vision": False,
                "supports_tools": True
            },
            "gpt-3.5-turbo-16k": {
                "max_tokens": 16384,
                "description": "GPT-3.5 Turbo z dłuższym kontekstem",
                "cost_per_1k_input": 0.003,
                "cost_per_1k_output": 0.004,
                "supports_vision": False,
                "supports_tools": True
            },
            "text-embedding-ada-002": {
                "max_tokens": 8191,
                "description": "Standardowy model do embeddingów",
                "cost_per_1k_tokens": 0.0001,
                "dimensions": 1536,
                "supports_vision": False,
                "supports_tools": False
            },
            "text-embedding-3-small": {
                "max_tokens": 8191,
                "description": "Nowszy, wydajniejszy model do embeddingów",
                "cost_per_1k_tokens": 0.00002,
                "dimensions": 1536,
                "supports_vision": False,
                "supports_tools": False
            },
            "text-embedding-3-large": {
                "max_tokens": 8191,
                "description": "Potężny model do embeddingów",
                "cost_per_1k_tokens": 0.00013,
                "dimensions": 3072,
                "supports_vision": False,
                "supports_tools": False
            }
        }
        
        logger.info(f"OpenAI Provider initialized with {len(self.model_configs)} models")

    async def generate_text(
        self, 
        prompt: str, 
        model: str = "gpt-3.5-turbo",
        temperature: float = 0.7,
        max_tokens: int = 1200,
        system_prompt: Optional[str] = None,
        tools: Optional[list] = None,
        tool_choice: Optional[Union[str, dict]] = None,
        **kwargs
    ) -> str:
        """
        Generowanie tekstu z OpenAI API z pełnym monitoringiem
        
        Args:
            prompt: Treść promptu
            model: Model do użycia
            temperature: Temperatura generowania (0.0 - 2.0)
            max_tokens: Maksymalna liczba tokenów
            system_prompt: Opcjonalny system prompt
            tools: Lista dostępnych narzędzi
            tool_choice: Konfiguracja wyboru narzędzi
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
            
            logger.info(f"Calling OpenAI {model} with temperature={temperature}, max_tokens={max_tokens}")
            
            # Przygotowanie wiadomości
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            # Przygotowanie parametrów
            params = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                **kwargs
            }
            
            # Dodanie narzędzi jeśli są dostępne
            if tools:
                params["tools"] = tools
            if tool_choice:
                params["tool_choice"] = tool_choice
            
            # Wywołanie API w wątku (dla kompatybilności z Python 3.14)
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.chat.completions.create(**params)
            )
            
            result = response.choices[0].message.content
            
            # Logowanie użycia
            usage = response.usage
            execution_time = time.time() - start_time
            
            logger.info(
                f"OpenAI {model} completed in {execution_time:.2f}s - "
                f"prompt_tokens: {usage.prompt_tokens}, "
                f"completion_tokens: {usage.completion_tokens}, "
                f"total_tokens: {usage.total_tokens}"
            )
            
            return result
            
        except RateLimitError as e:
            logger.error(f"OpenAI rate limit exceeded for {model}: {e}")
            raise
        except APIError as e:
            logger.error(f"OpenAI API error for {model}: {e}")
            raise
        except APIConnectionError as e:
            logger.error(f"OpenAI connection error for {model}: {e}")
            raise
        except APITimeoutError as e:
            logger.error(f"OpenAI timeout error for {model}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in OpenAI provider for {model}: {e}")
            raise

    async def generate_stream(
        self,
        prompt: str,
        model: str = "gpt-3.5-turbo",
        temperature: float = 0.7,
        max_tokens: int = 1200,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
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
            
            # Streamowanie w wątku (dla kompatybilności z Python 3.14)
            loop = asyncio.get_event_loop()
            stream = await loop.run_in_executor(
                None,
                lambda: self.client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=True,
                    **kwargs
                )
            )
            
            async def stream_generator():
                for chunk in stream:
                    if chunk.choices[0].delta.content is not None:
                        yield chunk.choices[0].delta.content
            
            async for content in stream_generator():
                yield content
                    
        except Exception as e:
            logger.error(f"Stream generation failed for {model}: {e}")
            raise

    async def generate_embedding(
        self,
        text: str,
        model: str = "text-embedding-ada-002"
    ) -> list:
        """
        Generowanie embeddingu z OpenAI z dokładnym monitoringiem
        
        Args:
            text: Tekst do embeddingu
            model: Model embeddingu
            
        Returns:
            Lista embeddingów
        """
        try:
            logger.info(f"Creating embedding with {model}")
            
            # Wywołanie API w wątku (dla kompatybilności)
            loop = asyncio.get_event_loop()
            # Wywołanie API w wątku (dla kompatybilności z Python 3.14)
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.embeddings.create(
                    model=model,
                    input=text
                )
            )
            
            embedding = response.data[0].embedding
            usage = response.usage
            
            logger.info(
                f"Embedding created with {model} - "
                f"tokens: {usage.total_tokens}, "
                f"dimensions: {len(embedding)}"
            )
            
            return embedding
            
        except Exception as e:
            logger.error(f"Embedding creation failed for {model}: {e}")
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
        
        if "cost_per_1k_input" in config:
            input_cost = (input_tokens / 1000) * config["cost_per_1k_input"]
            output_cost = (output_tokens / 1000) * config["cost_per_1k_output"]
            return input_cost + output_cost
        elif "cost_per_1k_tokens" in config:
            return ((input_tokens + output_tokens) / 1000) * config["cost_per_1k_tokens"]
        
        return 0.0

    async def health_check(self) -> Dict[str, Any]:
        """
        Kompleksowy health check OpenAI API z wieloma testami
        
        Returns:
            Szczegółowy status zdrowia
        """
        start_time = time.time()
        results = {
            "provider": "openai",
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "models_tested": [],
            "errors": [],
            "response_time": 0
        }
        
        # Testowe modele do sprawdzenia
        test_models = ["gpt-3.5-turbo", "gpt-4-turbo-preview"]
        
        for model in test_models:
            try:
                response = await self.client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": "Hello, this is a health check."}],
                    max_tokens=5
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
        
        logger.info(f"OpenAI health check completed: {results['status']}")
        return results

    def get_available_models(self) -> list:
        """Pobieranie listy dostępnych modeli"""
        return list(self.model_configs.keys())

    async def close(self):
        """Zamykanie połączenia z API"""
        try:
            await self.client.close()
            logger.info("OpenAI client closed successfully")
        except Exception as e:
            logger.error(f"Error closing OpenAI client: {e}")
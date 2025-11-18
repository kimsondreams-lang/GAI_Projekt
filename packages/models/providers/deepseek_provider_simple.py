import asyncio
import logging
from typing import Dict, Any, Optional, List
import aiohttp
import json
import os

logger = logging.getLogger(__name__)

class DeepSeekProvider:
    def __init__(self, api_key: str, base_url: str = "https://api.deepseek.com"):
        """
        Inicjalizacja DeepSeek Provider z async client
        
        Args:
            api_key: Klucz API DeepSeek
            base_url: Bazowy URL API (opcjonalny)
        """
        self.api_key = api_key
        self.base_url = base_url
        self.session = None
        
        # Konfiguracja modeli
        self.available_models = [
            "deepseek-chat",
            "deepseek-coder"
        ]
        
        logger.info(f"DeepSeek Provider initialized with models: {self.available_models}")

    async def _get_session(self) -> aiohttp.ClientSession:
        """
        Pobieranie lub tworzenie sesji HTTP
        
        Returns:
            Sesja aiohttp
        """
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                timeout=aiohttp.ClientTimeout(total=30)
            )
        return self.session

    async def generate_text(
        self, 
        prompt: str, 
        model: str = "deepseek-chat",
        temperature: float = 0.7,
        max_tokens: int = 1200,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> str:
        """
        Generowanie tekstu z DeepSeek API (async)
        
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
            Exception: Gdy wystąpi błąd API
        """
        try:
            logger.info(f"Calling DeepSeek {model} with temperature={temperature}, max_tokens={max_tokens}")
            
            # Przygotowanie wiadomości
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            # Przygotowanie danych żądania
            data = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                **kwargs
            }
            
            # Wywołanie API
            session = await self._get_session()
            
            async with session.post(
                f"{self.base_url}/v1/chat/completions",
                json=data
            ) as response:
                
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"DeepSeek API error {response.status}: {error_text}")
                    raise Exception(f"DeepSeek API error {response.status}: {error_text}")
                
                result = await response.json()
                
                # Wyciągnięcie tekstu z odpowiedzi
                generated_text = result["choices"][0]["message"]["content"]
                
                # Logowanie użycia
                usage = result.get("usage", {})
                logger.info(
                    f"DeepSeek {model} completed - "
                    f"prompt_tokens: {usage.get('prompt_tokens', 'unknown')}, "
                    f"completion_tokens: {usage.get('completion_tokens', 'unknown')}, "
                    f"total_tokens: {usage.get('total_tokens', 'unknown')}"
                )
                
                return generated_text
                
        except Exception as e:
            logger.error(f"DeepSeek API error: {e}")
            raise

    async def generate_stream(
        self,
        prompt: str,
        model: str = "deepseek-chat",
        temperature: float = 0.7,
        max_tokens: int = 1200,
        system_prompt: Optional[str] = None,
        **kwargs
    ):
        """
        Streamowanie odpowiedzi z DeepSeek (async generator)
        
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
            logger.info(f"Starting DeepSeek stream with {model}")
            
            # Przygotowanie wiadomości
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            # Przygotowanie danych żądania
            data = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": True,
                **kwargs
            }
            
            session = await self._get_session()
            
            async with session.post(
                f"{self.base_url}/v1/chat/completions",
                json=data
            ) as response:
                
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"DeepSeek stream API error {response.status}: {error_text}")
                    raise Exception(f"DeepSeek stream API error {response.status}: {error_text}")
                
                async for line in response.content:
                    line = line.decode('utf-8').strip()
                    
                    if line.startswith('data: '):
                        data_str = line[6:]
                        
                        if data_str == '[DONE]':
                            break
                        
                        try:
                            chunk_data = json.loads(data_str)
                            delta = chunk_data["choices"][0]["delta"]
                            
                            if "content" in delta and delta["content"]:
                                yield delta["content"]
                                
                        except json.JSONDecodeError:
                            continue
                            
        except Exception as e:
            logger.error(f"DeepSeek stream generation failed: {e}")
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
            "deepseek-chat": {
                "max_tokens": 32768,
                "description": "DeepSeek Chat - uniwersalny model konwersacyjny",
                "cost_per_1k_input": 0.00007,
                "cost_per_1k_output": 0.00014,
                "capabilities": ["text", "code", "reasoning", "multilingual"]
            },
            "deepseek-coder": {
                "max_tokens": 16384,
                "description": "DeepSeek Coder - wyspecjalizowany w kodowaniu",
                "cost_per_1k_input": 0.00007,
                "cost_per_1k_output": 0.00014,
                "capabilities": ["code", "debugging", "code_completion", "technical"]
            }
        }
        
        return model_info.get(model, {
            "max_tokens": 32768,
            "description": "Nieznany model DeepSeek",
            "cost_per_1k_input": 0.00007,
            "cost_per_1k_output": 0.00014,
            "capabilities": ["text"]
        })

    async def health_check(self) -> Dict[str, Any]:
        """
        Sprawdzanie dostępności DeepSeek API
        
        Returns:
            Status zdrowia providera
        """
        try:
            # Proste testowe wywołanie
            session = await self._get_session()
            
            data = {
                "model": "deepseek-chat",
                "messages": [{"role": "user", "content": "Hello, this is a health check."}],
                "max_tokens": 5
            }
            
            async with session.post(
                f"{self.base_url}/v1/chat/completions",
                json=data
            ) as response:
                
                if response.status == 200:
                    return {
                        "status": "healthy",
                        "provider": "deepseek",
                        "models_available": len(self.available_models),
                        "last_check": asyncio.get_event_loop().time()
                    }
                else:
                    return {
                        "status": "unhealthy",
                        "provider": "deepseek",
                        "error": f"HTTP {response.status}",
                        "last_check": asyncio.get_event_loop().time()
                    }
                    
        except Exception as e:
            logger.error(f"DeepSeek health check failed: {e}")
            return {
                "status": "unhealthy",
                "provider": "deepseek",
                "error": str(e),
                "last_check": asyncio.get_event_loop().time()
            }

    async def close(self):
        """
        Zamykanie sesji HTTP
        """
        if self.session and not self.session.closed:
            await self.session.close()
            self.session = None
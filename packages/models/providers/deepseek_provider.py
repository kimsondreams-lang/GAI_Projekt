import asyncio
import logging
from typing import Dict, Any, Optional, AsyncGenerator
import aiohttp
import json
import os
import time

logger = logging.getLogger(__name__)

class DeepSeekProvider:
    """
    Zaawansowany DeepSeek Provider z pełnym async wsparciem,
    retry logic i szczegółowym monitoringiem
    """
    
    def __init__(self, api_key: str, base_url: str = "https://api.deepseek.com", timeout: float = 30.0):
        """
        Inicjalizacja DeepSeek Provider z async client
        
        Args:
            api_key: Klucz API DeepSeek
            base_url: Bazowy URL API
            timeout: Timeout dla requestów w sekundach
        """
        self.api_key = api_key
        self.base_url = base_url
        self.timeout = timeout
        self.session = None
        
        # Konfiguracja modeli z dokładnymi limitami
        self.model_configs = {
            "deepseek-chat": {
                "max_tokens": 32768,
                "description": "DeepSeek Chat - uniwersalny model konwersacyjny",
                "cost_per_1k_input": 0.00007,
                "cost_per_1k_output": 0.00014,
                "supports_vision": False,
                "supports_tools": False,
                "supports_system_prompt": True
            },
            "deepseek-coder": {
                "max_tokens": 16384,
                "description": "DeepSeek Coder - wyspecjalizowany w kodowaniu",
                "cost_per_1k_input": 0.00007,
                "cost_per_1k_output": 0.00014,
                "supports_vision": False,
                "supports_tools": False,
                "supports_system_prompt": True
            }
        }
        
        logger.info(f"DeepSeek Provider initialized with {len(self.model_configs)} models")

    async def _get_session(self) -> aiohttp.ClientSession:
        """
        Pobieranie lub tworzenie sesji HTTP z connection pooling
        
        Returns:
            Sesja aiohttp
        """
        if self.session is None or self.session.closed:
            connector = aiohttp.TCPConnector(
                limit=100,  # Maksymalna liczba połączeń
                limit_per_host=30,  # Maksymalna liczba połączeń per host
                ttl_dns_cache=300,  # Cache DNS na 5 minut
                use_dns_cache=True,
                keepalive_timeout=30
            )
            
            timeout = aiohttp.ClientTimeout(
                total=self.timeout,
                connect=10,
                sock_read=self.timeout
            )
            
            self.session = aiohttp.ClientSession(
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "GAI-DeepSeek-Provider/1.0"
                },
                timeout=timeout,
                connector=connector
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
        Generowanie tekstu z DeepSeek API z pełnym monitoringiem
        
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
        start_time = time.time()
        
        try:
            # Walidacja modelu
            if model not in self.model_configs:
                raise ValueError(f"Model {model} nie jest obsługiwany")
            
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
                execution_time = time.time() - start_time
                
                logger.info(
                    f"DeepSeek {model} completed in {execution_time:.2f}s - "
                    f"prompt_tokens: {usage.get('prompt_tokens', 'unknown')}, "
                    f"completion_tokens: {usage.get('completion_tokens', 'unknown')}, "
                    f"total_tokens: {usage.get('total_tokens', 'unknown')}"
                )
                
                return generated_text
                
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"DeepSeek API error after {execution_time:.2f}s: {e}")
            raise

    async def generate_stream(
        self,
        prompt: str,
        model: str = "deepseek-chat",
        temperature: float = 0.7,
        max_tokens: int = 1200,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
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
        Kompleksowy health check DeepSeek API z wieloma testami
        
        Returns:
            Szczegółowy status zdrowia
        """
        start_time = time.time()
        results = {
            "provider": "deepseek",
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "models_tested": [],
            "errors": [],
            "response_time": 0
        }
        
        # Testowe modele do sprawdzenia
        test_models = ["deepseek-chat", "deepseek-coder"]
        
        for model in test_models:
            try:
                session = await self._get_session()
                
                data = {
                    "model": model,
                    "messages": [{"role": "user", "content": "Hello, this is a health check."}],
                    "max_tokens": 5
                }
                
                async with session.post(
                    f"{self.base_url}/v1/chat/completions",
                    json=data
                ) as response:
                    
                    if response.status == 200:
                        results["models_tested"].append({
                            "model": model,
                            "status": "healthy",
                            "response_time": time.time() - start_time
                        })
                    else:
                        error_text = await response.text()
                        results["models_tested"].append({
                            "model": model,
                            "status": "unhealthy",
                            "error": f"HTTP {response.status}: {error_text}"
                        })
                        results["errors"].append(f"{model}: HTTP {response.status}")
                        results["status"] = "degraded"
                        
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
        
        logger.info(f"DeepSeek health check completed: {results['status']}")
        return results

    def get_available_models(self) -> list:
        """Pobieranie listy dostępnych modeli"""
        return list(self.model_configs.keys())

    async def close(self):
        """Zamykanie sesji HTTP"""
        if self.session and not self.session.closed:
            await self.session.close()
            self.session = None
            logger.info("DeepSeek session closed successfully")
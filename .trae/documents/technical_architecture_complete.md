# GAI - Pełna Dokumentacja Techniczna do Produkcji

## 1. Aktualny Stan Projektu

### 1.1 Co Działa
- ✅ Struktura mikroserwisów (Backend, Frontend, Worker)
- ✅ Konfiguracja Docker i Railway
- ✅ System autoryzacji Basic Auth
- ✅ Architektura agenta AI z pamięcią
- ✅ System zadań Celery z cyklem autonomicznym

### 1.2 Krytyczne Braki (FAKE CODE)
- ❌ **Modele AI** - tylko symulacje, brak prawdziwych API
- ❌ **Routery API** - puste endpointy bez logiki
- ❌ **System pamięci** - brak implementacji PostgreSQL
- ❌ **Integracje zewnętrzne** - FTP, ASIN, SEO to puste funkcje
- ❌ **Obsługa błędów** - brak wyjątków i logowania
- ❌ **Testy** - zero testów jednostkowych
- ❌ **Monitoring** - brak health checks i metryk

## 2. Wymagane Implementacje

### 2.1 Moduł Modeli AI (PRIORYTET 1)

#### Integracje API
```python
# packages/models/providers/openai_provider.py
import openai
from typing import Dict, Any

class OpenAIProvider:
    def __init__(self, api_key: str):
        self.client = openai.OpenAI(api_key=api_key)
    
    def generate_text(self, prompt: str, model: str, temperature: float, max_tokens: int) -> str:
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content
        except openai.RateLimitError as e:
            logger.error(f"OpenAI rate limit: {e}")
            raise
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise

# packages/models/providers/anthropic_provider.py
import anthropic

class AnthropicProvider:
    def __init__(self, api_key: str):
        self.client = anthropic.Anthropic(api_key=api_key)
    
    def generate_text(self, prompt: str, model: str, temperature: float, max_tokens: int) -> str:
        try:
            response = self.client.messages.create(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Anthropic API error: {e}")
            raise
```

#### Główna Funkcja Modelu
```python
# packages/models/invoke.py (NOWA WERSJA)
import os
import logging
from typing import Dict, Optional
from .providers.openai_provider import OpenAIProvider
from .providers.anthropic_provider import AnthropicProvider
from .providers.deepseek_provider import DeepSeekProvider
from .registry import get_registry

logger = logging.getLogger(__name__)

class ModelManager:
    def __init__(self):
        self.providers = {}
        self._initialize_providers()
    
    def _initialize_providers(self):
        """Inicjalizacja providerów z kluczami API"""
        if os.getenv("OPENAI_API_KEY"):
            self.providers["openai"] = OpenAIProvider(os.getenv("OPENAI_API_KEY"))
        if os.getenv("ANTHROPIC_API_KEY"):
            self.providers["anthropic"] = AnthropicProvider(os.getenv("ANTHROPIC_API_KEY"))
        if os.getenv("DEEPSEEK_API_KEY"):
            self.providers["deepseek"] = DeepSeekProvider(os.getenv("DEEPSEEK_API_KEY"))
    
    def model_infer(self, task_label: str, prompt: str, temperature: float = 0.5, max_tokens: int = 1200) -> str:
        """
        Prawdziwa inferencja modelu AI z obsługą błędów i fallback
        """
        try:
            registry = get_registry()
            model_config = registry["models"].get(task_label, registry["models"]["fast_general"])
            
            provider_name = model_config["provider"]
            model_name = model_config["model_name"]
            
            if provider_name not in self.providers:
                raise ValueError(f"Provider {provider_name} not available")
            
            logger.info(f"Calling {provider_name}:{model_name} for task {task_label}")
            
            result = self.providers[provider_name].generate_text(
                prompt=prompt,
                model=model_name,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            # Logowanie do analityki
            self._log_usage(task_label, provider_name, model_name, len(prompt), len(result))
            
            return result
            
        except Exception as e:
            logger.error(f"Model inference failed for {task_label}: {e}")
            # Fallback na prostszy model lub default response
            return self._get_fallback_response(task_label, prompt)
    
    def _log_usage(self, task_label: str, provider: str, model: str, input_tokens: int, output_tokens: int):
        """Logowanie użycia modeli do analityki kosztów"""
        from packages.core_agent.analytics import log_model_usage
        log_model_usage(task_label, provider, model, input_tokens, output_tokens)
    
    def _get_fallback_response(self, task_label: str, prompt: str) -> str:
        """Prosta odpowiedź fallback gdy API nie działa"""
        return f"Przepraszam, ale nie mogę przetworzyć tego zapytania. Spróbuj ponownie później."

# Globalna instancja
model_manager = ModelManager()

def model_infer(task_label: str, prompt: str, temperature: float = 0.5, max_tokens: int = 1200) -> str:
    """Wrapper dla backward compatibility"""
    return model_manager.model_infer(task_label, prompt, temperature, max_tokens)
```

### 2.2 System Pamięci i Bazy Danych (PRIORYTET 1)

#### PostgreSQL z pgvector
```python
# packages/memory/db.py (NOWA WERSJA)
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        self.connection_string = os.getenv("DATABASE_URL")
        self._init_tables()
    
    def _init_tables(self):
        """Inicjalizacja tabel i rozszerzeń"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                # Rozszerzenie pgvector dla wektorów
                cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
                
                # Tabela konwersacji
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS conversations (
                        id SERIAL PRIMARY KEY,
                        session_id VARCHAR(255) NOT NULL,
                        role VARCHAR(50) NOT NULL,
                        content TEXT NOT NULL,
                        embedding vector(1536),
                        created_at TIMESTAMP DEFAULT NOW(),
                        INDEX idx_session_id (session_id),
                        INDEX idx_created_at (created_at)
                    )
                """)
                
                # Tabela zadań
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS tasks (
                        id SERIAL PRIMARY KEY,
                        task_id VARCHAR(255) UNIQUE NOT NULL,
                        task_type VARCHAR(100) NOT NULL,
                        status VARCHAR(50) NOT NULL,
                        parameters JSONB,
                        result JSONB,
                        error_message TEXT,
                        cost_usd DECIMAL(10,4),
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW(),
                        INDEX idx_task_id (task_id),
                        INDEX idx_status (status),
                        INDEX idx_created_at (created_at)
                    )
                """)
                
                # Tabela publikacji
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS publications (
                        id SERIAL PRIMARY KEY,
                        title VARCHAR(500) NOT NULL,
                        content TEXT NOT NULL,
                        keywords JSONB,
                        meta_description TEXT,
                        ftp_path VARCHAR(1000),
                        published_at TIMESTAMP,
                        status VARCHAR(50) NOT NULL,
                        analytics JSONB,
                        created_at TIMESTAMP DEFAULT NOW(),
                        INDEX idx_status (status),
                        INDEX idx_published_at (published_at)
                    )
                """)
                
                conn.commit()
    
    def get_connection(self):
        """Pobieranie połączenia z connection pooling"""
        return psycopg2.connect(
            self.connection_string,
            cursor_factory=RealDictCursor
        )
    
    def execute_query(self, query: str, params: tuple = None) -> List[Dict]:
        """Wykonywanie zapytań z obsługą błędów"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, params)
                    if query.strip().upper().startswith("SELECT"):
                        return cur.fetchall()
                    conn.commit()
                    return []
        except Exception as e:
            logger.error(f"Database query failed: {e}")
            raise
```

#### System Pamięci z Wektorami
```python
# packages/memory/store.py (NOWA WERSJA)
import openai
import numpy as np
from typing import List, Dict, Any
import logging
from .db import DatabaseManager

logger = logging.getLogger(__name__)

class MemoryStore:
    def __init__(self):
        self.db = DatabaseManager()
        self.embedding_model = "text-embedding-ada-002"
        self.max_context_length = 4000
    
    def create_embedding(self, text: str) -> List[float]:
        """Tworzenie embeddingu z OpenAI"""
        try:
            client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            response = client.embeddings.create(
                input=text,
                model=self.embedding_model
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Embedding creation failed: {e}")
            return [0.0] * 1536  # Fallback embedding
    
    def append_message(self, session_id: str, role: str, content: str):
        """Dodawanie wiadomości z embeddingiem"""
        embedding = self.create_embedding(content)
        
        query = """
            INSERT INTO conversations (session_id, role, content, embedding)
            VALUES (%s, %s, %s, %s)
        """
        self.db.execute_query(query, (session_id, role, content, embedding))
    
    def get_recent_context(self, session_id: str, limit: int = 10) -> str:
        """Pobieranie ostatniego kontekstu"""
        query = """
            SELECT role, content, created_at
            FROM conversations
            WHERE session_id = %s
            ORDER BY created_at DESC
            LIMIT %s
        """
        results = self.db.execute_query(query, (session_id, limit))
        
        # Odwrócenie kolejności dla chronologicznego kontekstu
        context_parts = []
        for row in reversed(results):
            context_parts.append(f"{row['role']}: {row['content']}")
        
        return "\n".join(context_parts)
    
    def search_similar_context(self, query: str, session_id: str = None, limit: int = 5) -> List[Dict]:
        """Wyszukiwanie podobnych kontekstów wektorowych"""
        query_embedding = self.create_embedding(query)
        
        sql_query = f"""
            SELECT role, content, created_at,
                   1 - (embedding <=> %s::vector) as similarity
            FROM conversations
            {f'WHERE session_id = %s' if session_id else ''}
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """
        
        params = [query_embedding]
        if session_id:
            params.extend([session_id, query_embedding, limit])
        else:
            params.extend([query_embedding, limit])
        
        return self.db.execute_query(sql_query, tuple(params))
```

### 2.3 System Zadań i Autonomiczna Praca (PRIORYTET 2)

#### Autonomiczny Agent
```python
# packages/core_agent/loop.py (NOWA WERSJA)
import asyncio
import logging
from typing import Dict, Any
from datetime import datetime, timedelta
from .planner import TaskPlanner
from .executor import TaskExecutor
from .validator import TaskValidator
from .analytics import AnalyticsCollector

logger = logging.getLogger(__name__)

class AutonomousAgent:
    def __init__(self):
        self.planner = TaskPlanner()
        self.executor = TaskExecutor()
        self.validator = TaskValidator()
        self.analytics = AnalyticsCollector()
        self.wake_cycle_min = int(os.getenv("WAKE_CYCLE_MIN", "5"))
        self.cost_budget = float(os.getenv("COST_BUDGET_USD_PER_CYCLE", "5.0"))
    
    async def wake_cycle(self):
        """Główny cykl autonomiczny agenta"""
        logger.info("Starting autonomous wake cycle")
        
        try:
            # 1. Analiza stanu systemu
            system_state = await self.analyze_system_state()
            
            # 2. Planowanie zadań
            tasks = await self.planner.plan_tasks(system_state)
            
            # 3. Walidacja budżetu i priorytetów
            validated_tasks = await self.validator.validate_tasks(tasks, self.cost_budget)
            
            # 4. Eksekucja zadań
            results = []
            for task in validated_tasks:
                result = await self.executor.execute_task(task)
                results.append(result)
                
                # Aktualizacja budżetu w czasie rzeczywistym
                self.cost_budget -= result.get("cost_usd", 0)
                if self.cost_budget <= 0:
                    logger.warning("Budget exhausted, stopping task execution")
                    break
            
            # 5. Analityka i samodoskonalenie
            await self.analytics.log_cycle_results(results)
            await self.self_improvement_analysis(results)
            
            logger.info(f"Wake cycle completed with {len(results)} tasks")
            
        except Exception as e:
            logger.error(f"Wake cycle failed: {e}")
            await self.analytics.log_error("wake_cycle", str(e))
    
    async def analyze_system_state(self) -> Dict[str, Any]:
        """Analiza aktualnego stanu systemu"""
        return {
            "recent_conversations": await self.get_recent_conversations(),
            "pending_tasks": await self.get_pending_tasks(),
            "publication_queue": await self.get_publication_queue(),
            "performance_metrics": await self.get_performance_metrics(),
            "cost_analysis": await self.get_cost_analysis()
        }
    
    async def self_improvement_analysis(self, results: List[Dict]):
        """Analiza wyników dla samodoskonalenia"""
        # TODO: Implementacja samodoskonalenia na podstawie wyników
        pass
```

#### Planer Zadań
```python
# packages/core_agent/planner.py (NOWA WERSJA)
import logging
from typing import List, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class TaskPlanner:
    def __init__(self):
        self.task_templates = {
            "content_generation": {
                "priority": 1,
                "estimated_cost": 0.01,
                "required_models": ["gpt-4", "claude-3"]
            },
            "seo_optimization": {
                "priority": 2,
                "estimated_cost": 0.005,
                "required_models": ["gpt-3.5-turbo"]
            },
            "publication": {
                "priority": 3,
                "estimated_cost": 0.001,
                "required_models": []
            },
            "analytics_update": {
                "priority": 4,
                "estimated_cost": 0.002,
                "required_models": ["gpt-3.5-turbo"]
            }
        }
    
    async def plan_tasks(self, system_state: Dict) -> List[Dict]:
        """Planowanie zadań na podstawie stanu systemu"""
        tasks = []
        
        # Analiza konwersacji i generowanie tematów
        if system_state.get("recent_conversations"):
            content_tasks = await self.plan_content_generation(system_state["recent_conversations"])
            tasks.extend(content_tasks)
        
        # Optymalizacja SEO dla istniejących treści
        seo_tasks = await self.plan_seo_optimization(system_state.get("pending_content", []))
        tasks.extend(seo_tasks)
        
        # Publikacja gotowych treści
        publication_tasks = await self.plan_publications(system_state.get("publication_queue", []))
        tasks.extend(publication_tasks)
        
        # Aktualizacja analityki
        analytics_tasks = await self.plan_analytics_update()
        tasks.extend(analytics_tasks)
        
        # Sortowanie według priorytetu i kosztu
        tasks.sort(key=lambda x: (x["priority"], x["estimated_cost"]))
        
        return tasks
    
    async def plan_content_generation(self, conversations: List[Dict]) -> List[Dict]:
        """Planowanie generowania treści na podstawie konwersacji"""
        tasks = []
        
        for conversation in conversations[-5:]:  # Ostatnie 5 konwersacji
            task = {
                "task_id": f"content_gen_{conversation['id']}_{datetime.now().timestamp()}",
                "task_type": "content_generation",
                "priority": 1,
                "estimated_cost": 0.01,
                "parameters": {
                    "topic": conversation["content"],
                    "context": conversation["context"],
                    "target_keywords": await self.extract_keywords(conversation["content"])
                },
                "required_models": ["gpt-4"],
                "retry_count": 0,
                "max_retries": 3
            }
            tasks.append(task)
        
        return tasks
```

### 2.4 Integracje Zewnętrzne (PRIORYTET 2)

#### FTP Publisher
```python
# packages/tools/publisher.py (NOWA WERSJA)
import ftplib
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)

class FTPPublisher:
    def __init__(self):
        self.host = os.getenv("FTP_HOST")
        self.user = os.getenv("FTP_USER")
        self.password = os.getenv("FTP_PASS")
        self.base_dir = os.getenv("FTP_BASE_DIR", "public_html")
    
    async def publish_content(self, content: Dict) -> Dict[str, Any]:
        """Publikacja treści przez FTP z atomową aktualizacją"""
        try:
            # Generowanie nazwy pliku i ścieżki
            filename = self.generate_filename(content["title"])
            filepath = f"{self.base_dir}/{filename}"
            
            # Połączenie FTP
            with ftplib.FTP(self.host, self.user, self.password) as ftp:
                # Upewnij się, że katalog istnieje
                self.ensure_directory_exists(ftp, os.path.dirname(filepath))
                
                # Upload pliku
                content_html = self.generate_html_content(content)
                ftp.storbinary(f"STOR {filepath}", io.BytesIO(content_html.encode()))
                
                # Aktualizacja sitemap.xml
                await self.update_sitemap(ftp, filename, content)
                
                logger.info(f"Published content to {filepath}")
                
                return {
                    "success": True,
                    "filepath": filepath,
                    "published_at": datetime.now(),
                    "url": f"https://yourdomain.com/{filename}"
                }
                
        except Exception as e:
            logger.error(f"FTP publication failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "published_at": None
            }
    
    def generate_html_content(self, content: Dict) -> str:
        """Generowanie pełnego HTML z SEO optimization"""
        return f"""
        <!DOCTYPE html>
        <html lang="pl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{content["title"]}</title>
            <meta name="description" content="{content.get("meta_description", "")}">
            <meta name="keywords" content="{",".join(content.get("keywords", []))}">
            <meta property="og:title" content="{content["title"]}">
            <meta property="og:description" content="{content.get("meta_description", "")}">
            <meta property="og:type" content="article">
            <link rel="canonical" href="https://yourdomain.com/{self.generate_filename(content["title"])}">
        </head>
        <body>
            <article>
                <h1>{content["title"]}</h1>
                <div class="content">
                    {content["content"]}
                </div>
                <div class="analytics" data-article-id="{content.get("id", "")}">
                    <!-- Analytics tracking code -->
                </div>
            </article>
        </body>
        </html>
        """
```

#### ASIN Integration
```python
# packages/tools/asin.py (NOWA WERSJA)
import aiohttp
import logging
from typing import Dict, List, Optional
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)

class ASINManager:
    def __init__(self):
        self.amazon_associates_tag = os.getenv("AMAZON_ASSOCIATES_TAG")
        self.amazon_access_key = os.getenv("AMAZON_ACCESS_KEY")
        self.amazon_secret_key = os.getenv("AMAZON_SECRET_KEY")
    
    async def find_relevant_asins(self, content: str, keywords: List[str]) -> List[Dict]:
        """Znajdowanie relevantnych produktów Amazon na podstawie treści"""
        try:
            # Wykorzystanie Amazon Product Advertising API
            search_terms = await self.extract_search_terms(content, keywords)
            
            products = []
            for term in search_terms[:3]:  # Maksymalnie 3 wyszukiwania
                results = await self.search_amazon_products(term)
                products.extend(results)
            
            # Filtrowanie i ranking produktów
            ranked_products = await self.rank_products_by_relevance(products, content)
            
            return ranked_products[:5]  # Top 5 produktów
            
        except Exception as e:
            logger.error(f"ASIN search failed: {e}")
            return []
    
    async def search_amazon_products(self, search_term: str) -> List[Dict]:
        """Wyszukiwanie produktów przez Amazon API"""
        # Implementacja wywołania Amazon Product Advertising API
        # z podpisem AWS Signature Version 4
        pass
    
    def generate_affiliate_links(self, asins: List[str]) -> Dict[str, str]:
        """Generowanie linków afiliacyjnych"""
        links = {}
        for asin in asins:
            links[asin] = f"https://www.amazon.com/dp/{asin}?tag={self.amazon_associates_tag}"
        return links
```

### 2.5 System Logowania i Monitoring (PRIORYTET 3)

#### Konfiguracja Logowania
```python
# logging_config.py
import logging
import logging.handlers
import json
from datetime import datetime

class StructuredLogger:
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)
        
        # Handler do plików z rotacją
        file_handler = logging.handlers.RotatingFileHandler(
            'logs/gai.log', maxBytes=10*1024*1024, backupCount=5
        )
        file_handler.setFormatter(self.get_json_formatter())
        
        # Handler do konsoli
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(self.get_human_formatter())
        
        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)
    
    def get_json_formatter(self):
        class JSONFormatter(logging.Formatter):
            def format(self, record):
                log_data = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "level": record.levelname,
                    "logger": record.name,
                    "message": record.getMessage(),
                    "module": record.module,
                    "function": record.funcName,
                    "line": record.lineno
                }
                if hasattr(record, 'extra_data'):
                    log_data.update(record.extra_data)
                return json.dumps(log_data)
        
        return JSONFormatter()
    
    def get_human_formatter(self):
        return logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    def info(self, message: str, extra_data: dict = None):
        if extra_data:
            self.logger.info(message, extra={'extra_data': extra_data})
        else:
            self.logger.info(message)
    
    def error(self, message: str, extra_data: dict = None):
        if extra_data:
            self.logger.error(message, extra={'extra_data': extra_data})
        else:
            self.logger.error(message)
```

#### Health Check i Monitoring
```python
# monitoring/health_check.py
import asyncio
import psutil
import logging
from datetime import datetime
from typing import Dict, Any

logger = logging.getLogger(__name__)

class HealthChecker:
    def __init__(self):
        self.checks = {
            "database": self.check_database,
            "redis": self.check_redis,
            "models": self.check_models,
            "ftp": self.check_ftp,
            "disk_space": self.check_disk_space,
            "memory": self.check_memory
        }
    
    async def comprehensive_health_check(self) -> Dict[str, Any]:
        """Kompleksowy health check wszystkich usług"""
        results = {}
        overall_status = "healthy"
        
        for check_name, check_func in self.checks.items():
            try:
                result = await check_func()
                results[check_name] = result
                
                if result["status"] != "healthy":
                    overall_status = "degraded"
                    if result["severity"] == "critical":
                        overall_status = "unhealthy"
                        
            except Exception as e:
                logger.error(f"Health check {check_name} failed: {e}")
                results[check_name] = {
                    "status": "unhealthy",
                    "error": str(e),
                    "severity": "critical"
                }
                overall_status = "unhealthy"
        
        return {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "checks": results,
            "system_info": await self.get_system_info()
        }
    
    async def check_database(self) -> Dict[str, Any]:
        """Sprawdzanie połączenia z bazą danych"""
        try:
            from packages.memory.db import DatabaseManager
            db = DatabaseManager()
            
            # Test query
            result = db.execute_query("SELECT 1 as test")
            
            return {
                "status": "healthy",
                "response_time": "<10ms",
                "severity": "none"
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "severity": "critical"
            }
    
    async def check_disk_space(self) -> Dict[str, Any]:
        """Sprawdzanie dostępnego miejsca na dysku"""
        disk_usage = psutil.disk_usage('/')
        free_percent = (disk_usage.free / disk_usage.total) * 100
        
        if free_percent < 10:
            severity = "critical"
            status = "unhealthy"
        elif free_percent < 20:
            severity = "warning"
            status = "degraded"
        else:
            severity = "none"
            status = "healthy"
        
        return {
            "status": status,
            "free_percent": free_percent,
            "free_gb": disk_usage.free / (1024**3),
            "severity": severity
        }
```

### 2.6 Frontend - Next.js Implementation (PRIORYTET 4)

#### Strona Główna Panelu
```javascript
// apps/web/pages/index.js (NOWA WERSJA)
import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import ChatInterface from '../components/ChatInterface'
import TaskDashboard from '../components/TaskDashboard'
import AnalyticsPanel from '../components/AnalyticsPanel'
import { useAuth } from '../hooks/useAuth'

export default function Dashboard() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('chat')
  const [systemStatus, setSystemStatus] = useState(null)

  useEffect(() => {
    // Pobieranie statusu systemu
    fetchSystemStatus()
    const interval = setInterval(fetchSystemStatus, 30000) // Co 30 sekund
    return () => clearInterval(interval)
  }, [])

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      setSystemStatus(data)
    } catch (error) {
      console.error('Failed to fetch system status:', error)
    }
  }

  if (loading) return <div>Loading...</div>
  if (!user) return <div>Access denied</div>

  return (
    <Layout>
      <div className="min-h-screen bg-gray-100">
        {/* Status Bar */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold text-gray-900">GAI Control Panel</h1>
              <SystemStatusIndicator status={systemStatus} />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              {[
                { id: 'chat', label: 'Chat', icon: '💬' },
                { id: 'tasks', label: 'Tasks', icon: '📋' },
                { id: 'publications', label: 'Publications', icon: '📄' },
                { id: 'analytics', label: 'Analytics', icon: '📊' },
                { id: 'settings', label: 'Settings', icon: '⚙️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'chat' && <ChatInterface />}
          {activeTab === 'tasks' && <TaskDashboard />}
          {activeTab === 'publications' && <PublicationsPanel />}
          {activeTab === 'analytics' && <AnalyticsPanel />}
          {activeTab === 'settings' && <SettingsPanel />}
        </div>
      </div>
    </Layout>
  )
}

function SystemStatusIndicator({ status }) {
  if (!status) return <div className="text-gray-400">Checking status...</div>
  
  const getStatusColor = () => {
    switch (status.status) {
      case 'healthy': return 'text-green-600'
      case 'degraded': return 'text-yellow-600'
      case 'unhealthy': return 'text-red-600'
      default: return 'text-gray-400'
    }
  }
  
  return (
    <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
      <div className={`w-2 h-2 rounded-full ${status.status === 'healthy' ? 'bg-green-500' : status.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`} />
      <span className="text-sm font-medium">System {status.status}</span>
    </div>
  )
}
```

### 2.7 Testy i Jakość Kodu (PRIORYTET 5)

#### Testy Jednostkowe
```python
# tests/test_models.py
import pytest
import asyncio
from unittest.mock import Mock, patch
from packages.models.invoke import ModelManager

class TestModelManager:
    @pytest.fixture
    def model_manager(self):
        return ModelManager()
    
    @pytest.mark.asyncio
    async def test_openai_provider_success(self, model_manager):
        """Test udanej inferencji OpenAI"""
        with patch('openai.OpenAI') as mock_openai:
            # Mock response
            mock_response = Mock()
            mock_response.choices = [Mock(message=Mock(content="Test response"))]
            mock_openai.return_value.chat.completions.create.return_value = mock_response
            
            result = model_manager.model_infer(
                "chat_general", 
                "Test prompt",
                temperature=0.7
            )
            
            assert result == "Test response"
            mock_openai.return_value.chat.completions.create.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_model_fallback_on_failure(self, model_manager):
        """Test fallback gdy główny model nie działa"""
        with patch.object(model_manager, 'providers', {}):
            result = model_manager.model_infer("chat_general", "Test prompt")
            assert "Przepraszam" in result  # Fallback response
    
    def test_cost_budget_enforcement(self):
        """Test egzekwowania budżetu kosztów"""
        agent = AutonomousAgent()
        agent.cost_budget = 0.01
        
        # Symulacja zadania kosztującego 0.02
        task = {"estimated_cost": 0.02}
        validated = agent.validator.validate_tasks([task], agent.cost_budget)
        
        assert len(validated) == 0  # Zadanie powinno być odrzucone
```

#### Testy Integracyjne
```python
# tests/test_endpoints.py
import pytest
from fastapi.testclient import TestClient
from apps.backend.main import app

client = TestClient(app)

class TestAPIEndpoints:
    def test_health_endpoint(self):
        """Test endpointu health check"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
    
    def test_chat_endpoint_with_auth(self):
        """Test endpointu czatu z autoryzacją"""
        # Mock autoryzacji
        with patch.dict(os.environ, {"GAI_PANEL_PASSWORD": "testpass"}):
            response = client.post(
                "/chat/send",
                json={"message": "Hello"},
                auth=("user", "testpass")
            )
            assert response.status_code == 200
            assert "reply" in response.json()
    
    def test_task_creation_endpoint(self):
        """Test tworzenia zadań"""
        task_data = {
            "task_type": "content_generation",
            "parameters": {
                "topic": "AI Technology",
                "keywords": ["AI", "machine learning"]
            }
        }
        
        response = client.post("/tasks/create", json=task_data)
        assert response.status_code == 201
        assert response.json()["task_id"] is not None
```

## 3. Plan Implementacji

### Faza 1 (Tydzień 1-2): Podstawy Systemu
1. **Implementacja modeli AI** - OpenAI, Anthropic, DeepSeek
2. **System pamięci PostgreSQL** - pgvector, embeddingi
3. **Podstawowe API** - chat, task creation
4. **Logowanie i monitoring** - structured logs, health checks

### Faza 2 (Tydzień 3-4): Autonomiczna Praca
1. **Agent autonomiczny** - wake cycle, task planning
2. **System zadań Celery** - queue, retry logic
3. **Integracje zewnętrzne** - FTP, ASIN discovery
4. **SEO content generation** - keywords, meta tags

### Faza 3 (Tydzień 5-6): Frontend i UX
1. **Next.js dashboard** - chat interface, task management
2. **Real-time updates** - WebSocket, notifications
3. **Analytics panel** - charts, metrics
4. **Settings panel** - configuration, API keys

### Faza 4 (Tydzień 7-8): Testy i Produkcja
1. **Testy jednostkowe** - 80% coverage
2. **Testy integracyjne** - API endpoints
3. **Performance testing** - load tests
4. **Deployment pipeline** - CI/CD, monitoring

## 4. Wymagania Środowiskowe

### Zmienne Środowiskowe (Produkcja)
```bash
# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=sk-...

# Database
DATABASE_URL=postgresql://user:pass@host:5432/gai
REDIS_URL=redis://host:6379/0

# FTP Configuration
FTP_HOST=ftp.yourdomain.com
FTP_USER=username
FTP_PASS=password
FTP_BASE_DIR=public_html/articles

# Security
GAI_PANEL_PASSWORD=strong_password_here
JWT_SECRET=your_jwt_secret_key

# Monitoring
SENTRY_DSN=https://...
LOG_LEVEL=INFO
METRICS_ENDPOINT=https://...

# AI Configuration
WAKE_CYCLE_MIN=5
COST_BUDGET_USD_PER_CYCLE=5.0
MAX_RETRIES=3
DEFAULT_MODEL=gpt-4
```

### Skalowanie i Wydajność
- **Connection pooling** dla PostgreSQL
- **Redis clustering** dla dużych obciążeń
- **CDN** dla publikowanych treści
- **Load balancing** dla API
- **Rate limiting** dla ochrony przed abuse

## 5. Bezpieczeństwo

### Authentication & Authorization
- JWT tokens dla sesji
- Rate limiting per user
- API key rotation
- Secure password storage

### Data Protection
- Encryption at rest dla wrażliwych danych
- HTTPS wszędzie
- Input validation i sanitization
- SQL injection protection

### Monitoring bezpieczeństwa
- Failed login attempt tracking
- Suspicious activity detection
- Regular security audits
- Dependency vulnerability scanning

Ta dokumentacja zawiera kompletny plan przekształcenia prototypu w pełnoprawny system produkcyjny z prawdziwą inteligencją AI, automatyzacją i skalowalnością.
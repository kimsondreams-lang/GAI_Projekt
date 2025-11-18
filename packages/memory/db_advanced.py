"""
Zaawansowany system bazy danych PostgreSQL z pgvector dla GAI
Zawiera connection pooling, migracje, obsługę błędów i optymalizacje
"""

import os
import asyncio
import logging
from typing import Optional, List, Dict, Any, AsyncGenerator
from datetime import datetime, timedelta
import json
import asyncpg
from asyncpg import Pool, Connection
from contextlib import asynccontextmanager
import backoff

logger = logging.getLogger(__name__)

class DatabaseManager:
    """
    Zaawansowany manager bazy danych PostgreSQL z pgvector
    """
    
    def __init__(self):
        self.pool: Optional[Pool] = None
        self.database_url = os.getenv("DATABASE_URL")
        self.min_connections = int(os.getenv("DB_MIN_CONNECTIONS", "5"))
        self.max_connections = int(os.getenv("DB_MAX_CONNECTIONS", "20"))
        self.connection_timeout = int(os.getenv("DB_CONNECTION_TIMEOUT", "30"))
        self.statement_timeout = int(os.getenv("DB_STATEMENT_TIMEOUT", "300"))
        
        if not self.database_url:
            raise ValueError("DATABASE_URL nie jest ustawiony w zmiennych środowiskowych")
    
    async def initialize(self):
        """Inicjalizacja connection pool i migracji"""
        try:
            logger.info("Inicjalizacja bazy danych PostgreSQL...")
            
            # Utworzenie connection pool
            self.pool = await asyncpg.create_pool(
                self.database_url,
                min_size=self.min_connections,
                max_size=self.max_connections,
                command_timeout=self.statement_timeout,
                server_settings={
                    "application_name": "gai_memory_system",
                    "statement_timeout": str(self.statement_timeout * 1000),  # w milisekundach
                }
            )
            
            logger.info(f"Connection pool utworzony: {self.min_connections}-{self.max_connections} połączeń")
            
            # Uruchomienie migracji
            await self._run_migrations()
            
            # Utworzenie indeksów
            await self._create_indexes()
            
            logger.info("Baza danych została pomyślnie zainicjalizowana")
            
        except Exception as e:
            logger.error(f"Błąd inicjalizacji bazy danych: {e}")
            raise
    
    async def _run_migrations(self):
        """Uruchomienie migracji bazy danych"""
        logger.info("Uruchamianie migracji bazy danych...")
        
        migrations = [
            self._migration_001_create_extensions,
            self._migration_002_create_conversations_table,
            self._migration_003_create_messages_table,
            self._migration_004_create_embeddings_table,
            self._migration_005_create_contexts_table,
            self._migration_006_create_pins_table,
            self._migration_007_create_memory_index_table,
        ]
        
        for migration in migrations:
            try:
                await migration()
                logger.info(f"Migracja {migration.__name__} zakończona pomyślnie")
            except Exception as e:
                logger.error(f"Błąd migracji {migration.__name__}: {e}")
                raise
    
    async def _migration_001_create_extensions(self):
        """Tworzenie rozszerzeń PostgreSQL"""
        async with self.pool.acquire() as conn:
            # pgvector dla wektorów
            await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
            # uuid-ossp dla UUID
            await conn.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")
            logger.info("Rozszerzenia PostgreSQL utworzone")
    
    async def _migration_002_create_conversations_table(self):
        """Tworzenie tabeli konwersacji"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    title VARCHAR(255),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    metadata JSONB DEFAULT '{}',
                    is_archived BOOLEAN DEFAULT FALSE,
                    archived_at TIMESTAMP WITH TIME ZONE
                )
            """)
    
    async def _migration_003_create_messages_table(self):
        """Tworzenie tabeli wiadomości"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
                    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
                    content TEXT NOT NULL,
                    token_count INTEGER,
                    model_used VARCHAR(100),
                    cost_usd DECIMAL(10,6) DEFAULT 0.0,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    metadata JSONB DEFAULT '{}'
                )
            """)
    
    async def _migration_004_create_embeddings_table(self):
        """Tworzenie tabeli embeddingów"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS embeddings (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    content_hash VARCHAR(64) UNIQUE NOT NULL,
                    content TEXT NOT NULL,
                    embedding vector(1536),
                    embedding_model VARCHAR(100) DEFAULT 'text-embedding-ada-002',
                    token_count INTEGER,
                    metadata JSONB DEFAULT '{}',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    expires_at TIMESTAMP WITH TIME ZONE
                )
            """)
    
    async def _migration_005_create_contexts_table(self):
        """Tworzenie tabeli kontekstów"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS contexts (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    context_type VARCHAR(50) NOT NULL CHECK (context_type IN ('conversation', 'document', 'code', 'task', 'user')),
                    context_key VARCHAR(255) NOT NULL,
                    title VARCHAR(255),
                    content TEXT NOT NULL,
                    embedding vector(1536),
                    tags TEXT[] DEFAULT '{}',
                    importance_score DECIMAL(3,2) DEFAULT 0.5 CHECK (importance_score >= 0.0 AND importance_score <= 1.0),
                    access_count INTEGER DEFAULT 0,
                    last_accessed TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    expires_at TIMESTAMP WITH TIME ZONE,
                    metadata JSONB DEFAULT '{}',
                    UNIQUE(context_type, context_key)
                )
            """)
    
    async def _migration_006_create_pins_table(self):
        """Tworzenie tabeli przypięć"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS pins (
                    key VARCHAR(255) PRIMARY KEY,
                    value TEXT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    expires_at TIMESTAMP WITH TIME ZONE
                )
            """)
    
    async def _migration_007_create_memory_index_table(self):
        """Tworzenie tabeli indeksu pamięci"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS memory_index (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    memory_type VARCHAR(50) NOT NULL,
                    memory_id UUID NOT NULL,
                    index_key VARCHAR(255) NOT NULL,
                    index_value TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    UNIQUE(memory_type, memory_id, index_key)
                )
            """)
    
    async def _create_indexes(self):
        """Tworzenie indeksów dla optymalizacji wydajności"""
        logger.info("Tworzenie indeksów...")
        
        indexes = [
            # Indeksy dla messages
            "CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)",
            "CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)",
            "CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role)",
            
            # Indeksy dla contexts
            "CREATE INDEX IF NOT EXISTS idx_contexts_type_key ON contexts(context_type, context_key)",
            "CREATE INDEX IF NOT EXISTS idx_contexts_importance ON contexts(importance_score DESC)",
            "CREATE INDEX IF NOT EXISTS idx_contexts_last_accessed ON contexts(last_accessed DESC)",
            "CREATE INDEX IF NOT EXISTS idx_contexts_expires_at ON contexts(expires_at)",
            
            # Indeksy dla embeddings
            "CREATE INDEX IF NOT EXISTS idx_embeddings_content_hash ON embeddings(content_hash)",
            "CREATE INDEX IF NOT EXISTS idx_embeddings_expires_at ON embeddings(expires_at)",
            
            # Indeksy dla memory_index
            "CREATE INDEX IF NOT EXISTS idx_memory_index_type ON memory_index(memory_type)",
            "CREATE INDEX IF NOT EXISTS idx_memory_index_key ON memory_index(index_key)",
            
            # Indeksy GIN dla JSONB
            "CREATE INDEX IF NOT EXISTS idx_messages_metadata ON messages USING GIN(metadata)",
            "CREATE INDEX IF NOT EXISTS idx_contexts_metadata ON contexts USING GIN(metadata)",
            "CREATE INDEX IF NOT EXISTS idx_contexts_tags ON contexts USING GIN(tags)",
        ]
        
        async with self.pool.acquire() as conn:
            for index_sql in indexes:
                try:
                    await conn.execute(index_sql)
                    logger.info(f"Indeks utworzony: {index_sql[:50]}...")
                except Exception as e:
                    logger.error(f"Błąd tworzenia indeksu: {e}")
    
    @asynccontextmanager
    async def get_connection(self):
        """Kontekstowy manager dla połączenia z bazą danych"""
        if not self.pool:
            raise RuntimeError("Baza danych nie została zainicjalizowana")
        
        async with self.pool.acquire() as conn:
            yield conn
    
    @backoff.on_exception(
        backoff.expo,
        asyncpg.PostgresError,
        max_tries=3,
        max_time=30
    )
    async def execute_query(self, query: str, *args) -> Any:
        """Wykonanie zapytania z retry logic"""
        async with self.get_connection() as conn:
            return await conn.execute(query, *args)
    
    @backoff.on_exception(
        backoff.expo,
        asyncpg.PostgresError,
        max_tries=3,
        max_time=30
    )
    async def fetch_one(self, query: str, *args) -> Optional[Dict[str, Any]]:
        """Pobranie jednego wyniku"""
        async with self.get_connection() as conn:
            row = await conn.fetchrow(query, *args)
            return dict(row) if row else None
    
    @backoff.on_exception(
        backoff.expo,
        asyncpg.PostgresError,
        max_tries=3,
        max_time=30
    )
    async def fetch_all(self, query: str, *args) -> List[Dict[str, Any]]:
        """Pobranie wszystkich wyników"""
        async with self.get_connection() as conn:
            rows = await conn.fetch(query, *args)
            return [dict(row) for row in rows]
    
    async def health_check(self) -> Dict[str, Any]:
        """Sprawdzanie zdrowia bazy danych"""
        try:
            start_time = asyncio.get_event_loop().time()
            
            # Test połączenia
            async with self.get_connection() as conn:
                result = await conn.fetchval("SELECT 1")
                
                # Test pgvector
                vector_result = await conn.fetchval("SELECT 'hello'::text")
                
                # Statystyki tabel
                table_stats = await conn.fetch("""
                    SELECT 
                        schemaname,
                        tablename,
                        n_live_tup as row_count
                    FROM pg_stat_user_tables
                    ORDER BY n_live_tup DESC
                """)
            
            response_time = asyncio.get_event_loop().time() - start_time
            
            return {
                "status": "healthy",
                "response_time": response_time,
                "connection_pool_size": {
                    "min": self.min_connections,
                    "max": self.max_connections
                },
                "table_stats": [
                    {
                        "schema": row["schemaname"],
                        "table": row["tablename"],
                        "rows": row["row_count"]
                    }
                    for row in table_stats
                ],
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def cleanup_expired_data(self):
        """Czyszczenie wygasłych danych"""
        logger.info("Rozpoczynam czyszczenie wygasłych danych...")
        
        cleanup_queries = [
            "DELETE FROM embeddings WHERE expires_at < NOW()",
            "DELETE FROM contexts WHERE expires_at < NOW()",
            "DELETE FROM pins WHERE expires_at < NOW()",
            "DELETE FROM conversations WHERE is_archived = TRUE AND archived_at < NOW() - INTERVAL '30 days'",
        ]
        
        total_deleted = 0
        
        async with self.get_connection() as conn:
            for query in cleanup_queries:
                try:
                    result = await conn.execute(query)
                    deleted_count = int(result.split()[-1]) if result else 0
                    total_deleted += deleted_count
                    logger.info(f"Usunięto {deleted_count} wygasłych rekordów")
                except Exception as e:
                    logger.error(f"Błąd podczas czyszczenia: {e}")
        
        logger.info(f"Czyszczenie zakończone. Usunięto {total_deleted} rekordów.")
        return total_deleted
    
    async def close(self):
        """Zamykanie connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("Connection pool zamknięty")

# Globalna instancja
_db_manager: Optional[DatabaseManager] = None

async def get_db_manager() -> DatabaseManager:
    """Pobieranie globalnej instancji DatabaseManager"""
    global _db_manager
    if _db_manager is None:
        _db_manager = DatabaseManager()
        await _db_manager.initialize()
    return _db_manager

@asynccontextmanager
async def get_db_connection():
    """Kontekstowy manager dla połączenia z bazą danych"""
    db_manager = await get_db_manager()
    async with db_manager.get_connection() as conn:
        yield conn
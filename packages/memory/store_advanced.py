"""
Zaawansowany system pamięci z embeddingami i wektorowym wyszukiwaniem dla GAI
Zawiera kontekst konwersacji, podobieństwo semantyczne, archiwizację i optymalizacje
"""

import asyncio
import logging
import hashlib
import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import numpy as np
from packages.memory.db_advanced import get_db_manager, get_db_connection
from packages.models.invoke import ModelManager
from packages.models.registry_advanced import get_model_config

logger = logging.getLogger(__name__)

class MemoryStore:
    """
    Zaawansowany system pamięci z embeddingami i wektorowym wyszukiwaniem
    """
    
    def __init__(self):
        self.db_manager = None
        self.model_manager = ModelManager()
        self.embedding_model = "text-embedding-ada-002"
        self.embedding_provider = "openai"
        self.similarity_threshold = 0.7
        self.max_context_length = 4000
        self.context_expiry_days = 30
        self.embedding_cache = {}  # Prosty cache w pamięci
        
    async def initialize(self):
        """Inicjalizacja systemu pamięci"""
        logger.info("Inicjalizacja systemu pamięci...")
        
        # Pobranie managera bazy danych
        self.db_manager = await get_db_manager()
        
        # Sprawdzenie czy embedding provider jest dostępny
        if self.embedding_provider not in self.model_manager.providers:
            logger.warning(f"Provider {self.embedding_provider} nie jest dostępny, używam fallback")
            # Znajdź dostępnego providera
            for provider in self.model_manager.providers:
                if hasattr(self.model_manager.providers[provider], 'generate_embedding'):
                    self.embedding_provider = provider
                    logger.info(f"Używam providera {provider} dla embeddingów")
                    break
            else:
                logger.warning("Brak dostępnych providerów dla embeddingów, system będzie działał bez nich")
        
        logger.info("System pamięci został zainicjalizowany")
    
    async def create_embedding(self, text: str, model: Optional[str] = None) -> List[float]:
        """
        Tworzenie embeddingu dla tekstu z cache i retry logic
        
        Args:
            text: Tekst do embeddingu
            model: Model embeddingu (opcjonalny)
            
        Returns:
            Lista embeddingów
        """
        if not text.strip():
            logger.warning("Pusty tekst do embeddingu")
            return [0.0] * 1536  # Pusty embedding
        
        # Sprawdzenie cache
        text_hash = hashlib.md5(text.encode()).hexdigest()
        cache_key = f"{text_hash}:{model or self.embedding_model}"
        
        if cache_key in self.embedding_cache:
            logger.debug(f"Używam cache dla embeddingu: {text[:50]}...")
            return self.embedding_cache[cache_key]
        
        try:
            # Użycie ModelManager do stworzenia embeddingu
            embedding = await self.model_manager.generate_embedding(
                text=text,
                model=model or self.embedding_model,
                provider=self.embedding_provider
            )
            
            # Cache wyniku
            self.embedding_cache[cache_key] = embedding
            
            # Ograniczenie rozmiaru cache
            if len(self.embedding_cache) > 1000:
                # Usuń najstarsze wpisy
                oldest_keys = list(self.embedding_cache.keys())[:500]
                for key in oldest_keys:
                    del self.embedding_cache[key]
            
            logger.debug(f"Embedding utworzony dla tekstu: {text[:50]}...")
            return embedding
            
        except Exception as e:
            logger.error(f"Błąd tworzenia embeddingu: {e}")
            # Zwróć pusty embedding jako fallback
            return [0.0] * 1536
    
    async def search_similar_context(
        self, 
        query: str, 
        context_type: str = "conversation",
        limit: int = 5,
        similarity_threshold: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Wyszukiwanie podobnych kontekstów za pomocą pgvector
        
        Args:
            query: Zapytanie do wyszukania
            context_type: Typ kontekstu
            limit: Limit wyników
            similarity_threshold: Próg podobieństwa
            
        Returns:
            Lista podobnych kontekstów
        """
        threshold = similarity_threshold or self.similarity_threshold
        
        try:
            # Stwórz embedding dla zapytania
            query_embedding = await self.create_embedding(query)
            
            # Konwertuj na format pgvector
            embedding_array = np.array(query_embedding)
            
            # Wyszukiwanie wektorowe z pgvector
            async with get_db_connection() as conn:
                results = await conn.fetch("""
                    SELECT 
                        id,
                        context_key,
                        title,
                        content,
                        tags,
                        importance_score,
                        created_at,
                        metadata,
                        1 - (embedding <=> $1) as similarity
                    FROM contexts
                    WHERE context_type = $2 
                        AND (expires_at IS NULL OR expires_at > NOW())
                        AND 1 - (embedding <=> $1) >= $3
                    ORDER BY embedding <=> $1
                    LIMIT $4
                """, embedding_array.tolist(), context_type, threshold, limit)
            
            # Konwersja wyników
            contexts = []
            for row in results:
                contexts.append({
                    "id": str(row["id"]),
                    "context_key": row["context_key"],
                    "title": row["title"],
                    "content": row["content"],
                    "tags": row["tags"],
                    "importance_score": float(row["importance_score"]),
                    "similarity": float(row["similarity"]),
                    "created_at": row["created_at"].isoformat(),
                    "metadata": row["metadata"]
                })
            
            logger.info(f"Znaleziono {len(contexts)} podobnych kontekstów dla zapytania: {query[:50]}...")
            return contexts
            
        except Exception as e:
            logger.error(f"Błąd wyszukiwania podobnych kontekstów: {e}")
            return []
    
    async def store_context(
        self,
        context_type: str,
        context_key: str,
        content: str,
        title: Optional[str] = None,
        tags: Optional[List[str]] = None,
        importance_score: float = 0.5,
        expires_in_days: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Przechowywanie kontekstu z embeddingiem
        
        Args:
            context_type: Typ kontekstu
            context_key: Unikalny klucz kontekstu
            content: Treść kontekstu
            title: Tytuł kontekstu
            tags: Lista tagów
            importance_score: Waga ważności (0.0-1.0)
            expires_in_days: Liczba dni do wygaśnięcia
            metadata: Dodatkowe metadane
            
        Returns:
            ID zapisanego kontekstu
        """
        try:
            # Stwórz embedding dla treści
            embedding = await self.create_embedding(content)
            embedding_array = np.array(embedding)
            
            # Oblicz hash treści dla deduplikacji
            content_hash = hashlib.md5(content.encode()).hexdigest()
            
            # Przygotuj datę wygaśnięcia
            expires_at = None
            if expires_in_days:
                expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
            
            # Przygotuj tagi
            tags_array = tags or []
            
            # Przygotuj metadane
            meta = metadata or {}
            meta["content_hash"] = content_hash
            
            async with get_db_connection() as conn:
                # Upsert kontekstu
                result = await conn.fetchrow("""
                    INSERT INTO contexts (
                        context_type, context_key, title, content, embedding,
                        tags, importance_score, expires_at, metadata
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (context_type, context_key) DO UPDATE SET
                        title = EXCLUDED.title,
                        content = EXCLUDED.content,
                        embedding = EXCLUDED.embedding,
                        tags = EXCLUDED.tags,
                        importance_score = EXCLUDED.importance_score,
                        expires_at = EXCLUDED.expires_at,
                        metadata = EXCLUDED.metadata,
                        updated_at = NOW()
                    RETURNING id
                """, context_type, context_key, title, content, embedding_array.tolist(),
                    tags_array, importance_score, expires_at, json.dumps(meta))
            
            context_id = str(result["id"])
            logger.info(f"Kontekst zapisany: {context_type}:{context_key} (ID: {context_id})")
            
            return context_id
            
        except Exception as e:
            logger.error(f"Błąd zapisywania kontekstu: {e}")
            raise
    
    async def get_recent_context(
        self,
        context_type: str = "conversation",
        limit: int = 10,
        include_content: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Pobieranie ostatnich kontekstów
        
        Args:
            context_type: Typ kontekstu
            limit: Limit wyników
            include_content: Czy zawrzeć pełną treść
            
        Returns:
            Lista ostatnich kontekstów
        """
        try:
            async with get_db_connection() as conn:
                results = await conn.fetch("""
                    SELECT 
                        id,
                        context_key,
                        title,
                        content,
                        tags,
                        importance_score,
                        created_at,
                        metadata
                    FROM contexts
                    WHERE context_type = $1 
                        AND (expires_at IS NULL OR expires_at > NOW())
                    ORDER BY created_at DESC
                    LIMIT $2
                """, context_type, limit)
            
            contexts = []
            for row in results:
                context = {
                    "id": str(row["id"]),
                    "context_key": row["context_key"],
                    "title": row["title"],
                    "tags": row["tags"],
                    "importance_score": float(row["importance_score"]),
                    "created_at": row["created_at"].isoformat(),
                    "metadata": row["metadata"]
                }
                
                if include_content:
                    context["content"] = row["content"]
                
                contexts.append(context)
            
            return contexts
            
        except Exception as e:
            logger.error(f"Błąd pobierania ostatnich kontekstów: {e}")
            return []
    
    async def append_message(
        self, 
        conversation_id: str, 
        role: str, 
        content: str,
        model_used: Optional[str] = None,
        cost_usd: float = 0.0,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Dodawanie wiadomości do konwersacji
        
        Args:
            conversation_id: ID konwersacji
            role: Rola (user, assistant, system, tool)
            content: Treść wiadomości
            model_used: Użyty model
            cost_usd: Koszt w USD
            metadata: Dodatkowe metadane
            
        Returns:
            ID wiadomości
        """
        try:
            # Oblicz liczbę tokenów (przybliżenie)
            token_count = len(content.split()) * 1.3
            
            async with get_db_connection() as conn:
                result = await conn.fetchrow("""
                    INSERT INTO messages (
                        conversation_id, role, content, token_count,
                        model_used, cost_usd, metadata
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING id
                """, conversation_id, role, content, int(token_count),
                    model_used, cost_usd, json.dumps(metadata or {}))
            
            message_id = str(result["id"])
            logger.info(f"Wiadomość dodana do konwersacji {conversation_id}: {role}")
            
            return message_id
            
        except Exception as e:
            logger.error(f"Błąd dodawania wiadomości: {e}")
            raise
    
    async def create_conversation(self, title: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        Tworzenie nowej konwersacji
        
        Args:
            title: Tytuł konwersacji
            metadata: Metadane konwersacji
            
        Returns:
            ID konwersacji
        """
        try:
            async with get_db_connection() as conn:
                result = await conn.fetchrow("""
                    INSERT INTO conversations (title, metadata)
                    VALUES ($1, $2)
                    RETURNING id
                """, title, json.dumps(metadata or {}))
            
            conversation_id = str(result["id"])
            logger.info(f"Utworzono konwersację: {conversation_id}")
            
            return conversation_id
            
        except Exception as e:
            logger.error(f"Błąd tworzenia konwersacji: {e}")
            raise
    
    async def get_conversation_history(
        self, 
        conversation_id: str, 
        limit: int = 50,
        include_system: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Pobieranie historii konwersacji
        
        Args:
            conversation_id: ID konwersacji
            limit: Limit wiadomości
            include_system: Czy zawrzeć wiadomości systemowe
            
        Returns:
            Lista wiadomości
        """
        try:
            where_clause = "conversation_id = $1"
            params = [conversation_id]
            
            if not include_system:
                where_clause += " AND role != 'system'"
            
            async with get_db_connection() as conn:
                results = await conn.fetch(f"""
                    SELECT 
                        id, role, content, token_count, model_used,
                        cost_usd, created_at, metadata
                    FROM messages
                    WHERE {where_clause}
                    ORDER BY created_at ASC
                    LIMIT $2
                """, *params, limit)
            
            messages = []
            for row in results:
                messages.append({
                    "id": str(row["id"]),
                    "role": row["role"],
                    "content": row["content"],
                    "token_count": row["token_count"],
                    "model_used": row["model_used"],
                    "cost_usd": float(row["cost_usd"]),
                    "created_at": row["created_at"].isoformat(),
                    "metadata": row["metadata"]
                })
            
            return messages
            
        except Exception as e:
            logger.error(f"Błąd pobierania historii konwersacji: {e}")
            return []
    
    async def get_recent_context_from_conversation(
        self, 
        conversation_id: str, 
        limit: int = 12
    ) -> str:
        """
        Pobieranie ostatniego kontekstu z konwersacji w formacie tekstowym
        
        Args:
            conversation_id: ID konwersacji
            limit: Limit ostatnich wiadomości
            
        Returns:
            Sformatowany kontekst
        """
        try:
            messages = await self.get_conversation_history(conversation_id, limit, include_system=False)
            
            if not messages:
                return ""
            
            # Formatuj jako tekst
            context_parts = []
            for msg in messages:
                role = msg["role"].capitalize()
                content = msg["content"]
                context_parts.append(f"{role}: {content}")
            
            return "\n".join(context_parts)
            
        except Exception as e:
            logger.error(f"Błąd formatowania kontekstu konwersacji: {e}")
            return ""
    
    async def save_pin(self, key: str, value: str, expires_in_days: Optional[int] = None) -> bool:
        """
        Zapisywanie przypiętej wartości
        
        Args:
            key: Klucz przypięcia
            value: Wartość do przechowania
            expires_in_days: Liczba dni do wygaśnięcia
            
        Returns:
            True jeśli sukces
        """
        try:
            # Przygotuj datę wygaśnięcia
            expires_at = None
            if expires_in_days:
                expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
            
            async with get_db_connection() as conn:
                await conn.execute("""
                    INSERT INTO pins (key, value, expires_at)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (key) DO UPDATE SET
                        value = EXCLUDED.value,
                        expires_at = EXCLUDED.expires_at,
                        updated_at = NOW()
                """, key, value, expires_at)
            
            logger.info(f"Przypięcie zapisane: {key}")
            return True
            
        except Exception as e:
            logger.error(f"Błąd zapisywania przypięcia: {e}")
            return False
    
    async def get_pin(self, key: str) -> Optional[str]:
        """
        Pobieranie przypiętej wartości
        
        Args:
            key: Klucz przypięcia
            
        Returns:
            Wartość lub None jeśli nie znaleziono/wygasło
        """
        try:
            async with get_db_connection() as conn:
                result = await conn.fetchrow("""
                    SELECT value, expires_at
                    FROM pins
                    WHERE key = $1 
                        AND (expires_at IS NULL OR expires_at > NOW())
                """, key)
            
            if result:
                return result["value"]
            
            return None
            
        except Exception as e:
            logger.error(f"Błąd pobierania przypięcia: {e}")
            return None
    
    async def cleanup_old_data(self, days_to_keep: int = 90) -> int:
        """
        Czyszczenie starych danych
        
        Args:
            days_to_keep: Liczba dni do zachowania
            
        Returns:
            Liczba usuniętych rekordów
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
            
            async with get_db_connection() as conn:
                # Usuń stare konwersacje
                conversations_deleted = await conn.fetchval("""
                    DELETE FROM conversations
                    WHERE updated_at < $1 AND is_archived = TRUE
                    RETURNING COUNT(*)
                """, cutoff_date)
                
                # Usuń stare wiadomości
                messages_deleted = await conn.fetchval("""
                    DELETE FROM messages
                    WHERE created_at < $1
                    RETURNING COUNT(*)
                """, cutoff_date)
                
                # Usuń stare konteksty
                contexts_deleted = await conn.fetchval("""
                    DELETE FROM contexts
                    WHERE created_at < $1
                    RETURNING COUNT(*)
                """, cutoff_date)
                
                # Usuń wygasłe przypięcia
                pins_deleted = await conn.fetchval("""
                    DELETE FROM pins
                    WHERE expires_at < NOW()
                    RETURNING COUNT(*)
                """)
                
                total_deleted = (conversations_deleted or 0) + (messages_deleted or 0) + \
                              (contexts_deleted or 0) + (pins_deleted or 0)
                
                logger.info(f"Wyczyszczono {total_deleted} starych rekordów")
                return total_deleted
                
        except Exception as e:
            logger.error(f"Błąd czyszczenia starych danych: {e}")
            return 0
    
    async def get_memory_stats(self) -> Dict[str, Any]:
        """
        Pobieranie statystyk pamięci
        
        Returns:
            Statystyki systemu pamięci
        """
        try:
            async with get_db_connection() as conn:
                # Liczba konwersacji
                conversations_count = await conn.fetchval("SELECT COUNT(*) FROM conversations")
                
                # Liczba wiadomości
                messages_count = await conn.fetchval("SELECT COUNT(*) FROM messages")
                
                # Liczba kontekstów
                contexts_count = await conn.fetchval("SELECT COUNT(*) FROM contexts")
                
                # Liczba embeddingów
                embeddings_count = await conn.fetchval("SELECT COUNT(*) FROM embeddings")
                
                # Liczba przypięć
                pins_count = await conn.fetchval("SELECT COUNT(*) FROM pins")
                
                # Całkowity koszt
                total_cost = await conn.fetchval("SELECT COALESCE(SUM(cost_usd), 0) FROM messages")
                
                # Średnia długość konwersacji
                avg_messages_per_conversation = await conn.fetchval("""
                    SELECT AVG(message_count)
                    FROM (
                        SELECT conversation_id, COUNT(*) as message_count
                        FROM messages
                        GROUP BY conversation_id
                    ) as conv_counts
                """)
            
            return {
                "conversations": conversations_count,
                "messages": messages_count,
                "contexts": contexts_count,
                "embeddings": embeddings_count,
                "pins": pins_count,
                "total_cost_usd": float(total_cost) if total_cost else 0.0,
                "avg_messages_per_conversation": float(avg_messages_per_conversation) if avg_messages_per_conversation else 0.0,
                "embedding_cache_size": len(self.embedding_cache),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Błąd pobierania statystyk: {e}")
            return {}

# Globalna instancja
_memory_store: Optional[MemoryStore] = None

async def get_memory_store() -> MemoryStore:
    """Pobieranie globalnej instancji MemoryStore"""
    global _memory_store
    if _memory_store is None:
        _memory_store = MemoryStore()
        await _memory_store.initialize()
    return _memory_store
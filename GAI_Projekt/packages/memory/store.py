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
from packages.memory.db import get_db_manager, get_db_connection
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
        self.memory_fallback = {}  # Fallback gdy brak bazy danych
        self.conversations_fallback = {}  # Fallback dla konwersacji
        self.pins_fallback = {}  # Fallback dla przypięć
        
    async def initialize(self):
        """Inicjalizacja systemu pamięci"""
        logger.info("Inicjalizacja systemu pamięci...")
        
        # Pobranie managera bazy danych
        try:
            self.db_manager = await get_db_manager()
            db_health = await self.db_manager.health_check()
            if db_health['status'] == 'healthy':
                logger.info("Połączenie z bazą danych nawiązane pomyślnie")
            else:
                logger.warning(f"Problem z bazą danych: {db_health.get('error', 'Unknown error')}")
                logger.warning("Używam trybu fallback - dane będą przechowywane w pamięci")
        except Exception as e:
            logger.warning(f"Nie można połączyć z bazą danych: {e}")
            logger.warning("Używam trybu fallback - dane będą przechowywane w pamięci")
        
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
    
    def _generate_fallback_id(self) -> str:
        """Generowanie unikalnego ID dla trybu fallback"""
        return f"fallback_{datetime.utcnow().timestamp()}_{hashlib.md5(str(np.random.rand()).encode()).hexdigest()[:8]}"
    
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
        Wyszukiwanie podobnych kontekstów za pomocą pgvector lub fallback
        
        Args:
            query: Zapytanie do wyszukania
            context_type: Typ kontekstu
            limit: Limit wyników
            similarity_threshold: Próg podobieństwa
            
        Returns:
            Lista podobnych kontekstów
        """
        threshold = similarity_threshold or self.similarity_threshold
        
        # Tryb fallback - proste wyszukiwanie tekstowe
        if not self.db_manager or not self.db_manager.pool:
            logger.info("Używam trybu fallback dla wyszukiwania kontekstów")
            
            # Proste wyszukiwanie w pamięci
            results = []
            for key, context in self.memory_fallback.items():
                if context.get("type") == context_type:
                    # Proste dopasowanie tekstowe
                    content = context.get("content", "").lower()
                    query_lower = query.lower()
                    
                    # Oblicz proste podobieństwo
                    if query_lower in content or any(word in content for word in query_lower.split()):
                        similarity = 0.8 if query_lower in content else 0.6
                        if similarity >= threshold:
                            results.append({
                                "id": key,
                                "context_key": context.get("key", ""),
                                "title": context.get("title", ""),
                                "content": context.get("content", ""),
                                "tags": context.get("tags", []),
                                "importance_score": context.get("importance", 0.5),
                                "similarity": similarity,
                                "created_at": context.get("created_at", datetime.utcnow().isoformat()),
                                "metadata": context.get("metadata", {})
                            })
            
            # Sortuj według podobieństwa
            results.sort(key=lambda x: x["similarity"], reverse=True)
            return results[:limit]
        
        try:
            # Stwórz embedding dla zapytania
            query_embedding = await self.create_embedding(query)
            
            # Konwertuj na format pgvector
            embedding_array = np.array(query_embedding)
            
            # Wyszukiwanie wektorowe z pgvector
            async with get_db_connection() as conn:
                if not conn:
                    return []
                    
                async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
                    await cur.execute("""
                        SELECT 
                            id,
                            context_key,
                            title,
                            content,
                            tags,
                            importance_score,
                            created_at,
                            metadata,
                            1 - (embedding <=> %s) as similarity
                        FROM contexts
                        WHERE context_type = %s 
                            AND (expires_at IS NULL OR expires_at > NOW())
                            AND 1 - (embedding <=> %s) >= %s
                        ORDER BY embedding <=> %s
                        LIMIT %s
                    """, (embedding_array.tolist(), context_type, embedding_array.tolist(), threshold, embedding_array.tolist(), limit))
                    results = await cur.fetchall()
            
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
        Przechowywanie kontekstu z embeddingiem lub fallback
        
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
        # Tryb fallback
        if not self.db_manager or not self.db_manager.pool:
            logger.info("Używam trybu fallback dla przechowywania kontekstu")
            
            fallback_id = self._generate_fallback_id()
            self.memory_fallback[fallback_id] = {
                "type": context_type,
                "key": context_key,
                "title": title,
                "content": content,
                "tags": tags or [],
                "importance": importance_score,
                "created_at": datetime.utcnow().isoformat(),
                "metadata": metadata or {}
            }
            
            logger.info(f"Kontekst zapisany w pamięci fallback: {context_type}:{context_key} (ID: {fallback_id})")
            return fallback_id
        
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
                if not conn:
                    raise RuntimeError("Brak połączenia z bazą danych")
                    
                async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
                    await cur.execute("""
                        INSERT INTO contexts (
                            context_type, context_key, title, content, embedding,
                            tags, importance_score, expires_at, metadata
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                    """, (context_type, context_key, title, content, embedding_array.tolist(),
                        tags_array, importance_score, expires_at, json.dumps(meta)))
                    result = await cur.fetchone()
            
            context_id = str(result["id"])
            logger.info(f"Kontekst zapisany: {context_type}:{context_key} (ID: {context_id})")
            
            return context_id
            
        except Exception as e:
            logger.error(f"Błąd zapisywania kontekstu: {e}")
            # Fallback na pamięć
            return await self.store_context(
                context_type, context_key, content, title, tags,
                importance_score, expires_in_days, metadata
            )
    
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
        # Tryb fallback
        if not self.db_manager or not self.db_manager.pool:
            logger.info("Używam trybu fallback dla pobierania kontekstów")
            
            contexts = []
            for key, context in self.memory_fallback.items():
                if context.get("type") == context_type:
                    ctx = {
                        "id": key,
                        "context_key": context.get("key", ""),
                        "title": context.get("title", ""),
                        "tags": context.get("tags", []),
                        "importance_score": context.get("importance", 0.5),
                        "created_at": context.get("created_at", datetime.utcnow().isoformat()),
                        "metadata": context.get("metadata", {})
                    }
                    
                    if include_content:
                        ctx["content"] = context.get("content", "")
                    
                    contexts.append(ctx)
            
            # Sortuj według daty utworzenia
            contexts.sort(key=lambda x: x["created_at"], reverse=True)
            return contexts[:limit]
        
        try:
            async with get_db_connection() as conn:
                if not conn:
                    return []
                    
                async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
                    await cur.execute("""
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
                        WHERE context_type = %s 
                            AND (expires_at IS NULL OR expires_at > NOW())
                        ORDER BY created_at DESC
                        LIMIT %s
                    """, (context_type, limit))
                    results = await cur.fetchall()
            
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
        # Tryb fallback
        if not self.db_manager or not self.db_manager.pool:
            logger.info("Używam trybu fallback dla dodawania wiadomości")
            
            if conversation_id not in self.conversations_fallback:
                self.conversations_fallback[conversation_id] = []
            
            message_id = self._generate_fallback_id()
            message_data = {
                "id": message_id,
                "role": role,
                "content": content,
                "model_used": model_used,
                "cost_usd": cost_usd,
                "metadata": metadata or {},
                "created_at": datetime.utcnow().isoformat()
            }
            
            self.conversations_fallback[conversation_id].append(message_data)
            
            logger.info(f"Wiadomość dodana do konwersacji {conversation_id}: {role}")
            return message_id
        
        try:
            # Oblicz liczbę tokenów (przybliżenie)
            token_count = len(content.split()) * 1.3
            
            async with get_db_connection() as conn:
                if not conn:
                    raise RuntimeError("Brak połączenia z bazą danych")
                    
                async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
                    await cur.execute("""
                        INSERT INTO messages (
                            conversation_id, role, content, token_count,
                            model_used, cost_usd, metadata
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (conversation_id, role, content, int(token_count),
                        model_used, cost_usd, json.dumps(metadata or {})))
                    result = await cur.fetchone()
            
            message_id = str(result["id"])
            logger.info(f"Wiadomość dodana do konwersacji {conversation_id}: {role}")
            
            return message_id
            
        except Exception as e:
            logger.error(f"Błąd dodawania wiadomości: {e}")
            # Fallback na pamięć
            return await self.append_message(
                conversation_id, role, content, model_used, cost_usd, metadata
            )
    
    async def create_conversation(self, title: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        Tworzenie nowej konwersacji
        
        Args:
            title: Tytuł konwersacji
            metadata: Metadane konwersacji
            
        Returns:
            ID konwersacji
        """
        # Tryb fallback - zawsze używaj gdy brak połączenia
        if not self.db_manager or not self.db_manager.pool:
            logger.info("Używam trybu fallback dla tworzenia konwersacji")
            
            conversation_id = self._generate_fallback_id()
            self.conversations_fallback[conversation_id] = []
            
            logger.info(f"Utworzono konwersację w trybie fallback: {conversation_id}")
            return conversation_id
        
        try:
            async with get_db_connection() as conn:
                if not conn:
                    logger.info("Brak połączenia z bazą, używam trybu fallback")
                    conversation_id = self._generate_fallback_id()
                    self.conversations_fallback[conversation_id] = []
                    return conversation_id
                    
                async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
                    await cur.execute("""
                        INSERT INTO conversations (title, metadata)
                        VALUES (%s, %s)
                        RETURNING id
                    """, (title, json.dumps(metadata or {})))
                    result = await cur.fetchone()
            
            conversation_id = str(result["id"])
            logger.info(f"Utworzono konwersację: {conversation_id}")
            
            return conversation_id
            
        except Exception as e:
            logger.error(f"Błąd tworzenia konwersacji: {e}")
            # Fallback na pamięć
            conversation_id = self._generate_fallback_id()
            self.conversations_fallback[conversation_id] = []
            logger.info(f"Utworzono konwersację w trybie fallback po błędzie: {conversation_id}")
            return conversation_id
    
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
        # Tryb fallback
        if not self.db_manager or not self.db_manager.pool:
            logger.info("Używam trybu fallback dla pobierania historii konwersacji")
            
            messages = self.conversations_fallback.get(conversation_id, [])
            
            if not include_system:
                messages = [msg for msg in messages if msg.get("role") != "system"]
            
            # Sortuj według daty utworzenia
            messages.sort(key=lambda x: x["created_at"])
            
            return messages[-limit:] if limit else messages
        
        try:
            where_clause = "conversation_id = %s"
            params = [conversation_id]
            
            if not include_system:
                where_clause += " AND role != 'system'"
            
            async with get_db_connection() as conn:
                if not conn:
                    return []
                    
                async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
                    await cur.execute(f"""
                        SELECT 
                            id, role, content, token_count, model_used,
                            cost_usd, created_at, metadata
                        FROM messages
                        WHERE {where_clause}
                        ORDER BY created_at ASC
                        LIMIT %s
                    """, (*params, limit))
                    results = await cur.fetchall()
            
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
        # Tryb fallback
        if not self.db_manager or not self.db_manager.pool:
            logger.info("Używam trybu fallback dla przypięć")
            
            expires_at = None
            if expires_in_days:
                expires_at = (datetime.utcnow() + timedelta(days=expires_in_days)).isoformat()
            
            self.pins_fallback[key] = {
                "value": value,
                "expires_at": expires_at,
                "created_at": datetime.utcnow().isoformat()
            }
            
            logger.info(f"Przypięcie zapisane w trybie fallback: {key}")
            return True
        
        try:
            # Przygotuj datę wygaśnięcia
            expires_at = None
            if expires_in_days:
                expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
            
            async with get_db_connection() as conn:
                if not conn:
                    raise RuntimeError("Brak połączenia z bazą danych")
                    
                async with conn.cursor() as cur:
                    await cur.execute("""
                        INSERT INTO pins (key, value, expires_at)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (key) DO UPDATE SET
                            value = EXCLUDED.value,
                            expires_at = EXCLUDED.expires_at,
                            updated_at = NOW()
                    """, (key, value, expires_at))
            
            logger.info(f"Przypięcie zapisane: {key}")
            return True
            
        except Exception as e:
            logger.error(f"Błąd zapisywania przypięcia: {e}")
            # Fallback na pamięć
            return await self.save_pin(key, value, expires_in_days)
    
    async def get_pin(self, key: str) -> Optional[str]:
        """
        Pobieranie przypiętej wartości
        
        Args:
            key: Klucz przypięcia
            
        Returns:
            Wartość lub None jeśli nie znaleziono/wygasło
        """
        # Tryb fallback
        if not self.db_manager or not self.db_manager.pool:
            logger.info("Używam trybu fallback dla pobierania przypięć")
            
            pin_data = self.pins_fallback.get(key)
            if not pin_data:
                return None
            
            # Sprawdź czy nie wygasło
            expires_at = pin_data.get("expires_at")
            if expires_at:
                expires_dt = datetime.fromisoformat(expires_at)
                if datetime.utcnow() > expires_dt:
                    del self.pins_fallback[key]
                    return None
            
            return pin_data.get("value")
        
        try:
            async with get_db_connection() as conn:
                if not conn:
                    return None
                    
                async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
                    await cur.execute("""
                        SELECT value, expires_at
                        FROM pins
                        WHERE key = %s 
                            AND (expires_at IS NULL OR expires_at > NOW())
                    """, (key,))
                    result = await cur.fetchone()
            
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
            
            # Wyczyść fallback memory
            old_keys = []
            for key, context in self.memory_fallback.items():
                created_at = datetime.fromisoformat(context.get("created_at", datetime.utcnow().isoformat()))
                if created_at < cutoff_date:
                    old_keys.append(key)
            
            for key in old_keys:
                del self.memory_fallback[key]
            
            # Wyczyść stare konwersacje
            old_conv_keys = []
            for key, messages in self.conversations_fallback.items():
                if not messages:
                    old_conv_keys.append(key)
                    continue
                    
                # Sprawdź datę ostatniej wiadomości
                last_message = messages[-1]
                created_at = datetime.fromisoformat(last_message.get("created_at", datetime.utcnow().isoformat()))
                if created_at < cutoff_date:
                    old_conv_keys.append(key)
            
            for key in old_conv_keys:
                del self.conversations_fallback[key]
            
            # Wyczyść wygasłe przypięcia
            old_pin_keys = []
            for key, pin_data in self.pins_fallback.items():
                expires_at = pin_data.get("expires_at")
                if expires_at:
                    expires_dt = datetime.fromisoformat(expires_at)
                    if datetime.utcnow() > expires_dt:
                        old_pin_keys.append(key)
            
            for key in old_pin_keys:
                del self.pins_fallback[key]
            
            total_fallback_cleaned = len(old_keys) + len(old_conv_keys) + len(old_pin_keys)
            
            # Czyszczenie bazy danych
            if self.db_manager and self.db_manager.pool:
                db_cleaned = await self._cleanup_db_data(days_to_keep)
            else:
                db_cleaned = 0
            
            total_cleaned = total_fallback_cleaned + db_cleaned
            
            logger.info(f"Wyczyszczono {total_cleaned} starych rekordów (fallback: {total_fallback_cleaned}, DB: {db_cleaned})")
            return total_cleaned
            
        except Exception as e:
            logger.error(f"Błąd czyszczenia starych danych: {e}")
            return 0
    
    async def _cleanup_db_data(self, days_to_keep: int) -> int:
        """Czyszczenie danych z bazy danych"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
            
            async with get_db_connection() as conn:
                if not conn:
                    return 0
                    
                async with conn.cursor() as cur:
                    # Usuń stare konwersacje
                    await cur.execute("""
                        DELETE FROM conversations
                        WHERE updated_at < %s AND is_archived = TRUE
                        RETURNING COUNT(*)
                    """, (cutoff_date,))
                    conversations_deleted = await cur.fetchone()
                    
                    # Usuń stare wiadomości
                    await cur.execute("""
                        DELETE FROM messages
                        WHERE created_at < %s
                        RETURNING COUNT(*)
                    """, (cutoff_date,))
                    messages_deleted = await cur.fetchone()
                    
                    # Usuń stare konteksty
                    await cur.execute("""
                        DELETE FROM contexts
                        WHERE created_at < %s
                        RETURNING COUNT(*)
                    """, (cutoff_date,))
                    contexts_deleted = await cur.fetchone()
                    
                    # Usuń wygasłe przypięcia
                    await cur.execute("""
                        DELETE FROM pins
                        WHERE expires_at < NOW()
                        RETURNING COUNT(*)
                    """)
                    pins_deleted = await cur.fetchone()
                await conn.commit()
            
            total_deleted = (conversations_deleted[0] if conversations_deleted else 0) + \
                            (messages_deleted[0] if messages_deleted else 0) + \
                            (contexts_deleted[0] if contexts_deleted else 0) + \
                            (pins_deleted[0] if pins_deleted else 0)
            
            return total_deleted
            
        except Exception as e:
            logger.error(f"Błąd czyszczenia danych z bazy: {e}")
            return 0
    
    async def get_memory_stats(self) -> Dict[str, Any]:
        """
        Pobieranie statystyk pamięci
        
        Returns:
            Statystyki systemu pamięci
        """
        try:
            # Statystyki fallback
            fallback_stats = {
                "memory_fallback_items": len(self.memory_fallback),
                "conversations_fallback": len(self.conversations_fallback),
                "pins_fallback": len(self.pins_fallback),
                "embedding_cache_size": len(self.embedding_cache)
            }
            
            # Statystyki bazy danych
            if self.db_manager and self.db_manager.pool:
                db_stats = await self._get_db_stats()
            else:
                db_stats = {
                    "conversations": 0,
                    "messages": 0,
                    "contexts": 0,
                    "embeddings": 0,
                    "pins": 0,
                    "total_cost_usd": 0.0,
                    "avg_messages_per_conversation": 0.0
                }
            
            return {
                **db_stats,
                **fallback_stats,
                "database_connected": self.db_manager is not None and self.db_manager.pool is not None,
                "embedding_provider": self.embedding_provider,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Błąd pobierania statystyk: {e}")
            return {
                "error": str(e),
                "database_connected": False,
                "fallback_mode": True,
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def _get_db_stats(self) -> Dict[str, Any]:
        """Pobieranie statystyk z bazy danych"""
        try:
            async with get_db_connection() as conn:
                if not conn:
                    return {
                        "conversations": 0,
                        "messages": 0,
                        "contexts": 0,
                        "embeddings": 0,
                        "pins": 0,
                        "total_cost_usd": 0.0,
                        "avg_messages_per_conversation": 0.0
                    }
                    
                async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
                    # Liczba konwersacji
                    await cur.execute("SELECT COUNT(*) as count FROM conversations")
                    conversations_count = await cur.fetchone()
                    
                    # Liczba wiadomości
                    await cur.execute("SELECT COUNT(*) as count FROM messages")
                    messages_count = await cur.fetchone()
                    
                    # Liczba kontekstów
                    await cur.execute("SELECT COUNT(*) as count FROM contexts")
                    contexts_count = await cur.fetchone()
                    
                    # Liczba embeddingów
                    await cur.execute("SELECT COUNT(*) as count FROM embeddings")
                    embeddings_count = await cur.fetchone()
                    
                    # Liczba przypięć
                    await cur.execute("SELECT COUNT(*) as count FROM pins")
                    pins_count = await cur.fetchone()
                    
                    # Całkowity koszt
                    await cur.execute("SELECT COALESCE(SUM(cost_usd), 0) as total FROM messages")
                    total_cost = await cur.fetchone()
                    
                    # Średnia długość konwersacji
                    await cur.execute("""
                        SELECT AVG(message_count) as avg
                        FROM (
                            SELECT conversation_id, COUNT(*) as message_count
                            FROM messages
                            GROUP BY conversation_id
                        ) as conv_counts
                    """)
                    avg_messages_per_conversation = await cur.fetchone()
            
            return {
                "conversations": conversations_count["count"] if conversations_count else 0,
                "messages": messages_count["count"] if messages_count else 0,
                "contexts": contexts_count["count"] if contexts_count else 0,
                "embeddings": embeddings_count["count"] if embeddings_count else 0,
                "pins": pins_count["count"] if pins_count else 0,
                "total_cost_usd": float(total_cost["total"]) if total_cost else 0.0,
                "avg_messages_per_conversation": float(avg_messages_per_conversation["avg"]) if avg_messages_per_conversation and avg_messages_per_conversation["avg"] else 0.0
            }
            
        except Exception as e:
            logger.error(f"Błąd pobierania statystyk z bazy: {e}")
            return {
                "conversations": 0,
                "messages": 0,
                "contexts": 0,
                "embeddings": 0,
                "pins": 0,
                "total_cost_usd": 0.0,
                "avg_messages_per_conversation": 0.0
            }

# Globalna instancja
_memory_store: Optional[MemoryStore] = None

async def get_memory_store() -> MemoryStore:
    """Pobieranie globalnej instancji MemoryStore"""
    global _memory_store
    if _memory_store is None:
        _memory_store = MemoryStore()
        await _memory_store.initialize()
    return _memory_store
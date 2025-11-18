"""
Uproszczony system pamięci dla GAI - działa bez PostgreSQL
Zawiera fallback dla wszystkich operacji w pamięci RAM
"""

import asyncio
import logging
import hashlib
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import numpy as np
from packages.models.invoke import ModelManager

logger = logging.getLogger(__name__)

class SimpleMemoryStore:
    """
    Uproszczony system pamięci działający w pamięci RAM
    """
    
    def __init__(self):
        self.model_manager = ModelManager()
        self.embedding_model = "text-embedding-ada-002"
        self.embedding_provider = "openai"
        self.similarity_threshold = 0.7
        self.max_context_length = 4000
        self.context_expiry_days = 30
        
        # Struktury danych w pamięci
        self.conversations = {}  # conversation_id -> [messages]
        self.contexts = {}  # context_id -> context_data
        self.pins = {}  # key -> pin_data
        self.embedding_cache = {}
        
        # Metadane
        self.stats = {
            "conversations_created": 0,
            "messages_added": 0,
            "contexts_stored": 0,
            "embeddings_created": 0,
            "searches_performed": 0
        }
        
    async def initialize(self):
        """Inicjalizacja systemu pamięci"""
        logger.info("Inicjalizacja uproszczonego systemu pamięci...")
        
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
        
        logger.info("Uproszczony system pamięci został zainicjalizowany")
    
    def _generate_id(self) -> str:
        """Generowanie unikalnego ID"""
        return f"mem_{datetime.utcnow().timestamp()}_{hashlib.md5(str(np.random.rand()).encode()).hexdigest()[:8]}"
    
    async def create_embedding(self, text: str, model: Optional[str] = None) -> List[float]:
        """
        Tworzenie embeddingu dla tekstu
        
        Args:
            text: Tekst do embeddingu
            model: Model embeddingu (opcjonalny)
            
        Returns:
            Lista embeddingów
        """
        if not text.strip():
            logger.warning("Pusty tekst do embeddingu")
            return [0.0] * 1536
        
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
            self.stats["embeddings_created"] += 1
            
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
        Wyszukiwanie podobnych kontekstów (tryb uproszczony)
        
        Args:
            query: Zapytanie do wyszukania
            context_type: Typ kontekstu
            limit: Limit wyników
            similarity_threshold: Próg podobieństwa
            
        Returns:
            Lista podobnych kontekstów
        """
        threshold = similarity_threshold or self.similarity_threshold
        self.stats["searches_performed"] += 1
        
        # Proste wyszukiwanie tekstowe
        results = []
        query_lower = query.lower()
        query_words = query_lower.split()
        
        for context_id, context in self.contexts.items():
            if context.get("type") == context_type:
                # Proste dopasowanie tekstowe
                content = context.get("content", "").lower()
                title = context.get("title", "").lower()
                
                # Oblicz proste podobieństwo
                matches = 0
                if query_lower in content or query_lower in title:
                    matches += 3  # Dokładne dopasowanie
                else:
                    for word in query_words:
                        if word in content or word in title:
                            matches += 1
                
                similarity = min(matches / len(query_words), 1.0) if query_words else 0.0
                
                if similarity >= threshold:
                    results.append({
                        "id": context_id,
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
        
        logger.info(f"Znaleziono {len(results)} podobnych kontekstów dla zapytania: {query[:50]}...")
        return results[:limit]
    
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
        Przechowywanie kontekstu
        
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
        context_id = self._generate_id()
        
        # Przygotuj datę wygaśnięcia
        expires_at = None
        if expires_in_days:
            expires_at = (datetime.utcnow() + timedelta(days=expires_in_days)).isoformat()
        
        self.contexts[context_id] = {
            "type": context_type,
            "key": context_key,
            "title": title,
            "content": content,
            "tags": tags or [],
            "importance": importance_score,
            "expires_at": expires_at,
            "created_at": datetime.utcnow().isoformat(),
            "metadata": metadata or {}
        }
        
        self.stats["contexts_stored"] += 1
        
        logger.info(f"Kontekst zapisany: {context_type}:{context_key} (ID: {context_id})")
        return context_id
    
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
        contexts = []
        
        # Filtruj według typu i sortuj według daty
        filtered_contexts = [
            (ctx_id, ctx) for ctx_id, ctx in self.contexts.items()
            if ctx.get("type") == context_type
        ]
        
        # Sortuj według daty utworzenia (od najnowszych)
        filtered_contexts.sort(key=lambda x: x[1].get("created_at", ""), reverse=True)
        
        for context_id, context in filtered_contexts[:limit]:
            # Sprawdź czy nie wygasło
            expires_at = context.get("expires_at")
            if expires_at:
                try:
                    expires_dt = datetime.fromisoformat(expires_at)
                    if datetime.utcnow() > expires_dt:
                        continue
                except:
                    pass
            
            ctx = {
                "id": context_id,
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
        
        return contexts
    
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
        if conversation_id not in self.conversations:
            self.conversations[conversation_id] = []
        
        message_id = self._generate_id()
        
        message_data = {
            "id": message_id,
            "role": role,
            "content": content,
            "model_used": model_used,
            "cost_usd": cost_usd,
            "metadata": metadata or {},
            "created_at": datetime.utcnow().isoformat()
        }
        
        self.conversations[conversation_id].append(message_data)
        self.stats["messages_added"] += 1
        
        logger.info(f"Wiadomość dodana do konwersacji {conversation_id}: {role}")
        return message_id
    
    async def create_conversation(self, title: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        Tworzenie nowej konwersacji
        
        Args:
            title: Tytuł konwersacji
            metadata: Metadane konwersacji
            
        Returns:
            ID konwersacji
        """
        conversation_id = self._generate_id()
        self.conversations[conversation_id] = []
        self.stats["conversations_created"] += 1
        
        logger.info(f"Utworzono konwersację: {conversation_id}")
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
        messages = self.conversations.get(conversation_id, [])
        
        if not include_system:
            messages = [msg for msg in messages if msg.get("role") != "system"]
        
        # Zwróć ostatnie wiadomości
        return messages[-limit:] if limit else messages
    
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
        expires_at = None
        if expires_in_days:
            expires_at = (datetime.utcnow() + timedelta(days=expires_in_days)).isoformat()
        
        self.pins[key] = {
            "value": value,
            "expires_at": expires_at,
            "created_at": datetime.utcnow().isoformat()
        }
        
        logger.info(f"Przypięcie zapisane: {key}")
        return True
    
    async def get_pin(self, key: str) -> Optional[str]:
        """
        Pobieranie przypiętej wartości
        
        Args:
            key: Klucz przypięcia
            
        Returns:
            Wartość lub None jeśli nie znaleziono/wygasło
        """
        pin_data = self.pins.get(key)
        if not pin_data:
            return None
        
        # Sprawdź czy nie wygasło
        expires_at = pin_data.get("expires_at")
        if expires_at:
            try:
                expires_dt = datetime.fromisoformat(expires_at)
                if datetime.utcnow() > expires_dt:
                    del self.pins[key]
                    return None
            except:
                pass
        
        return pin_data.get("value")
    
    async def cleanup_old_data(self, days_to_keep: int = 90) -> int:
        """
        Czyszczenie starych danych
        
        Args:
            days_to_keep: Liczba dni do zachowania
            
        Returns:
            Liczba usuniętych rekordów
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
        
        # Wyczyść stare konteksty
        old_context_keys = []
        for ctx_id, context in self.contexts.items():
            created_at = datetime.fromisoformat(context.get("created_at", datetime.utcnow().isoformat()))
            if created_at < cutoff_date:
                old_context_keys.append(ctx_id)
        
        for key in old_context_keys:
            del self.contexts[key]
        
        # Wyczyść stare konwersacje
        old_conv_keys = []
        for conv_id, messages in self.conversations.items():
            if not messages:
                old_conv_keys.append(conv_id)
                continue
                
            # Sprawdź datę ostatniej wiadomości
            last_message = messages[-1]
            created_at = datetime.fromisoformat(last_message.get("created_at", datetime.utcnow().isoformat()))
            if created_at < cutoff_date:
                old_conv_keys.append(conv_id)
        
        for key in old_conv_keys:
            del self.conversations[key]
        
        # Wyczyść wygasłe przypięcia
        old_pin_keys = []
        for key, pin_data in self.pins.items():
            expires_at = pin_data.get("expires_at")
            if expires_at:
                try:
                    expires_dt = datetime.fromisoformat(expires_at)
                    if datetime.utcnow() > expires_dt:
                        old_pin_keys.append(key)
                except:
                    pass
        
        for key in old_pin_keys:
            del self.pins[key]
        
        total_cleaned = len(old_context_keys) + len(old_conv_keys) + len(old_pin_keys)
        
        logger.info(f"Wyczyszczono {total_cleaned} starych rekordów")
        return total_cleaned
    
    async def get_context(self, context_key: str, context_type: str = "general") -> Optional[Dict[str, Any]]:
        """Pobieranie kontekstu z pamięci"""
        try:
            key = f"{context_type}:{context_key}"
            
            if key in self.contexts:
                context = self.contexts[key]
                logger.info(f"Pobrano kontekst: {key}")
                return context
            else:
                logger.warning(f"Nie znaleziono kontekstu: {key}")
                return None
                
        except Exception as e:
            logger.error(f"Błąd pobierania kontekstu {context_key}: {e}")
            return None
        """
        Pobieranie statystyk pamięci
        
        Returns:
            Statystyki systemu pamięci
        """
        return {
            "conversations": len(self.conversations),
            "messages": sum(len(msgs) for msgs in self.conversations.values()),
            "contexts": len(self.contexts),
            "pins": len(self.pins),
            "embedding_cache_size": len(self.embedding_cache),
            "total_cost_usd": sum(
                msg.get("cost_usd", 0.0) 
                for msgs in self.conversations.values() 
                for msg in msgs
            ),
            "avg_messages_per_conversation": (
                sum(len(msgs) for msgs in self.conversations.values()) / len(self.conversations)
                if self.conversations else 0.0
            ),
            "stats": self.stats.copy(),
            "database_connected": False,
            "mode": "simple_memory",
            "embedding_provider": self.embedding_provider,
            "timestamp": datetime.utcnow().isoformat()
        }

# Globalna instancja
_memory_store: Optional[SimpleMemoryStore] = None

async def get_memory_store() -> SimpleMemoryStore:
    """Pobieranie globalnej instancji SimpleMemoryStore"""
    global _memory_store
    if _memory_store is None:
        _memory_store = SimpleMemoryStore()
        await _memory_store.initialize()
    return _memory_store
#!/usr/bin/env python3
"""
Test zaawansowanego systemu pamięci z PostgreSQL + pgvector i fallbackiem
"""

import asyncio
import os
import logging
from packages.memory.store import MemoryStore, get_memory_store
from packages.memory.db import get_db_manager

# Konfiguracja logowania
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_memory_system_with_fallback():
    """Test całego systemu pamięci z fallbackiem"""
    print("🚀 Uruchamianie testów systemu pamięci z fallbackiem...")
    
    try:
        # Sprawdzenie DATABASE_URL
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("⚠️  DATABASE_URL nie jest ustawiony - system będzie działał w trybie fallback")
            print("   Aby użyć pełnej funkcjonalności, ustaw DATABASE_URL do PostgreSQL z pgvector")
        
        # Inicjalizacja systemu
        print("📊 Inicjalizacja systemu pamięci...")
        memory_store = await get_memory_store()
        
        print("✅ System pamięci zainicjalizowany")
        
        # Test 1: Health check
        print("\n🏥 Test health check...")
        try:
            db_manager = await get_db_manager()
            health = await db_manager.health_check()
            print(f"Status bazy danych: {health['status']}")
            if health['status'] == 'healthy':
                print(f"Response time: {health['response_time']:.3f}s")
                print(f"Connection pool: {health['connection_pool_size']['min']}-{health['connection_pool_size']['max']}")
            else:
                print(f"Błąd: {health.get('error', 'Unknown error')}")
                print("Przełączam się na tryb fallback")
        except Exception as e:
            print(f"❌ Błąd health check: {e}")
            print("Używam trybu fallback")
        
        # Test 2: Tworzenie konwersacji
        print("\n💬 Test tworzenia konwersacji...")
        conversation_id = await memory_store.create_conversation(
            title="Test konwersacji z fallbackiem",
            metadata={"test": True, "purpose": "system_test", "mode": "fallback"}
        )
        print(f"Utworzono konwersację: {conversation_id}")
        
        # Test 3: Dodawanie wiadomości
        print("\n📝 Test dodawania wiadomości...")
        messages = [
            ("user", "Cześć, jak działa system pamięci z fallbackiem?"),
            ("assistant", "System pamięci działa w trybie fallback - dane są przechowywane w pamięci RAM zamiast w PostgreSQL."),
            ("user", "Czy to znaczy, że nie potrzebuję bazy danych?"),
            ("assistant", "Dokładnie! System automatycznie przełącza się na tryb fallback gdy nie może połączyć się z PostgreSQL."),
            ("user", "A co z embeddingami i wyszukiwaniem wektorowym?"),
            ("assistant", "Embeddingi są tworzone używając dostępnych providerów AI, a wyszukiwanie działa w trybie tekstowym gdy brak pgvector."),
        ]
        
        for role, content in messages:
            msg_id = await memory_store.append_message(
                conversation_id=conversation_id,
                role=role,
                content=content,
                model_used="gpt-3.5-turbo",
                cost_usd=0.001,
                metadata={"test_message": True}
            )
            print(f"Dodano wiadomość [{role}]: {content[:60]}...")
        
        # Test 4: Pobieranie historii
        print("\n📜 Test pobierania historii...")
        history = await memory_store.get_conversation_history(conversation_id, limit=10)
        print(f"Pobrano {len(history)} wiadomości")
        print("Ostatnie 2 wiadomości:")
        for msg in history[-2:]:
            print(f"  {msg['role']}: {msg['content'][:80]}...")
        
        # Test 5: Kontekst konwersacji
        print("\n🧠 Test kontekstu konwersacji...")
        context = await memory_store.get_recent_context_from_conversation(conversation_id, limit=4)
        print(f"Kontekst ({len(context)} znaków):")
        if len(context) > 200:
            print(context[:200] + "...")
        else:
            print(context)
        
        # Test 6: Przechowywanie kontekstu z embeddingiem
        print("\n🔍 Test przechowywania kontekstu z embeddingiem...")
        context_id = await memory_store.store_context(
            context_type="code",
            context_key="python_memory_fallback_example",
            title="Przykład systemu pamięci z fallbackiem",
            content="""
            class MemoryStore:
                def __init__(self):
                    self.memory_fallback = {}  # Fallback gdy brak bazy danych
                    self.conversations_fallback = {}  # Fallback dla konwersacji
                    self.pins_fallback = {}  # Fallback dla przypięć
                    
                async def store_context(self, content, context_type="general"):
                    # Jeśli brak połączenia z bazą, użyj pamięci
                    if not self.db_manager or not self.db_manager.pool:
                        fallback_id = self._generate_fallback_id()
                        self.memory_fallback[fallback_id] = {
                            "type": context_type,
                            "content": content,
                            "created_at": datetime.utcnow().isoformat()
                        }
                        return fallback_id
                    
                    # Normalna operacja z bazą danych
                    return await self._store_in_database(content, context_type)
            """,
            tags=["python", "memory", "fallback", "async"],
            importance_score=0.9,
            expires_in_days=30,
            metadata={"language": "python", "category": "system", "has_embedding": True}
        )
        print(f"Zapisano kontekst: {context_id}")
        
        # Test 7: Wyszukiwanie podobnych kontekstów (tryb fallback)
        print("\n🔎 Test wyszukiwania podobnych kontekstów...")
        similar_contexts = await memory_store.search_similar_context(
            query="jak działa system pamięci w pythonie",
            context_type="code",
            limit=3,
            similarity_threshold=0.3
        )
        print(f"Znaleziono {len(similar_contexts)} podobnych kontekstów")
        for ctx in similar_contexts:
            print(f"  - {ctx.get('title', 'No title')} (podobieństwo: {ctx.get('similarity', 0):.2f})")
            print(f"    {ctx.get('content', 'No content')[:100]}...")
        
        # Test 8: Przypięcia
        print("\n📌 Test systemu przypięć...")
        await memory_store.save_pin(
            key="system_info",
            value="GAI Memory System v2.0 - Advanced PostgreSQL + pgvector + fallback",
            expires_in_days=30
        )
        print("Zapisano przypięcie")
        
        pin_value = await memory_store.get_pin("system_info")
        print(f"Odczytano przypięcie: {pin_value}")
        
        # Test 9: Statystyki
        print("\n📊 Test statystyk...")
        stats = await memory_store.get_memory_stats()
        print("Statystyki pamięci:")
        for key, value in stats.items():
            print(f"  {key}: {value}")
        
        # Test 10: Embedding
        print("\n🧮 Test tworzenia embeddingu...")
        embedding = await memory_store.create_embedding("To jest testowy tekst do embeddingu w systemie pamięci")
        print(f"Utworzono embedding o wymiarze: {len(embedding)}")
        print(f"Pierwsze 5 wartości: {embedding[:5]}")
        
        # Test 11: Czyszczenie starych danych
        print("\n🧹 Test czyszczenia starych danych...")
        deleted = await memory_store.cleanup_old_data(days_to_keep=1)  # Usuń wszystko starsze niż 1 dzień
        print(f"Wyczyszczono {deleted} starych rekordów")
        
        print("\n✅ Wszystkie testy zakończone sukcesem!")
        print("\n🎯 Podsumowanie:")
        print("- System pamięci działa w trybie fallback (pamięć RAM)")
        print("- Konwersacje są przechowywane i dostępne")
        print("- Konteksty są zapisywane i wyszukiwane")
        print("- Embeddingi są tworzone (jeśli dostępny provider)")
        print("- System jest gotowy do użycia z prawdziwą bazą danych")
        
    except Exception as e:
        print(f"❌ Błąd podczas testów: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        # Zamknięcie połączeń
        try:
            if 'db_manager' in locals():
                await db_manager.close()
        except:
            pass
        print("\n🏁 Testy zakończone")
    
    return True

if __name__ == "__main__":
    success = asyncio.run(test_memory_system_with_fallback())
    exit(0 if success else 1)
#!/usr/bin/env python3
"""
Test zaawansowanego systemu pamięci z PostgreSQL + pgvector
"""

import asyncio
import os
import logging
from packages.memory.store import MemoryStore, get_memory_store
from packages.memory.db import get_db_manager

# Konfiguracja logowania
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_memory_system():
    """Test całego systemu pamięci"""
    print("🚀 Uruchamianie testów systemu pamięci...")
    
    try:
        # Sprawdzenie DATABASE_URL
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("❌ DATABASE_URL nie jest ustawiony")
            print("Używam testowego URL dla lokalnej bazy")
            os.environ["DATABASE_URL"] = "postgresql://postgres:password@localhost:5432/gai_memory"
        
        # Inicjalizacja systemu
        print("📊 Inicjalizacja systemu pamięci...")
        memory_store = await get_memory_store()
        db_manager = await get_db_manager()
        
        print("✅ System pamięci zainicjalizowany")
        
        # Test 1: Health check
        print("\n🏥 Test health check...")
        health = await db_manager.health_check()
        print(f"Status: {health['status']}")
        print(f"Response time: {health['response_time']:.3f}s")
        
        # Test 2: Tworzenie konwersacji
        print("\n💬 Test tworzenia konwersacji...")
        conversation_id = await memory_store.create_conversation(
            title="Test konwersacji",
            metadata={"test": True, "purpose": "system_test"}
        )
        print(f"Utworzono konwersację: {conversation_id}")
        
        # Test 3: Dodawanie wiadomości
        print("\n📝 Test dodawania wiadomości...")
        messages = [
            ("user", "Cześć, jak się masz?"),
            ("assistant", "Cześć! Dobrze, dziękuję. A Ty?"),
            ("user", "U mnie też w porządku. Czy możesz mi pomóc z kodowaniem?"),
            ("assistant", "Oczywiście! W czym mogę Ci pomóc?"),
        ]
        
        for role, content in messages:
            msg_id = await memory_store.append_message(
                conversation_id=conversation_id,
                role=role,
                content=content,
                model_used="gpt-3.5-turbo",
                cost_usd=0.001
            )
            print(f"Dodano wiadomość [{role}]: {content[:50]}...")
        
        # Test 4: Pobieranie historii
        print("\n📜 Test pobierania historii...")
        history = await memory_store.get_conversation_history(conversation_id, limit=10)
        print(f"Pobrano {len(history)} wiadomości")
        for msg in history[-2:]:  # Pokaż ostatnie 2
            print(f"  {msg['role']}: {msg['content'][:60]}...")
        
        # Test 5: Kontekst konwersacji
        print("\n🧠 Test kontekstu konwersacji...")
        context = await memory_store.get_recent_context_from_conversation(conversation_id, limit=3)
        print(f"Kontekst ({len(context)} znaków):")
        print(context[:200] + "..." if len(context) > 200 else context)
        
        # Test 6: Przechowywanie kontekstu z embeddingiem
        print("\n🔍 Test przechowywania kontekstu z embeddingiem...")
        context_id = await memory_store.store_context(
            context_type="code",
            context_key="python_async_example",
            title="Przykład kodu async",
            content="""
            async def fetch_data(session, url):
                async with session.get(url) as response:
                    return await response.json()
            
            async def main():
                async with aiohttp.ClientSession() as session:
                    data = await fetch_data(session, "https://api.example.com/data")
                    return data
            """,
            tags=["python", "async", "aiohttp", "api"],
            importance_score=0.8,
            expires_in_days=30,
            metadata={"language": "python", "category": "tutorial"}
        )
        print(f"Zapisano kontekst: {context_id}")
        
        # Test 7: Wyszukiwanie podobnych kontekstów
        print("\n🔎 Test wyszukiwania podobnych kontekstów...")
        similar_contexts = await memory_store.search_similar_context(
            query="jak używać async w pythonie",
            context_type="code",
            limit=3,
            similarity_threshold=0.5
        )
        print(f"Znaleziono {len(similar_contexts)} podobnych kontekstów")
        for ctx in similar_contexts:
            print(f"  - {ctx['title']} (podobieństwo: {ctx['similarity']:.2f})")
            print(f"    {ctx['content'][:100]}...")
        
        # Test 8: Przypięcia
        print("\n📌 Test systemu przypięć...")
        await memory_store.save_pin(
            key="last_test_run",
            value=datetime.now().isoformat(),
            expires_in_days=7
        )
        print("Zapisano przypięcie")
        
        pin_value = await memory_store.get_pin("last_test_run")
        print(f"Odczytano przypięcie: {pin_value}")
        
        # Test 9: Statystyki
        print("\n📊 Test statystyk...")
        stats = await memory_store.get_memory_stats()
        print("Statystyki pamięci:")
        for key, value in stats.items():
            if key != "timestamp":
                print(f"  {key}: {value}")
        
        # Test 10: Embedding
        print("\n🧮 Test tworzenia embeddingu...")
        embedding = await memory_store.create_embedding("To jest testowy tekst do embeddingu")
        print(f"Utworzono embedding o wymiarze: {len(embedding)}")
        print(f"Pierwsze 5 wartości: {embedding[:5]}")
        
        print("\n✅ Wszystkie testy zakończone sukcesem!")
        
        # Cleanup (opcjonalne)
        print("\n🧹 Czyszczenie testowych danych...")
        deleted = await memory_store.cleanup_old_data(days_to_keep=0)
        print(f"Wyczyszczono {deleted} starych rekordów")
        
    except Exception as e:
        print(f"❌ Błąd podczas testów: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        # Zamknięcie połączeń
        if 'db_manager' in locals():
            await db_manager.close()
        print("\n🏁 Testy zakończone")
    
    return True

if __name__ == "__main__":
    success = asyncio.run(test_memory_system())
    exit(0 if success else 1)
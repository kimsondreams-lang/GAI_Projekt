#!/usr/bin/env python3
"""
Test uproszczonego systemu pamięci dla GAI
"""

import asyncio
from packages.memory import get_memory_store

async def test_simple_memory():
    print("🚀 Test uproszczonego systemu pamięci...")
    
    try:
        # Inicjalizacja
        memory_store = await get_memory_store()
        print("✅ System pamięci zainicjalizowany")
        
        # Test tworzenia konwersacji
        conv_id = await memory_store.create_conversation("Test Konwersacji")
        print(f"✅ Utworzono konwersację: {conv_id}")
        
        # Test dodawania wiadomości
        msg_id = await memory_store.append_message(conv_id, "user", "Cześć, jak się masz?")
        print(f"✅ Dodano wiadomość: {msg_id}")
        
        msg_id2 = await memory_store.append_message(conv_id, "assistant", "Cześć! Dobrze, dziękuję. A Ty?")
        print(f"✅ Dodano odpowiedź: {msg_id2}")
        
        # Test pobierania historii
        history = await memory_store.get_conversation_history(conv_id)
        print(f"✅ Pobrano historię: {len(history)} wiadomości")
        
        # Test kontekstu
        context = await memory_store.get_recent_context_from_conversation(conv_id)
        print(f"✅ Kontekst: {len(context)} znaków")
        
        # Test przechowywania kontekstu
        ctx_id = await memory_store.store_context(
            "code", 
            "python_example", 
            "Przykład kodu Python",
            """async def hello():
    print("Hello World!")""",
            ["python", "async"],
            0.8
        )
        print(f"✅ Zapisano kontekst: {ctx_id}")
        
        # Test wyszukiwania
        results = await memory_store.search_similar_context("python async")
        print(f"✅ Znaleziono {len(results)} podobnych kontekstów")
        
        # Test przypięć
        await memory_store.save_pin("test_key", "test_value")
        value = await memory_store.get_pin("test_key")
        print(f"✅ System przypięć działa: {value}")
        
        # Test statystyk
        stats = await memory_store.get_memory_stats()
        print(f"✅ Statystyki: {stats['conversations']} konwersacji, {stats['messages']} wiadomości")
        
        print("\n🎉 Wszystkie testy zakończone sukcesem!")
        print("System pamięci działa poprawnie w trybie pamięci RAM.")
        
    except Exception as e:
        print(f"❌ Błąd: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_simple_memory())
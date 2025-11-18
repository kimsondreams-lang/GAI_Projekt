#!/usr/bin/env python3
"""
Demonstracja pełnego systemu pamięci GAI z PostgreSQL + pgvector
"""

import asyncio
import os
from datetime import datetime
from packages.memory import get_memory_store

async def demonstrate_memory_system():
    """Pełna demonstracja systemu pamięci"""
    print("🚀 GAI Memory System - Pełna demonstracja")
    print("=" * 60)
    
    try:
        # Inicjalizacja systemu pamięci
        print("\n📊 Inicjalizacja systemu pamięci...")
        memory_store = await get_memory_store()
        print("✅ System pamięci gotowy!")
        
        # 1. Tworzenie konwersacji
        print("\n💬 1. Tworzenie konwersacji")
        conversation_id = await memory_store.create_conversation(
            title="Rozmowa o AI i systemach pamięci",
            metadata={"topic": "AI", "language": "pl", "demo": True}
        )
        print(f"   Utworzono konwersację: {conversation_id[:20]}...")
        
        # 2. Dodawanie wiadomości
        print("\n📝 2. Dodawanie wiadomości do konwersacji")
        messages = [
            ("user", "Cześć! Czy możesz mi wyjaśnić jak działają systemy pamięci w AI?"),
            ("assistant", "Cześć! Oczywiście! Systemy pamięci w AI to mechanizmy które pozwalają modelom zapamiętywać i wykorzystywać wcześniejsze informacje."),
            ("user", "To brzmi interesująco! Jakie są główne typy systemów pamięci?"),
            ("assistant", "Są trzy główne typy: 1) Krótkotrwała pamięć - przechowuje bieżącą konwersację, 2) Długotrwała pamięć - zapisuje ważne informacje na dłużej, 3) Wektorowa pamięć - przechowuje embeddingi do wyszukiwania podobieństw."),
            ("user", "A jak działa wektorowa pamięć? Czy to coś jak pgvector?"),
            ("assistant", "Dokładnie! pgvector to rozszerzenie PostgreSQL które pozwala przechowywać i wyszukiwać wektory embeddingów. Umożliwia to semantyczne wyszukiwanie podobnych treści."),
        ]
        
        for role, content in messages:
            msg_id = await memory_store.append_message(
                conversation_id=conversation_id,
                role=role,
                content=content,
                model_used="gpt-3.5-turbo",
                cost_usd=0.002,
                metadata={"demo_message": True, "length": len(content)}
            )
            print(f"   Dodano [{role}]: {content[:60]}...")
        
        # 3. Pobieranie historii konwersacji
        print("\n📜 3. Pobieranie historii konwersacji")
        history = await memory_store.get_conversation_history(conversation_id, limit=10)
        print(f"   Pobrano {len(history)} wiadomości")
        print("   Ostatnia wiadomość:")
        if history:
            last_msg = history[-1]
            print(f"   {last_msg['role']}: {last_msg['content'][:80]}...")
        
        # 4. Kontekst konwersacji
        print("\n🧠 4. Generowanie kontekstu z konwersacji")
        context = await memory_store.get_recent_context_from_conversation(conversation_id, limit=4)
        print(f"   Wygenerowano kontekst ({len(context)} znaków)")
        print("   Fragment kontekstu:")
        if len(context) > 100:
            print(f"   {context[:100]}...")
        else:
            print(f"   {context}")
        
        # 5. Przechowywanie kontekstów technicznych
        print("\n💾 5. Przechowywanie kontekstów technicznych")
        code_contexts = [
            {
                "type": "code",
                "key": "memory_store_example",
                "title": "Przykład MemoryStore w Pythonie",
                "content": """
class MemoryStore:
    def __init__(self):
        self.conversations = {}
        self.contexts = {}
        self.embedding_cache = {}
    
    async def store_context(self, content, context_type="general"):
        context_id = self._generate_id()
        self.contexts[context_id] = {
            "content": content,
            "type": context_type,
            "created_at": datetime.utcnow()
        }
        return context_id
                """,
                "tags": ["python", "memory", "class"],
                "importance": 0.8
            },
            {
                "type": "documentation",
                "key": "pgvector_guide",
                "title": "Przewodnik po pgvector",
                "content": """
pgvector to rozszerzenie PostgreSQL które dodaje wsparcie dla wektorów.

Instalacja:
CREATE EXTENSION vector;

Użycie:
CREATE TABLE items (id SERIAL PRIMARY KEY, embedding vector(1536));
INSERT INTO items (embedding) VALUES ('[1,2,3,...]'::vector);

Wyszukiwanie:
SELECT * FROM items ORDER BY embedding <=> '[1,2,3,...]' LIMIT 5;
                """,
                "tags": ["postgresql", "pgvector", "embedding"],
                "importance": 0.9
            }
        ]
        
        stored_contexts = []
        for ctx in code_contexts:
            ctx_id = await memory_store.store_context(
                context_type=ctx["type"],
                context_key=ctx["key"],
                title=ctx["title"],
                content=ctx["content"],
                tags=ctx["tags"],
                importance_score=ctx["importance"],
                expires_in_days=30
            )
            stored_contexts.append(ctx_id)
            print(f"   Zapisano kontekst: {ctx['title']}")
        
        # 6. Wyszukiwanie podobnych kontekstów
        print("\n🔍 6. Wyszukiwanie podobnych kontekstów")
        search_queries = [
            "jak działa system pamięci w Pythonie",
            "pgvector embedding wyszukiwanie",
            "memory store implementation"
        ]
        
        for query in search_queries:
            results = await memory_store.search_similar_context(
                query=query,
                context_type="code",
                limit=3,
                similarity_threshold=0.3
            )
            print(f"   Zapytanie: '{query[:40]}...'")
            print(f"   Znaleziono {len(results)} wyników:")
            for i, result in enumerate(results, 1):
                print(f"     {i}. {result.get('title', 'No title')} (podobieństwo: {result.get('similarity', 0):.2f})")
        
        # 7. System przypięć
        print("\n📌 7. System przypięć (pins)")
        pins = [
            ("last_demo_run", datetime.now().isoformat(), 7),
            ("system_version", "GAI Memory System v2.0", 30),
            ("embedding_model", "text-embedding-ada-002", None)  # Bez wygaśnięcia
        ]
        
        for key, value, expires_days in pins:
            await memory_store.save_pin(key, value, expires_in_days=expires_days)
            expiry_info = f" (wygasa za {expires_days} dni)" if expires_days else " (bez wygaśnięcia)"
            print(f"   Zapisano: {key} = {value}{expiry_info}")
        
        # Odczyt przypięć
        print("   Odczyt przypięć:")
        for key, _, _ in pins[:2]:  # Odczytaj pierwsze 2
            value = await memory_store.get_pin(key)
            print(f"   {key}: {value}")
        
        # 8. Statystyki systemu
        print("\n📊 8. Statystyki systemu pamięci")
        stats = await memory_store.get_memory_stats()
        print("   Podsumowanie:")
        for key, value in stats.items():
            if isinstance(value, (int, float, str)) and not key.startswith("_"):
                print(f"   {key}: {value}")
        
        # 9. Test embeddingów
        print("\n🧮 9. Test systemu embeddingów")
        test_texts = [
            "System pamięci AI z pgvector i wektorowym wyszukiwaniem",
            "Python asyncio i programowanie asynchroniczne",
            "PostgreSQL z rozszerzeniem pgvector dla embeddingów"
        ]
        
        for text in test_texts:
            embedding = await memory_store.create_embedding(text)
            print(f"   Embedding dla: '{text[:40]}...'")
            print(f"   Wymiar: {len(embedding)}, pierwsze 5 wartości: {embedding[:5]}")
        
        # 10. Czyszczenie starych danych
        print("\n🧹 10. Czyszczenie starych danych")
        # Najpierw dodaj stare dane do wyczyszczenia
        old_context_id = await memory_store.store_context(
            context_type="test",
            context_key="old_test_data",
            title="Stare dane testowe",
            content="To jest stara wiadomość testowa do wyczyszczenia",
            tags=["test", "old"],
            importance_score=0.1,
            expires_in_days=-1  # Przeterminowane
        )
        print(f"   Dodano przeterminowane dane: {old_context_id[:20]}...")
        
        # Wyczyść stare dane
        deleted_count = await memory_store.cleanup_old_data(days_to_keep=0)
        print(f"   Wyczyszczono {deleted_count} starych rekordów")
        
        print("\n" + "=" * 60)
        print("✅ Demonstracja zakończona sukcesem!")
        print("🎯 System pamięci GAI jest gotowy do użycia!")
        print("\nKluczowe funkcje:")
        print("  • Konwersacje z pełną historią")
        print("  • Konteksty z tagami i ważnością")
        print("  • Wyszukiwanie podobieństwa (tryb tekstowy)")
        print("  • System przypięć z wygaśnięciem")
        print("  • Embeddingi (gdy dostępny provider)")
        print("  • Statystyki i czyszczenie danych")
        print("  • Tryb fallback - działa bez PostgreSQL!")
        
    except Exception as e:
        print(f"❌ Błąd podczas demonstracji: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = asyncio.run(demonstrate_memory_system())
    exit(0 if success else 1)
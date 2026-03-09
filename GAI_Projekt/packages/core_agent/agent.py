from packages.memory import get_memory_store
from packages.models.invoke import ModelManager
import asyncio

SYSTEM_PROMPT = (
    "You are GAI, a proactive, business-oriented assistant. "
    "Maintain context, propose tasks, and act autonomously."
)

async def respond_with_memory(user_message: str) -> str:
    """Odpowiedz na wiadomość użytkownika z kontekstem pamięci"""
    try:
        memory_store = await get_memory_store()
        
        # Pobierz kontekst
        recent_contexts = await memory_store.search_contexts(
            query=user_message,
            limit=5
        )
        
        ctx = "\n".join([ctx.get("content", "") for ctx in recent_contexts])
        
        # Przygotuj prompt
        prompt = f"{SYSTEM_PROMPT}\nContext:\n{ctx}\nUser: {user_message}\nAssistant:"
        
        # Wygeneruj odpowiedź
        model_manager = ModelManager()
        response = await model_manager.model_infer(
            task_label="chat_general",
            prompt=prompt,
            temperature=0.7,
            max_tokens=500
        )
        
        reply = response.get("content", "Przepraszam, wystąpił błąd.")
        
        return reply
        
    except Exception as e:
        return f"Przepraszam, wystąpił błąd: {str(e)}"

def respond_with_memory_sync(user_message: str) -> str:
    """Synchroniczna wersja dla kompatybilności wstecznej"""
    return asyncio.run(respond_with_memory(user_message))

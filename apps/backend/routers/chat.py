from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from packages.core_agent.agent import respond_with_memory_sync

router = APIRouter()

class ChatMessage(BaseModel):
    message: str

@router.post("/send")
def send(msg: ChatMessage):
    """Wyślij wiadomość do agenta AI"""
    try:
        reply = respond_with_memory_sync(msg.message)
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd podczas przetwarzania wiadomości: {str(e)}")

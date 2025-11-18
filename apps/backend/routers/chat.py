from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from packages.core_agent.agent import respond_with_memory

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

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            reply = await respond_with_memory(data)
            await websocket.send_text(reply)
    except WebSocketDisconnect:
        print("Client disconnected")


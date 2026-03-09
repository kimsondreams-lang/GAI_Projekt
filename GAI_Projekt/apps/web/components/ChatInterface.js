import { useState, useEffect, useRef } from "react";
import { Send, Bot, User, Loader2, Zap, Clock } from "lucide-react";

export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [agentStatus, setAgentStatus] = useState("stopped");
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  // WebSocket connection
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    try {
      // Użyj poprawnego adresu WebSocket (ENV lub domyślny)
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `ws://${window.location.host}/api/ws/chat`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        console.log("WebSocket połączony");
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === "typing_indicator") {
          setIsTyping(data.is_typing);
        } else if (data.type === "message") {
          setMessages(prev => [...prev, {
            id: Date.now(),
            role: data.role,
            content: data.content,
            timestamp: new Date(data.timestamp)
          }]);
          setIsTyping(false);
        } else if (data.type === "agent_status") {
          setAgentStatus(data.status);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log("WebSocket rozłączony");
        // Próbuj ponownie po 5 sekundach
        setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket błąd:", error);
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Błąd łączenia WebSocket:", error);
      setIsConnected(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Dodaj wiadomość użytkownika
    const userMessage = {
      id: Date.now(),
      role: "user",
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    try {
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          // Wyślij przez WebSocket
          wsRef.current.send(JSON.stringify({
            type: "message",
            content: inputMessage
          }));
        } else if (wsRef.current.emit) {
          // Użyj Socket.io
          wsRef.current.emit("message", {
            type: "message",
            content: inputMessage
          });
        } else {
          throw new Error("Brak aktywnego połączenia");
        }
      } else {
        // Fallback na HTTP API
        const response = await fetch("/api/chat/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: inputMessage })
        });
        
        if (response.ok) {
          const data = await response.json();
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            role: "assistant",
            content: data.reply,
            timestamp: new Date()
          }]);
        } else {
          throw new Error("Błąd odpowiedzi API");
        }
      }
    } catch (error) {
      console.error("Błąd wysyłania wiadomości:", error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: "system",
        content: "Przepraszam, wystąpił błąd podczas przetwarzania wiadomości.",
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Przewiń do najnowszej wiadomości
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[600px] bg-white/80 backdrop-blur-sm rounded-xl border shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Bot className="h-8 w-8 text-blue-600 drop-shadow-lg" />
            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
              isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
            }`}></div>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">GAI Agent Chat</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>{isConnected ? "Connected" : "Disconnected"}</span>
              <span>•</span>
              <span className="capitalize font-medium">{agentStatus}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <Zap className="h-5 w-5 text-green-500 animate-pulse" />
          ) : (
            <Clock className="h-5 w-5 text-red-500" />
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Rozpocznij rozmowę z GAI Agent</p>
            <p className="text-sm mt-2">Zapytaj o status, zadania lub poproś o pomoc.</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex space-x-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role !== "user" && (
              <div className="flex-shrink-0">
                {message.role === "assistant" ? (
                  <Bot className="h-8 w-8 text-blue-600" />
                ) : (
                  <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">SYS</span>
                  </div>
                )}
              </div>
            )}
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              message.role === "user"
                ? "bg-blue-600 text-white"
                : message.role === "assistant"
                ? "bg-gray-100 text-gray-900"
                : "bg-red-100 text-red-900"
            }`}>
              <p className="text-sm">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.role === "user" ? "text-blue-100" : "text-gray-500"
              }`}>
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex space-x-3">
            <div className="flex-shrink-0">
              <Bot className="h-8 w-8 text-blue-600" />
            </div>
            <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">GAI Agent pisze...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex space-x-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Napisz wiadomość... (Enter aby wysłać, Shift+Enter dla nowej linii)"
            className="flex-1 resize-none border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            disabled={!isConnected}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isTyping || !isConnected}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

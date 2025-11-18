'use client';
import { useState, useEffect, useRef } from "react";
import { Send, Bot, User, Loader2, Zap, Clock, Wifi, WifiOff } from "lucide-react";

const MessageBubble = ({ message, formatTime }) => {
    const isUser = message.role === "user";
    const isSystem = message.role === "system";

    const bubbleStyles = isUser
        ? "bg-blue-500 text-white neo-pressed-blue"
        : isSystem
        ? "bg-red-500/20 text-red-400 neo-surface"
        : "neo-surface text-neo-fg";

    const Icon = isUser ? User : Bot;

    return (
        <div className={`flex items-start gap-3 ${isUser ? "justify-end" : ""}`}>
            {!isUser && (
                <div className="w-8 h-8 rounded-full neo-surface flex-shrink-0 flex items-center justify-center">
                    <Icon className={`w-5 h-5 ${isSystem ? 'text-red-400' : 'text-blue-500'}`} />
                </div>
            )}
            <div className={`max-w-md w-fit rounded-lg px-4 py-2.5 ${bubbleStyles}`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <div className={`text-xs mt-1.5 ${isUser ? 'text-blue-200' : 'text-neo-muted'}`}>
                    {formatTime(message.timestamp)}
                </div>
            </div>
            {isUser && (
                <div className="w-8 h-8 rounded-full neo-surface flex-shrink-0 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-neo-fg" />
                </div>
            )}
        </div>
    );
};

export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [agentStatus, setAgentStatus] = useState("stopped");
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

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
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `ws://${window.location.host}/api/ws/chat`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        console.log("WebSocket connected");
        addSystemMessage("Connection established with the agent.", "success");
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
        console.log("WebSocket disconnected");
        addSystemMessage("Connection lost. Attempting to reconnect...", "error");
        setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
        addSystemMessage("WebSocket connection error.", "error");
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Error connecting to WebSocket:", error);
      setIsConnected(false);
      addSystemMessage("Failed to initialize WebSocket connection.", "error");
    }
  };

  const addSystemMessage = (content, level = "info") => {
      setMessages(prev => [...prev, {
          id: Date.now(),
          role: "system",
          content,
          timestamp: new Date(),
          level
      }]);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

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
        wsRef.current.send(JSON.stringify({
            type: "message",
            content: inputMessage
        }));
    } catch (error) {
      console.error("Error sending message:", error);
      addSystemMessage("Failed to send message. Please check your connection.", "error");
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[70vh] neo-card bg-neo-bg-dark overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-neo-surface flex-shrink-0">
        <div className="flex items-center gap-3">
            <div className="relative">
                <Bot className="w-8 h-8 text-blue-500" />
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-neo-bg-dark ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
            </div>
            <div>
                <h3 className="font-bold text-neo-fg text-lg">GAI Agent</h3>
                <p className="text-sm text-neo-muted capitalize">
                    {agentStatus}
                </p>
            </div>
        </div>
        <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full neo-surface ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span>{isConnected ? "Connected" : "Disconnected"}</span>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-neo-muted py-16 flex flex-col items-center">
            <Bot className="h-16 w-16 mx-auto mb-4 text-neo-muted" />
            <h2 className="text-xl font-semibold text-neo-fg">Start a Conversation</h2>
            <p className="mt-2">Ask about task status, give commands, or get help.</p>
          </div>
        )}

        {messages.map((message) => (
            <MessageBubble key={message.id} message={message} formatTime={formatTime} />
        ))}

        {isTyping && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full neo-surface flex-shrink-0 flex items-center justify-center">
                <Bot className="w-5 h-5 text-blue-500" />
            </div>
            <div className="neo-surface text-neo-fg px-4 py-2.5 rounded-lg flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-sm">Agent is typing...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <footer className="p-4 border-t border-neo-surface flex-shrink-0">
        <div className="relative">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Send a message to the agent..." : "Waiting for connection..."}
            className="neo-input w-full resize-none text-sm pr-12"
            rows={2}
            disabled={!isConnected || isTyping}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isTyping || !isConnected}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 neo-btn neo-btn-primary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send Message"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}

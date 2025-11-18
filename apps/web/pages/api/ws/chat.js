import { Server } from "socket.io";

export default function handler(req, res) {
  if (res.socket.server.io) {
    console.log("Socket.io już uruchomiony");
    res.end();
    return;
  }

  console.log("Uruchamianie Socket.io...");
  const io = new Server(res.socket.server, {
    path: "/api/ws/chat",
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  res.socket.server.io = io;

  io.on("connection", (socket) => {
    console.log("Nowe połączenie WebSocket:", socket.id);

    socket.on("message", async (data) => {
      try {
        // Prześlij wiadomość do backend API
        const response = await fetch(`${process.env.BACKEND_URL || "http://localhost:8000"}/api/chat/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: data.content })
        });

        if (response.ok) {
          const result = await response.json();
          
          // Wyślij odpowiedź z powrotem do klienta
          socket.emit("message", {
            type: "message",
            role: "assistant",
            content: result.reply,
            timestamp: new Date().toISOString()
          });
        } else {
          socket.emit("error", { message: "Błąd przetwarzania wiadomości" });
        }
      } catch (error) {
        console.error("Błąd WebSocket:", error);
        socket.emit("error", { message: "Wystąpił błąd serwera" });
      }
    });

    socket.on("typing_start", () => {
      socket.broadcast.emit("typing_indicator", { is_typing: true });
    });

    socket.on("typing_stop", () => {
      socket.broadcast.emit("typing_indicator", { is_typing: false });
    });

    socket.on("disconnect", () => {
      console.log("Rozłączono WebSocket:", socket.id);
    });
  });

  res.end();
}
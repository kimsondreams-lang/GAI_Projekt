export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Wyślij żądanie start do backend API
    const response = await fetch(`${process.env.BACKEND_URL || "http://localhost:8000"}/api/agent/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error("Failed to start agent");
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Błąd uruchamiania agenta:", error);
    res.status(500).json({ 
      error: "Failed to start agent",
      message: error.message 
    });
  }
}
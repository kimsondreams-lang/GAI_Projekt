export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      // Pobierz ustawienia z backend API lub zwróć domyślne
      const response = await fetch(`${process.env.BACKEND_URL || "http://localhost:8000"}/api/settings`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch settings");
      }

      const data = await response.json();
      res.status(200).json(data);
    } catch (error) {
      console.error("Błąd pobierania ustawień:", error);
      
      // Zwróć domyślne ustawienia
      res.status(200).json({
        settings: {
          openai_api_key: process.env.OPENAI_API_KEY || "",
          anthropic_api_key: process.env.ANTHROPIC_API_KEY || "",
          deepseek_api_key: process.env.DEEPSEEK_API_KEY || "",
          amazon_api_key: process.env.AMAZON_API_KEY || "",
          analytics_tracking: true,
          auto_refresh_interval: 5000,
          max_tasks_per_cycle: 10,
          budget_limit: 10.0,
          debug_mode: false
        }
      });
    }
  } else if (req.method === "POST") {
    try {
      const { settings } = req.body;
      
      // Zapisz ustawienia w backend API
      const response = await fetch(`${process.env.BACKEND_URL || "http://localhost:8000"}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings })
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      res.status(200).json({ message: "Settings saved successfully" });
    } catch (error) {
      console.error("Błąd zapisywania ustawień:", error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
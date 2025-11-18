export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Pobierz zadania z backend API
    const response = await fetch(`${process.env.BACKEND_URL || "http://localhost:8000"}/api/tasks`);
    
    if (!response.ok) {
      throw new Error("Failed to fetch tasks");
    }

    const data = await response.json();
    
    res.status(200).json({
      tasks: data.tasks || [],
      total: data.total || 0,
      status: "success"
    });
  } catch (error) {
    console.error("Błąd pobierania zadań:", error);
    
    // Zwróć przykładowe dane w przypadku błędu
    res.status(200).json({
      tasks: [
        {
          id: "task_1",
          title: "Generate content about AI trends",
          description: "Create comprehensive article about latest AI developments",
          type: "content_generation",
          status: "completed",
          priority: "high",
          created_at: new Date(Date.now() - 3600000).toISOString(),
          cost_usd: 0.0234,
          execution_time_seconds: 45
        },
        {
          id: "task_2", 
          title: "SEO optimization for tech articles",
          description: "Analyze and optimize content for search engines",
          type: "seo_optimization",
          status: "running",
          priority: "medium",
          created_at: new Date(Date.now() - 1800000).toISOString(),
          cost_usd: 0.0156,
          execution_time_seconds: 30
        }
      ],
      total: 2,
      status: "demo_data",
      error: error.message
    });
  }
}
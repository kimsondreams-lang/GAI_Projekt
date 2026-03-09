export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Pobierz status systemu z backend API
    const response = await fetch(`${process.env.BACKEND_URL || "http://localhost:8000"}/api/analytics/summary`);
    
    if (!response.ok) {
      throw new Error("Failed to fetch system status");
    }

    const data = await response.json();
    
    res.status(200).json({
      agent_status: data.agent_status?.status || "stopped",
      total_tasks: data.agent_status?.total_tasks || 0,
      active_tasks: data.agent_status?.active_tasks || 0,
      completed_tasks: data.agent_status?.completed_tasks || 0,
      total_cost: data.total_cost || 0,
      uptime: data.agent_status?.uptime || "0h 0m",
      system_health: data.system_health || "unknown"
    });
  } catch (error) {
    console.error("Błąd pobierania statusu systemu:", error);
    
    // Zwróć domyślne wartości w przypadku błędu
    res.status(200).json({
      agent_status: "stopped",
      total_tasks: 0,
      active_tasks: 0,
      completed_tasks: 0,
      total_cost: 0,
      uptime: "0h 0m",
      system_health: "error",
      error: error.message
    });
  }
}
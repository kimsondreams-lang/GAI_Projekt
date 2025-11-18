export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Pobierz publikacje z backend API
    const response = await fetch(`${process.env.BACKEND_URL || "http://localhost:8000"}/api/publications`);
    
    if (!response.ok) {
      throw new Error("Failed to fetch publications");
    }

    const data = await response.json();
    
    res.status(200).json({
      publications: data.publications || [],
      total: data.total || 0,
      status: "success"
    });
  } catch (error) {
    console.error("Błąd pobierania publikacji:", error);
    
    // Zwróć przykładowe dane w przypadku błędu
    res.status(200).json({
      publications: [
        {
          id: "pub_1",
          title: "Best Laptops for Remote Work 2024",
          content: "Comprehensive guide to the best laptops for remote work, including performance benchmarks, battery life tests, and value analysis...",
          slug: "best-laptops-remote-work-2024",
          status: "published",
          tags: ["laptops", "remote-work", "tech"],
          created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: "pub_2",
          title: "AI Content Generation Tools Comparison",
          content: "Detailed comparison of AI content generation tools including GPT-4, Claude, and other popular platforms...",
          slug: "ai-content-tools-comparison",
          status: "draft",
          tags: ["ai", "content", "tools"],
          created_at: new Date(Date.now() - 172800000).toISOString()
        }
      ],
      total: 2,
      status: "demo_data",
      error: error.message
    });
  }
}
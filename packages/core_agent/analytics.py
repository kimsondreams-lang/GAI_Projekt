from packages.core_agent import get_agent
import asyncio

def summary_metrics():
    """Podsumowanie metryk systemu"""
    return {"revenue": 0, "cost": 0, "ctr": 0.0, "top_articles": []}

def get_kpis():
    """Pobierz KPI systemu"""
    return {"needs_new_article": True}

async def get_agent_analytics():
    """Pobierz analitykę z agenta"""
    try:
        agent = await get_agent()
        if agent:
            return await agent.get_status()
        return {"error": "Agent not initialized"}
    except Exception as e:
        return {"error": str(e)}

def get_agent_analytics_sync():
    """Synchroniczna wersja dla kompatybilności"""
    return asyncio.run(get_agent_analytics())

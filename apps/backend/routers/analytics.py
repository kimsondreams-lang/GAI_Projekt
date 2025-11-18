from fastapi import APIRouter, HTTPException
from packages.core_agent import get_agent
from packages.tools import get_analytics_tracker, track_page_view, track_conversion, get_analytics_dashboard, generate_performance_report

router = APIRouter()

@router.get("/summary")
async def summary():
    """Pobierz podsumowanie analityczne systemu z nowymi narzędziami"""
    try:
        agent = await get_agent()
        analytics = get_analytics_tracker()
        
        # Dashboard analityczny
        dashboard_data = await get_analytics_dashboard(time_range="7d")
        
        if agent:
            agent_status = await agent.get_status()
            return {
                "agent_status": agent_status,
                "system_health": "healthy",
                "analytics_dashboard": dashboard_data.get("dashboard", {}),
                "active_tasks": agent_status.get("active_tasks", 0),
                "completed_tasks": agent_status.get("completed_tasks", 0),
                "total_cost": agent_status.get("total_cost", 0.0),
                "analytics_features": [
                    "page_view_tracking",
                    "conversion_tracking", 
                    "content_performance",
                    "traffic_sources",
                    "geographic_data"
                ]
            }
        
        return {
            "agent_status": {"error": "Agent not initialized"},
            "system_health": "unknown",
            "analytics_dashboard": dashboard_data.get("dashboard", {}),
            "active_tasks": 0,
            "completed_tasks": 0,
            "total_cost": 0.0,
            "analytics_features": ["basic_tracking_enabled"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd analityki: {str(e)}")

@router.get("/agent/history")
async def agent_history():
    """Pobierz historię działań agenta"""
    try:
        agent = await get_agent()
        analytics = get_analytics_tracker()
        
        # Dashboard analityczny
        dashboard_data = await get_analytics_dashboard(time_range="30d")
        
        if agent and agent.wake_cycle_history:
            return {
                "wake_cycles": len(agent.wake_cycle_history),
                "last_cycle": agent.wake_cycle_history[-1].cycle_id if agent.wake_cycle_history else None,
                "total_tasks": sum(cycle.tasks_executed for cycle in agent.wake_cycle_history),
                "total_cost": sum(cycle.total_cost for cycle in agent.wake_cycle_history),
                "success_rate": len([c for c in agent.wake_cycle_history if c.status == "success"]) / len(agent.wake_cycle_history) if agent.wake_cycle_history else 0,
                "analytics_integration": {
                    "dashboard_available": True,
                    "total_page_views": dashboard_data.get("dashboard", {}).get("overview", {}).get("total_page_views", 0),
                    "total_revenue": dashboard_data.get("dashboard", {}).get("overview", {}).get("total_revenue", 0),
                    "active_tracking": True
                }
            }
        
        return {
            "wake_cycles": 0,
            "last_cycle": None,
            "total_tasks": 0,
            "total_cost": 0.0,
            "success_rate": 0.0,
            "analytics_integration": {
                "dashboard_available": bool(dashboard_data.get("dashboard")),
                "total_page_views": dashboard_data.get("dashboard", {}).get("overview", {}).get("total_page_views", 0),
                "total_revenue": dashboard_data.get("dashboard", {}).get("overview", {}).get("total_revenue", 0),
                "active_tracking": True
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd historii: {str(e)}")

@router.post("/track/pageview")
async def track_pageview(request: dict):
    """Śledź odsłonę strony"""
    try:
        page_url = request.get("page_url", "")
        user_id = request.get("user_id", "anonymous")
        session_id = request.get("session_id", "")
        referrer = request.get("referrer", "")
        
        if not page_url:
            raise HTTPException(status_code=400, detail="page_url jest wymagany")
        
        result = await track_page_view(
            page_url=page_url,
            user_id=user_id,
            session_id=session_id,
            referrer=referrer
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd śledzenia odsłony: {str(e)}")

@router.post("/track/conversion")
async def track_conversion_endpoint(request: dict):
    """Śledź konwersję"""
    try:
        event_type = request.get("event_type", "")
        user_id = request.get("user_id", "anonymous")
        page_url = request.get("page_url", "")
        value = request.get("value", 0.0)
        currency = request.get("currency", "USD")
        
        if not event_type or not page_url:
            raise HTTPException(status_code=400, detail="event_type i page_url są wymagane")
        
        result = await track_conversion(
            event_type=event_type,
            user_id=user_id,
            page_url=page_url,
            value=value,
            currency=currency
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd śledzenia konwersji: {str(e)}")

@router.get("/performance/report")
async def performance_report(content_id: str = None, report_type: str = "comprehensive"):
    """Wygeneruj raport wydajności"""
    try:
        report_data = await generate_performance_report(
            content_id=content_id,
            report_type=report_type
        )
        
        return report_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd generowania raportu: {str(e)}")

@router.get("/dashboard/{time_range}")
async def analytics_dashboard_range(time_range: str = "7d", content_filter: str = None):
    """Pobierz dashboard dla konkretnego zakresu czasu"""
    try:
        dashboard_data = await get_analytics_dashboard(
            time_range=time_range,
            content_filter=content_filter
        )
        
        return dashboard_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd pobierania dashboardu: {str(e)}")

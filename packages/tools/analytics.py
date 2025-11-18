"""
Zaawansowany system analityki dla GAI Agent
Zawiera śledzenie wydajności, metryki konwersji, analizę ruchu i raportowanie
"""

import asyncio
import aiohttp
import json
import logging
import os
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import statistics
import hashlib
from urllib.parse import urlparse, parse_qs

logger = logging.getLogger(__name__)

@dataclass
class PageMetrics:
    """Metryki strony"""
    page_url: str
    page_views: int = 0
    unique_visitors: int = 0
    avg_time_on_page: float = 0.0
    bounce_rate: float = 0.0
    exit_rate: float = 0.0
    scroll_depth: float = 0.0
    click_through_rate: float = 0.0
    conversion_rate: float = 0.0
    revenue: float = 0.0
    keywords: List[str] = field(default_factory=list)
    traffic_sources: Dict[str, int] = field(default_factory=dict)
    device_types: Dict[str, int] = field(default_factory=dict)
    countries: Dict[str, int] = field(default_factory=dict)

@dataclass
class ContentPerformance:
    """Wydajność treści"""
    content_id: str
    content_type: str
    publish_date: datetime
    total_views: int = 0
    avg_engagement_time: float = 0.0
    social_shares: int = 0
    backlinks: int = 0
    seo_rankings: Dict[str, int] = field(default_factory=dict)
    affiliate_clicks: int = 0
    affiliate_conversions: int = 0
    revenue_generated: float = 0.0
    performance_score: float = 0.0

@dataclass
class UserJourney:
    """Ścieżka użytkownika"""
    user_id: str
    sessions: List[Dict[str, Any]] = field(default_factory=list)
    total_sessions: int = 0
    total_page_views: int = 0
    avg_session_duration: float = 0.0
    conversion_events: List[Dict[str, Any]] = field(default_factory=list)
    last_activity: datetime = None
    device_fingerprint: str = ""
    geolocation: Dict[str, str] = field(default_factory=dict)

@dataclass
class ConversionEvent:
    """Zdarzenie konwersji"""
    event_id: str
    event_type: str  # purchase, signup, download, affiliate_click
    user_id: str
    page_url: str
    timestamp: datetime
    value: float = 0.0
    currency: str = "USD"
    metadata: Dict[str, Any] = field(default_factory=dict)
    attribution_source: str = ""
    attribution_campaign: str = ""
    attribution_medium: str = ""

class AnalyticsTracker:
    """Zaawansowany system śledzenia analityki"""
    
    def __init__(self):
        self.google_analytics_id = os.environ.get("GOOGLE_ANALYTICS_ID", "")
        self.google_analytics_key = os.environ.get("GOOGLE_ANALYTICS_KEY", "")
        self.mixpanel_token = os.environ.get("MIXPANEL_TOKEN", "")
        self.hotjar_id = os.environ.get("HOTJAR_ID", "")
        
        # Magazyn danych
        self.page_metrics: Dict[str, PageMetrics] = {}
        self.content_performance: Dict[str, ContentPerformance] = {}
        self.user_journeys: Dict[str, UserJourney] = {}
        self.conversion_events: List[ConversionEvent] = []
        
        # Cache dla wydajności
        self.cache = {}
        self.cache_timeout = timedelta(minutes=15)
        
        # Konfiguracja
        self.tracking_enabled = os.environ.get("ANALYTICS_TRACKING_ENABLED", "true").lower() == "true"
        self.privacy_compliant = os.environ.get("PRIVACY_COMPLIANT", "true").lower() == "true"
        
        logger.info("AnalyticsTracker zainicjalizowany")
    
    async def track_page_view(self, 
                            page_url: str, 
                            user_id: str = None,
                            session_id: str = None,
                            referrer: str = None,
                            user_agent: str = None,
                            ip_address: str = None,
                            custom_dimensions: Dict[str, Any] = None) -> Dict[str, Any]:
        """Śledź odsłonę strony"""
        try:
            if not self.tracking_enabled:
                return {"status": "tracking_disabled"}
            
            # Hashuj dane osobowe dla prywatności
            if self.privacy_compliant and user_id:
                user_id = hashlib.sha256(user_id.encode()).hexdigest()[:16]
            
            # Zaktualizuj metryki strony
            if page_url not in self.page_metrics:
                self.page_metrics[page_url] = PageMetrics(page_url=page_url)
            
            metrics = self.page_metrics[page_url]
            metrics.page_views += 1
            
            if user_id and user_id not in metrics.traffic_sources:
                metrics.unique_visitors += 1
            
            # Zaktualizuj źródła ruchu
            source = self._identify_traffic_source(referrer, custom_dimensions)
            metrics.traffic_sources[source] = metrics.traffic_sources.get(source, 0) + 1
            
            # Zaktualizuj typ urządzenia
            device_type = self._identify_device_type(user_agent)
            metrics.device_types[device_type] = metrics.device_types.get(device_type, 0) + 1
            
            # Zaktualizuj geolokalizację
            country = self._identify_country(ip_address, custom_dimensions)
            metrics.countries[country] = metrics.countries.get(country, 0) + 1
            
            # Zaktualizuj ścieżkę użytkownika
            await self._update_user_journey(user_id, page_url, session_id, custom_dimensions)
            
            # Wyślij do zewnętrznych serwisów
            await self._send_to_google_analytics(page_url, user_id, session_id, custom_dimensions)
            await self._send_to_mixpanel("page_view", {
                "page_url": page_url,
                "user_id": user_id,
                "session_id": session_id,
                "referrer": referrer,
                "device_type": device_type,
                "country": country
            })
            
            logger.info(f"Odsłona strony śledzona: {page_url}")
            
            return {
                "status": "success",
                "page_url": page_url,
                "user_id": user_id,
                "session_id": session_id,
                "tracking_id": hashlib.md5(f"{page_url}_{user_id}_{datetime.utcnow().isoformat()}".encode()).hexdigest()
            }
            
        except Exception as e:
            logger.error(f"Błąd śledzenia odsłony strony: {e}")
            return {"status": "error", "error": str(e)}
    
    async def track_content_performance(self, 
                                      content_id: str,
                                      content_type: str,
                                      metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Śledź wydajność treści"""
        try:
            if content_id not in self.content_performance:
                self.content_performance[content_id] = ContentPerformance(
                    content_id=content_id,
                    content_type=content_type,
                    publish_date=datetime.utcnow()
                )
            
            performance = self.content_performance[content_id]
            
            # Zaktualizuj metryki
            if "views" in metrics:
                performance.total_views += metrics["views"]
            if "engagement_time" in metrics:
                performance.avg_engagement_time = metrics["engagement_time"]
            if "social_shares" in metrics:
                performance.social_shares += metrics["social_shares"]
            if "backlinks" in metrics:
                performance.backlinks += metrics["backlinks"]
            if "affiliate_clicks" in metrics:
                performance.affiliate_clicks += metrics["affiliate_clicks"]
            if "conversions" in metrics:
                performance.affiliate_conversions += metrics["conversions"]
            if "revenue" in metrics:
                performance.revenue_generated += metrics["revenue"]
            
            # Oblicz wynik wydajności
            performance.performance_score = self._calculate_performance_score(performance)
            
            logger.info(f"Wydajność treści zaktualizowana: {content_id}")
            
            return {
                "status": "success",
                "content_id": content_id,
                "performance_score": performance.performance_score,
                "total_views": performance.total_views
            }
            
        except Exception as e:
            logger.error(f"Błąd śledzenia wydajności treści: {e}")
            return {"status": "error", "error": str(e)}
    
    async def track_conversion(self, 
                               event_type: str,
                               user_id: str,
                               page_url: str,
                               value: float = 0.0,
                               currency: str = "USD",
                               metadata: Dict[str, Any] = None,
                               attribution: Dict[str, Any] = None) -> Dict[str, Any]:
        """Śledź zdarzenie konwersji"""
        try:
            event_id = hashlib.md5(f"{user_id}_{event_type}_{datetime.utcnow().isoformat()}".encode()).hexdigest()
            
            conversion_event = ConversionEvent(
                event_id=event_id,
                event_type=event_type,
                user_id=user_id,
                page_url=page_url,
                timestamp=datetime.utcnow(),
                value=value,
                currency=currency,
                metadata=metadata or {},
                attribution_source=attribution.get("source", "") if attribution else "",
                attribution_campaign=attribution.get("campaign", "") if attribution else "",
                attribution_medium=attribution.get("medium", "") if attribution else ""
            )
            
            self.conversion_events.append(conversion_event)
            
            # Zaktualizuj metryki strony
            if page_url in self.page_metrics:
                metrics = self.page_metrics[page_url]
                metrics.conversion_rate = (metrics.conversion_rate * metrics.page_views + 1) / (metrics.page_views + 1)
                metrics.revenue += value
            
            # Wyślij do zewnętrznych serwisów
            await self._send_conversion_to_analytics(conversion_event)
            
            logger.info(f"Konwersja śledzona: {event_type} dla użytkownika {user_id}")
            
            return {
                "status": "success",
                "event_id": event_id,
                "event_type": event_type,
                "value": value,
                "currency": currency
            }
            
        except Exception as e:
            logger.error(f"Błąd śledzenia konwersji: {e}")
            return {"status": "error", "error": str(e)}
    
    async def get_analytics_dashboard(self, 
                                     time_range: str = "7d",
                                     content_filter: str = None) -> Dict[str, Any]:
        """Pobierz dane do dashboardu analitycznego"""
        try:
            # Oblicz zakres czasowy
            end_date = datetime.utcnow()
            if time_range == "1d":
                start_date = end_date - timedelta(days=1)
            elif time_range == "7d":
                start_date = end_date - timedelta(days=7)
            elif time_range == "30d":
                start_date = end_date - timedelta(days=30)
            elif time_range == "90d":
                start_date = end_date - timedelta(days=90)
            else:
                start_date = end_date - timedelta(days=7)
            
            # Filtrowanie danych
            filtered_metrics = self._filter_metrics_by_date(self.page_metrics.values(), start_date, end_date)
            filtered_performance = self._filter_performance_by_date(self.content_performance.values(), start_date, end_date)
            filtered_conversions = self._filter_conversions_by_date(self.conversion_events, start_date, end_date)
            
            # Dodatkowe filtrowanie po typie treści
            if content_filter:
                filtered_performance = [p for p in filtered_performance if p.content_type == content_filter]
            
            # Oblicz podstawowe metryki
            total_page_views = sum(m.page_views for m in filtered_metrics)
            total_unique_visitors = sum(m.unique_visitors for m in filtered_metrics)
            total_revenue = sum(m.revenue for m in filtered_metrics)
            total_conversions = len(filtered_conversions)
            
            # Oblicz średnie wskaźniki
            avg_bounce_rate = statistics.mean([m.bounce_rate for m in filtered_metrics]) if filtered_metrics else 0
            avg_session_duration = statistics.mean([m.avg_time_on_page for m in filtered_metrics]) if filtered_metrics else 0
            
            # Najlepsze treści
            top_content = sorted(filtered_performance, key=lambda x: x.performance_score, reverse=True)[:10]
            
            # Źródła ruchu
            traffic_sources = self._aggregate_traffic_sources(filtered_metrics)
            
            # Dane geograficzne
            geographic_data = self._aggregate_geographic_data(filtered_metrics)
            
            # Dane urządzeń
            device_data = self._aggregate_device_data(filtered_metrics)
            
            # Trendy czasowe
            time_series_data = self._generate_time_series_data(filtered_metrics, start_date, end_date)
            
            dashboard_data = {
                "time_range": time_range,
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                },
                "overview": {
                    "total_page_views": total_page_views,
                    "total_unique_visitors": total_unique_visitors,
                    "total_revenue": total_revenue,
                    "total_conversions": total_conversions,
                    "avg_bounce_rate": round(avg_bounce_rate, 2),
                    "avg_session_duration": round(avg_session_duration, 2)
                },
                "top_content": [
                    {
                        "content_id": content.content_id,
                        "content_type": content.content_type,
                        "performance_score": content.performance_score,
                        "total_views": content.total_views,
                        "revenue_generated": content.revenue_generated
                    } for content in top_content
                ],
                "traffic_sources": traffic_sources,
                "geographic_data": geographic_data,
                "device_data": device_data,
                "time_series": time_series_data,
                "generated_at": datetime.utcnow().isoformat()
            }
            
            logger.info(f"Dashboard analityczny wygenerowany dla zakresu: {time_range}")
            
            return {
                "status": "success",
                "dashboard": dashboard_data,
                "data_points": len(filtered_metrics) + len(filtered_performance) + len(filtered_conversions)
            }
            
        except Exception as e:
            logger.error(f"Błąd generowania dashboardu: {e}")
            return {"status": "error", "error": str(e)}
    
    async def generate_performance_report(self, 
                                        content_id: str = None,
                                        report_type: str = "comprehensive") -> Dict[str, Any]:
        """Wygeneruj raport wydajności"""
        try:
            if content_id:
                # Raport dla konkretnej treści
                if content_id not in self.content_performance:
                    return {"status": "error", "error": "Treść nie znaleziona"}
                
                performance = self.content_performance[content_id]
                
                report = {
                    "content_id": content_id,
                    "content_type": performance.content_type,
                    "publish_date": performance.publish_date.isoformat(),
                    "performance_metrics": {
                        "total_views": performance.total_views,
                        "avg_engagement_time": performance.avg_engagement_time,
                        "social_shares": performance.social_shares,
                        "backlinks": performance.backlinks,
                        "affiliate_performance": {
                            "clicks": performance.affiliate_clicks,
                            "conversions": performance.affiliate_conversions,
                            "conversion_rate": performance.affiliate_conversions / max(performance.affiliate_clicks, 1),
                            "revenue": performance.revenue_generated
                        },
                        "overall_score": performance.performance_score
                    },
                    "seo_rankings": performance.seo_rankings,
                    "recommendations": self._generate_content_recommendations(performance)
                }
                
            else:
                # Raport ogólny
                all_performance = list(self.content_performance.values())
                
                report = {
                    "report_type": "comprehensive",
                    "total_content_pieces": len(all_performance),
                    "total_views": sum(p.total_views for p in all_performance),
                    "total_revenue": sum(p.revenue_generated for p in all_performance),
                    "avg_performance_score": statistics.mean([p.performance_score for p in all_performance]) if all_performance else 0,
                    "top_performers": sorted(all_performance, key=lambda x: x.performance_score, reverse=True)[:5],
                    "underperformers": sorted(all_performance, key=lambda x: x.performance_score)[:5],
                    "content_type_breakdown": self._breakdown_by_content_type(all_performance),
                    "trends": self._analyze_performance_trends(all_performance)
                }
            
            logger.info(f"Raport wydajności wygenerowany: {report_type}")
            
            return {
                "status": "success",
                "report": report,
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Błąd generowania raportu: {e}")
            return {"status": "error", "error": str(e)}
    
    # Pomocnicze metody prywatne
    
    def _identify_traffic_source(self, referrer: str, custom_dimensions: Dict[str, Any]) -> str:
        """Zidentyfikuj źródło ruchu"""
        if not referrer:
            return "direct"
        
        if "google" in referrer.lower():
            return "organic_search"
        elif "facebook" in referrer.lower():
            return "social_facebook"
        elif "twitter" in referrer.lower():
            return "social_twitter"
        elif "linkedin" in referrer.lower():
            return "social_linkedin"
        elif "youtube" in referrer.lower():
            return "social_youtube"
        elif "amazon" in referrer.lower():
            return "affiliate_amazon"
        else:
            return "referral"
    
    def _identify_device_type(self, user_agent: str) -> str:
        """Zidentyfikuj typ urządzenia"""
        if not user_agent:
            return "unknown"
        
        user_agent_lower = user_agent.lower()
        
        if "mobile" in user_agent_lower:
            return "mobile"
        elif "tablet" in user_agent_lower or "ipad" in user_agent_lower:
            return "tablet"
        else:
            return "desktop"
    
    def _identify_country(self, ip_address: str, custom_dimensions: Dict[str, Any]) -> str:
        """Zidentyfikuj kraj"""
        # Symulacja - w prawdziwej implementacji użylibyśmy geolokalizacji IP
        if custom_dimensions and "country" in custom_dimensions:
            return custom_dimensions["country"]
        return "US"
    
    async def _update_user_journey(self, user_id: str, page_url: str, session_id: str, custom_dimensions: Dict[str, Any]):
        """Zaktualizuj ścieżkę użytkownika"""
        if not user_id:
            return
        
        if user_id not in self.user_journeys:
            self.user_journeys[user_id] = UserJourney(
                user_id=user_id,
                last_activity=datetime.utcnow()
            )
        
        journey = self.user_journeys[user_id]
        
        # Dodaj sesję
        session_data = {
            "session_id": session_id,
            "pages_viewed": [page_url],
            "start_time": datetime.utcnow(),
            "duration": 0,
            "conversions": []
        }
        
        journey.sessions.append(session_data)
        journey.total_sessions += 1
        journey.last_activity = datetime.utcnow()
    
    def _calculate_performance_score(self, performance: ContentPerformance) -> float:
        """Oblicz wynik wydajności treści"""
        score = 0.0
        
            # Wydajność treści (30%)
        if performance.total_views > 0:
            score += min(0.3, performance.total_views / 10000)
        
        # Angażowanie (25%)
        if performance.avg_engagement_time > 0:
            score += min(0.25, performance.avg_engagement_time / 300)
        
        # Konwersje (30%)
        if performance.affiliate_conversions > 0:
            conversion_rate = performance.affiliate_conversions / max(performance.affiliate_clicks, 1)
            score += min(0.3, conversion_rate * 10)
        
        # Przychód (15%)
        if performance.revenue_generated > 0:
            score += min(0.15, performance.revenue_generated / 1000)
        
        return min(score, 1.0)
    
    def _filter_metrics_by_date(self, metrics: List[PageMetrics], start_date: datetime, end_date: datetime) -> List[PageMetrics]:
        """Filtrowanie metryk według daty"""
        # W tej implementacji zakładamy, że wszystkie metryki są z aktualnego okresu
        # W prawdziwej implementacji mielibyśmy daty w metrykach
        return list(metrics)
    
    def _filter_performance_by_date(self, performance: List[ContentPerformance], start_date: datetime, end_date: datetime) -> List[ContentPerformance]:
        """Filtrowanie wydajności według daty"""
        return [p for p in performance if start_date <= p.publish_date <= end_date]
    
    def _filter_conversions_by_date(self, conversions: List[ConversionEvent], start_date: datetime, end_date: datetime) -> List[ConversionEvent]:
        """Filtrowanie konwersji według daty"""
        return [c for c in conversions if start_date <= c.timestamp <= end_date]
    
    def _aggregate_traffic_sources(self, metrics: List[PageMetrics]) -> Dict[str, int]:
        """Zagreguj źródła ruchu"""
        aggregated = defaultdict(int)
        for metric in metrics:
            for source, count in metric.traffic_sources.items():
                aggregated[source] += count
        return dict(aggregated)
    
    def _aggregate_geographic_data(self, metrics: List[PageMetrics]) -> Dict[str, int]:
        """Zagreguj dane geograficzne"""
        aggregated = defaultdict(int)
        for metric in metrics:
            for country, count in metric.countries.items():
                aggregated[country] += count
        return dict(aggregated)
    
    def _aggregate_device_data(self, metrics: List[PageMetrics]) -> Dict[str, int]:
        """Zagreguj dane urządzeń"""
        aggregated = defaultdict(int)
        for metric in metrics:
            for device, count in metric.device_types.items():
                aggregated[device] += count
        return dict(aggregated)
    
    def _generate_time_series_data(self, metrics: List[PageMetrics], start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Generuj dane szeregu czasowego"""
        # Symulacja danych szeregu czasowego
        days = (end_date - start_date).days + 1
        time_series = []
        
        for i in range(days):
            date = start_date + timedelta(days=i)
            time_series.append({
                "date": date.isoformat(),
                "page_views": 100 + i * 10,  # Symulacja
                "unique_visitors": 80 + i * 8,  # Symulacja
                "revenue": 50 + i * 5  # Symulacja
            })
        
        return time_series
    
    def _generate_content_recommendations(self, performance: ContentPerformance) -> List[str]:
        """Generuj rekomendacje dla treści"""
        recommendations = []
        
        if performance.total_views < 100:
            recommendations.append("Zwiększ promocję treści w mediach społecznościowych")
        
        if performance.avg_engagement_time < 60:
            recommendations.append("Popraw jakość treści aby zwiększyć czas angażowania")
        
        if performance.affiliate_clicks > 0 and performance.affiliate_conversions == 0:
            recommendations.append("Zoptymalizuj call-to-action aby zwiększyć konwersje")
        
        if performance.backlinks < 10:
            recommendations.append("Zbuduj więcej linków zwrotnych poprzez outreach")
        
        return recommendations
    
    def _breakdown_by_content_type(self, performance: List[ContentPerformance]) -> Dict[str, Dict[str, Any]]:
        """Podział według typu treści"""
        breakdown = defaultdict(lambda: {"count": 0, "total_views": 0, "total_revenue": 0})
        
        for perf in performance:
            content_type = perf.content_type
            breakdown[content_type]["count"] += 1
            breakdown[content_type]["total_views"] += perf.total_views
            breakdown[content_type]["total_revenue"] += perf.revenue_generated
        
        return dict(breakdown)
    
    def _analyze_performance_trends(self, performance: List[ContentPerformance]) -> Dict[str, Any]:
        """Analizuj trendy wydajności"""
        if not performance:
            return {"trend": "stable", "change": 0}
        
        # Symulacja analizy trendów
        recent_performance = [p for p in performance if (datetime.utcnow() - p.publish_date).days <= 30]
        older_performance = [p for p in performance if (datetime.utcnow() - p.publish_date).days > 30]
        
        recent_avg = statistics.mean([p.performance_score for p in recent_performance]) if recent_performance else 0
        older_avg = statistics.mean([p.performance_score for p in older_performance]) if older_performance else 0
        
        if recent_avg > older_avg * 1.1:
            trend = "improving"
            change = ((recent_avg - older_avg) / max(older_avg, 0.01)) * 100
        elif recent_avg < older_avg * 0.9:
            trend = "declining"
            change = ((older_avg - recent_avg) / max(older_avg, 0.01)) * 100
        else:
            trend = "stable"
            change = 0
        
        return {"trend": trend, "change": round(change, 2)}
    
    async def _send_to_google_analytics(self, page_url: str, user_id: str, session_id: str, custom_dimensions: Dict[str, Any]):
        """Wyślij dane do Google Analytics"""
        if not self.google_analytics_id:
            return
        
        try:
            # Symulacja wysyłania do GA4
            logger.info(f"Wysyłanie do Google Analytics: {page_url}")
        except Exception as e:
            logger.warning(f"Błąd wysyłania do Google Analytics: {e}")
    
    async def _send_to_mixpanel(self, event_name: str, properties: Dict[str, Any]):
        """Wyślij dane do Mixpanel"""
        if not self.mixpanel_token:
            return
        
        try:
            # Symulacja wysyłania do Mixpanel
            logger.info(f"Wysyłanie do Mixpanel: {event_name}")
        except Exception as e:
            logger.warning(f"Błąd wysyłania do Mixpanel: {e}")
    
    async def _send_conversion_to_analytics(self, conversion_event: ConversionEvent):
        """Wyślij zdarzenie konwersji do serwisów analitycznych"""
        try:
            # Google Analytics
            await self._send_to_google_analytics(
                conversion_event.page_url,
                conversion_event.user_id,
                "",  # session_id
                {"event_value": conversion_event.value, "event_currency": conversion_event.currency}
            )
            
            # Mixpanel
            await self._send_to_mixpanel("conversion", {
                "event_type": conversion_event.event_type,
                "value": conversion_event.value,
                "currency": conversion_event.currency,
                "attribution_source": conversion_event.attribution_source
            })
            
        except Exception as e:
            logger.warning(f"Błąd wysyłania konwersji do analityki: {e}")

# Globalna instancja tracker
_default_tracker = None

def get_analytics_tracker() -> AnalyticsTracker:
    """Pobierz globalną instancję AnalyticsTracker"""
    global _default_tracker
    if _default_tracker is None:
        _default_tracker = AnalyticsTracker()
    return _default_tracker

# Funkcje pomocnicze dla łatwego dostępu
async def track_page_view(page_url: str, 
                         user_id: str = None,
                         session_id: str = None,
                         referrer: str = None,
                         user_agent: str = None,
                         ip_address: str = None,
                         custom_dimensions: Dict[str, Any] = None) -> Dict[str, Any]:
    """Śledź odsłonę strony (funkcja pomocnicza)"""
    tracker = get_analytics_tracker()
    return await tracker.track_page_view(
        page_url=page_url,
        user_id=user_id,
        session_id=session_id,
        referrer=referrer,
        user_agent=user_agent,
        ip_address=ip_address,
        custom_dimensions=custom_dimensions
    )

async def track_conversion(event_type: str,
                          user_id: str,
                          page_url: str,
                          value: float = 0.0,
                          currency: str = "USD",
                          metadata: Dict[str, Any] = None,
                          attribution: Dict[str, Any] = None) -> Dict[str, Any]:
    """Śledź konwersję (funkcja pomocnicza)"""
    tracker = get_analytics_tracker()
    return await tracker.track_conversion(
        event_type=event_type,
        user_id=user_id,
        page_url=page_url,
        value=value,
        currency=currency,
        metadata=metadata,
        attribution=attribution
    )

async def get_analytics_dashboard(time_range: str = "7d", content_filter: str = None) -> Dict[str, Any]:
    """Pobierz dashboard analityczny (funkcja pomocnicza)"""
    tracker = get_analytics_tracker()
    return await tracker.get_analytics_dashboard(time_range=time_range, content_filter=content_filter)

async def generate_performance_report(content_id: str = None, report_type: str = "comprehensive") -> Dict[str, Any]:
    """Wygeneruj raport wydajności (funkcja pomocnicza)"""
    tracker = get_analytics_tracker()
    return await tracker.generate_performance_report(content_id=content_id, report_type=report_type)
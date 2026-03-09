from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
import time
import json
from packages.core_agent import get_agent
from packages.tools import get_publisher, get_content_generator, get_seo_analyzer, get_asin_manager, get_analytics_tracker

router = APIRouter()

class PublishPayload(BaseModel):
    slug: str
    title: str
    content: str
    tags: list = []

@router.post("/publish")
async def publish(p: PublishPayload):
    """Opublikuj treść przez agenta AI z użyciem zaawansowanych narzędzi"""
    try:
        agent = await get_agent()
        if not agent:
            raise HTTPException(status_code=503, detail="Agent nie jest dostępny")
        
        # Utwórz zadanie publikacji z nowym systemem
        task_data = {
            "id": f"publish_{p.slug}_{int(time.time())}",
            "type": "publishing",
            "title": f"Publish: {p.title}",
            "description": f"Publish article with slug: {p.slug} using FTP publisher",
            "priority": 2,  # HIGH
            "estimated_cost": 0.02,
            "estimated_duration": 45,
            "required_models": ["gpt-3.5-turbo"],
            "dependencies": [],
            "metadata": {
                "content": {
                    "slug": p.slug,
                    "title": p.title,
                    "content": p.content,
                    "meta": {
                        "tags": p.tags,
                        "author": "GAI Agent",
                        "publish_date": datetime.utcnow().isoformat()
                    },
                    "schema": json.dumps({
                        "@context": "https://schema.org",
                        "@type": "Article",
                        "headline": p.title,
                        "datePublished": datetime.utcnow().isoformat()
                    })
                }
            },
            "created_at": datetime.utcnow(),
            "scheduled_for": None,
            "status": "pending"
        }
        
        # Zaplanuj zadanie
        planned_tasks = await agent.task_planner.plan_tasks([task_data])
        
        if planned_tasks:
            return {
                "status": "success",
                "task_id": planned_tasks[0]["id"],
                "message": f"Publication task created for {p.slug} with FTP publishing",
                "publishing_features": [
                    "atomic_deployment",
                    "sitemap_update", 
                    "backup_creation",
                    "analytics_tracking"
                ]
            }
        else:
            raise HTTPException(status_code=400, detail="Nie udało się zaplanować publikacji")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd podczas publikacji: {str(e)}")

@router.post("/publish/direct")
async def publish_direct(p: PublishPayload):
    """Bezpośrednia publikacja treści bez agenta"""
    try:
        # Użyj bezpośrednio FTPPublisher
        publisher = get_publisher()
        
        # Przygotuj artykuł
        article = {
            "slug": p.slug,
            "title": p.title,
            "content": p.content,
            "schema": json.dumps({
                "@context": "https://schema.org",
                "@type": "Article",
                "headline": p.title,
                "datePublished": datetime.utcnow().isoformat()
            }),
            "meta": {
                "tags": p.tags,
                "author": "GAI Agent",
                "publish_date": datetime.utcnow().isoformat()
            }
        }
        
        # Stwórz paczkę i opublikuj
        publisher.stage_article_package(article)
        publish_result = await publisher.publish_article_package(article["slug"])
        
        # Śledź analitykę
        analytics = get_analytics_tracker()
        await analytics.track_page_view(
            page_url=f"https://kimsondreams.com/articles/{article['slug']}",
            user_id="direct_publisher"
        )
        
        return {
            "status": "success",
            "slug": p.slug,
            "published_files": publish_result.get("files", []),
            "backup_created": publish_result.get("backup_created"),
            "sitemap_updated": True,
            "analytics_tracked": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd bezpośredniej publikacji: {str(e)}")

@router.post("/content/generate")
async def generate_content_endpoint(request: dict):
    """Wygeneruj treść z użyciem AI"""
    try:
        content_gen = get_content_generator()
        
        topic = request.get("topic", "")
        content_type = request.get("content_type", "product_review")
        keywords = request.get("keywords", [])
        products = request.get("products", [])
        tone = request.get("tone", "professional")
        target_length = request.get("target_length", 2000)
        
        if not topic:
            raise HTTPException(status_code=400, detail="Topic jest wymagany")
        
        # Generuj treść
        generated_content = await content_gen.generate_content(
            topic=topic,
            content_type=content_type,
            target_keywords=keywords,
            products=products,
            tone=tone,
            target_length=target_length,
            include_media=True
        )
        
        # Optymalizuj SEO
        seo_analyzer = get_seo_analyzer()
        optimized_content = await content_gen.optimize_content(
            generated_content, 
            optimization_target="seo"
        )
        
        # Eksportuj do różnych formatów
        markdown = content_gen.export_to_markdown(optimized_content)
        html = content_gen.export_to_html(optimized_content)
        
        return {
            "status": "success",
            "content": {
                "title": optimized_content.title,
                "slug": optimized_content.slug,
                "total_words": optimized_content.total_words,
                "sections": len(optimized_content.sections),
                "markdown": markdown,
                "html": html
            },
            "seo_analysis": optimized_content.seo_analysis,
            "media_items": len(optimized_content.media_items),
            "template_used": optimized_content.template_used
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd generowania treści: {str(e)}")

@router.post("/amazon/search")
async def amazon_search(request: dict):
    """Wyszukaj produkty na Amazon"""
    try:
        asin_manager = get_asin_manager()
        
        keywords = request.get("keywords", [])
        max_results = request.get("max_results", 10)
        
        if not keywords:
            raise HTTPException(status_code=400, detail="Keywords są wymagane")
        
        # Wyszukaj produkty
        search_result = await asin_manager.search_products(
            keywords=" ".join(keywords),
            max_results=max_results
        )
        
        return {
            "status": "success",
            "search_query": search_result.search_query,
            "total_results": search_result.total_results,
            "current_page": search_result.current_page,
            "total_pages": search_result.total_pages,
            "products": [
                {
                    "asin": product.asin,
                    "title": product.title,
                    "price": product.price,
                    "currency": product.currency,
                    "rating": product.rating,
                    "review_count": product.review_count,
                    "category": product.category,
                    "availability": product.availability,
                    "affiliate_link": asin_manager.build_affiliate_link(product.asin)
                } for product in search_result.products
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd wyszukiwania Amazon: {str(e)}")

@router.get("/analytics/dashboard")
async def analytics_dashboard(time_range: str = "7d", content_filter: str = None):
    """Pobierz dashboard analityczny"""
    try:
        analytics = get_analytics_tracker()
        
        dashboard_data = await analytics.get_analytics_dashboard(
            time_range=time_range,
            content_filter=content_filter
        )
        
        return {
            "status": "success",
            "dashboard": dashboard_data.get("dashboard", {}),
            "data_points": dashboard_data.get("data_points", 0),
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd pobierania dashboardu: {str(e)}")

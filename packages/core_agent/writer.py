from typing import Dict, Any
from packages.models.invoke import ModelManager
from packages.tools.asin import build_affiliate_link
from packages.tools.schema import build_schema
import asyncio

async def generate_article(payload: Dict[str, Any], refresh: bool = False) -> Dict[str, Any]:
    """Wygeneruj artykuł używając agenta AI"""
    topic_hint = payload.get("topic_hint", "tech accessory")
    prompt = (
        "Write a 1600-2200 word English review article with sections: "
        "Intro, Detailed Analysis, Pros/Cons, Competitor Comparison, Verdict/Recommendations, FAQ. "
        "Include affiliate anchors like 'Check price on Amazon'. "
        f"Topic hint: {topic_hint}. "
        "Return plain markdown."
    )
    
    model_manager = ModelManager()
    response = await model_manager.model_infer(
        task_label="write_longform",
        prompt=prompt,
        temperature=0.7,
        max_tokens=2000
    )
    
    content = response.get("content", "")
    
    # Placeholder valid-format ASIN for MVP; replace via real ASIN discovery.
    asin = "B08N5WRWNW"
    link = build_affiliate_link(asin)
    content += f"\n\n[Check price on Amazon]({link})\n"
    schema = build_schema(title=f"{topic_hint} review", asin_list=[asin])
    slug = topic_hint.lower().replace(" ", "-")
    
    return {
        "slug": slug,
        "title": f"{topic_hint} Review",
        "content": content,
        "asin_list": [asin],
        "schema": schema,
        "meta": {"lang": "en", "category": "reviews"}
    }

def generate_article_sync(payload: Dict[str, Any], refresh: bool = False) -> Dict[str, Any]:
    """Synchroniczna wersja dla kompatybilności wstecznej"""
    return asyncio.run(generate_article(payload, refresh))

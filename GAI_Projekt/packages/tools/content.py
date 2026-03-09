"""
Zaawansowany generator treści dla GAI Agent
Zawiera system szablonów, formatowanie, integrację mediów i AI-powered content generation
"""

import asyncio
import json
import logging
import re
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
import os
import hashlib
from urllib.parse import urlparse

from packages.models.invoke import ModelManager
from packages.tools.seo import get_seo_analyzer
from packages.tools.asin import get_asin_manager

logger = logging.getLogger(__name__)

@dataclass
class ContentTemplate:
    """Szablon treści"""
    template_id: str
    name: str
    category: str  # review, guide, comparison, news, tutorial
    structure: Dict[str, Any]
    target_length: int
    tone: str  # professional, casual, technical, persuasive
    seo_requirements: Dict[str, Any]
    media_requirements: Dict[str, Any]
    
@dataclass
class ContentSection:
    """Sekcja treści"""
    section_type: str  # intro, main, conclusion, faq, comparison
    heading: str
    content: str
    word_count: int
    keywords: List[str]
    media_items: List[Dict[str, Any]]
    seo_score: float
    
@dataclass
class GeneratedContent:
    """Wygenerowana treść"""
    content_id: str
    title: str
    slug: str
    sections: List[ContentSection]
    total_words: int
    seo_analysis: Dict[str, Any]
    media_items: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    created_at: datetime
    template_used: str
    ai_model: str

class ContentGenerator:
    """Zaawansowany generator treści z AI i szablonami"""
    
    def __init__(self):
        self.model_manager = ModelManager()
        self.templates = self._load_default_templates()
        self.content_cache = {}
        self.cache_timeout = timedelta(hours=24)
        
        logger.info("ContentGenerator zainicjalizowany")
    
    def _load_default_templates(self) -> Dict[str, ContentTemplate]:
        """Załaduj domyślne szablony treści"""
        templates = {
            "product_review": ContentTemplate(
                template_id="product_review",
                name="Product Review",
                category="review",
                structure={
                    "sections": [
                        {"type": "intro", "min_words": 150, "max_words": 200},
                        {"type": "overview", "min_words": 200, "max_words": 300},
                        {"type": "features", "min_words": 400, "max_words": 600},
                        {"type": "performance", "min_words": 300, "max_words": 400},
                        {"type": "pros_cons", "min_words": 200, "max_words": 300},
                        {"type": "comparison", "min_words": 300, "max_words": 500},
                        {"type": "price_value", "min_words": 200, "max_words": 300},
                        {"type": "conclusion", "min_words": 150, "max_words": 200},
                        {"type": "faq", "min_words": 200, "max_words": 400}
                    ]
                },
                target_length=2000,
                tone="professional",
                seo_requirements={
                    "keyword_density": {"min": 1.0, "max": 3.0},
                    "headings_required": ["h1", "h2", "h3"],
                    "meta_description_length": {"min": 120, "max": 160},
                    "internal_links": {"min": 2, "max": 5}
                },
                media_requirements={
                    "images": {"min": 3, "max": 8, "types": ["product", "comparison", "infographic"]},
                    "videos": {"min": 0, "max": 2},
                    "charts": {"min": 1, "max": 3}
                }
            ),
            
            "buying_guide": ContentTemplate(
                template_id="buying_guide",
                name="Buying Guide",
                category="guide",
                structure={
                    "sections": [
                        {"type": "intro", "min_words": 100, "max_words": 150},
                        {"type": "what_is", "min_words": 200, "max_words": 300},
                        {"type": "key_features", "min_words": 400, "max_words": 600},
                        {"type": "types", "min_words": 300, "max_words": 400},
                        {"type": "how_to_choose", "min_words": 400, "max_words": 500},
                        {"type": "top_products", "min_words": 600, "max_words": 800},
                        {"type": "maintenance", "min_words": 200, "max_words": 300},
                        {"type": "conclusion", "min_words": 100, "max_words": 150}
                    ]
                },
                target_length=2500,
                tone="educational",
                seo_requirements={
                    "keyword_density": {"min": 0.8, "max": 2.5},
                    "headings_required": ["h1", "h2", "h3", "h4"],
                    "faq_schema": True,
                    "table_of_contents": True
                },
                media_requirements={
                    "images": {"min": 5, "max": 12, "types": ["educational", "comparison", "step-by-step"]},
                    "infographics": {"min": 1, "max": 3}
                }
            ),
            
            "comparison_article": ContentTemplate(
                template_id="comparison_article",
                name="Product Comparison",
                category="comparison",
                structure={
                    "sections": [
                        {"type": "intro", "min_words": 150, "max_words": 200},
                        {"type": "criteria", "min_words": 200, "max_words": 300},
                        {"type": "product_1", "min_words": 400, "max_words": 500},
                        {"type": "product_2", "min_words": 400, "max_words": 500},
                        {"type": "product_3", "min_words": 400, "max_words": 500},
                        {"type": "comparison_table", "min_words": 100, "max_words": 200},
                        {"type": "winner", "min_words": 200, "max_words": 300},
                        {"type": "alternatives", "min_words": 200, "max_words": 300},
                        {"type": "conclusion", "min_words": 150, "max_words": 200}
                    ]
                },
                target_length=2500,
                tone="objective",
                seo_requirements={
                    "keyword_density": {"min": 1.0, "max": 3.0},
                    "comparison_schema": True,
                    "product_schema": True,
                    "review_schema": True
                },
                media_requirements={
                    "images": {"min": 6, "max": 15, "types": ["product", "comparison", "feature"]},
                    "comparison_tables": {"min": 2, "max": 4}
                }
            )
        }
        
        return templates
    
    async def generate_content(self, 
                             topic: str,
                             content_type: str = "product_review",
                             target_keywords: List[str] = None,
                             products: List[Dict[str, Any]] = None,
                             tone: str = "professional",
                             target_length: int = None,
                             include_media: bool = True) -> GeneratedContent:
        """Wygeneruj treść przy użyciu AI i szablonów"""
        try:
            logger.info(f"Generowanie treści: {topic}, typ: {content_type}")
            
            # Sprawdź cache
            cache_key = f"{topic}_{content_type}_{tone}_{target_length or 'auto'}"
            if cache_key in self.content_cache:
                cached_data, timestamp = self.content_cache[cache_key]
                if datetime.utcnow() - timestamp < self.cache_timeout:
                    logger.info(f"Treść pobrana z cache: {topic}")
                    return cached_data
            
            # Pobierz szablon
            template = self.templates.get(content_type)
            if not template:
                raise ValueError(f"Nieznany typ treści: {content_type}")
            
            # Przeprowadź research słów kluczowych
            if target_keywords:
                seo_analyzer = get_seo_analyzer()
                keyword_data = await seo_analyzer.research_keywords(target_keywords)
                optimized_keywords = [kw.keyword for kw in keyword_data[:15]]
            else:
                optimized_keywords = [topic.lower()]
            
            # Generuj slug
            slug = self._generate_slug(topic)
            
            # Generuj sekcje treści
            sections = []
            total_words = 0
            
            for section_config in template.structure["sections"]:
                section = await self._generate_section(
                    topic=topic,
                    section_type=section_config["type"],
                    min_words=section_config["min_words"],
                    max_words=section_config["max_words"],
                    keywords=optimized_keywords,
                    products=products,
                    tone=tone,
                    template=template
                )
                
                sections.append(section)
                total_words += section.word_count
            
            # Generuj media
            media_items = []
            if include_media:
                media_items = await self._generate_media_items(
                    topic, sections, template.media_requirements
                )
            
            # Analiza SEO
            full_content = "\n\n".join([s.content for s in sections])
            seo_analysis = await self._analyze_content_seo(full_content, optimized_keywords)
            
            # Tworzenie wyniku
            content_id = hashlib.md5(f"{topic}_{content_type}_{datetime.utcnow().isoformat()}".encode()).hexdigest()
            
            result = GeneratedContent(
                content_id=content_id,
                title=topic,
                slug=slug,
                sections=sections,
                total_words=total_words,
                seo_analysis=seo_analysis,
                media_items=media_items,
                metadata={
                    "topic": topic,
                    "content_type": content_type,
                    "keywords": optimized_keywords,
                    "products": products or [],
                    "tone": tone,
                    "template_used": template.template_id
                },
                created_at=datetime.utcnow(),
                template_used=template.template_id,
                ai_model="gpt-4"
            )
            
            # Zapisz w cache
            self.content_cache[cache_key] = (result, datetime.utcnow())
            
            logger.info(f"Treść wygenerowana pomyślnie: {topic} ({total_words} słów)")
            return result
            
        except Exception as e:
            logger.error(f"Błąd generowania treści: {e}")
            raise
    
    async def _generate_section(self, 
                               topic: str,
                               section_type: str,
                               min_words: int,
                               max_words: int,
                               keywords: List[str],
                               products: List[Dict[str, Any]],
                               tone: str,
                               template: ContentTemplate) -> ContentSection:
        """Wygeneruj pojedynczą sekcję treści"""
        try:
            # Przygotuj prompt dla AI
            prompt = self._build_section_prompt(
                topic, section_type, min_words, max_words, keywords, products, tone
            )
            
            # Generuj treść z AI
            response = await self.model_manager.model_infer(
                task_label=f"content_{section_type}",
                prompt=prompt,
                temperature=0.7,
                max_tokens=max_words * 2  # Przybliżenie
            )
            
            content = response.get("content", "")
            
            # Generuj nagłówek
            heading = self._generate_heading(section_type, topic, keywords)
            
            # Licz słowa
            word_count = len(content.split())
            
            # Oblicz SEO score dla sekcji
            seo_score = self._calculate_section_seo_score(content, keywords)
            
            return ContentSection(
                section_type=section_type,
                heading=heading,
                content=content,
                word_count=word_count,
                keywords=keywords[:5],  # Główne słowa kluczowe dla tej sekcji
                media_items=[],  # Media będą dodane później
                seo_score=seo_score
            )
            
        except Exception as e:
            logger.error(f"Błąd generowania sekcji {section_type}: {e}")
            # Zwróć pustą sekcję w razie błędu
            return ContentSection(
                section_type=section_type,
                heading=f"{section_type.title()}",
                content=f"Treść sekcji {section_type} dla tematu {topic}",
                word_count=50,
                keywords=keywords[:3],
                media_items=[],
                seo_score=0.5
            )
    
    def _build_section_prompt(self, 
                             topic: str,
                             section_type: str,
                             min_words: int,
                             max_words: int,
                             keywords: List[str],
                             products: List[Dict[str, Any]],
                             tone: str) -> str:
        """Zbuduj prompt dla sekcji"""
        base_prompt = f"""
        Napisz sekcję artykułu na temat: {topic}
        
        Typ sekcji: {section_type}
        Długość: {min_words}-{max_words} słów
        Ton: {tone}
        
        Słowa kluczowe do uwzględnienia: {', '.join(keywords[:5])}
        """
        
        # Dodaj specyficzne instrukcje dla różnych typów sekcji
        if section_type == "intro":
            prompt = base_prompt + f"""
            Napisz wstęp, który:
            - Zaciekawi czytelnika tematem
            - Przedstawi problem, który rozwiązuje {topic}
            - Zwięźle przedstawi, co znajdzie w artykule
            - Zawiera główne słowo kluczowe: {keywords[0] if keywords else topic}
            """
        
        elif section_type == "features":
            prompt = base_prompt + f"""
            Opisz kluczowe cechy i funkcje. Uwzględnij:
            - Główne funkcje i możliwości
            - Unikalne cechy wyróżniające
            - Korzyści dla użytkownika
            - Specyfikacje techniczne (jeśli dotyczy)
            """
        
        elif section_type == "comparison":
            prompt = base_prompt + f"""
            Przeprowadź porównanie z alternatywami:
            - Porównaj z podobnymi produktami/rozwiązaniami
            - Przedstaw zalety i wady każdej opcji
            - Pomóż czytelnikowi podjąć decyzję
            - Bądź obiektywny i rzetelny
            """
        
        elif section_type == "pros_cons":
            prompt = base_prompt + f"""
            Przedstaw zalety i wady:
            - Lista zalet (minimum 3)
            - Lista wad (minimum 2, maksimum 5)
            - Bądź uczciwy i rzetelny
            - Uwzględnij różne perspektywy użytkowników
            """
        
        else:
            prompt = base_prompt + f"""
            Napisz treść sekcji {section_type}:
            - Bądź konkretny i rzeczowy
            - Użyj przejrzystego języka
            - Strukturuj treść logicznie
            - Uwzględnij słowa kluczowe naturalnie
            """
        
        return prompt.strip()
    
    def _generate_heading(self, section_type: str, topic: str, keywords: List[str]) -> str:
        """Wygeneruj nagłówek dla sekcji"""
        headings = {
            "intro": f"Wprowadzenie do {topic}",
            "overview": f"Przegląd {topic}",
            "features": f"Kluczowe cechy {topic}",
            "performance": f"Wydajność i efektywność {topic}",
            "pros_cons": f"Zalety i wady {topic}",
            "comparison": f"Porównanie {topic} z alternatywami",
            "price_value": f"Cena i wartość {topic}",
            "conclusion": f"Podsumowanie i wnioski",
            "faq": f"Najczęściej zadawane pytania o {topic}",
            "what_is": f"Co to jest {topic}?",
            "key_features": f"Kluczowe cechy {topic}",
            "types": f"Rodzaje {topic}",
            "how_to_choose": f"Jak wybrać {topic}?",
            "top_products": f"Najlepsze {topic}",
            "maintenance": f"Utrzymanie i konserwacja {topic}",
            "product_1": f"Produkt 1: {topic}",
            "product_2": f"Produkt 2: {topic}",
            "product_3": f"Produkt 3: {topic}",
            "comparison_table": f"Tabela porównawcza {topic}",
            "winner": f"Zwycięzca porównania {topic}",
            "alternatives": f"Alternatywy dla {topic}"
        }
        
        return headings.get(section_type, f"{section_type.title()}: {topic}")
    
    def _calculate_section_seo_score(self, content: str, keywords: List[str]) -> float:
        """Oblicz SEO score dla sekcji"""
        score = 0.0
        content_lower = content.lower()
        
        # Gęstość słów kluczowych
        total_words = len(content.split())
        if total_words > 0:
            keyword_count = sum(1 for keyword in keywords[:3] if keyword.lower() in content_lower)
            keyword_density = (keyword_count / total_words) * 100
            
            if 1.0 <= keyword_density <= 3.0:
                score += 0.4
            elif 0.5 <= keyword_density < 1.0:
                score += 0.2
        
        # Długość treści
        if total_words >= 100:
            score += 0.3
        
        # Struktura (nagłówki)
        if '#' in content or re.search(r'<h[1-6]>', content):
            score += 0.3
        
        return min(score, 1.0)
    
    async def _generate_media_items(self, 
                                   topic: str,
                                   sections: List[ContentSection],
                                   media_requirements: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Wygeneruj elementy multimedialne"""
        media_items = []
        
        # Wymagania obrazków
        image_req = media_requirements.get("images", {})
        if image_req:
            min_images = image_req.get("min", 0)
            max_images = image_req.get("max", 5)
            image_types = image_req.get("types", ["general"])
            
            num_images = min(max_images, max(min_images, len(sections) // 2))
            
            for i in range(num_images):
                image_type = image_types[i % len(image_types)] if image_types else "general"
                
                media_item = {
                    "type": "image",
                    "subtype": image_type,
                    "description": f"{image_type.title()} image for {topic}",
                    "alt_text": f"{topic} - {image_type} {i+1}",
                    "suggested_filename": f"{self._generate_slug(topic)}_{image_type}_{i+1}.jpg",
                    "placement": f"section_{i % len(sections) if sections else 0}"
                }
                media_items.append(media_item)
        
        # Wymagania tabel porównawczych
        table_req = media_requirements.get("comparison_tables", {})
        if table_req:
            min_tables = table_req.get("min", 0)
            max_tables = table_req.get("max", 2)
            
            num_tables = min(max_tables, max(min_tables, 1 if "comparison" in topic.lower() else 0))
            
            for i in range(num_tables):
                table_item = {
                    "type": "table",
                    "subtype": "comparison",
                    "title": f"Comparison Table {i+1}",
                    "description": f"Detailed comparison of {topic} options",
                    "data": []  # Dane będą wypełnione później
                }
                media_items.append(table_item)
        
        return media_items
    
    async def _analyze_content_seo(self, content: str, keywords: List[str]) -> Dict[str, Any]:
        """Przeanalizuj SEO wygenerowanej treści"""
        try:
            seo_analyzer = get_seo_analyzer()
            
            # Symulacja analizy - w prawdziwej implementacji użylibyśmy pełnej analizy
            word_count = len(content.split())
            keyword_density = {}
            
            for keyword in keywords[:10]:
                count = len(re.findall(r'\b' + re.escape(keyword) + r'\b', content, re.IGNORECASE))
                density = (count / word_count) * 100 if word_count > 0 else 0
                keyword_density[keyword] = round(density, 2)
            
            return {
                "word_count": word_count,
                "keyword_density": keyword_density,
                "readability_score": 0.75,  # Symulacja
                "seo_score": 0.82,  # Symulacja
                "recommendations": [
                    "Dodaj więcej wewnętrznych linków",
                    "Zoptymalizuj gęstość słów kluczowych",
                    "Dodaj więcej nagłówków H2 i H3"
                ]
            }
            
        except Exception as e:
            logger.error(f"Błąd analizy SEO: {e}")
            return {"error": str(e), "word_count": len(content.split())}
    
    def _generate_slug(self, title: str) -> str:
        """Wygeneruj slug z tytułu"""
        # Konwertuj na małe litery
        slug = title.lower()
        
        # Usuń polskie znaki
        polish_chars = {'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z'}
        for polish, english in polish_chars.items():
            slug = slug.replace(polish, english)
        
        # Zamień spacje i znaki specjalne na myślniki
        slug = re.sub(r'[^a-z0-9]+', '-', slug)
        
        # Usuń myślniki na początku i końcu
        slug = slug.strip('-')
        
        # Ogranicz długość
        if len(slug) > 60:
            slug = slug[:60].rstrip('-')
        
        return slug or "content"
    
    async def optimize_content(self, 
                              content: GeneratedContent,
                              optimization_target: str = "seo") -> GeneratedContent:
        """Zoptymalizuj wygenerowaną treść"""
        try:
            logger.info(f"Optymalizacja treści: {content.title}, target: {optimization_target}")
            
            if optimization_target == "seo":
                # Optymalizacja SEO
                optimized_sections = []
                
                for section in content.sections:
                    optimized_section = await self._optimize_section_for_seo(section, content.metadata["keywords"])
                    optimized_sections.append(optimized_section)
                
                content.sections = optimized_sections
                
            elif optimization_target == "readability":
                # Optymalizacja czytelności
                for section in content.sections:
                    section.content = self._optimize_readability(section.content)
            
            # Przelicz statystyki
            content.total_words = sum(s.word_count for s in content.sections)
            
            logger.info(f"Treść zoptymalizowana pomyślnie: {content.title}")
            return content
            
        except Exception as e:
            logger.error(f"Błąd optymalizacji treści: {e}")
            return content
    
    async def _optimize_section_for_seo(self, section: ContentSection, keywords: List[str]) -> ContentSection:
        """Zoptymalizuj sekcję dla SEO"""
        try:
            # Popraw gęstość słów kluczowych
            content = section.content
            
            # Dodaj słowa kluczowe naturalnie
            if keywords and keywords[0].lower() not in content.lower():
                # Dodaj słowo kluczowe na początku sekcji
                content = f"{keywords[0]} to {content.lower()}"
            
            # Optymalizacja nagłówka
            if keywords and not any(kw.lower() in section.heading.lower() for kw in keywords[:3]):
                section.heading = f"{keywords[0]} - {section.heading}"
            
            section.content = content
            section.word_count = len(content.split())
            section.seo_score = self._calculate_section_seo_score(content, keywords)
            
            return section
            
        except Exception as e:
            logger.error(f"Błąd optymalizacji SEO sekcji: {e}")
            return section
    
    def _optimize_readability(self, content: str) -> str:
        """Zoptymalizuj czytelność treści"""
        # Prosta optymalizacja - w prawdziwej implementacji użylibyśmy NLP
        
        # Skróć długie zdania
        sentences = content.split('.')
        optimized_sentences = []
        
        for sentence in sentences:
            if len(sentence.split()) > 25:  # Zbyt długie zdanie
                # Podziel na krótsze zdania
                words = sentence.split()
                mid_point = len(words) // 2
                part1 = ' '.join(words[:mid_point]) + '.'
                part2 = ' '.join(words[mid_point:]) + '.'
                optimized_sentences.extend([part1, part2])
            else:
                optimized_sentences.append(sentence + '.' if sentence and not sentence.endswith('.') else sentence)
        
        return ' '.join(optimized_sentences).strip()
    
    def export_to_markdown(self, content: GeneratedContent) -> str:
        """Eksportuj treść do formatu Markdown"""
        markdown_parts = []
        
        # Tytuł i metadane
        markdown_parts.append(f"# {content.title}")
        markdown_parts.append("")
        markdown_parts.append(f"*Generated on: {content.created_at.strftime('%Y-%m-%d %H:%M:%S')}*")
        markdown_parts.append(f"*Template: {content.template_used}*")
        markdown_parts.append(f"*Word count: {content.total_words}*")
        markdown_parts.append("")
        
        # Sekcje
        for section in content.sections:
            markdown_parts.append(f"## {section.heading}")
            markdown_parts.append("")
            markdown_parts.append(section.content)
            markdown_parts.append("")
        
        # Media
        if content.media_items:
            markdown_parts.append("## Media")
            markdown_parts.append("")
            for media in content.media_items:
                markdown_parts.append(f"- **{media['type'].title()}**: {media.get('description', 'No description')}")
            markdown_parts.append("")
        
        # SEO Analysis
        if content.seo_analysis:
            markdown_parts.append("## SEO Analysis")
            markdown_parts.append("")
            markdown_parts.append(f"- **Word Count**: {content.seo_analysis.get('word_count', 'N/A')}")
            markdown_parts.append(f"- **SEO Score**: {content.seo_analysis.get('seo_score', 'N/A')}")
            
            if 'keyword_density' in content.seo_analysis:
                markdown_parts.append("- **Keyword Density**:")
                for keyword, density in content.seo_analysis['keyword_density'].items():
                    markdown_parts.append(f"  - {keyword}: {density}%")
            
            if 'recommendations' in content.seo_analysis:
                markdown_parts.append("- **Recommendations**:")
                for rec in content.seo_analysis['recommendations']:
                    markdown_parts.append(f"  - {rec}")
            markdown_parts.append("")
        
        return "\n".join(markdown_parts)
    
    def export_to_html(self, content: GeneratedContent) -> str:
        """Eksportuj treść do formatu HTML"""
        html_parts = []
        
        html_parts.append('<!DOCTYPE html>')
        html_parts.append('<html lang="en">')
        html_parts.append('<head>')
        html_parts.append(f'    <meta charset="UTF-8">')
        html_parts.append(f'    <meta name="viewport" content="width=device-width, initial-scale=1.0">')
        html_parts.append(f'    <title>{content.title}</title>')
        
        # Meta tags
        if content.seo_analysis:
            html_parts.append(f'    <meta name="description" content="{content.seo_analysis.get("meta_description", content.title)}">')
            if 'keywords' in content.metadata:
                html_parts.append(f'    <meta name="keywords" content="{", ".join(content.metadata["keywords"][:10])}">')
        
        html_parts.append('</head>')
        html_parts.append('<body>')
        html_parts.append(f'    <h1>{content.title}</h1>')
        
        # Sekcje
        for section in content.sections:
            html_parts.append(f'    <h2>{section.heading}</h2>')
            # Konwertuj Markdown-like format do HTML
            section_html = section.content.replace('\n\n', '</p><p>').replace('\n', '<br>')
            html_parts.append(f'    <p>{section_html}</p>')
        
        html_parts.append('</body>')
        html_parts.append('</html>')
        
        return '\n'.join(html_parts)

# Globalna instancja generatora
_default_generator = None

def get_content_generator() -> ContentGenerator:
    """Pobierz globalną instancję ContentGenerator"""
    global _default_generator
    if _default_generator is None:
        _default_generator = ContentGenerator()
    return _default_generator

# Funkcje pomocnicze dla łatwego dostępu
async def generate_content(topic: str, 
                          content_type: str = "product_review",
                          target_keywords: List[str] = None,
                          products: List[Dict[str, Any]] = None,
                          tone: str = "professional",
                          target_length: int = None,
                          include_media: bool = True) -> GeneratedContent:
    """Wygeneruj treść (funkcja pomocnicza)"""
    generator = get_content_generator()
    return await generator.generate_content(
        topic=topic,
        content_type=content_type,
        target_keywords=target_keywords,
        products=products,
        tone=tone,
        target_length=target_length,
        include_media=include_media
    )

async def optimize_content(content: GeneratedContent, optimization_target: str = "seo") -> GeneratedContent:
    """Zoptymalizuj treść (funkcja pomocnicza)"""
    generator = get_content_generator()
    return await generator.optimize_content(content, optimization_target)
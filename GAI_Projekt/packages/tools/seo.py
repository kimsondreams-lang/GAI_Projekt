"""
Zaawansowany moduł SEO dla GAI Agent
Zawiera analizę SEO, research słów kluczowych, optymalizację meta tagów i content analysis
"""

import asyncio
import aiohttp
import json
import logging
import re
import os
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from urllib.parse import urljoin, urlparse
import math

logger = logging.getLogger(__name__)

@dataclass
class KeywordData:
    """Dane o słowie kluczowym"""
    keyword: str
    search_volume: int
    competition: float  # 0.0 - 1.0
    cpc: float  # Cost Per Click
    difficulty: float  # 0.0 - 1.0
    trends: List[float]  # Trendy w czasie
    related_keywords: List[str]
    intent: str  # commercial, informational, navigational, transactional

@dataclass
class SEOAnalysis:
    """Wyniki analizy SEO"""
    url: str
    title: str
    title_length: int
    title_optimization: float  # 0.0 - 1.0
    meta_description: str
    meta_description_length: int
    meta_optimization: float
    headings: Dict[str, int]  # h1, h2, h3, etc.
    keywords: List[KeywordData]
    keyword_density: Dict[str, float]
    readability_score: float
    content_quality: float
    technical_score: float
    mobile_friendly: bool
    page_speed: float
    backlinks: int
    domain_authority: float
    recommendations: List[str]
    issues: List[Dict[str, Any]]

@dataclass
class CompetitorAnalysis:
    """Analiza konkurencji"""
    competitor_url: str
    title: str
    keywords: List[str]
    content_length: int
    backlinks: int
    domain_authority: float
    social_signals: int
    estimated_traffic: int
    strengths: List[str]
    weaknesses: List[str]

class SEOAnalyzer:
    """Zaawansowany analizator SEO"""
    
    def __init__(self):
        self.api_key = os.environ.get("SEO_API_KEY", "")
        self.search_engine_id = os.environ.get("SEARCH_ENGINE_ID", "")
        self.cache = {}
        self.cache_timeout = timedelta(hours=24)
        
        # Słowa kluczowe wysokiego poziomu dla różnych kategorii
        self.high_intent_keywords = {
            "commercial": ["best", "top", "review", "comparison", "vs", "buy", "price", "cheap"],
            "informational": ["how", "what", "why", "guide", "tutorial", "tips", "ideas"],
            "transactional": ["purchase", "order", "download", "subscribe", "register"],
            "navigational": ["brand", "company", "website", "login", "app"]
        }
        
        logger.info("SEOAnalyzer zainicjalizowany")
    
    async def analyze_page(self, url: str, content: Optional[str] = None) -> SEOAnalysis:
        """Przeanalizuj stronę pod kątem SEO"""
        try:
            logger.info(f"Analizuję stronę: {url}")
            
            # Pobierz treść jeśli nie dostarczono
            if not content:
                content = await self._fetch_page_content(url)
            
            # Analiza podstawowa
            title = self._extract_title(content)
            meta_description = self._extract_meta_description(content)
            headings = self._analyze_headings(content)
            
            # Analiza słów kluczowych
            keywords = await self._analyze_keywords(content, url)
            keyword_density = self._calculate_keyword_density(content, keywords)
            
            # Analiza techniczna
            technical_score = await self._analyze_technical_aspects(url, content)
            
            # Analiza konkurencji
            competitors = await self.analyze_competitors(url, keywords)
            
            # Generuj rekomendacje
            recommendations = self._generate_recommendations(
                title, meta_description, headings, keywords, content
            )
            
            # Zidentyfikuj problemy
            issues = self._identify_issues(
                title, meta_description, headings, content, technical_score
            )
            
            analysis = SEOAnalysis(
                url=url,
                title=title,
                title_length=len(title),
                title_optimization=self._optimize_title_score(title, keywords),
                meta_description=meta_description,
                meta_description_length=len(meta_description),
                meta_optimization=self._optimize_meta_score(meta_description, keywords),
                headings=headings,
                keywords=keywords,
                keyword_density=keyword_density,
                readability_score=self._calculate_readability_score(content),
                content_quality=self._calculate_content_quality(content),
                technical_score=technical_score,
                mobile_friendly=await self._check_mobile_friendly(url),
                page_speed=await self._analyze_page_speed(url),
                backlinks=await self._count_backlinks(url),
                domain_authority=await self._calculate_domain_authority(url),
                recommendations=recommendations,
                issues=issues
            )
            
            logger.info(f"Analiza SEO zakończona dla: {url}")
            return analysis
            
        except Exception as e:
            logger.error(f"Błąd analizy SEO dla {url}: {e}")
            raise
    
    async def research_keywords(self, 
                               seed_keywords: List[str], 
                               language: str = "en",
                               location: str = "us") -> List[KeywordData]:
        """Przeprowadź research słów kluczowych"""
        try:
            logger.info(f"Research słów kluczowych dla: {seed_keywords}")
            
            keywords_data = []
            
            for seed_keyword in seed_keywords:
                # Symulacja danych - w prawdziwej implementacji użylibyśmy API
                related_keywords = await self._generate_related_keywords(seed_keyword)
                
                for related_kw in related_keywords[:10]:  # Ogranicz do 10 słów kluczowych
                    keyword_data = await self._get_keyword_metrics(related_kw, language, location)
                    if keyword_data:
                        keywords_data.append(keyword_data)
            
            # Sortuj według wolumenu wyszukiwania
            keywords_data.sort(key=lambda x: x.search_volume, reverse=True)
            
            logger.info(f"Znaleziono {len(keywords_data)} słów kluczowych")
            return keywords_data
            
        except Exception as e:
            logger.error(f"Błąd researchu słów kluczowych: {e}")
            return []
    
    async def analyze_competitors(self, url: str, keywords: List[str]) -> List[CompetitorAnalysis]:
        """Przeanalizuj konkurencję dla danych słów kluczowych"""
        try:
            logger.info(f"Analiza konkurencji dla: {url}, słowa kluczowe: {keywords}")
            
            competitors = []
            
            # Symulacja wyszukiwania konkurencji
            for i, keyword in enumerate(keywords[:5]):  # Ogranicz do 5 słów kluczowych
                competitor_url = f"https://competitor{i+1}.com/{keyword.replace(' ', '-')}-review"
                
                # Symulacja danych konkurenta
                competitor = CompetitorAnalysis(
                    competitor_url=competitor_url,
                    title=f"Best {keyword} Review {i+1}",
                    keywords=[keyword, f"{keyword} review", f"best {keyword}"],
                    content_length=1500 + i * 200,
                    backlinks=50 + i * 25,
                    domain_authority=30 + i * 5,
                    social_signals=100 + i * 50,
                    estimated_traffic=1000 + i * 500,
                    strengths=[f"Dobra optymalizacja dla '{keyword}'", "Wysoka jakość treści"],
                    weaknesses=["Brak aktualizacji", "Słabe meta opisy"]
                )
                
                competitors.append(competitor)
            
            return competitors
            
        except Exception as e:
            logger.error(f"Błąd analizy konkurencji: {e}")
            return []
    
    async def optimize_meta_tags(self, 
                                title: str, 
                                description: str, 
                                keywords: List[str]) -> Dict[str, str]:
        """Zoptymalizuj meta tagi"""
        try:
            # Optymalizacja tytułu
            optimized_title = self._optimize_title(title, keywords)
            
            # Optymalizacja opisu
            optimized_description = self._optimize_description(description, keywords)
            
            # Generuj meta keywords
            meta_keywords = ", ".join(keywords[:15])  # Ogranicz do 15 słów kluczowych
            
            return {
                "title": optimized_title,
                "description": optimized_description,
                "keywords": meta_keywords,
                "og_title": optimized_title[:60],  # Open Graph
                "og_description": optimized_description[:160],
                "twitter_title": optimized_title[:60],
                "twitter_description": optimized_description[:160]
            }
            
        except Exception as e:
            logger.error(f"Błąd optymalizacji meta tagów: {e}")
            return {"title": title, "description": description, "keywords": ", ".join(keywords)}
    
    async def generate_content_outline(self, 
                                      topic: str, 
                                      keywords: List[str],
                                      target_length: int = 2000) -> Dict[str, Any]:
        """Wygeneruj outline treści SEO"""
        try:
            # Analiza intencji użytkownika
            intent = self._determine_intent(keywords)
            
            # Struktura outline
            outline = {
                "topic": topic,
                "target_length": target_length,
                "intent": intent,
                "sections": [],
                "keywords_to_include": keywords[:20],
                "recommended_headings": [],
                "internal_linking_opportunities": [],
                "faq_questions": []
            }
            
            # Generuj sekcje na podstawie intencji
            if intent == "informational":
                outline["sections"] = [
                    {"heading": "Wstęp", "target_words": 150, "keywords": [topic]},
                    {"heading": "Co to jest?", "target_words": 300, "keywords": [f"co to {topic}", f"definicja {topic}"]},
                    {"heading": "Jak to działa?", "target_words": 400, "keywords": [f"jak działa {topic}", f"mechanizm {topic}"]},
                    {"heading": "Korzyści i zastosowania", "target_words": 400, "keywords": [f"korzyści {topic}", f"zastosowanie {topic}"]},
                    {"heading": "Porównanie z alternatywami", "target_words": 350, "keywords": [f"{topic} vs", f"porównanie {topic}"]},
                    {"heading": "Podsumowanie", "target_words": 200, "keywords": [f"podsumowanie {topic}", f"wnioski {topic}"]}
                ]
            elif intent == "commercial":
                outline["sections"] = [
                    {"heading": "Wstęp", "target_words": 150, "keywords": [f"najlepsze {topic}", f"ranking {topic}"]},
                    {"heading": "Top 5 produktów", "target_words": 800, "keywords": [f"najlepsze {topic}", f"top {topic}"]},
                    {"heading": "Porównanie funkcji", "target_words": 500, "keywords": [f"porównanie {topic}", f"funkcje {topic}"]},
                    {"heading": "Cena i wartość", "target_words": 400, "keywords": [f"cena {topic}", f"opłacalność {topic}"]},
                    {"heading": "Rekomendacje", "target_words": 200, "keywords": [f"rekomendacja {topic}", f"które {topic}"]}
                ]
            
            # Generuj pytania FAQ
            outline["faq_questions"] = [
                f"Co to jest {topic}?",
                f"Jak wybrać najlepsze {topic}?",
                f"Ile kosztuje {topic}?",
                f"Czy {topic} jest warte zakupu?",
                f"Jak długo działa {topic}?"
            ]
            
            return outline
            
        except Exception as e:
            logger.error(f"Błąd generowania outline: {e}")
            return {"error": str(e)}
    
    # Pomocnicze metody prywatne
    
    async def _fetch_page_content(self, url: str) -> str:
        """Pobierz treść strony"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=30) as response:
                    if response.status == 200:
                        return await response.text()
                    else:
                        raise Exception(f"HTTP {response.status}")
        except Exception as e:
            logger.error(f"Błąd pobierania strony {url}: {e}")
            return ""
    
    def _extract_title(self, content: str) -> str:
        """Wydobądź tytuł strony"""
        title_match = re.search(r'<title[^>]*>(.*?)</title>', content, re.IGNORECASE | re.DOTALL)
        return title_match.group(1).strip() if title_match else ""
    
    def _extract_meta_description(self, content: str) -> str:
        """Wydobądź meta opis"""
        meta_match = re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=["\'](.*?)["\']', 
                               content, re.IGNORECASE)
        if not meta_match:
            meta_match = re.search(r'<meta[^>]*content=["\'](.*?)["\'][^>]*name=["\']description["\']', 
                                   content, re.IGNORECASE)
        return meta_match.group(1).strip() if meta_match else ""
    
    def _analyze_headings(self, content: str) -> Dict[str, int]:
        """Przeanalizuj nagłówki"""
        headings = {}
        for level in range(1, 7):
            h_tag = f"h{level}"
            matches = re.findall(f'<{h_tag}[^>]*>(.*?)</{h_tag}>', content, re.IGNORECASE)
            headings[h_tag] = len(matches)
        return headings
    
    async def _analyze_keywords(self, content: str, url: str) -> List[KeywordData]:
        """Przeanalizuj słowa kluczowe"""
        # Prosta analiza - w prawdziwej implementacji użylibyśmy NLP
        words = re.findall(r'\b[a-zA-Z]{3,}\b', content.lower())
        word_freq = {}
        
        for word in words:
            if word not in ["the", "and", "for", "are", "but", "not", "you", "all", "can", "had", "her", "was", "one", "our", "out", "day", "get", "has", "him", "his", "how", "man", "new", "now", "old", "see", "two", "way", "who", "boy", "did", "its", "let", "put", "say", "she", "too", "use"]:
                word_freq[word] = word_freq.get(word, 0) + 1
        
        # Sortuj według częstotliwości
        top_keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:20]
        
        keywords_data = []
        for keyword, freq in top_keywords:
            keyword_data = KeywordData(
                keyword=keyword,
                search_volume=freq * 100,  # Symulacja
                competition=0.5,  # Symulacja
                cpc=0.5,  # Symulacja
                difficulty=0.6,  # Symulacja
                trends=[freq * 100] * 12,  # Symulacja trendów
                related_keywords=[],  # Symulacja
                intent="informational"  # Symulacja
            )
            keywords_data.append(keyword_data)
        
        return keywords_data
    
    def _calculate_keyword_density(self, content: str, keywords: List[KeywordData]) -> Dict[str, float]:
        """Oblicz gęstość słów kluczowych"""
        total_words = len(content.split())
        density = {}
        
        for keyword_data in keywords[:10]:  # Ogranicz do 10 głównych słów kluczowych
            keyword = keyword_data.keyword
            count = len(re.findall(r'\b' + re.escape(keyword) + r'\b', content, re.IGNORECASE))
            density[keyword] = (count / total_words) * 100 if total_words > 0 else 0
        
        return density
    
    async def _analyze_technical_aspects(self, url: str, content: str) -> float:
        """Przeanalizuj aspekty techniczne"""
        score = 0.0
        
        # Sprawdź obecność meta tagów
        if self._extract_meta_description(content):
            score += 0.2
        
        # Sprawdź obecność tytułu
        if self._extract_title(content):
            score += 0.2
        
        # Sprawdź strukturę nagłówków
        headings = self._analyze_headings(content)
        if headings.get('h1', 0) > 0:
            score += 0.2
        
        # Sprawdź obecność alt tekstów dla obrazków
        images = re.findall(r'<img[^>]*>', content)
        images_with_alt = re.findall(r'<img[^>]*alt=["\'].*?["\'][^>]*>', content)
        if images and len(images_with_alt) / len(images) > 0.8:
            score += 0.2
        
        # Sprawdź obecność linków wewnętrznych
        internal_links = re.findall(r'<a[^>]*href=["\']#["\'].*?["\'][^>]*>', content)
        if internal_links:
            score += 0.2
        
        return min(score, 1.0)
    
    def _calculate_readability_score(self, content: str) -> float:
        """Oblicz wynik czytelności (Flesch Reading Ease)"""
        # Uproszczona wersja - w prawdziwej implementacji użylibyśmy pełnego algorytmu
        sentences = len(re.findall(r'[.!?]+', content))
        words = len(content.split())
        
        if sentences == 0 or words == 0:
            return 0.0
        
        avg_sentence_length = words / sentences
        
        # Im krótsze zdania, tym lepsza czytelność
        if avg_sentence_length < 15:
            return 0.9
        elif avg_sentence_length < 20:
            return 0.7
        elif avg_sentence_length < 25:
            return 0.5
        else:
            return 0.3
    
    def _calculate_content_quality(self, content: str) -> float:
        """Oblicz jakość treści"""
        score = 0.0
        
        # Długość treści
        word_count = len(content.split())
        if word_count >= 1500:
            score += 0.3
        elif word_count >= 1000:
            score += 0.2
        elif word_count >= 500:
            score += 0.1
        
        # Unikalność (symulacja)
        score += 0.3
        
        # Struktura (nagłówki)
        headings = self._analyze_headings(content)
        total_headings = sum(headings.values())
        if total_headings > 5:
            score += 0.2
        elif total_headings > 3:
            score += 0.1
        
        # Obecność multimediów (symulacja)
        if '<img' in content or '<video' in content:
            score += 0.2
        
        return min(score, 1.0)
    
    async def _check_mobile_friendly(self, url: str) -> bool:
        """Sprawdź czy strona jest przyjazna dla urządzeń mobilnych"""
        # Symulacja - w prawdziwej implementacji użylibyśmy Google Mobile-Friendly API
        return True
    
    async def _analyze_page_speed(self, url: str) -> float:
        """Przeanalizuj szybkość strony"""
        # Symulacja - w prawdziwej implementacji użylibyśmy PageSpeed Insights API
        return 0.85
    
    async def _count_backlinks(self, url: str) -> int:
        """Policz linki zwrotne"""
        # Symulacja - w prawdziwej implementacji użylibyśmy Ahrefs API lub podobne
        return 150
    
    async def _calculate_domain_authority(self, url: str) -> float:
        """Oblicz autorytet domeny"""
        # Symulacja - w prawdziwej implementacji użylibyśmy Moz API
        domain = urlparse(url).netloc
        return 0.65
    
    def _optimize_title_score(self, title: str, keywords: List[KeywordData]) -> float:
        """Ocena optymalizacji tytułu"""
        score = 0.0
        
        # Długość tytułu
        if 30 <= len(title) <= 60:
            score += 0.3
        
        # Obecność słów kluczowych
        for keyword in keywords[:3]:
            if keyword.keyword.lower() in title.lower():
                score += 0.2
                break
        
        # Unikalność
        if title:
            score += 0.2
        
        return min(score, 1.0)
    
    def _optimize_meta_score(self, meta_description: str, keywords: List[KeywordData]) -> float:
        """Ocena optymalizacji meta opisu"""
        score = 0.0
        
        # Długość opisu
        if 120 <= len(meta_description) <= 160:
            score += 0.4
        
        # Obecność słów kluczowych
        for keyword in keywords[:3]:
            if keyword.keyword.lower() in meta_description.lower():
                score += 0.3
                break
        
        return min(score, 1.0)
    
    def _generate_related_keywords(self, seed_keyword: str) -> List[str]:
        """Generuj powiązane słowa kluczowe"""
        related = []
        
        # Prosta heurystyka
        prefixes = ["best", "top", "cheap", "premium", "review", "guide", "how to", "what is"]
        suffixes = ["review", "guide", "tips", "comparison", "2024", "for beginners", "vs"]
        
        for prefix in prefixes:
            related.append(f"{prefix} {seed_keyword}")
        
        for suffix in suffixes:
            related.append(f"{seed_keyword} {suffix}")
        
        # Dodaj warianty
        related.extend([
            f"{seed_keyword} alternative",
            f"{seed_keyword} replacement",
            f"buy {seed_keyword}",
            f"{seed_keyword} price",
            f"{seed_keyword} near me"
        ])
        
        return related[:20]  # Ogranicz
    
    async def _get_keyword_metrics(self, keyword: str, language: str, location: str) -> Optional[KeywordData]:
        """Pobierz metryki słowa kluczowego"""
        # Symulacja danych - w prawdziwej implementacji użylibyśmy Google Keyword Planner API
        
        # Oblicz wolumen na podstawie długości słowa
        base_volume = max(100, len(keyword) * 50)
        search_volume = base_volume + (hash(keyword) % 1000)
        
        # Oblicz konkurencję
        competition = min(1.0, len(keyword.split()) * 0.2)
        
        # Oblicz CPC
        cpc = max(0.1, competition * 2.0)
        
        # Oblicz trudność
        difficulty = min(1.0, competition * 1.2)
        
        # Określ intencję
        intent = self._determine_intent([keyword])
        
        return KeywordData(
            keyword=keyword,
            search_volume=search_volume,
            competition=competition,
            cpc=cpc,
            difficulty=difficulty,
            trends=[search_volume] * 12,  # Symulacja
            related_keywords=[],  # Symulacja
            intent=intent
        )
    
    def _determine_intent(self, keywords: List[str]) -> str:
        """Określ intencję użytkownika"""
        for keyword in keywords:
            keyword_lower = keyword.lower()
            
            # Sprawdź komercyjne słowa kluczowe
            for commercial_word in self.high_intent_keywords["commercial"]:
                if commercial_word in keyword_lower:
                    return "commercial"
            
            # Sprawdź transakcyjne
            for transactional_word in self.high_intent_keywords["transactional"]:
                if transactional_word in keyword_lower:
                    return "transactional"
            
            # Sprawdź nawigacyjne
            for navigational_word in self.high_intent_keywords["navigational"]:
                if navigational_word in keyword_lower:
                    return "navigational"
            
            # Sprawdź informacyjne
            for informational_word in self.high_intent_keywords["informational"]:
                if informational_word in keyword_lower:
                    return "informational"
        
        return "informational"  # Domyślnie informacyjne
    
    def _generate_recommendations(self, 
                                 title: str, 
                                 meta_description: str, 
                                 headings: Dict[str, int], 
                                 keywords: List[KeywordData], 
                                 content: str) -> List[str]:
        """Generuj rekomendacje SEO"""
        recommendations = []
        
        # Rekomendacje dla tytułu
        if len(title) < 30:
            recommendations.append("Tytuł jest zbyt krótki. Rozważ dodanie więcej szczegółów.")
        elif len(title) > 60:
            recommendations.append("Tytuł jest zbyt długi. Skróć go do maksymalnie 60 znaków.")
        
        # Rekomendacje dla meta opisu
        if len(meta_description) < 120:
            recommendations.append("Meta opis jest zbyt krótki. Rozważ rozszerzenie go do 120-160 znaków.")
        elif len(meta_description) > 160:
            recommendations.append("Meta opis jest zbyt długi. Skróć go do maksymalnie 160 znaków.")
        
        # Rekomendacje dla nagłówków
        if headings.get('h1', 0) == 0:
            recommendations.append("Brak nagłówka H1. Dodaj główny nagłówek strony.")
        elif headings.get('h1', 0) > 1:
            recommendations.append("Za dużo nagłówków H1. Użyj tylko jednego na stronę.")
        
        # Rekomendacje dla słów kluczowych
        if not keywords:
            recommendations.append("Brak zoptymalizowanych słów kluczowych. Dodaj słowa kluczowe do treści.")
        
        # Rekomendacje dla długości treści
        word_count = len(content.split())
        if word_count < 500:
            recommendations.append("Treść jest zbyt krótka. Rozważ rozszerzenie do minimum 500 słów.")
        
        return recommendations
    
    def _identify_issues(self, 
                        title: str, 
                        meta_description: str, 
                        headings: Dict[str, int], 
                        content: str, 
                        technical_score: float) -> List[Dict[str, Any]]:
        """Zidentyfikuj problemy SEO"""
        issues = []
        
        # Problemy z tytułem
        if not title:
            issues.append({
                "type": "critical",
                "category": "title",
                "issue": "Brak tytułu strony",
                "recommendation": "Dodaj tytuł strony (30-60 znaków)"
            })
        
        # Problemy z meta opisem
        if not meta_description:
            issues.append({
                "type": "warning",
                "category": "meta",
                "issue": "Brak meta opisu",
                "recommendation": "Dodaj meta opis (120-160 znaków)"
            })
        
        # Problemy techniczne
        if technical_score < 0.5:
            issues.append({
                "type": "warning",
                "category": "technical",
                "issue": f"Niski wynik techniczny: {technical_score:.2f}",
                "recommendation": "Popraw strukturę HTML i dodaj brakujące elementy"
            })
        
        return issues
    
    def _optimize_title(self, title: str, keywords: List[str]) -> str:
        """Zoptymalizuj tytuł"""
        if not keywords:
            return title
        
        # Dodaj główne słowo kluczowe jeśli nie jest obecne
        main_keyword = keywords[0]
        if main_keyword.lower() not in title.lower():
            title = f"{main_keyword} - {title}"
        
        # Skróć jeśli za długi
        if len(title) > 60:
            title = title[:57] + "..."
        
        return title
    
    def _optimize_description(self, description: str, keywords: List[str]) -> str:
        """Zoptymalizuj opis"""
        if not description and keywords:
            description = f"Dowiedz się wszystkiego o {keywords[0]}. Kompletny przewodnik i recenzja."
        
        # Dodaj słowa kluczowe jeśli nie są obecne
        for keyword in keywords[:3]:
            if keyword.lower() not in description.lower():
                description = f"{keyword}. {description}"
                break
        
        # Skróć jeśli za długi
        if len(description) > 160:
            description = description[:157] + "..."
        
        return description

# Globalna instancja analizatora
_default_analyzer = None

def get_seo_analyzer() -> SEOAnalyzer:
    """Pobierz globalną instancję SEOAnalyzer"""
    global _default_analyzer
    if _default_analyzer is None:
        _default_analyzer = SEOAnalyzer()
    return _default_analyzer

# Funkcje pomocnicze dla łatwego dostępu
async def analyze_page_seo(url: str, content: Optional[str] = None) -> SEOAnalysis:
    """Przeanalizuj stronę pod kątem SEO"""
    analyzer = get_seo_analyzer()
    return await analyzer.analyze_page(url, content)

async def research_keywords(seed_keywords: List[str], language: str = "en") -> List[KeywordData]:
    """Przeprowadź research słów kluczowych"""
    analyzer = get_seo_analyzer()
    return await analyzer.research_keywords(seed_keywords, language)

async def optimize_meta_tags(title: str, description: str, keywords: List[str]) -> Dict[str, str]:
    """Zoptymalizuj meta tagi"""
    analyzer = get_seo_analyzer()
    return await analyzer.optimize_meta_tags(title, description, keywords)

async def generate_content_outline(topic: str, keywords: List[str], target_length: int = 2000) -> Dict[str, Any]:
    """Wygeneruj outline treści SEO"""
    analyzer = get_seo_analyzer()
    return await analyzer.generate_content_outline(topic, keywords, target_length)
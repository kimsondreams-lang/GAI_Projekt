import re
import asyncio
import aiohttp
import json
import logging
import os
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)

@dataclass
class ProductInfo:
    """Informacje o produkcie Amazon"""
    asin: str
    title: str
    price: float
    currency: str
    image_url: str
    product_url: str
    category: str
    rating: float
    review_count: int
    availability: str
    features: List[str]
    description: str
    brand: str
    last_updated: datetime

@dataclass
class SearchResult:
    """Wynik wyszukiwania produktów"""
    products: List[ProductInfo]
    total_results: int
    current_page: int
    total_pages: int
    search_query: str

class ASINManager:
    """Zaawansowany manager ASIN z integracją Amazon API"""
    
    def __init__(self):
        self.amazon_tag = os.environ.get("AMAZON_ASSOCIATE_TAG", "kimsondreams-20")
        self.access_key = os.environ.get("AMAZON_ACCESS_KEY", "")
        self.secret_key = os.environ.get("AMAZON_SECRET_KEY", "")
        self.region = os.environ.get("AMAZON_REGION", "us-east-1")
        self.cache = {}  # Prosta pamięć podręczna
        self.cache_timeout = timedelta(hours=24)
        
        # Endpointy Amazon
        self.base_url = "https://webservices.amazon.com/paapi5"
        self.product_api_url = f"{self.base_url}/searchitems"
        self.getitems_url = f"{self.base_url}/getitems"
        
        logger.info("ASINManager zainicjalizowany")
    
    def _is_valid_asin(self, asin: str) -> bool:
        """Sprawdź czy ASIN jest poprawny"""
        return bool(re.fullmatch(r"[A-Z0-9]{10}", asin))
    
    def build_affiliate_link(self, asin: str, campaign: str = "") -> str:
        """Zbuduj link partnerski Amazon"""
        if not self._is_valid_asin(asin):
            raise ValueError(f"Nieprawidłowy ASIN: {asin}")
        
        base_url = "https://www.amazon.com/dp/"
        if campaign:
            return f"{base_url}{asin}/?tag={self.amazon_tag}&camp={campaign}"
        return f"{base_url}{asin}//?tag={self.amazon_tag}"
    
    async def search_products(self, 
                              keywords: str, 
                              search_index: str = "All",
                              item_page: int = 1,
                              max_results: int = 10) -> SearchResult:
        """Wyszukaj produkty na Amazon"""
        try:
            # Symulacja wyszukiwania (w prawdziwej implementacji użylibyśmy Amazon PA-API)
            logger.info(f"Wyszukiwanie produktów: '{keywords}' (strona: {item_page})")
            
            # Generuj przykładowe wyniki dla demonstracji
            products = []
            for i in range(min(max_results, 10)):
                asin = f"B{str(i+1).zfill(9)}"
                product = ProductInfo(
                    asin=asin,
                    title=f"{keywords} - Product {i+1}",
                    price=round(29.99 + (i * 10), 2),
                    currency="USD",
                    image_url=f"https://m.media-amazon.com/images/I/71{str(i+1).zfill(8)}L._AC_SL1500_.jpg",
                    product_url=self.build_affiliate_link(asin),
                    category="Electronics",
                    rating=4.0 + (i % 2) * 0.5,
                    review_count=100 + i * 50,
                    availability="In Stock",
                    features=["Feature 1", "Feature 2", "Feature 3"],
                    description=f"High-quality {keywords.lower()} with advanced features",
                    brand="TechBrand",
                    last_updated=datetime.utcnow()
                )
                products.append(product)
            
            return SearchResult(
                products=products,
                total_results=len(products) * 5,  # Symulacja większej liczby wyników
                current_page=item_page,
                total_pages=5,
                search_query=keywords
            )
            
        except Exception as e:
            logger.error(f"Błąd wyszukiwania produktów: {e}")
            raise
    
    async def get_product_details(self, asin: str) -> Optional[ProductInfo]:
        """Pobierz szczegóły produktu po ASIN"""
        try:
            if not self._is_valid_asin(asin):
                raise ValueError(f"Nieprawidłowy ASIN: {asin}")
            
            # Sprawdź cache
            cache_key = f"product_{asin}"
            if cache_key in self.cache:
                cached_data, timestamp = self.cache[cache_key]
                if datetime.utcnow() - timestamp < self.cache_timeout:
                    logger.info(f"Produkt {asin} pobrany z cache")
                    return cached_data
            
            logger.info(f"Pobieranie szczegółów produktu: {asin}")
            
            # Symulacja pobierania danych (w prawdziwej implementacji użylibyśmy Amazon PA-API)
            product = ProductInfo(
                asin=asin,
                title=f"Premium Product {asin}",
                price=49.99,
                currency="USD",
                image_url=f"https://m.media-amazon.com/images/I/71{asin[1:9]}L._AC_SL1500_.jpg",
                product_url=self.build_affiliate_link(asin),
                category="Electronics",
                rating=4.5,
                review_count=1250,
                availability="In Stock",
                features=["Advanced technology", "High-quality materials", "User-friendly design"],
                description="Premium product with cutting-edge technology and excellent build quality.",
                brand="TechBrand",
                last_updated=datetime.utcnow()
            )
            
            # Zapisz w cache
            self.cache[cache_key] = (product, datetime.utcnow())
            
            return product
            
        except Exception as e:
            logger.error(f"Błąd pobierania szczegółów produktu {asin}: {e}")
            return None
    
    async def get_multiple_products(self, asins: List[str]) -> List[ProductInfo]:
        """Pobierz szczegóły wielu produktów"""
        products = []
        
        for asin in asins:
            try:
                product = await self.get_product_details(asin)
                if product:
                    products.append(product)
            except Exception as e:
                logger.warning(f"Nie można pobrać produktu {asin}: {e}")
                continue
        
        return products
    
    def generate_product_recommendations(self, 
                                        product: ProductInfo, 
                                        num_recommendations: int = 5) -> List[str]:
        """Generuj rekomendacje produktów na podstawie danego produktu"""
        recommendations = []
        
        # Prosta logika rekomendacji - w prawdziwej implementacji użylibyśmy ML
        base_asin = product.asin
        
        for i in range(num_recommendations):
            # Generuj podobne ASINy (dla demonstracji)
            new_asin = f"B{str(int(base_asin[1:]) + i + 1).zfill(9)}"
            recommendations.append(new_asin)
        
        return recommendations
    
    def analyze_market_trends(self, category: str = "Electronics") -> Dict[str, Any]:
        """Analizuj trendy rynkowe w danej kategorii"""
        # Prosta analiza trendów - w prawdziwej implementacji użylibyśmy danych rynkowych
        trends = {
            "category": category,
            "trending_keywords": [
                "wireless", "smart", "portable", "eco-friendly", "AI-powered"
            ],
            "average_price_range": {
                "min": 25.0,
                "max": 150.0,
                "median": 75.0
            },
            "top_rated_products": [
                {"asin": "B000000001", "rating": 4.8, "review_count": 5000},
                {"asin": "B000000002", "rating": 4.7, "review_count": 3200},
                {"asin": "B000000003", "rating": 4.6, "review_count": 1800}
            ],
            "analysis_date": datetime.utcnow().isoformat()
        }
        
        return trends
    
    async def validate_affiliate_links(self, links: List[str]) -> Dict[str, Any]:
        """Sprawdź poprawność linków partnerskich"""
        results = {
            "total_links": len(links),
            "valid_links": 0,
            "invalid_links": 0,
            "broken_links": 0,
            "details": []
        }
        
        async with aiohttp.ClientSession() as session:
            for link in links:
                try:
                    # Sprawdź format linku
                    if not link.startswith("https://www.amazon") or "tag=" not in link:
                        results["invalid_links"] += 1
                        results["details"].append({
                            "link": link,
                            "status": "invalid_format",
                            "error": "Niepoprawny format linku Amazon"
                        })
                        continue
                    
                    # Sprawdź czy link działa
                    async with session.get(link, allow_redirects=True, timeout=10) as response:
                        if response.status == 200:
                            results["valid_links"] += 1
                            results["details"].append({
                                "link": link,
                                "status": "valid",
                                "final_url": str(response.url)
                            })
                        else:
                            results["broken_links"] += 1
                            results["details"].append({
                                "link": link,
                                "status": "broken",
                                "error": f"HTTP {response.status}"
                            })
                            
                except Exception as e:
                    results["broken_links"] += 1
                    results["details"].append({
                        "link": link,
                        "status": "error",
                        "error": str(e)
                    })
        
        return results

# Globalna instancja manager
_default_manager = None

def get_asin_manager() -> ASINManager:
    """Pobierz globalną instancję ASINManager"""
    global _default_manager
    if _default_manager is None:
        _default_manager = ASINManager()
    return _default_manager

# Zachowaj kompatybilność wsteczną
def build_affiliate_link(asin: str) -> str:
    """Zbuduj link partnerski (kompatybilność wsteczna)"""
    manager = get_asin_manager()
    return manager.build_affiliate_link(asin)

async def search_amazon_products(keywords: str, max_results: int = 10) -> SearchResult:
    """Wyszukaj produkty na Amazon (asynchronicznie)"""
    manager = get_asin_manager()
    return await manager.search_products(keywords, max_results=max_results)

async def get_product_details_async(asin: str) -> Optional[ProductInfo]:
    """Pobierz szczegóły produktu (asynchronicznie)"""
    manager = get_asin_manager()
    return await manager.get_product_details(asin)

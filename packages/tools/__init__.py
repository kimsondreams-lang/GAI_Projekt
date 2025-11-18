"""
Zaawansowane narzędzia dla GAI Agent
Zawiera system publikacji, ASIN management, SEO analizę, generowanie treści i analitykę
"""

from .publisher import (
    FTPPublisher,
    PublishConfig,
    get_publisher,
    stage_article_package,
    publish_article_package
)

from .asin import (
    ASINManager,
    ProductInfo,
    SearchResult,
    get_asin_manager,
    build_affiliate_link,
    search_amazon_products,
    get_product_details_async
)

from .seo import (
    SEOAnalyzer,
    KeywordData,
    SEOAnalysis,
    CompetitorAnalysis,
    get_seo_analyzer,
    analyze_page_seo,
    research_keywords,
    optimize_meta_tags,
    generate_content_outline
)

from .content import (
    ContentGenerator,
    ContentTemplate,
    ContentSection,
    GeneratedContent,
    get_content_generator,
    generate_content,
    optimize_content
)

from .analytics import (
    AnalyticsTracker,
    PageMetrics,
    ContentPerformance,
    UserJourney,
    ConversionEvent,
    get_analytics_tracker,
    track_page_view,
    track_conversion,
    get_analytics_dashboard,
    generate_performance_report
)

from .schema import (
    build_schema
)

__all__ = [
    # Publisher
    'FTPPublisher',
    'PublishConfig',
    'get_publisher',
    'stage_article_package',
    'publish_article_package',
    
    # ASIN Manager
    'ASINManager',
    'ProductInfo',
    'SearchResult',
    'get_asin_manager',
    'build_affiliate_link',
    'search_amazon_products',
    'get_product_details_async',
    
    # SEO
    'SEOAnalyzer',
    'KeywordData',
    'SEOAnalysis',
    'CompetitorAnalysis',
    'get_seo_analyzer',
    'analyze_page_seo',
    'research_keywords',
    'optimize_meta_tags',
    'generate_content_outline',
    
    # Content Generator
    'ContentGenerator',
    'ContentTemplate',
    'ContentSection',
    'GeneratedContent',
    'get_content_generator',
    'generate_content',
    'optimize_content',
    
    # Analytics
    'AnalyticsTracker',
    'PageMetrics',
    'ContentPerformance',
    'UserJourney',
    'ConversionEvent',
    'get_analytics_tracker',
    'track_page_view',
    'track_conversion',
    'get_analytics_dashboard',
    'generate_performance_report',
    
    # Schema
    'build_schema'
]

__version__ = "2.0.0"
__author__ = "GAI Agent"
__description__ = "Zaawansowane narzędzia dla autonomicznego agenta AI"
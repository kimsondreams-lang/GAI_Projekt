"""
Zaawansowany system rejestru modeli AI dla GAI
Zawiera konfiguracje wszystkich dostępnych modeli, ich mapowania do zadań,
kosztorysowanie, wydajność i zalecenia użycia
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class ModelCapability(Enum):
    """Możliwości modeli"""
    TEXT = "text"
    CHAT = "chat"
    VISION = "vision"
    CODE = "code"
    ANALYSIS = "analysis"
    REASONING = "reasoning"
    CREATIVITY = "creativity"
    MULTILINGUAL = "multilingual"
    LONG_FORM = "long_form"
    REAL_TIME = "real_time"
    EMBEDDING = "embedding"

class ModelTier(Enum):
    """Poziomy modeli"""
    PREMIUM = "premium"      # Najwyższa jakość, najwyższy koszt
    ADVANCED = "advanced"    # Wysoka jakość, średni koszt
    STANDARD = "standard"    # Dobra jakość, niski koszt
    FAST = "fast"           # Szybki, bardzo niski koszt

@dataclass
class ModelConfig:
    """Konfiguracja modelu"""
    provider: str
    model_name: str
    display_name: str
    description: str
    tier: ModelTier
    max_tokens: int
    cost_per_1k_input: float
    cost_per_1k_output: float
    capabilities: List[ModelCapability]
    temperature_range: tuple[float, float]
    recommended_temperature: float
    supports_system_prompt: bool
    supports_streaming: bool
    supports_tools: bool
    fallback_models: List[str]
    use_cases: List[str]
    performance_score: float  # 0-10
    quality_score: float    # 0-10
    speed_score: float      # 0-10

# Zaawansowany rejestr modeli
ADVANCED_MODEL_REGISTRY = {
    # === OPENAI MODELS ===
    "gpt4_turbo": ModelConfig(
        provider="openai",
        model_name="gpt-4-turbo-preview",
        display_name="GPT-4 Turbo",
        description="Najnowszy model GPT-4 z najlepszymi wynikami",
        tier=ModelTier.PREMIUM,
        max_tokens=128000,
        cost_per_1k_input=0.01,
        cost_per_1k_output=0.03,
        capabilities=[
            ModelCapability.TEXT, ModelCapability.CHAT, ModelCapability.ANALYSIS,
            ModelCapability.REASONING, ModelCapability.CREATIVITY, ModelCapability.MULTILINGUAL,
            ModelCapability.LONG_FORM, ModelCapability.VISION
        ],
        temperature_range=(0.0, 2.0),
        recommended_temperature=0.7,
        supports_system_prompt=True,
        supports_streaming=True,
        supports_tools=True,
        fallback_models=["claude_opus", "gpt4"],
        use_cases=["analiza złożonych danych", "pisanie zaawansowanych treści", "kodowanie", "debugging"],
        performance_score=9.5,
        quality_score=9.8,
        speed_score=7.5
    ),
    
    "gpt4": ModelConfig(
        provider="openai",
        model_name="gpt-4",
        display_name="GPT-4",
        description="Standardowy GPT-4 z wysoką jakością",
        tier=ModelTier.PREMIUM,
        max_tokens=8192,
        cost_per_1k_input=0.03,
        cost_per_1k_output=0.06,
        capabilities=[
            ModelCapability.TEXT, ModelCapability.CHAT, ModelCapability.ANALYSIS,
            ModelCapability.REASONING, ModelCapability.CREATIVITY, ModelCapability.MULTILINGUAL
        ],
        temperature_range=(0.0, 2.0),
        recommended_temperature=0.7,
        supports_system_prompt=True,
        supports_streaming=True,
        supports_tools=True,
        fallback_models=["claude_opus", "gpt4_turbo"],
        use_cases=["analiza danych", "pisanie treści", "kodowanie", "tłumaczenia"],
        performance_score=9.0,
        quality_score=9.5,
        speed_score=6.5
    ),
    
    "gpt35_turbo": ModelConfig(
        provider="openai",
        model_name="gpt-3.5-turbo",
        display_name="GPT-3.5 Turbo",
        description="Szybki i wydajny model do codziennych zadań",
        tier=ModelTier.STANDARD,
        max_tokens=4096,
        cost_per_1k_input=0.0005,
        cost_per_1k_output=0.0015,
        capabilities=[
            ModelCapability.TEXT, ModelCapability.CHAT, ModelCapability.ANALYSIS,
            ModelCapability.MULTILINGUAL, ModelCapability.REAL_TIME
        ],
        temperature_range=(0.0, 2.0),
        recommended_temperature=0.7,
        supports_system_prompt=True,
        supports_streaming=True,
        supports_tools=True,
        fallback_models=["claude_haiku", "deepseek_chat"],
        use_cases=["czaty", "proste analizy", "tłumaczenia", "podsumowania"],
        performance_score=7.5,
        quality_score=7.8,
        speed_score=9.0
    ),
    
    # === ANTHROPIC MODELS ===
    "claude_opus": ModelConfig(
        provider="anthropic",
        model_name="claude-3-opus-20240229",
        display_name="Claude 3 Opus",
        description="Najpotężniejszy model Claude z doskonałym rozumowaniem",
        tier=ModelTier.PREMIUM,
        max_tokens=200000,
        cost_per_1k_input=0.015,
        cost_per_1k_output=0.075,
        capabilities=[
            ModelCapability.TEXT, ModelCapability.CHAT, ModelCapability.ANALYSIS,
            ModelCapability.REASONING, ModelCapability.CREATIVITY, ModelCapability.MULTILINGUAL,
            ModelCapability.LONG_FORM, ModelCapability.VISION, ModelCapability.CODE
        ],
        temperature_range=(0.0, 1.0),
        recommended_temperature=0.5,
        supports_system_prompt=True,
        supports_streaming=True,
        supports_tools=True,
        fallback_models=["gpt4_turbo", "claude_sonnet"],
        use_cases=["zaawansowana analiza", "pisanie kreatywne", "kodowanie", "badania"],
        performance_score=9.8,
        quality_score=9.7,
        speed_score=6.0
    ),
    
    "claude_sonnet": ModelConfig(
        provider="anthropic",
        model_name="claude-3-sonnet-20240229",
        display_name="Claude 3 Sonnet",
        description="Zbalansowany model Claude z dobrą jakością i szybkością",
        tier=ModelTier.ADVANCED,
        max_tokens=200000,
        cost_per_1k_input=0.003,
        cost_per_1k_output=0.015,
        capabilities=[
            ModelCapability.TEXT, ModelCapability.CHAT, ModelCapability.ANALYSIS,
            ModelCapability.REASONING, ModelCapability.CREATIVITY, ModelCapability.MULTILINGUAL,
            ModelCapability.LONG_FORM, ModelCapability.VISION, ModelCapability.CODE
        ],
        temperature_range=(0.0, 1.0),
        recommended_temperature=0.7,
        supports_system_prompt=True,
        supports_streaming=True,
        supports_tools=True,
        fallback_models=["claude_opus", "gpt4_turbo"],
        use_cases=["analiza danych", "pisanie treści", "kodowanie", "tłumaczenia"],
        performance_score=8.5,
        quality_score=8.8,
        speed_score=7.5
    ),
    
    "claude_haiku": ModelConfig(
        provider="anthropic",
        model_name="claude-3-haiku-20240307",
        display_name="Claude 3 Haiku",
        description="Najszybszy model Claude do szybkich odpowiedzi",
        tier=ModelTier.FAST,
        max_tokens=200000,
        cost_per_1k_input=0.00025,
        cost_per_1k_output=0.00125,
        capabilities=[
            ModelCapability.TEXT, ModelCapability.CHAT, ModelCapability.ANALYSIS,
            ModelCapability.MULTILINGUAL, ModelCapability.REAL_TIME, ModelCapability.VISION
        ],
        temperature_range=(0.0, 1.0),
        recommended_temperature=0.7,
        supports_system_prompt=True,
        supports_streaming=True,
        supports_tools=True,
        fallback_models=["gpt35_turbo", "deepseek_chat"],
        use_cases=["czaty", "szybkie odpowiedzi", "proste analizy", "podsumowania"],
        performance_score=7.0,
        quality_score=7.5,
        speed_score=9.5
    ),
    
    # === DEEPSEEK MODELS ===
    "deepseek_chat": ModelConfig(
        provider="deepseek",
        model_name="deepseek-chat",
        display_name="DeepSeek Chat",
        description="Uniwersalny model konwersacyjny z doskonałym stosunkiem jakości do ceny",
        tier=ModelTier.STANDARD,
        max_tokens=32768,
        cost_per_1k_input=0.00007,
        cost_per_1k_output=0.00014,
        capabilities=[
            ModelCapability.TEXT, ModelCapability.CHAT, ModelCapability.ANALYSIS,
            ModelCapability.REASONING, ModelCapability.MULTILINGUAL, ModelCapability.CODE
        ],
        temperature_range=(0.0, 2.0),
        recommended_temperature=0.7,
        supports_system_prompt=True,
        supports_streaming=True,
        supports_tools=False,
        fallback_models=["gpt35_turbo", "claude_haiku"],
        use_cases=["czaty", "analiza", "kodowanie", "tłumaczenia"],
        performance_score=8.0,
        quality_score=8.2,
        speed_score=8.0
    ),
    
    "deepseek_coder": ModelConfig(
        provider="deepseek",
        model_name="deepseek-coder",
        display_name="DeepSeek Coder",
        description="Wyspecjalizowany model do kodowania i programowania",
        tier=ModelTier.ADVANCED,
        max_tokens=16384,
        cost_per_1k_input=0.00007,
        cost_per_1k_output=0.00014,
        capabilities=[
            ModelCapability.CODE, ModelCapability.ANALYSIS, ModelCapability.REASONING,
            ModelCapability.MULTILINGUAL
        ],
        temperature_range=(0.0, 2.0),
        recommended_temperature=0.2,
        supports_system_prompt=True,
        supports_streaming=True,
        supports_tools=False,
        fallback_models=["gpt4", "claude_sonnet"],
        use_cases=["kodowanie", "debugging", "code review", "algorytmy"],
        performance_score=8.8,
        quality_score=8.5,
        speed_score=8.0
    ),
    
    # === EMBEDDING MODELS ===
    "text_embedding_ada": ModelConfig(
        provider="openai",
        model_name="text-embedding-ada-002",
        display_name="Text Embedding Ada",
        description="Standardowy model do embeddingów tekstowych",
        tier=ModelTier.STANDARD,
        max_tokens=8191,
        cost_per_1k_input=0.0001,
        cost_per_1k_output=0.0,
        capabilities=[ModelCapability.EMBEDDING],
        temperature_range=(0.0, 0.0),
        recommended_temperature=0.0,
        supports_system_prompt=False,
        supports_streaming=False,
        supports_tools=False,
        fallback_models=["text_embedding_3_small"],
        use_cases=["embeddingi", "wyszukiwanie semantyczne", "klasyfikacja"],
        performance_score=8.0,
        quality_score=8.0,
        speed_score=8.0
    ),
    
    "text_embedding_3_small": ModelConfig(
        provider="openai",
        model_name="text-embedding-3-small",
        display_name="Text Embedding 3 Small",
        description="Nowoczesny model do embeddingów z lepszą wydajnością",
        tier=ModelTier.FAST,
        max_tokens=8191,
        cost_per_1k_input=0.00002,
        cost_per_1k_output=0.0,
        capabilities=[ModelCapability.EMBEDDING],
        temperature_range=(0.0, 0.0),
        recommended_temperature=0.0,
        supports_system_prompt=False,
        supports_streaming=False,
        supports_tools=False,
        fallback_models=["text_embedding_ada"],
        use_cases=["embeddingi", "wyszukiwanie semantyczne", "klasyfikacja"],
        performance_score=8.5,
        quality_score=8.2,
        speed_score=9.0
    )
}

# Mapowanie zadań do modeli z priorytetami
TASK_MODEL_MAPPING = {
    # Konwersacja i czaty
    "chat_general": ["claude_haiku", "gpt35_turbo", "deepseek_chat", "claude_sonnet"],
    "chat_advanced": ["claude_sonnet", "gpt4_turbo", "claude_opus", "deepseek_chat"],
    "chat_premium": ["claude_opus", "gpt4_turbo", "claude_sonnet"],
    
    # Generowanie treści
    "content_generation": ["claude_sonnet", "gpt4_turbo", "deepseek_chat", "claude_opus"],
    "content_advanced": ["claude_opus", "gpt4_turbo", "claude_sonnet"],
    "content_creative": ["claude_opus", "claude_sonnet", "gpt4_turbo"],
    "content_technical": ["gpt4_turbo", "claude_sonnet", "deepseek_coder"],
    
    # Kodowanie i programowanie
    "code_generation": ["deepseek_coder", "gpt4_turbo", "claude_sonnet", "claude_opus"],
    "code_analysis": ["gpt4_turbo", "claude_sonnet", "claude_opus", "deepseek_coder"],
    "code_debugging": ["claude_opus", "gpt4_turbo", "deepseek_coder"],
    "code_review": ["claude_sonnet", "gpt4_turbo", "deepseek_coder"],
    
    # Analiza i wnioskowanie
    "text_analysis": ["claude_sonnet", "gpt4_turbo", "claude_haiku", "deepseek_chat"],
    "data_extraction": ["gpt4_turbo", "claude_sonnet", "claude_opus"],
    "reasoning": ["claude_opus", "gpt4_turbo", "claude_sonnet"],
    "research": ["claude_opus", "gpt4_turbo", "claude_sonnet"],
    
    # SEO i marketing
    "seo_optimization": ["gpt35_turbo", "claude_haiku", "deepseek_chat"],
    "keyword_research": ["deepseek_chat", "gpt35_turbo", "claude_haiku"],
    "meta_generation": ["claude_haiku", "gpt35_turbo", "deepseek_chat"],
    
    # Szybkie zadania
    "fast_response": ["claude_haiku", "gpt35_turbo", "deepseek_chat"],
    "simple_task": ["gpt35_turbo", "claude_haiku", "deepseek_chat"],
    "real_time": ["claude_haiku", "gpt35_turbo"],
    
    # Embeddingi
    "embedding": ["text_embedding_3_small", "text_embedding_ada"],
    "semantic_search": ["text_embedding_3_small", "text_embedding_ada"],
    "classification": ["text_embedding_3_small", "text_embedding_ada"]
}

def get_model_config(model_key: str) -> Optional[ModelConfig]:
    """
    Pobieranie konfiguracji modelu po kluczu
    
    Args:
        model_key: Klucz modelu z rejestru
        
    Returns:
        Konfiguracja modelu lub None
    """
    return ADVANCED_MODEL_REGISTRY.get(model_key)

def get_models_for_task(task_label: str, max_cost: Optional[float] = None) -> List[str]:
    """
    Pobieranie listy modeli dla zadania z opcjonalnym filtrem kosztów
    
    Args:
        task_label: Etykieta zadania
        max_cost: Maksymalny koszt na 1k tokenów (opcjonalny)
        
    Returns:
        Lista kluczy modeli posortowanych według priorytetu
    """
    if task_label not in TASK_MODEL_MAPPING:
        logger.warning(f"Nieznane zadanie: {task_label}, używam domyślnych modeli")
        return ["gpt35_turbo", "claude_haiku", "deepseek_chat"]
    
    models = TASK_MODEL_MAPPING[task_label]
    
    if max_cost is not None:
        # Filtrowanie po koszcie
        filtered_models = []
        for model_key in models:
            config = get_model_config(model_key)
            if config and config.cost_per_1k_input <= max_cost:
                filtered_models.append(model_key)
        
        if filtered_models:
            return filtered_models
        else:
            logger.warning(f"Brak modeli w zadanym budżecie ${max_cost}, używam wszystkich")
    
    return models

def get_best_model_for_task(task_label: str, criteria: str = "balanced") -> str:
    """
    Pobieranie najlepszego modelu dla zadania według kryteriów
    
    Args:
        task_label: Etykieta zadania
        criteria: "quality", "speed", "cost", "balanced"
        
    Returns:
        Klucz najlepszego modelu
    """
    models = get_models_for_task(task_label)
    
    if not models:
        return "gpt35_turbo"  # Domyślny model
    
    if criteria == "quality":
        # Sortuj według quality_score malejąco
        scored_models = [(m, get_model_config(m).quality_score) for m in models if get_model_config(m)]
        return max(scored_models, key=lambda x: x[1])[0] if scored_models else models[0]
    
    elif criteria == "speed":
        # Sortuj według speed_score malejąco
        scored_models = [(m, get_model_config(m).speed_score) for m in models if get_model_config(m)]
        return max(scored_models, key=lambda x: x[1])[0] if scored_models else models[0]
    
    elif criteria == "cost":
        # Sortuj według kosztu rosnąco
        cost_models = [(m, get_model_config(m).cost_per_1k_input) for m in models if get_model_config(m)]
        return min(cost_models, key=lambda x: x[1])[0] if cost_models else models[0]
    
    else:  # balanced
        # Balansuj między jakością, szybkością i kosztem
        scored_models = []
        for model_key in models:
            config = get_model_config(model_key)
            if config:
                # Oblicz wynik zbalansowany (normalizuj koszt)
                cost_score = max(0, 10 - (config.cost_per_1k_input * 1000))  # Niższy koszt = wyższy wynik
                balanced_score = (config.quality_score * 0.4 + config.speed_score * 0.3 + cost_score * 0.3)
                scored_models.append((model_key, balanced_score))
        
        return max(scored_models, key=lambda x: x[1])[0] if scored_models else models[0]

def get_model_cost_estimate(model_key: str, input_tokens: int, output_tokens: int = 0) -> float:
    """
    Szacowanie kosztu użycia modelu
    
    Args:
        model_key: Klucz modelu
        input_tokens: Liczba tokenów wejściowych
        output_tokens: Liczba tokenów wyjściowych (opcjonalne)
        
    Returns:
        Szacowany koszt w USD
    """
    config = get_model_config(model_key)
    if not config:
        return 0.0
    
    input_cost = (input_tokens / 1000) * config.cost_per_1k_input
    output_cost = (output_tokens / 1000) * config.cost_per_1k_output
    return input_cost + output_cost

def get_model_capabilities(model_key: str) -> List[str]:
    """
    Pobieranie listy możliwości modelu
    
    Args:
        model_key: Klucz modelu
        
    Returns:
        Lista możliwości jako stringi
    """
    config = get_model_config(model_key)
    if not config:
        return []
    
    return [cap.value for cap in config.capabilities]

def list_all_models() -> List[Dict[str, Any]]:
    """
    Lista wszystkich dostępnych modeli z podstawowymi informacjami
    
    Returns:
        Lista słowników z informacjami o modelach
    """
    models = []
    for model_key, config in ADVANCED_MODEL_REGISTRY.items():
        models.append({
            "key": model_key,
            "provider": config.provider,
            "display_name": config.display_name,
            "tier": config.tier.value,
            "max_tokens": config.max_tokens,
            "cost_per_1k_input": config.cost_per_1k_input,
            "cost_per_1k_output": config.cost_per_1k_output,
            "capabilities": [cap.value for cap in config.capabilities],
            "performance_score": config.performance_score,
            "quality_score": config.quality_score,
            "speed_score": config.speed_score
        })
    
    return models

def get_registry_summary() -> Dict[str, Any]:
    """
    Pobieranie podsumowania rejestru
    
    Returns:
        Podsumowanie rejestru
    """
    total_models = len(ADVANCED_MODEL_REGISTRY)
    providers = set(config.provider for config in ADVANCED_MODEL_REGISTRY.values())
    
    tier_counts = {}
    for config in ADVANCED_MODEL_REGISTRY.values():
        tier = config.tier.value
        tier_counts[tier] = tier_counts.get(tier, 0) + 1
    
    total_tasks = len(TASK_MODEL_MAPPING)
    
    return {
        "total_models": total_models,
        "providers": list(providers),
        "tier_distribution": tier_counts,
        "total_tasks": total_tasks,
        "models_per_task": {task: len(models) for task, models in TASK_MODEL_MAPPING.items()}
    }
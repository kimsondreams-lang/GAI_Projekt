"""
System rejestru modeli AI dla GAI
Zawiera konfiguracje wszystkich dostępnych modeli i ich mapowania do zadań
"""

from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

# Globalny rejestr modeli
MODEL_REGISTRY = {
    "models": {
        # Modele szybkie i tanie do prostych zadań
        "fast_general": {
            "provider": "openai",
            "model_name": "gpt-3.5-turbo",
            "description": "Szybki model do prostych zadań",
            "temperature": 0.7,
            "max_tokens": 1000,
            "cost_per_1k_input": 0.0005,
            "cost_per_1k_output": 0.0015,
            "capabilities": ["text", "chat", "simple_reasoning"],
            "fallback_model": "deepseek_chat"
        },
        
        # Modele do konwersacji i chatu
        "chat_general": {
            "provider": "openai",
            "model_name": "gpt-3.5-turbo",
            "description": "Model do ogólnych konwersacji",
            "temperature": 0.8,
            "max_tokens": 1500,
            "cost_per_1k_input": 0.0005,
            "cost_per_1k_output": 0.0015,
            "capabilities": ["chat", "text", "conversation"],
            "fallback_model": "claude_haiku"
        },
        
        "chat_advanced": {
            "provider": "anthropic",
            "model_name": "claude-3-haiku-20240307",
            "description": "Zaawansowany model do konwersacji",
            "temperature": 0.7,
            "max_tokens": 2000,
            "cost_per_1k_input": 0.00025,
            "cost_per_1k_output": 0.00125,
            "capabilities": ["chat", "text", "reasoning", "analysis"],
            "fallback_model": "gpt4_turbo"
        },
        
        # Modele do generowania treści
        "content_generation": {
            "provider": "anthropic",
            "model_name": "claude-3-sonnet-20240229",
            "description": "Model do generowania treści i artykułów",
            "temperature": 0.8,
            "max_tokens": 3000,
            "cost_per_1k_input": 0.003,
            "cost_per_1k_output": 0.015,
            "capabilities": ["content", "writing", "creativity", "long_form"],
            "fallback_model": "gpt4_turbo"
        },
        
        "content_advanced": {
            "provider": "openai",
            "model_name": "gpt-4-turbo-preview",
            "description": "Zaawansowany model do generowania treści",
            "temperature": 0.7,
            "max_tokens": 4000,
            "cost_per_1k_input": 0.01,
            "cost_per_1k_output": 0.03,
            "capabilities": ["content", "writing", "analysis", "long_form", "complex_reasoning"],
            "fallback_model": "claude_sonnet"
        },
        
        # Modele do kodowania i technicznych zadań
        "code_generation": {
            "provider": "deepseek",
            "model_name": "deepseek-coder",
            "description": "Wyspecjalizowany model do kodowania",
            "temperature": 0.2,
            "max_tokens": 2000,
            "cost_per_1k_input": 0.00007,
            "cost_per_1k_output": 0.00014,
            "capabilities": ["code", "programming", "debugging", "technical"],
            "fallback_model": "gpt4_turbo"
        },
        
        "code_analysis": {
            "provider": "openai",
            "model_name": "gpt-4",
            "description": "Model do analizy kodu",
            "temperature": 0.3,
            "max_tokens": 2500,
            "cost_per_1k_input": 0.03,
            "cost_per_1k_output": 0.06,
            "capabilities": ["code", "analysis", "debugging", "review"],
            "fallback_model": "claude_sonnet"
        },
        
        # Modele do SEO i optymalizacji
        "seo_optimization": {
            "provider": "openai",
            "model_name": "gpt-3.5-turbo",
            "description": "Model do optymalizacji SEO",
            "temperature": 0.5,
            "max_tokens": 1000,
            "cost_per_1k_input": 0.0005,
            "cost_per_1k_output": 0.0015,
            "capabilities": ["seo", "keywords", "optimization", "meta"],
            "fallback_model": "claude_haiku"
        },
        
        "keyword_research": {
            "provider": "deepseek",
            "model_name": "deepseek-chat",
            "description": "Model do badania słów kluczowych",
            "temperature": 0.6,
            "max_tokens": 1500,
            "cost_per_1k_input": 0.00007,
            "cost_per_1k_output": 0.00014,
            "capabilities": ["keywords", "research", "analysis", "trends"],
            "fallback_model": "gpt35_turbo"
        },
        
        # Modele do analizy i podsumowania
        "text_analysis": {
            "provider": "anthropic",
            "model_name": "claude-3-haiku-20240307",
            "description": "Model do analizy tekstu",
            "temperature": 0.3,
            "max_tokens": 2000,
            "cost_per_1k_input": 0.00025,
            "cost_per_1k_output": 0.00125,
            "capabilities": ["analysis", "summarization", "extraction"],
            "fallback_model": "gpt35_turbo"
        },
        
        "data_extraction": {
            "provider": "openai",
            "model_name": "gpt-4",
            "description": "Model do ekstrakcji danych",
            "temperature": 0.2,
            "max_tokens": 1500,
            "cost_per_1k_input": 0.03,
            "cost_per_1k_output": 0.06,
            "capabilities": ["extraction", "structured_data", "parsing"],
            "fallback_model": "claude_sonnet"
        },
        
        # Modele premium do złożonych zadań
        "premium_reasoning": {
            "provider": "anthropic",
            "model_name": "claude-3-opus-20240229",
            "description": "Najpotężniejszy model do złożonego rozumowania",
            "temperature": 0.4,
            "max_tokens": 4000,
            "cost_per_1k_input": 0.015,
            "cost_per_1k_output": 0.075,
            "capabilities": ["reasoning", "complex_analysis", "problem_solving", "research"],
            "fallback_model": "gpt4_turbo"
        },
        
        "gpt4_turbo": {
            "provider": "openai",
            "model_name": "gpt-4-turbo-preview",
            "description": "GPT-4 Turbo dla złożonych zadań",
            "temperature": 0.5,
            "max_tokens": 4000,
            "cost_per_1k_input": 0.01,
            "cost_per_1k_output": 0.03,
            "capabilities": ["reasoning", "complex_analysis", "problem_solving"],
            "fallback_model": "claude_opus"
        },
        
        "claude_opus": {
            "provider": "anthropic",
            "model_name": "claude-3-opus-20240229",
            "description": "Claude 3 Opus",
            "temperature": 0.5,
            "max_tokens": 4000,
            "cost_per_1k_input": 0.015,
            "cost_per_1k_output": 0.075,
            "capabilities": ["reasoning", "complex_analysis", "problem_solving", "creativity"]
        },
        
        "claude_sonnet": {
            "provider": "anthropic",
            "model_name": "claude-3-sonnet-20240229",
            "description": "Claude 3 Sonnet",
            "temperature": 0.5,
            "max_tokens": 3000,
            "cost_per_1k_input": 0.003,
            "cost_per_1k_output": 0.015,
            "capabilities": ["text", "analysis", "reasoning"]
        },
        
        "claude_haiku": {
            "provider": "anthropic",
            "model_name": "claude-3-haiku-20240307",
            "description": "Claude 3 Haiku",
            "temperature": 0.7,
            "max_tokens": 2000,
            "cost_per_1k_input": 0.00025,
            "cost_per_1k_output": 0.00125,
            "capabilities": ["text", "chat", "simple_analysis"]
        },
        
        "gpt35_turbo": {
            "provider": "openai",
            "model_name": "gpt-3.5-turbo",
            "description": "GPT-3.5 Turbo",
            "temperature": 0.7,
            "max_tokens": 2000,
            "cost_per_1k_input": 0.0005,
            "cost_per_1k_output": 0.0015,
            "capabilities": ["text", "chat", "simple_reasoning"]
        },
        
        "deepseek_chat": {
            "provider": "deepseek",
            "model_name": "deepseek-chat",
            "description": "DeepSeek Chat",
            "temperature": 0.7,
            "max_tokens": 3000,
            "cost_per_1k_input": 0.00007,
            "cost_per_1k_output": 0.00014,
            "capabilities": ["text", "chat", "reasoning", "multilingual"]
        }
    },
    
    # Mapowanie zadań do modeli
    "task_mappings": {
        "chat": ["chat_general", "chat_advanced"],
        "content_generation": ["content_generation", "content_advanced"],
        "code_generation": ["code_generation", "code_analysis"],
        "code_analysis": ["code_analysis", "code_generation"],
        "seo_optimization": ["seo_optimization", "keyword_research"],
        "keyword_research": ["keyword_research", "seo_optimization"],
        "text_analysis": ["text_analysis", "data_extraction"],
        "data_extraction": ["data_extraction", "text_analysis"],
        "premium_analysis": ["premium_reasoning", "gpt4_turbo", "claude_opus"],
        "simple_task": ["fast_general", "gpt35_turbo", "claude_haiku"],
        "embedding": ["text_embedding_ada", "text_embedding_3_small"]
    },
    
    # Modele do embeddingów
    "embedding_models": {
        "text_embedding_ada": {
            "provider": "openai",
            "model_name": "text-embedding-ada-002",
            "description": "Standardowy model do embeddingów",
            "dimensions": 1536,
            "cost_per_1k_tokens": 0.0001
        },
        "text_embedding_3_small": {
            "provider": "openai",
            "model_name": "text-embedding-3-small",
            "description": "Nowszy, wydajniejszy model do embeddingów",
            "dimensions": 1536,
            "cost_per_1k_tokens": 0.00002
        },
        "text_embedding_3_large": {
            "provider": "openai",
            "model_name": "text-embedding-3-large",
            "description": "Potężny model do embeddingów",
            "dimensions": 3072,
            "cost_per_1k_tokens": 0.00013
        }
    }
}

def get_registry() -> Dict[str, Any]:
    """
    Pobieranie globalnego rejestru modeli
    
    Returns:
        Słownik z konfiguracją modeli
    """
    return MODEL_REGISTRY

def get_model_config(task_label: str) -> Dict[str, Any]:
    """
    Pobieranie konfiguracji modelu dla danego zadania
    
    Args:
        task_label: Etykieta zadania
        
    Returns:
        Konfiguracja modelu lub domyślna konfiguracja
    """
    registry = get_registry()
    
    # Sprawdzenie czy task_label jest bezpośrednio w rejestrze
    if task_label in registry["models"]:
        return registry["models"][task_label]
    
    # Sprawdzenie mapowania zadań
    if task_label in registry["task_mappings"]:
        model_labels = registry["task_mappings"][task_label]
        for model_label in model_labels:
            if model_label in registry["models"]:
                return registry["models"][model_label]
    
    # Domyślny model
    logger.warning(f"No model configuration found for task: {task_label}, using default")
    return registry["models"]["fast_general"]

def get_fallback_model(task_label: str, failed_model: str) -> Dict[str, Any]:
    """
    Pobieranie modelu zapasowego
    
    Args:
        task_label: Etykieta zadania
        failed_model: Model który nie działa
        
    Returns:
        Konfiguracja modelu zapasowego
    """
    registry = get_registry()
    
    # Pobieranie listy modeli dla zadania
    if task_label in registry["task_mappings"]:
        model_labels = registry["task_mappings"][task_label]
        
        # Znajdź pierwszy model który nie jest failed_model
        for model_label in model_labels:
            model_config = registry["models"].get(model_label)
            if model_config and model_config["model_name"] != failed_model:
                logger.info(f"Using fallback model {model_label} for task {task_label}")
                return model_config
    
    # Użyj domyślnego modelu jako ostatecznego fallback
    logger.warning(f"No suitable fallback model found for task {task_label}, using default")
    return registry["models"]["fast_general"]

def list_available_models() -> List[str]:
    """
    Lista wszystkich dostępnych modeli
    
    Returns:
        Lista nazw modeli
    """
    registry = get_registry()
    return list(registry["models"].keys())

def list_available_providers() -> List[str]:
    """
    Lista wszystkich dostępnych providerów
    
    Returns:
        Lista nazw providerów
    """
    registry = get_registry()
    providers = set()
    
    for model_config in registry["models"].values():
        providers.add(model_config["provider"])
    
    return list(providers)

def get_models_by_provider(provider: str) -> List[Dict[str, Any]]:
    """
    Pobieranie wszystkich modeli dla danego providera
    
    Args:
        provider: Nazwa providera
        
    Returns:
        Lista konfiguracji modeli
    """
    registry = get_registry()
    models = []
    
    for model_label, model_config in registry["models"].items():
        if model_config["provider"] == provider:
            models.append({
                "label": model_label,
                "config": model_config
            })
    
    return models
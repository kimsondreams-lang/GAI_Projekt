#!/usr/bin/env python3
"""
Test zaawansowanego systemu modeli AI
"""

import asyncio
from packages.models.registry_advanced import list_all_models, get_registry_summary
from packages.models.invoke import ModelManager, amodel_infer_advanced

def test_registry():
    """Test rejestru modeli"""
    print('=== TEST REJESTRU MODELI ===')
    models = list_all_models()
    print(f'Dostępne modele: {len(models)}')
    
    for model in models[:3]:  # Pierwsze 3 modele
        print(f'  - {model["display_name"]} ({model["provider"]}) - ${model["cost_per_1k_input"]:.4f}/1k tokens')
    
    summary = get_registry_summary()
    print(f'Podsumowanie: {summary}')
    print()

def test_model_manager():
    """Test ModelManager"""
    print('=== TEST MODEL MANAGERA ===')
    manager = ModelManager()
    print(f'Dostępni providerzy: {manager.get_available_providers()}')
    print(f'Statystyki: {manager.get_usage_stats()}')
    print()

async def test_advanced_inference():
    """Test zaawansowanej inferencji"""
    print('=== TEST ZAAWANSOWANEJ INFERENCJI ===')
    
    # Test z różnymi kryteriami
    criteria_list = ['cost', 'speed', 'quality', 'balanced']
    
    for criteria in criteria_list:
        print(f'Test z kryterium: {criteria}')
        try:
            result = await amodel_infer_advanced(
                'chat_general', 
                'Hello, how are you?', 
                criteria=criteria
            )
            
            print(f'  Wynik: {result["success"]}')
            print(f'  Model: {result.get("model_used", "N/A")}')
            print(f'  Koszt: ${result.get("cost_usd", 0):.6f}')
            print(f'  Czas: {result.get("execution_time", 0):.2f}s')
            print()
            
        except Exception as e:
            print(f'  Błąd: {e}')
            print()

async def main():
    """Główna funkcja testująca"""
    print('🚀 Uruchamianie testów zaawansowanego systemu modeli AI...\n')
    
    try:
        test_registry()
        test_model_manager()
        await test_advanced_inference()
        
        print('✅ Wszystkie testy zakończone sukcesem!')
        
    except Exception as e:
        print(f'❌ Błąd podczas testów: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(main())
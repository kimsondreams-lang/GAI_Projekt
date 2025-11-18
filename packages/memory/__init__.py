"""
Package memory - zaawansowany system pamięci dla GAI
Zawiera PostgreSQL z pgvector, embeddingi i wektorowe wyszukiwanie
"""

# Używamy uproszczonego systemu pamięci który działa bez PostgreSQL
from .simple_store import SimpleMemoryStore, get_memory_store

# Alias dla kompatybilności
MemoryStore = SimpleMemoryStore

__all__ = [
    'MemoryStore',
    'get_memory_store'
]
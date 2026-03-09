#!/usr/bin/env python3
import json
import os

ARTICLES_DIR = \"/Users/jakubnetza/Desktop/GAI/temp_blog_fix/articles\"

SCHEMAS = {
    \"ai-assistants-comparison-2025.json\": {
        \"@context\": \"https://schema.org\",
        \"@type\": \"ItemList\",
        \"name\": \"Best AI Assistants 2025: ChatGPT vs Claude vs Gemini Compared\",
        \"description\": \"A comprehensive comparison of the leading AI assistants\",
        \"numberOfItems\": 3,
        \"itemListElement\": [
            {\"@type\": \"ListItem\", \"position\": 1, \"name\": \"ChatGPT\"},
            {\"@type\": \"ListItem\", \"position\": 2, \"name\": \"Claude\"},
            {\"@type\": \"ListItem\", \"position\": 3, \"name\": \"Gemini\"}
        ]
    },
    \"best-4k-monitors-2025.json\": {
        \"@context\": \"https://schema.org\",
        \"@type\": \"ItemList\",
        \"name\": \"Best 4K Monitors 2025\",
        \"description\": \"Top 4K monitors for gaming and professional work\",
        \"numberOfItems\": 5,
        \"itemListElement\": [
            {\"@type\": \"ListItem\", \"position\": 1, \"name\": \"LG UltraGear 27GN950-B\"},
            {\"@type\": \"ListItem\", \"position\": 2, \"name\": \"Dell UltraSharp U2720Q\"},
            {\"@type\": \"ListItem\", \"position\": 3, \"name\": \"ASUS ProArt PA279CV\"}
        ]
    },
    \"best-gaming-headsets-2025.json\": {
        \"@context\": \"https://schema.org\",
        \"@type\": \"ItemList\",
        \"name\": \"Best Gaming Headsets 2025\",
        \"description\": \"Top gaming headsets for immersive gaming\",
        \"numberOfItems\": 5,
        \"itemListElement\": [
            {\"@type\": \"ListItem\", \"position\": 1, \"name\": \"SteelSeries Arctis Nova Pro\"},
            {\"@type\": \"ListItem\", \"position\": 2, \"name\": \"HyperX Cloud III\"},
            {\"@type\": \"ListItem\", \"position\": 3, \"name\": \"Razer BlackShark V2\"}
        ]
    },
    \"best-wireless-earbuds-2025.json\": {
        \"@context\": \"https://schema.org\",
        \"@type\": \"ItemList\",
        \"name\": \"Best Wireless Earbuds 2025\",
        \"description\": \"Top wireless earbuds for music and calls\",
        \"numberOfItems\": 5,
        \"itemListElement\": [
            {\"@type\": \"ListItem\", \"position\": 1, \"name\": \"Sony WF-1000XM5\"},
            {\"@type\": \"ListItem\", \"position\": 2, \"name\": \"Apple AirPods Pro 2\"},
            {\"@type\": \"ListItem\", \"position\": 3, \"name\": \"Samsung Galaxy Buds2 Pro\"}
        ]
    }
}

def add_schema(filename, schema):
    filepath = os.path.join(ARTICLES_DIR, filename)
    if not os.path.exists(filepath):
        print(f\"NOT FOUND: {filename}\")
        return False
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            article = json.load(f)
        article['schema'] = schema
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(article, f, indent=2, ensure_ascii=False)
        print(f\"SUCCESS: {filename}\")
        return True
    except Exception as e:
        print(f\"ERROR: {filename} - {e}\")
        return False

count = 0
for fn, sch in SCHEMAS.items():
    if add_schema(fn, sch):
        count += 1
print(f\"Done: {count}/{len(SCHEMAS)}\")

import json

def build_schema(title: str, asin_list):
    schema = {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        "headline": title,
        "mainEntityOfPage": {"@type": "WebPage"},
        "about": "Technology product review",
        "potentialAction": "ReadAction",
        "isPartOf": "technova.buzz",
        "product": [{"@type": "Product", "sku": asin} for asin in asin_list]
    }
    return json.dumps(schema, ensure_ascii=False)

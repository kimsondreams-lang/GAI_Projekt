import os
import json
import pytest
from jsonschema import validate, ValidationError

SCHEMA_PATH = 'config/article_schema.json'
ARTICLES_DIR = 'data/articles'

with open(SCHEMA_PATH, 'r') as f:
    schema = json.load(f)

def get_articles():
    articles = []
    if not os.path.exists(ARTICLES_DIR):
        return articles
    for filename in os.listdir(ARTICLES_DIR):
        if filename.endswith('.json') and filename != 'index.json':
            articles.append(os.path.join(ARTICLES_DIR, filename))
    return articles

@pytest.mark.parametrize('article_path', get_articles())
def test_article_schema(article_path):
    with open(article_path, 'r') as f:
        data = json.load(f)
    try:
        validate(instance=data, schema=schema)
    except ValidationError as e:
        pytest.fail(f'Article {article_path} failed validation: {e.message}')

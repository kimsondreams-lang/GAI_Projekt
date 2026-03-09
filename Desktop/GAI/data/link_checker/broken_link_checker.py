import requests
import json
import os
from datetime import datetime

ARTICLES_DIR = os.path.join(os.path.dirname(__file__), "../articles")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "../link_checker_report.json")

def check_link(url):
    try:
        r = requests.head(url, timeout=5, allow_redirects=True)
        return r.status_code
    except:
        return 0

print("Broken Link Checker - Starting...")

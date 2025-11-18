#!/usr/bin/env python3
"""
GAI Agent - Main Railway Application
Simple entry point for Railway deployment
"""

import os
import sys

base_dir = os.path.dirname(__file__)
# Ensure backend and packages are importable when running from repo root
sys.path.insert(0, os.path.join(base_dir, 'apps', 'backend'))
sys.path.insert(0, os.path.join(base_dir, 'packages'))

# Import the main FastAPI app
try:
    from main import app
    print("✅ Successfully imported FastAPI app from apps/backend/main.py")
except ImportError as e:
    print(f"❌ Failed to import FastAPI app: {e}")
    # Fallback to simple app
    from fastapi import FastAPI
    app = FastAPI(title="GAI Agent Railway", version="1.0.0")
    
    @app.get("/")
    def read_root():
        return {"message": "GAI Agent Railway API", "status": "running"}
    
    @app.get("/health")
    def health_check():
        return {"status": "healthy", "service": "gai-agent"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, workers=2)

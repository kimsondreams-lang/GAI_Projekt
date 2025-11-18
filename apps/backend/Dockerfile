# Standard Railway Dockerfile for GAI Agent Backend
FROM python:3.11-slim

# Cache busting to force fresh dependency install on Railway
ARG CACHE_BUST=1

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY apps/backend/requirements.txt ./requirements.txt
# Echo cache-bust arg to invalidate layer and force re-install when changed
RUN echo "cache-bust=${CACHE_BUST}" && pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Copy shared packages from repo root into image
COPY packages /app/packages

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV PYTHONPATH=/app:/app/apps/backend:/app/packages

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

# Run the application
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]

# Standard Railway Dockerfile for GAI Agent Worker
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
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY apps/worker/requirements.txt ./requirements.txt
# Echo cache-bust arg to invalidate layer and force re-install when changed
RUN echo "cache-bust=${CACHE_BUST}" && pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Copy shared packages from repo root into image
COPY packages /app/packages

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app:/app/apps/worker:/app/packages

# Health check for worker
HEALTHCHECK --interval=30s --timeout=30s --start-period=10s --retries=3 \
  CMD python -c "import celery; print('Celery OK')" || exit 1

# Run worker
CMD ["python", "-m", "celery", "-A", "celery_app.celery", "worker", "--loglevel=INFO", "--concurrency=2"]

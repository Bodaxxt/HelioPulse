# ============================================================
# HelioPulse Backend — Dockerfile
# Multi-stage build: slim production image
# ============================================================

## ---- Stage 1: builder ----
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --no-cache-dir --prefix=/install -r requirements.txt


## ---- Stage 2: production ----
FROM python:3.11-slim AS production

# Non-root user for security
RUN useradd -m -u 1001 heliopulse

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY app/ ./app/
COPY snapshots/ ./snapshots/

# Allow snapshots dir to be writable
RUN chown -R heliopulse:heliopulse /app/snapshots

USER heliopulse

EXPOSE 8000

# Health check using the /api/v1/health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/api/v1/health').raise_for_status()"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]


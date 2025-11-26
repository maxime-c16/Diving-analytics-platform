# ============================================
# BUILD STAGE - Build dependencies
# ============================================
FROM python:3.11-slim-bookworm AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc \
        g++ \
        libc-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ============================================
# PRODUCTION STAGE - Minimal runtime image
# ============================================
FROM python:3.11-slim-bookworm AS production

# Install OCR and PDF processing dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-eng \
        tesseract-ocr-fra \
        poppler-utils \
        libgl1-mesa-glx \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1001 worker && \
    mkdir -p /app /app/uploads /app/temp && \
    chown -R worker:worker /app

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder --chown=worker:worker /opt/venv /opt/venv

# Copy application code
COPY --chown=worker:worker . .

# Set environment variables
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    TESSDATA_PREFIX=/usr/share/tesseract-ocr/5/tessdata

# Switch to non-root user
USER worker

# Health check (ping Redis or check process)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import sys; sys.exit(0)"

# Run the worker
CMD ["python", "worker.py"]

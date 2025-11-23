# ============================================
# BUILD STAGE - Build dependencies
# ============================================
FROM python:3.11-slim-bookworm AS builder

# Set working directory
WORKDIR /app

# Install build dependencies for compiling Python packages
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

# Create non-root user
RUN useradd -m -u 1001 flask && \
    mkdir -p /app && \
    chown -R flask:flask /app

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder --chown=flask:flask /opt/venv /opt/venv

# Copy application code
COPY --chown=flask:flask . .

# Set environment variables
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    FLASK_APP=main.py

# Switch to non-root user
USER flask

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:5000/health')"

# Run the application
CMD ["python", "main.py"]

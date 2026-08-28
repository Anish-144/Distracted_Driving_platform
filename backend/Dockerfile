FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run migrations then start the application.
# `set -e` ensures the container exits immediately if alembic fails
# (prevents app starting against a database with no schema).
# --proxy-headers/--forwarded-allow-ips trust Render's reverse proxy so
# request.client.host reflects the real client IP (needed for per-IP rate limiting).
CMD ["sh", "-c", "set -e && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2 --proxy-headers --forwarded-allow-ips='*'"]

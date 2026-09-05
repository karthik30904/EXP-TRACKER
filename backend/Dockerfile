FROM python:3.11-slim

WORKDIR /app

# Install build & system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv package manager
RUN pip install --no-cache-dir uv

# Copy dependency definition files
COPY pyproject.toml uv.lock* ./

# Install python dependencies in virtual environment
RUN uv sync --frozen --no-cache || uv sync --no-cache

# Place virtual environment in PATH
ENV PATH="/app/.venv/bin:$PATH"

# Copy backend source code
COPY . .

# Default port
ENV PORT=8001

EXPOSE 8001

# Start script: run migrations then start uvicorn on dynamic $PORT
CMD ["sh", "-c", "uv run alembic upgrade head || true; exec uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001}"]

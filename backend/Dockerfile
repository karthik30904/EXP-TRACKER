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
ENV PATH="/app/.venv/bin:"

# Copy backend source code
COPY . .

# Expose FastAPI port
EXPOSE 8001

# Run entrypoint script or directly run uvicorn
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port 8001"]

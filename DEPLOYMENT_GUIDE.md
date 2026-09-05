# Expense Tracker — Deployment & Docker Guide

This guide covers everything you need to:
1. **Run anywhere locally with Docker** (One command setup on any laptop or OS).
2. **Push your code securely to GitHub**.
3. **Deploy PostgreSQL Database** (Free managed Postgres on Neon / Supabase / Render).
4. **Deploy Backend (FastAPI)** to **Render** or **Railway**.
5. **Deploy Frontend (Next.js)** to **Vercel**.
6. **Ask AI Tab Architecture** (Using free LLM APIs like Google Gemini or Groq).

---

## 1. Local Run on Any Laptop (Docker & Docker Compose)

Make sure you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.

### Start the full stack:
Run the following command from the project root:

```bash
docker compose up --build
```

This automatically starts:
- **PostgreSQL 16**: Port `5432` with persistent volume
- **FastAPI Backend**: Port `8001` (auto-applies Alembic migrations)
- **Next.js Frontend**: Port `3000`

### Access points:
- **Web App**: http://localhost:3000
- **API Swagger Docs**: http://localhost:8001/docs
- **API Health Check**: http://localhost:8001/health

### Stop the containers:
```bash
docker compose down
```

---

## 2. Push to GitHub

### Step 1: Initialize and check status
Verify no secrets or local logs are tracked:

```bash
git status
```

### Step 2: Commit all changes
```bash
git add .
git commit -m "chore: dockerize fullstack app and prepare deployment configs"
```

### Step 3: Connect to your GitHub repository
Create a new repository on [GitHub](https://github.com/new), then run:

```bash
# If setting up the main branch:
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>.git
git push -u origin main
```

---

## 3. Free Database Setup (Neon / Supabase)

We recommend [Neon.tech](https://neon.tech) (generous free tier serverless PostgreSQL):

1. Go to [Neon.tech](https://neon.tech) and sign up.
2. Create a new project named `expense-tracker`.
3. Copy the **Connection String** (choose the **SQLAlchemy / Python** or **Direct connection** format).
   It will look like:
   ```
   postgresql+psycopg://username:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

---

## 4. Backend Deployment (Render or Railway)

FastAPI requires a persistent Python/Docker environment. [Render](https://render.com) provides a free tier web service.

### Deploying on Render:
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Name**: `expense-tracker-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3` (or `Docker`)
   - **Build Command**: `pip install uv && uv sync --frozen`
   - **Start Command**: `uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add **Environment Variables** in Render:
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | Your Neon Postgres URL with `postgresql+psycopg://...` |
   | `USE_DATABASE` | `true` |
   | `JWT_SECRET_KEY` | A long random string (e.g. 32+ characters) |
   | `CORS_ORIGINS` | `https://your-frontend.vercel.app,http://localhost:3000` |
   | `FRONTEND_URL` | `https://your-frontend.vercel.app` |
   | `LOG_LEVEL` | `INFO` |
5. Click **Deploy Web Service**.
6. Copy your live backend URL (e.g. `https://expense-tracker-backend.onrender.com`).

---

## 5. Frontend Deployment (Vercel)

1. Go to [Vercel](https://vercel.com/) and click **Add New...** -> **Project**.
2. Import your GitHub repository.
3. Configure Project Settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click *Edit* and select `frontend`
4. Under **Environment Variables**, add:
   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_BASE_URL` | `https://expense-tracker-backend.onrender.com` (your Render backend URL) |
5. Click **Deploy**.

---

## 6. "Ask AI" Tab Implementation (Using Free LLMs)

You can build a conversational AI sidebar assistant that:
1. **Answers questions** about your spending (e.g., *"How much did I spend on dining out last week?"*).
2. **Creates expenses via chat** (e.g., *"Add 35 dollars for grocery at Trader Joe's today"*).

### Recommended Free LLM Providers:
1. **Google Gemini API (Free Tier)**:
   - Free quota via Google AI Studio (`gemini-1.5-flash` or `gemini-2.0-flash`).
   - Function calling / Tool use supported out of the box.
2. **Groq API (Free Tier)**:
   - Ultra-fast inference with `llama-3.3-70b-versatile` or `llama-3.1-8b-instant`.
3. **Ollama (100% Local / Free)**:
   - For running open models directly on your laptop without any API keys.

### How it works:
```
User Prompt (e.g. "Spent 15 on lunch")
       ¦
       ?
Frontend ("Ask AI" Sidebar)
       ¦ HTTP POST (with JWT token)
       ?
FastAPI (/api/v1/ai/chat)
       ¦ Calls LLM with function definitions:
       ¦ - create_expense(title, amount, category, date)
       ¦ - get_expense_summary(start_date, end_date)
       ?
Free LLM (Gemini 2.0 Flash / Groq)
       ¦ Returns structured function call
       ?
FastAPI executes DB query / DB insert & responds to user!
```

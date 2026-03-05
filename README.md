# Macro Tracker

A mobile-first web app for logging meals and macros via text and images, powered by Claude AI.

## Stack

- **Frontend**: React + TypeScript + Vite + Tailwind + shadcn/ui (PWA)
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude API
- **Storage**: Supabase Storage (meal images)

## Project Structure

```
macro_tracker/
├── frontend/       # React PWA
├── backend/        # FastAPI
└── supabase/       # DB migrations
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Supabase project (free tier works)
- Anthropic API key

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your keys
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # set VITE_API_URL
npm run dev
```

### Database

Run the migration in your Supabase SQL editor:

```bash
supabase/migrations/001_initial.sql
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (not anon) |
| `SUPABASE_STORAGE_BUCKET` | Bucket name for meal images (e.g. `meal-images`) |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL (e.g. `http://localhost:8000`) |

# AGENTS.md — ExpertIQ Copilot

Monorepo: `backend/` (FastAPI + Python) and `frontend/` (Next.js 16 + React 19).

## Quick Commands

| Task | Command |
|:-----|:--------|
| Dev (both) | `npm run dev` (runs backend + frontend in parallel via zsh) |
| Dev backend only | `npm run dev:backend` or `npm run dev:backend:reload` |
| Dev frontend only | `npm run dev:frontend` |
| Install all | `npm run install:all` |
| Backend tests | `cd backend && venv/bin/pytest tests/ -v` |
| Frontend build | `npm run build:frontend` |
| Frontend lint | `cd frontend && npm run lint` |
| Clean all caches | `npm run clean:caches` |
| Demo (production) | `npm run demo` or `npm run demo:lite` |

## Backend

- **Entry point**: `backend/app/main.py` — FastAPI app with lifespan, CORS, rate limiting, security headers.
- **Config**: `backend/app/config.py` — pydantic-settings, reads `.env` from repo root. Singleton via `get_settings()`.
- **Database**: SQLAlchemy 2.0+ with PostgreSQL. During pytest, auto-switches to SQLite at `backend/expertiq_test.db` (see `backend/app/database.py:19`).
- **Virtual env**: `backend/venv/` — all root scripts assume this path (`venv/bin/python3`, `venv/bin/pip`, `venv/bin/pytest`).
- **Agent pipeline**: `backend/app/core/agent.py` — 6-node LangGraph orchestration (QueryAnalyser → VectorSearcher → GraphExpander → Reranker → Summariser → ResponseBuilder).
- **Search backends**: `SEARCH_BACKEND` env var controls `"lightweight"` (default) vs `"pro"` (ChromaDB + ONNX embeddings).
- **Knowledge graph**: NetworkX in-memory. Toggle with `ENABLE_KNOWLEDGE_GRAPH` env var (default: true).
- **Rate limiting**: slowapi, 10/min search, 5/min auth. Falls back to in-memory if Redis unavailable.
- **Caching**: Redis with graceful fallback to in-memory TTLCache.

## Frontend

- **Next.js 16.2.2** with React 19, Tailwind CSS 4, Three.js (3D knowledge graph).
- **Breaking changes warning**: See `frontend/AGENTS.md` — read `node_modules/next/dist/docs/` before modifying Next.js code.
- **Components**: `frontend/src/components/` — SearchBar, ExpertCard, KnowledgeGraphViz, Vector3DGraph, ExecutiveSummary, DiscoveryHUD.
- **Dev server**: Binds to `127.0.0.1:3000` with `--max-old-space-size=768`.
- **Build**: Uses `--max-old-space-size=1024`. Build output in `.next/`.

## Environment

- Copy `.env.example` to `.env` before running. Required: `GROQ_API_KEY`, `JWT_SECRET_KEY`, `DATABASE_URL`.
- `GROQ_API_KEY` can use free tier from console.groq.com.
- Redis is optional — falls back to in-memory automatically.
- LangSmith tracing is optional — set `LANGCHAIN_API_KEY` to enable.

## Testing

- Backend: pytest with 33 tests across `test_agent.py`, `test_auth.py`, `test_search.py`.
- Tests auto-isolate to SQLite — safe to run against dev PostgreSQL without data loss.
- No frontend tests configured.
- No CI workflows found in `.github/`.

## Gotchas

- Root scripts use `zsh` (`dev:all`, `demo:lite`). `npm run dev` requires zsh.
- Backend venv must exist at `backend/venv/`. Recreate with: `cd backend && python3 -m venv venv && venv/bin/pip install -r requirements.txt`.
- Backend Dockerfile uses Python 3.11-slim (not 3.14+ as README badges claim).
- `.gitignore` includes `.planning/` (GSD data) and `chroma_db/` (vector store).
- `backend/expertiq.db` is a SQLite file that exists alongside PostgreSQL config — it's a local fallback artifact, ignore it.

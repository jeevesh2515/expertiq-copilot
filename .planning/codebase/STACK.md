# Tech Stack

## Overview
ExpertIQ Copilot uses a modern Python backend (FastAPI) and a React frontend (Next.js), orchestrated with Docker Compose. It leverages SQLite for relational state and ChromaDB for vector storage.

## Backend
- **Language**: Python 3.11+
- **Framework**: FastAPI (0.104.1) with Uvicorn
- **Databases**:
  - Relational: SQLite via SQLAlchemy (2.0.23)
  - Vector: ChromaDB (0.4.22)
- **AI / ML**:
  - Embeddings: `sentence-transformers` (2.3.1)
  - LLM Integration: `groq` (Llama 3.1)
- **Knowledge Graph**: `networkx` (3.2.1)
- **Auth**: `python-jose` for JWT, `passlib` + `bcrypt`
- **Security**: `slowapi` for rate limiting, `bleach` for sanitization
- **Structure**: Pydantic schemas (V2)

## Frontend
- **Framework**: Next.js 16.2 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4, `lucide-react` for icons
- **State/Fetching**: React Hooks + Axios
- **Components**: `class-variance-authority`, `clsx`, `tailwind-merge`

## DevOps & Infrastructure
- **Containerization**: Docker & Docker Compose
- **Configuration**: `.env` (dotenv)
- **Package Management**: `npm` (Frontend), `pip` / `requirements.txt` (Backend)

## Rationale & Dependencies
- **ChromaDB + Sentence Transformers**: Pinned `numpy<2.0.0` to resolve compatibility issues.
- **SQLite**: Kept lightweight for dev/demo purposes; relational tables map to `expertiq.db`.
- **Groq**: Provides low-latency extraction and reasoning for the agentic re-ranking layer.

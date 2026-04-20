# 🧠 ExpertIQ Copilot

> **AI-Powered Expert Discovery & Research Intelligence Platform**

[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![LangChain](https://img.shields.io/badge/LangChain-0.1-green?logo=chainlink&logoColor=white)](https://langchain.com)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector%20DB-orange)](https://trychroma.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## The Problem This Solves

Expert networks (like GLG, AlphaSights, proSapient) connect researchers with subject-matter experts. The core challenge: **keyword search fails to surface the RIGHT expert for nuanced research queries**.

Searching for *"semiconductor supply chain expert with buy-side banking experience"* returns hundreds of irrelevant results when relying on keyword matching. Researchers waste hours manually reviewing profiles.

**ExpertIQ Copilot** solves this with a **3-layer AI retrieval system** that understands meaning, not just keywords.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 14 Frontend                       │
│  ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌──────────────┐ │
│  │ SearchBar│  │ExpertCard│  │ GraphViz│  │  Executive   │ │
│  │          │  │  (Score) │  │  (D3/   │  │  Summary     │ │
│  │          │  │  + AI    │  │  Canvas)│  │  Panel       │ │
│  └──────────┘  └──────────┘  └─────────┘  └──────────────┘ │
└───────────────────────┬─────────────────────────────────────┘
                        │ REST API (JWT Auth)
┌───────────────────────▼─────────────────────────────────────┐
│                   FastAPI Backend                             │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              LangGraph AI Agent Pipeline                  │ │
│  │                                                           │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │ │
│  │  │  Query   │→ │  Vector  │→ │  Graph   │              │ │
│  │  │ Analyser │  │ Searcher │  │ Expander │              │ │
│  │  └──────────┘  └──────────┘  └──────────┘              │ │
│  │       ↓              ↓              ↓                    │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │ │
│  │  │Reranker  │→ │Summariser│→ │Response  │              │ │
│  │  │(Groq LLM)│  │(Groq LLM)│  │ Builder  │              │ │
│  │  └──────────┘  └──────────┘  └──────────┘              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ ChromaDB │  │ NetworkX │  │  SQLite  │  │  JWT Auth  │  │
│  │ (Vectors)│  │  (Graph) │  │   (ORM)  │  │ + bcrypt   │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### The 3 Retrieval Layers

| Layer | Technology | What it Does |
|-------|-----------|-------------|
| **1. Semantic Search** | sentence-transformers + ChromaDB | Embeds query & expert profiles into 384-dim vector space, finds nearest matches by cosine similarity |
| **2. Knowledge Graph** | NetworkX | Traverses Expert→Company→Industry→Topic relationships (2-hop BFS) to surface contextually adjacent experts |
| **3. LLM Agent** | LangGraph + Groq (Llama 3.1 70B) | AI agent scores candidates 1-10 with reasoning, generates executive summary of top 5 |

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- Groq API key (free at [console.groq.com](https://console.groq.com))

### Setup (3 commands)

```bash
# 1. Clone and configure
git clone https://github.com/your-username/expertiq-copilot.git
cd expertiq-copilot
cp .env.example .env  # Edit .env with your GROQ_API_KEY

# 2. Start backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# 3. Start frontend (new terminal)
cd frontend
npm install && npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — register an account and start searching!

### Docker (Alternative)

```bash
cp .env.example .env  # Add your GROQ_API_KEY
docker-compose up --build
```

---

## API Documentation

Once the backend is running, visit:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Key Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/health` | ❌ | Health check |
| `POST` | `/auth/register` | ❌ | Create account |
| `POST` | `/auth/login` | ❌ | Get JWT tokens |
| `POST` | `/auth/refresh` | ❌ | Refresh access token |
| `GET` | `/auth/me` | ✅ | Get user profile |
| `POST` | `/api/search` | ✅ | **AI expert search** |
| `GET` | `/api/experts` | ✅ | List experts (paginated) |
| `GET` | `/api/experts/{id}` | ✅ | Get expert by ID |

### Search Request Example

```json
POST /api/search
Authorization: Bearer <token>

{
  "query": "Find experts in semiconductor supply chain with buy-side banking experience",
  "filters": {
    "industry": "FinTech",
    "seniority": "VP"
  },
  "top_k": 10
}
```

### Search Response Example

```json
{
  "query": "Find experts in semiconductor supply chain...",
  "total_results": 10,
  "results": [
    {
      "id": "uuid-here",
      "name": "Dr. Sophia Chen",
      "title": "Chief AI Officer",
      "company": "QuantumPay Technologies",
      "match_score": 92.5,
      "vector_score": 85.3,
      "llm_score": 9,
      "ai_reasoning": "Strong quantitative finance background with deep ML expertise...",
      "topics": ["algorithmic trading", "machine learning", "quantitative finance"]
    }
  ],
  "executive_summary": "Based on the research query, the top candidates...",
  "graph_data": {
    "nodes": [...],
    "edges": [...]
  },
  "processing_time_ms": 3420.5
}
```

---

## Architecture Decisions

### Why ChromaDB?
- Runs entirely locally (no cloud dependency)
- Persistent storage with DuckDB+Parquet backend
- Native Python API, easy to embed in FastAPI
- Metadata filtering for industry/seniority queries

### Why Groq (Llama 3.1 70B)?
- **Free tier** with generous rate limits
- Fastest LLM inference available (300+ tokens/sec)
- Open-source model (no vendor lock-in)
- Quality comparable to GPT-4 for ranking/summarisation tasks

### Why LangGraph over simple chains?
- **Typed state** — each node receives and produces structured data
- **Graceful degradation** — if one node fails, others continue
- **Observable** — easy to log and debug each pipeline stage
- **Extensible** — add new nodes (e.g., citation checker) without refactoring

### Why sentence-transformers (local) over OpenAI embeddings?
- **Zero cost** — runs on CPU, no API calls
- **Privacy** — expert data never leaves your infrastructure
- **Speed** — batch embedding of 50 profiles in <2 seconds
- **all-MiniLM-L6-v2** — 384 dimensions, excellent quality/speed tradeoff

---

## Security Measures

| Measure | Implementation |
|---------|---------------|
| **Authentication** | JWT access tokens (30 min) + refresh tokens (7 days) |
| **Password Hashing** | bcrypt with 12 rounds via passlib |
| **Rate Limiting** | 10 searches/min per user via slowapi |
| **Input Sanitisation** | HTML stripping via bleach, max 500 char queries |
| **SQL Injection** | SQLAlchemy ORM (parameterised queries only) |
| **CORS** | Whitelist frontend origin only |
| **Security Headers** | X-Content-Type-Options, X-Frame-Options, CSP, HSTS |
| **Error Handling** | Stack traces never exposed to client |
| **Secrets** | All via environment variables, never hardcoded |
| **Request Tracing** | Unique request ID per request for audit logs |

---

## Testing

```bash
cd backend

# Run all tests
python -m pytest tests/ -v

# Run specific test file
python -m pytest tests/test_auth.py -v
python -m pytest tests/test_search.py -v
python -m pytest tests/test_agent.py -v

# Run with coverage
python -m pytest tests/ --cov=app --cov-report=term-missing
```

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| API Framework | FastAPI 0.104 | Async REST API with auto-docs |
| LLM Orchestration | LangGraph + LangChain | Multi-step AI agent pipeline |
| LLM Inference | Groq (Llama 3.1 70B) | Free, fast LLM for ranking/summarisation |
| Vector Database | ChromaDB | Local persistent vector storage |
| Embeddings | sentence-transformers | Local 384-dim text embeddings |
| Knowledge Graph | NetworkX | In-memory relationship traversal |
| Relational DB | SQLite + SQLAlchemy | User/expert profile storage |
| Auth | python-jose + passlib | JWT tokens + bcrypt hashing |
| Rate Limiting | slowapi | Per-user request throttling |
| Frontend | Next.js 14 + Tailwind CSS | App Router, server components |
| Visualisation | Canvas API | Force-directed graph rendering |
| Containerisation | Docker + docker-compose | One-command deployment |
| CI/CD | GitHub Actions | Test, lint, security scan, build |

---

## Project Structure

```
expertiq-copilot/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry + middleware + startup
│   │   ├── config.py            # pydantic-settings from .env
│   │   ├── database.py          # SQLAlchemy engine + session
│   │   ├── auth/                # JWT auth (handler, middleware, routes)
│   │   ├── api/                 # REST endpoints (search, experts, health)
│   │   ├── core/                # AI/ML (embeddings, vectors, graph, agent)
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   └── data/                # Synthetic expert seed data (50 profiles)
│   ├── tests/                   # pytest test suite
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router pages
│   │   ├── components/          # React components
│   │   └── lib/                 # API client
│   ├── Dockerfile
│   └── package.json
├── .github/workflows/           # CI/CD pipelines
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with ❤️ using FastAPI, LangGraph, ChromaDB, and Next.js
</p>

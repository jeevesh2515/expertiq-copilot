# 🧠 ExpertIQ Copilot

> **Enterprise-Grade Expert Discovery, Hybrid Retrieval, & Research Intelligence Platform**

ExpertIQ Copilot is a production-ready, highly-optimized expert discovery platform. It replaces naive search pipelines with a resilient **6-node LangGraph agent network**, dual relational-vector databases, multi-tier fallback caching, and production-grade observability telemetry.

[![Python 3.14+](https://img.shields.io/badge/Python-3.14+-blue?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js 16 (React 19)](https://img.shields.io/badge/Next.js-16--Turbopack-black?logo=next.js)](https://nextjs.org)
[![LangChain / LangGraph](https://img.shields.io/badge/LangGraph-Agent--Pipeline-green?logo=chainlink&logoColor=white)](https://langchain.com)
[![Redis](https://img.shields.io/badge/Redis-Cache%20%26%20Rate%20Limit-red?logo=redis&logoColor=white)](https://redis.io)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector%20DB-orange)](https://trychroma.com)
[![Pinecone](https://img.shields.io/badge/Pinecone-Cloud%20Vector%20DB-blue)](https://pinecone.io)

---

## 🗺️ System Architecture Flow

The following map traces how a user query flows from the frontend client to the backend database, vector, graph, and LLM nodes, and returns as a grounded, context-enriched expert discovery profile:

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                        1. Next.js 16 Frontend Client                   │
 │   - Search Dashboard   - 3D D3 Force Graph   - Expert Details Drawer   │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │ Secure HTTPS REST API 
                                     ▼ (JWT Auth + Redis Rate Limiter)
 ┌────────────────────────────────────────────────────────────────────────┐
 │                        2. FastAPI API Router                           │
 │   - /api/search        - /api/feedback       - /api/health             │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │ Orchestrates Lifespan Spans
                                     ▼ (LangSmith tracing_context)
 ┌────────────────────────────────────────────────────────────────────────┐
 │                 3. 6-Node LangGraph Agent Pipeline                     │
 │                                                                        │
 │   [Node A: QueryAnalyser]  ──►  [Node B: VectorSearcher]               │
 │   - Extracts Intent & Filters   - HyDE Query Expansion                 │
 │   - Generates Synthetic Bio     - Compiles Dict Metadata Operators     │
 │              │                               │                         │
 │              ▼                               ▼                         │
 │   [Node C: GraphExpander]  ──►  [Node D: Reranker]                     │
 │   - Traverses Multi-Hop Links   - dynamic Grounding Lookups            │
 │   - Surfaces Related Connections - Structured LLM Scoring (1-10)       │
 │              │                               │                         │
 │              ▼                               ▼                         │
 │   [Node E: Summariser]     ──►  [Node F: ResponseBuilder]              │
 │   - Professional Research       - Constructs Dual-Compatible Payload   │
 │     Fidelity Executive Summary  - Logs Session Metrics                 │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │ Data Storage & Cache Layers
                                     ▼
       ┌───────────────────┬───────────────────┬───────────────────┐
       │   PostgreSQL/     │    ChromaDB /     │     NetworkX      │
       │   SQLite (DB)     │  Pinecone (Vector)│  (In-Memory Graph)│
       └───────────────────┴───────────────────┴───────────────────┘
```

---

## 🚀 Advanced RAG & Platform Features

This project utilizes advanced patterns designed for production-level stability and high-accuracy semantic matching:

### 1. Parent-Child Semantic Chunking
* **The Solution**: Biographies and publication documents are segmented into short, granular sentences (**Child Chunks**). During database ingestion, these children are embedded and stored with a `parent_id` and the complete paragraph text (`parent_text`) attached to their metadata payload.
* **The Retrieval**: Cosine similarity is computed against child chunks for precise, sentence-level matching. On retrieval, `RAGPipeline.retrieve_context` automatically swaps child hits with their broader `parent_text` and deduplicates them in-memory via `seen_parent_ids`. This feeds the LLM with cohesive paragraph contexts, avoiding fragmented prompts.

### 2. Self-Querying Metadata Filtering
* **The Solution**: The `QueryAnalyser` parses natural language filters (e.g. *"Fintech expert with 15+ years experience"*) and extracts structural constraint dictionaries.
* **The Compilation**: `VectorSearcher` compiles these into structured, database-native comparison operator trees (e.g. `{"years_experience": {"$gte": 15}, "availability": "available"}`). The vector engine and local simulators execute these filters strictly, bypassing ANN vector post-filtering limitations.

### 3. Hypothetical Document Embeddings (HyDE)
* **The Solution**: Raw user prompts are often short or phrased as questions, which do not align semantically with stored resumes/resumes.
* **The Injections**: The pipeline prompts a free-tier Groq model to generate a synthetic expert biography (`hyde_bio`) representing the perfect candidate. This synthetic card is embedded and queried, aligning query intents directly with document structural layouts to boost retrieval recall.

### 4. Dynamic Database Auto-Migrations
* **The Solution**: When upgrading database schemas (like adding conversation thread tracking `thread_id` columns), conventional engines crash if tables are not manually migrated.
* **The Migration**: On startup, `database.py` dynamically inspects column mappings (`PRAGMA table_info` for SQLite and `information_schema.columns` for PostgreSQL) and executes SQLAlchemy 2.0-compliant `text()` DDL statement alters with explicit transaction commits, updating production databases seamlessly on boot.

---

## 🛠️ Step-by-Step Local User Guide

### 1. Clone & Configure Environments
Copy the env template in the root workspace directory to create your local `.env`:
```bash
cp .env.example .env
```
Provide your Groq API Key (obtain free at [console.groq.com](https://console.groq.com)). 

By default, the platform boots in **`lightweight`** mode. This simulator boots in **under 5 seconds** and runs zero-downloads vector matching completely locally over your relational database, allowing instant offline development!

---

### 2. Backend Startup (Python 3.11/3.14)
1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```
2. **Initialize a Python virtual environment and activate it**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. **Install modern production-grade dependencies**:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
4. **Launch the FastAPI development server**:
   ```bash
   venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
*The database tables will be initialized, 50 expert profiles seeded, and the local relation knowledge graph built automatically on boot!*

---

### 3. Frontend Startup (Node 20+)
1. **Navigate to the frontend directory** (in a new terminal tab):
   ```bash
   cd frontend
   ```
2. **Install node dependencies**:
   ```bash
   npm install
   ```
3. **Launch the Next.js development server with Turbopack**:
   ```bash
   npm run dev
   ```
Open [http://localhost:3000](http://localhost:3000) in your web browser. Create a new user profile to immediately access the interactive dashboard, search experts, submit feedback, and explore the **3D Force-Directed D3 Knowledge Graph**!

---

## 🔍 Observatory Tracing & Programmatic Benchmarks

### 1. Syncing Tracing in 30 Seconds
To activate real-time LangSmith telemetry tracing, add your LangSmith API key to your local `.env` file under standard keys (no surrounding quotes):
```env
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY=your_langsmith_api_key_here
LANGCHAIN_PROJECT=expertiq-copilot
```
Simply restart the backend server or uvicorn task to immediately apply the variables. Every query you run on your local site will now register instantly under your LangSmith **Tracing** list!

---

### 2. Running Programmatic Evaluations ($0.00 LLM Cost)
We have written a fully automated programmatic benchmark runner at `backend/scripts/run_langsmith_eval.py`. It boots an isolated database sandbox, seeds custom metrics, synchronizes datasets, and executes 3 free local evaluators:
* **expert_fidelity**: Asserts the LLM summary strictly mentions retrieved experts, detecting hallucinations.
* **grounding_precision**: Confirms child-to-parent containment mapping.
* **constraint_precision**: Validates retrieved profiles comply with NLP constraints.

To execute this suite:
```bash
cd backend
source venv/bin/activate
python scripts/run_langsmith_eval.py
```
This prints the comparison dashboard URL directly in your terminal, logging the entire experiment to the **Datasets & Experiments** tab of your LangSmith account for free!

---

## 🚢 Production Cloud Deployment (Railway + Vercel)

### 1. Production Backend (Railway)
1. Commit your codebase changes and push them to your GitHub repository.
2. In your **[Railway Dashboard](https://railway.app)**, select your project and navigate to the **Variables** tab on your backend service.
3. Inject the LangSmith variables (`LANGCHAIN_TRACING_V2`, `LANGCHAIN_ENDPOINT`, `LANGCHAIN_API_KEY`, `LANGCHAIN_PROJECT`) and your production database credentials.
4. **Resilient Warmup**: The system includes a custom deployment handler. Our increase of `"healthcheckTimeout": 300` in [railway.json](file:///Users/jeeveshsingale/ExpertIQ%20Copilot/backend/railway.json) allows Railway enough time on cold boots to download models from HuggingFace and index profiles successfully without timing out.

### 2. Production Frontend (Vercel)
1. Connect your GitHub repository to your **[Vercel Dashboard](https://vercel.com)**.
2. Add the environment variable `NEXT_PUBLIC_API_URL` pointing to your active Railway backend URL.
3. Click deploy! The site will automatically compile, configure type validation, and serve the application globally.

---

## 🧪 Verification & Test Command Matrix

| Target | Command | Purpose |
| :--- | :--- | :--- |
| **All Backend Tests** | `cd backend && venv/bin/pytest tests/ -v` | Runs the full 47-case integration and unit test suite |
| **RAG Triad Test Only** | `cd backend && venv/bin/pytest tests/test_rag_eval.py -v` | Runs the isolated database RAG metric evaluations |
| **Frontend Compilation** | `cd frontend && npm run build` | Compiles Next.js React 19 pages with strict TypeScript check |

```text
======================= 47 passed, 4 warnings in 25.20s ========================
```

---

## 📁 Monorepo Folder Structure

```text
expertiq-copilot/
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI/CD Pipeline (Python + Node)
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application lifecycle & middlewares
│   │   ├── config.py            # Pydantic-settings config loads & standardisation
│   │   ├── database.py          # SQLAlchemy 2.0 engine & dynamic migrators
│   │   ├── api/                 # REST Routers (search, health, feedback, experts)
│   │   ├── models/              # SQLAlchemy Database ORM tables
│   │   ├── schemas/             # Pydantic JSON serialization contracts
│   │   └── core/                # Agent core routing & algorithms
│   │       ├── agent.py         # 6-node LangGraph orchestration
│   │       ├── rag_pipeline.py  # Parent-Child contextual RAG compiler
│   │       ├── lightweight_search.py # Nested operator local keyword engine
│   │       ├── vector_store.py  # Local persistent ChromaDB manager
│   │       └── vector_store_pinecone.py # Cloud Pinecone manager
│   ├── scripts/
│   │   ├── ingest_pinecone.py   # Bulk database loader script for Pinecone
│   │   └── run_langsmith_eval.py # Programmatic LangSmith evaluation runner
│   └── tests/                   # Pytest automated test runner (47 test cases)
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router views, layouts, and styles
│   │   ├── components/          # ForceGraph3D, SearchBar, ExpertDetailDrawer
│   │   └── lib/                 # API connection configurations
│   └── package.json
└── docker-compose.yml
```

---

*Built with ❤️ using Next.js 16, React 19, FastAPI, Redis, ChromaDB, Pinecone, and LangGraph.*

# 🧠 ExpertIQ Copilot

> **Enterprise-Grade Expert Discovery, Hybrid Retrieval, & Research Intelligence Platform**

[![Python 3.14+](https://img.shields.io/badge/Python-3.14+-blue?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js 16 (React 19)](https://img.shields.io/badge/Next.js-16--Turbopack-black?logo=next.js)](https://nextjs.org)
[![LangChain / LangGraph](https://img.shields.io/badge/LangGraph-Agent--Pipeline-green?logo=chainlink&logoColor=white)](https://langchain.com)
[![Redis](https://img.shields.io/badge/Redis-Cache%20%26%20Rate%20Limit-red?logo=redis&logoColor=white)](https://redis.io)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector%20DB-orange)](https://trychroma.com)
[![Pinecone](https://img.shields.io/badge/Pinecone-Cloud%20Vector%20DB-blue)](https://pinecone.io)

---

## 🚀 The Senior-Grade Difference: Project Overview

Standard RAG tutorial projects usually load a single PDF file, chunk it naively, search it using basic cosine similarity, and dump it straight into an LLM window. That works for simple demos but breaks instantly under enterprise-grade scale, noisy queries, or strict constraints.

**ExpertIQ Copilot** is a **senior-grade, production-ready expert discovery platform** built with architectural resilience at its core. It operates via a **6-node LangGraph orchestration pipeline** with advanced RAG strategies, multi-tier database fallback layers, and comprehensive observability integrations.

### Key Senior-Grade RAG Solutions Implemented:

1. **Parent-Child Semantic Chunking**:
   * *The Problem*: Storing large paragraphs in vector databases dilutes semantic vectors, while storing sentences alone leaves the LLM with incomplete context.
   * *Our Solution*: We extract small sentence-level units (**Child Chunks**) for high-resolution vector searches, but attach them to full coherent biographies (**Parent Chunks**). On retrieval, the engine dynamically resolves child hits to parents and deduplicates them in-memory, ensuring crisp vector matches and cohesive context grounding.
2. **Self-Querying Metadata Filtering**:
   * *The Problem*: Natural language prompts often contain explicit logical constraints (e.g., "available experts with 15+ years experience") that vectors struggle to filter strictly.
   * *Our Solution*: The `QueryAnalyser` node extracts query filters and compiles them into database-native comparison operator dictionaries (e.g., `{"years_experience": {"$gte": 15}}`). 
3. **Hypothetical Document Embeddings (HyDE)**:
   * *The Problem*: Queries and stored documents live in different semantic spaces (questions vs. resumes/bios).
   * *Our Solution*: The pipeline prompts Groq to synthesize a hypothetical biography (`hyde_bio`) representing the perfect candidate profile matching the user's intent. This synthetic card is embedded and queried, aligning query vocabulary directly with stored documents and boosting retrieval recall.
4. **Dynamic Multi-Backend Architecture**:
   * *The Problem*: External cloud databases (like Pinecone) or local ONNX embedding models are heavy and slow to load during development or offline runs.
   * *Our Solution*: A plug-and-play config system with three interchangeable search backends (`lightweight`, `pro`, `pinecone`), allowing instant offline starts with an in-memory SQL/vector simulator or cloud-scale production indexing with Pinecone.
5. **Robust Database Auto-Migrations**:
   * *The Problem*: Updating schemas (like adding conversation thread tracking UUIDs) typically breaks existing databases or requires manually executing complex migration scripts.
   * *Our Solution*: Adaptive column discovery. On startup, the system automatically checks table column mappings (`PRAGMA` for SQLite or `information_schema` for PostgreSQL) and appends columns dynamically (e.g., `thread_id` to `SearchHistory`) without data loss.

---

## ⚡ Multi-Backend Routing: Do I Need to Run All of These?

**No!** You do **NOT** need to configure Pinecone, install heavyweight ONNX models, or download massive datasets just to run this project. 

The architecture is built with high development resilience and offers three distinct search backends, easily toggled in your `.env` configuration file:

| `SEARCH_BACKEND` | Deployment Level | System Requirements | Mechanics |
| :--- | :--- | :--- | :--- |
| **`lightweight`** *(Default)* | **Local / Offline Dev** | **Instant (Zero Downloads)** | Uses a high-performance, deterministic local string-scoring simulator over SQLite/Postgres. Supports nested logical operator matching (`$gte`, `$lte`, `$eq`) out-of-the-box. Boots in **under 5 seconds**! |
| **`pro`** | **Local Embedding RAG** | **ONNX + ChromaDB** | Leverages local persistent ChromaDB collections with fast `FastEmbed` embeddings running on your CPU, isolated for zero network latency. |
| **`pinecone`** | **Cloud Production** | **Pinecone Account** | Connects to a serverless Pinecone index. Features bulk index ingest boots (`scripts/ingest_pinecone.py`) and handles massive multi-tenant semantic matching in the cloud. |

*To immediately run the application, keep the default `.env` setting `SEARCH_BACKEND=lightweight` and provide only your `GROQ_API_KEY`!*

---

## 🔍 Observability & LangSmith Tracing

To monitor query execution latency, debug prompt alignments, and inspect retrieved document contexts, the entire orchestration layer is integrated with **LangSmith**.

Every search request propagates a custom session UUID (`thread_id`), which groups consecutive search queries into persistent conversation threads. In LangSmith, every step of our **6-node LangGraph agent** is traced chronologically under a single parent execution span:

1. **QueryAnalyser**: Structurally expands raw queries, generates a synthetic HyDE bio, and extracts logical filters.
2. **VectorSearcher**: Queries Pinecone/ChromaDB or Lightweight engines using compiled logical operators.
3. **GraphExpander**: Traverses multi-hop relation networks (Expert ↔ Company ↔ Industry) via an in-memory NetworkX graph.
4. **Reranker**: Employs Groq LLM reasoning (`Llama-3.3-70B`) in JSON mode to score candidates (1-10) and document grounds.
5. **Summariser**: Formulates a clear executive research summary of recommended expert matches.
6. **ResponseBuilder**: Outputs a structured, dual-compatible JSON response.

### Nested Execution Tree
Below is the LangSmith visual tree depicting latency, input payloads, and node execution status:

![ExpertIQ Copilot LangSmith Dashboard](assets/langsmith_dashboard_trace.png)

---

## 🛡️ Annotation Queues & Feedback Systems
ExpertIQ Copilot features a production-ready **Annotation Queue** and **User Feedback Loop** integrated with LangSmith.
* Researchers can programmatically submit ratings (1-5), metadata tags, and corrective comments for any search session.
* Ratings are stored locally in the relational database (`Feedback` and `SearchHistory` models) and dynamically logged into active LangSmith evaluation runs.
* Feedback queues allow researchers to continuously benchmark performance and monitor retrieval drift over time.

---

## 📦 Production Tech Stack

* **API Engine**: `FastAPI 0.136+`
* **Agent Framework**: `LangGraph` + `LangChain`
* **Vector Stores**: `ChromaDB` (Local Persistent) + `Pinecone` (Cloud Serverless)
* **Embedding Model**: `FastEmbed` (ONNX optimized CPU execution)
* **Graph Database**: `NetworkX` (In-memory multi-hop relation network)
* **Caching & Rate Limiting**: `Redis` (Failover Support) + `slowapi` + in-memory `TTLCache` fallback
* **Relational Storage**: `PostgreSQL` + `SQLAlchemy 2.0+`
* **Frontend App**: `Next.js 16 (App Router)` + `React 19` + `Tailwind CSS 4` + `3D Canvas (Three.js Graph)`

---

## 🛠️ Quick Start & Installation

### 1. Configure the Environment
Copy the configuration template to `.env` in the root directory:
```bash
cp .env.example .env
```
Provide your `GROQ_API_KEY` (obtain free at [console.groq.com](https://console.groq.com)). By default, the system boots in `lightweight` mode.

### 2. Standalone Local Dev (Recommended)

#### Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Launch FastAPI dev server
venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

#### Frontend Setup (New Terminal Window)
```bash
cd frontend
npm install
npm run dev
```

Navigate your browser to [http://localhost:3000](http://localhost:3000), register a profile, and explore the search engine and **3D interactive knowledge graph**!

### 3. Pinecone Indexing (Optional Cloud Production)
If you wish to switch to the Pinecone cloud backend, configure `SEARCH_BACKEND=pinecone` in `.env` along with your `PINECONE_API_KEY`.
Run the bulk indexing ingestion script to generate embeddings and load your PostgreSQL database profiles into Pinecone:
```bash
cd backend
venv/bin/python -m scripts.ingest_pinecone --force
```

---

## 🧪 Automated Testing & Benchmark Suite

The platform includes a comprehensive, isolated test suite consisting of **47 automated tests** (covering database actions, JWT auth, rate limiters, graph traversals, and dynamic migrations).

### The RAG Triad Evaluator:
We have integrated a dedicated evaluation test suite (`tests/test_rag_eval.py`) that executes in a sandboxed SQLite environment to evaluate RAG quality metrics:
* **Context Precision**: Asserts that constraint parameters extracted from queries strictly filter out non-compliant profiles.
* **Faithfulness / Hallucination Detection**: Checks the generated executive summaries against retrieved expert lists, ensuring the LLM never references nonexistent profiles.
* **Parent-Child Resolution**: Confirms that child sentences map perfectly to parent paragraphs.

```bash
cd backend
venv/bin/pytest tests/ -v
```

```text
======================= 47 passed, 4 warnings in 25.31s ========================
```

---

## 📁 Directory Architecture

```text
expertiq-copilot/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application lifecycle & middlewares
│   │   ├── config.py            # Pydantic-settings config loaders
│   │   ├── database.py          # SQLAlchemy engine & dynamic table migrators
│   │   ├── auth/                # Optimized direct-bcrypt JWT handlers
│   │   ├── api/                 # REST Controller routers (search, health, feedback)
│   │   ├── models/              # SQLAlchemy Database ORM tables
│   │   ├── schemas/             # Pydantic JSON serialization contracts
│   │   └── core/                # Agent core routing & algorithms
│   │       ├── agent.py         # 6-node LangGraph orchestration
│   │       ├── rag_pipeline.py  # Parent-Child contextual RAG compiler
│   │       ├── lightweight_search.py # Nested operator local keyword engine
│   │       ├── vector_store.py  # Local persistent ChromaDB manager
│   │       └── vector_store_pinecone.py # Cloud Pinecone manager
│   ├── scripts/
│   │   └── ingest_pinecone.py   # Bulk database loader script for Pinecone
│   └── tests/                   # Pytest automated test runner (47 test cases)
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router views & globals
│   │   └── components/          # ForceGraph3D, SearchBar, ExpertDetailDrawer
│   └── package.json
└── docker-compose.yml
```

---

*Built with ❤️ using Next.js 16, React 19, FastAPI, Redis, ChromaDB, Pinecone, and LangGraph.*

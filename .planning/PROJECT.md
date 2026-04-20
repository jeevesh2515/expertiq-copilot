# ExpertIQ Copilot

## What This Is

ExpertIQ Copilot is a production-ready, full-stack AI application designed to provide intelligent, multi-hop semantic search across a highly detailed synthetic database of expert profiles. It empowers users to instantly find the right industry professionals using semantic vector retrieval, knowledge graphs, and agentic LLM re-ranking within a sophisticated minimal editorial interface.

## Core Value

To deliver perfectly ranked and evaluated expert professionals using a multi-layer AI retrieval pipeline (semantic, graph, agentic), eliminating the hallucination and noise of standard keyword search.

## Requirements

### Validated

- ✓ [Backend API] FastAPI serving structured JSON with strict Pydantic V2 validation and centralized custom error envelope structures. — existing
- ✓ [Database Layers] SQLite persistence, integrated ChromaDB vector-store, and NetworkX in-memory graph handling complex topological queries. — existing
- ✓ [AI Pipeline] Llama 3.1 70B (Groq) integration evaluating relevance and generating reasoning/executive summaries. — existing
- ✓ [Authentication] Stateless JWT architecture utilizing python-jose and bcrypt. — existing
- ✓ [Frontend Platform] NextJS 16 App Router application structured around cleanly composed components (Axios, React Query). — existing
- ✓ [UI/UX Integration] Complete 'Editorial Light Theme' interface adhering to Tailwind v4, utilizing shadcn-styled blocks (pill search bars, pastel glass cards). — existing
- ✓ [Container Orchestration] Docker-Compose unifying discrete backend and frontend services under specific healthcheck gates. — existing

### Active

- [ ] Evolve and scale capabilities mapping to any subsequent user requirements for V2.

### Out of Scope

- Distributed Kubernetes Orchestration — Scope creep for local/demo deployment goals; docker-compose handles orchestration.
- Alternative Heavy SQL engines (e.g. Postgres) — Deferred pending substantial concurrent read/write loads over the default SQLite schema.

## Context

- The platform is structurally functional with a seeded repository of 50 synthetic experts covering FinTech, HealthTech, ClimateTech, EdTech, RegTech, DeepTech, and ConsumerTech.
- The UI maintains a strictly elegant warm stone aesthetic (`#FAF9F6`) utilizing emerald and amber accents, explicitly avoiding sterile dark modes and harsh neon purples.
- Local deployments map ChromaDB and SQLite artifacts perfectly via volume shares.

## Constraints

- **Tech Stack**: Must adhere to Python 3.11/FastAPI Backend and Next.js 14+/React 19 App Router Frontend patterns.
- **Validation**: Strict use of Pydantic V2 models for payload management.
- **Environment**: Must remain fully containerized utilizing `.env` encapsulation to prevent cross-contamination.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SQLite for relational mapping | Simplifies the single-node setup and acts efficiently as a companion to the in-memory NetworkX DB. | ✓ Good |
| Groq Llama 3.1 vs OpenAI | Negates API latency bounds, allowing high-throughput reasoning evaluations. | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-20 after initialization*

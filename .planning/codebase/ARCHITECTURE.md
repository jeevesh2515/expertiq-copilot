# Architecture

## Pattern
The ExpertIQ Copilot follows a classic Client-Server Architecture.
- **Frontend**: A React/Next.js SPA relying heavily on CSR (Client-Side Rendering) for real-time interactivity. Communicates via REST APIs.
- **Backend API**: A modularized FastAPI REST application following layered patterns (`routers` -> `services` -> `database`/`core logic`).

## Tier 1: Client (Frontend)
- **App Router**: Uses Next.js 16 (`src/app`).
- **Components**: Separated into presentational logic and domain-specific UI (`src/components/`, e.g., `SearchBar.tsx`, `KnowledgeGraphViz.tsx`).
- **State Management**: Local React state (`useState`, `useEffect`) accompanied by `axios` for network calls via `src/lib/api.ts`.
- **Theming**: Tailwinds CSS v4 wrapped around a custom minimal/editorial light-mode theme defined in `globals.css` and explicit React component definitions.

## Tier 2: Server (Backend API)
Entry point: `backend/app/main.py`.

- **API Layer (`app/api/`)**: Defines the HTTP endpoints and routes.
- **Auth Layer (`app/auth/`)**: Handles JWT parsing, password hashing (`passlib`), and authentication middleware.
- **Core Intelligence Layer (`app/core/`)**:
  1. **Vector Retrieval**: Wraps ChromaDB.
  2. **Knowledge Graph**: Maintains NetworkX multi-hop mapping of `expert <-> company <-> industry <-> topic`.
  3. **Agentic Layer**: Passes top candidates through Groq (Llama Model) to rate and summarize relevance based on user prompt.
- **Data/Models (`app/models/` & `app/schemas/`)**:
  - `models/`: SQLAlchemy ORM definitions bridging Python classes to SQLite.
  - `schemas/`: Pydantic V2 definitions for validation, serialization, and deserialization.

## Data Flow (Search Request)
1. **Client**: User inputs a query in `SearchBar.tsx`, invoking `searchExperts` in `api.ts`.
2. **Gateway**: FastAPI (`main.py`) receives request, applies rate limits (`slowapi`), and parses token.
3. **Retrieval Pipeline**: 
   - Generates an embedding for the query.
   - Queries ChromaDB for base semantic match.
   - Augments results with Contextual nodes via NetworkX Graph.
   - Funnels candidates to Groq LLM agent to re-assess and compose the `executive_summary`.
4. **Response**: FastAPI serializes the `SearchResponse` schema and delivers it to the frontend.
5. **Renderer**: UI updates `KnowledgeGraphViz.tsx`, `ExecutiveSummary.tsx`, and ranking via `ExpertCard.tsx`.

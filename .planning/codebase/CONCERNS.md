# Technical Concerns & Debt

## Database Scalability
- **SQLite Concurrency**: SQLite is utilized for relational metadata matching vectors in ChromaDB. SQLite is primarily a single-writer DB. In high-concurrent write applications (like massive new user registrations), the DB layer may throttle or throw locking errors.
  - *Recommendation*: Migration to PostgreSQL (via SQLAlchemy configuration updates) prior to multi-region scaling.
- **SQLite `.wal` and `.shm` files**: The project creates temporary SQLite caching files which must heavily be excluded in `.gitignore` (which currently is handled).

## Frontend Hydration & Rendering Limitations
- The entire Next.js component stack strongly leverages absolute `"use client"` bounding boxes at the topmost levels (`src/app/page.tsx`).
- This sacrifices native Server-Side Rendering (SSR) SEO/performance boosts since heavy computations and API requests originate entirely from the browser client tree.
  - *Recommendation*: As requirements scale, compartmentalize `'use client'` strictly to leaf-node interactive blocks rather than application wrappers.

## Security Secrets & State
- **Docker `.env` Overlaps**: Secrets are actively handled by hardcoded / dynamically generated dotfiles. Production handling will require Docker Secrets or a Vault management injection script rather than basic `.env` injections.
- **Frontend Secrets**: Client side currently requires unhindered HTTP cross-origin queries (if deployed out of localhost context).

## Testing Completeness
- There are no visible UI tests (Cypress/Playwright). Future design updates rely purely on manual checks.
- Backend mocking is sufficient for isolation, but end-to-end (E2E) Docker health parity tests covering the full pipeline (`Search` -> `Chroma Query` -> `LLM Graph Rerank` -> `Response`) are highly complex to maintain locally due to massive LLM stochasticity.

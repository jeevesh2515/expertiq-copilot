# Integrations

## External APIs & Services

1. **Groq API**
   - **Purpose**: Fast LLM inference for agentic evaluations (Llama 3.1).
   - **Integration Point**: Backend `api/` or `core/agent` depending on the implementation.
   - **Auth**: Environment variable `GROQ_API_KEY`.

2. **ChromaDB (Local)**
   - **Purpose**: Local vector embedding storage for semantic search over experts.
   - **Integration Point**: Mounted as a volume in Docker (`chrom_data`). Uses `sentence-transformers` locally to generate embeddings.

## Authentication Providers
- **Internal JWT**: Uses `python-jose` to generate stateless JWT tokens. No external IdPs (like Auth0 or Firebase) are currently configured.

## Databases (Mounted Volumes)
- **SQLite Database**: Local `expertiq.db` file. Mounted in Docker as `sqlite_data`. Contains structured user details and expert records.

## Webhooks
- None detected.

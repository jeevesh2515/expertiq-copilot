# Testing

## Frameworks
- **Backend**: Employs `pytest`. The structure resides purely in the `backend/tests/` directory.

## Backend Test Structure
```
backend/tests/
  ├── test_agent.py      # Mocks Groq agent logic and embeddings.
  ├── test_auth.py       # Validates bcrypt hashing, JWT issuance and protected routes.
  └── test_search.py     # Verifies API interactions over ChromaDB extraction pipelines.
```
- **Mocks & Fixtures**: Heavily relies on mocking external API invocations (like LLMs) instead of triggering live external requests during unit tests. Test DBs override the main SQLite target (typically memory-bound `sqlite:///:memory:`).

## Frontend Testing
- **Visual Validation / Linting**: Relies on NextJS native ESLint configuration via `eslint-config-next`.
- Currently, deep component-level assertions (Jest / React Testing Library) are not explicitly present. Manual UAT runs over Docker containers.

## Automation / CI
- Historically validated with GitHub Actions, though currently triggered explicitly or executed manually given strict repo policies.

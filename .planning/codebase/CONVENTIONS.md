# Conventions

## Coding Style
### Frontend
- **Strict Types**: Emphasizes explicit typing for Component props (`ExpertCardProps`, `SearchResponse`, `ExpertResult` via `src/lib/api.ts`).
- **Styling Method**: Utility-first CSS using Tailwind. Logic for complex class merging is expected to rely on `clsx` and `tailwind-merge`.
- **Component Complexity**: Favors compositional patterns.
- **Client Components**: All UI-interactive hooks contain `"use client";` headers (`useState`, `useEffect`).

### Backend
- **Type Hinting**: PEP 484 type hints are rigorously utilized. Return schemas are strictly enforced via `response_model` decorators on HTTP routes.
- **Dependency Injection**: Relies heavily on `Depends(...)` paradigm mapping Database sessions and user authentication resolution (`get_db`, `get_current_user`).

## Error Handling
- **API (FastAPI)**: Propagates application errors as HTTP exceptions via `raise HTTPException(status_code=x, detail="msg")`. Specific cases (like JWT errors) map back directly to `401 Unauthorized`.
- **Client**: Evaluates asynchronous catches from `axios` via standard `try...catch` loops, displaying unified visual error banners in React via `authError` and `searchError` states.

## Security Practices
- **Passwords**: Hashed with `bcrypt` (12 rounds).
- **Injection**: Handled natively by modern ORMs (SQLAlchemy parameters). Further string sanitization uses `bleach`.
- **Rate limiting**: Handled natively via `slowapi` decorators across exposed routes.

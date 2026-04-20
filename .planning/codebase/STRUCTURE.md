# Directory Structure

## Repository Layout
```
/
├── .planning/       # GSD lifecycle and documentation state
├── backend/         # FastAPI Application
│   ├── app/         # Core application logic
│   │   ├── api/     # Routers / Controllers
│   │   ├── auth/    # JWT and hashing
│   │   ├── core/    # AI Services (Chroma, NetworkX, Groq Agent)
│   │   ├── data/    # Helper logic for db initialization
│   │   ├── models/  # SQLAlchemy ORM classes
│   │   ├── schemas/ # Pydantic types
│   │   ├── config.py    # Environment settings
│   │   ├── database.py  # SQLite connection pooling
│   │   └── main.py      # FastAPI ASGI app
│   ├── tests/       # Pytest suite
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/        # Next.js Application
│   ├── src/
│   │   ├── app/     # Pages and layouts (dashboard, root)
│   │   ├── components/ # Presentation and functional React components
│   │   └── lib/     # Utilities (api.ts for Axios calls)
│   ├── public/      # Static assets
│   ├── Dockerfile
│   ├── package.json
│   └── tailwind.config.ts # Inherently implied by v4 usage/postcss
└── docker-compose.yml 
```

## Naming Conventions
- **Backend Components**: `snake_case` for python modules. Standard FastAPI names (`models`, `schemas`, `api`).
- **Frontend Components**: `PascalCase` for React functional components (`ExpertCard.tsx`).
- **Classes/Interfaces**: `PascalCase` throughout both stacks.
- **Variables**: `camelCase` in Frontend, `snake_case` in Backend.

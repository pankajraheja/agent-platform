# Agent Platform — Prototype Builder

A multi-tier AI agent builder platform with No-Code, Low-Code, and Pro-Code capabilities.

## Architecture

```
agent-platform/
├── backend/          # Express + Node.js API server
│   ├── src/
│   │   ├── config/       # DB connection, env config
│   │   ├── migrations/   # PostgreSQL schema migrations (prototype_builder)
│   │   ├── seeds/        # Seed data (default personas, connectors, templates)
│   │   ├── models/       # Sequelize/Knex models
│   │   ├── routes/       # Express route definitions
│   │   ├── controllers/  # Business logic
│   │   └── middleware/    # Auth, validation, error handling
│   └── scripts/          # DB setup, migration runner
│
├── frontend/         # Vue 3 + Vite SPA
│   ├── src/
│   │   ├── views/        # Page-level components
│   │   ├── components/   # Reusable UI components
│   │   ├── router/       # Vue Router config
│   │   ├── stores/       # Pinia state management
│   │   └── api/          # Axios API client
│   └── public/
│
└── docker-compose.yml  # Local dev: PostgreSQL + pgAdmin
```

## Prerequisites

- Node.js >= 18
- Docker & Docker Compose (for local PostgreSQL)
- npm or yarn

## Quick Start

### 1. Start PostgreSQL locally
```bash
docker-compose up -d
```

### 2. Backend setup
```bash
cd backend
cp .env.example .env
npm install
npm run db:migrate    # Creates schema + tables
npm run db:seed       # Loads default personas, connectors, templates
npm run dev           # Starts on http://localhost:3000
```

### 3. Frontend setup
```bash
cd frontend
cp .env.example .env
npm install
npm run dev           # Starts on http://localhost:5173
```

### 4. Verify
- API Health: http://localhost:3000/api/health
- Frontend: http://localhost:5173
- pgAdmin: http://localhost:5050 (admin@local.dev / admin)

## Azure Deployment (Future)
See `docs/azure-deployment.md` for App Service + Azure PostgreSQL setup.

# Travel Agent

Self-hosted personal travel AI agent. Single-user.

Stack: FastAPI + Postgres (pgvector) + Redis + React (Vite/TS/Tailwind), behind Caddy. Deployed via Docker Compose.

## Quick start (dev)

Prereqs:

- Docker Desktop (or Docker Engine + Compose v2)
- [Ollama](https://ollama.com) running on the host (native install, not in Docker — Mac GPU acceleration works that way)

Pull the models the agent will use:

```sh
ollama pull qwen2.5:32b          # main agent model
ollama pull qwen2.5:7b           # cheap classifier (memory extraction, etc.)
ollama pull mxbai-embed-large    # embeddings (1024-dim)
```

Then bring up the stack:

```sh
cd infra
cp .env.example .env
# set SESSION_SECRET to any long random string; the OLLAMA_* defaults are fine
docker compose up --build
```

Open <http://localhost>. You should see "Backend OK".

The backend reaches your host Ollama via `host.docker.internal:11434` (configured in compose).

### Run database migrations

After the stack is up:

```sh
docker compose exec backend alembic upgrade head
```

Verify the `vector` extension is installed:

```sh
docker compose exec postgres psql -U travel -d travel -c "\dx vector"
```

## Layout

```
backend/    FastAPI app, agent loop, tools, memory, integrations
frontend/   React + Vite + Tailwind
infra/      docker-compose, Caddyfile, env template
```

See the build plan for phase-by-phase scope.

## Phase status

- [x] Phase 0 — Foundation
- [ ] Phase 1 — Core agent loop
- [ ] Phase 2 — Memory system
- [ ] Phase 3 — Real integrations (Duffel, Amadeus, Google Places, Gmail, Calendar)
- [ ] Phase 4 — Multi-step planning
- [ ] Phase 5 — UI polish
- [ ] Phase 6 — Production deployment

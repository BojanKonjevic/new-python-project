# docker

The `docker` addon adds containerisation support to any Zenit project. It generates a multi-stage Dockerfile, a Docker Compose configuration, and a `.dockerignore` file. This addon is **required by the `fastapi` template** and auto-selected for all `fastapi` projects.

---

## When to use it

Choose `docker` when you want to:

- Containerise your application for consistent deployments
- Run the app locally with Docker Compose alongside dependencies (PostgreSQL, Redis)
- Build optimised production images with multi-stage builds
- Use Docker Compose watch mode for live code syncing during development

---

## What it adds

### Files

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage build using `uv` for dependency management |
| `compose.yml` | Docker Compose services: app, PostgreSQL (fastapi only) |
| `.dockerignore` | Excludes build artefacts, caches, and local env files |

### Dockerfile

The generated Dockerfile:

- Uses `python:3.14-slim` as the base image
- Installs `uv` from the official Astral container image
- Creates a non-root `app` user for security
- Copies `pyproject.toml` and `uv.lock` first for layer caching
- Installs dependencies with `uv sync --frozen --no-dev --no-install-project`
- Copies source code and installs the project
- Exposes port 8000
- Sets `PYTHONPATH=/app/src`

For `fastapi` projects, the default CMD runs uvicorn. For `blank` projects, it runs `python -m <pkg_name>`.

### Compose services

**FastAPI projects** get two services:

| Service | Image | Purpose |
|---|---|---|
| `app` | Build from Dockerfile | The FastAPI application with hot-reload |
| `db` | `postgres:16` | PostgreSQL database with persistent volume |

The `app` service:
- Mounts `.env` for configuration
- Uses Docker Compose watch mode to sync `./src` to `/app/src`
- Runs uvicorn with `--reload` for development

The `db` service:
- Persists data in `./.pgdata` (gitignored)
- Exposes port 5432

**Blank projects** get only the `app` service (no database).

### Just recipes

| Recipe | Command |
|---|---|
| `just docker-up` | Build and start all services |
| `just docker-down` | Stop all services |

---

## Usage

### Development

```bash
just docker-up    # Build and start app + db
just docker-down  # Stop everything
```

The app service runs with `--reload`, so code changes in `src/` are reflected immediately.

### Production builds

```bash
docker build -t my-project .
docker run -p 8000:8000 --env-file .env my-project
```

The production image:
- Has no dev dependencies installed
- Runs as the non-root `app` user
- Uses the frozen `uv.lock` for reproducible builds

---

## Removing the addon

`zenit remove docker` will:

- Delete `Dockerfile`, `compose.yml`, and `.dockerignore`
- Remove `docker-up` and `docker-down` recipes from the justfile

**Note:** For `fastapi` projects, the `docker` addon is required by the template. You cannot remove it without first switching to the `blank` template (which requires re-scaffolding).

---

## Compatibility

| Template | Compatible |
|---|---|
| `fastapi` | **Required** — auto-selected, locked |
| `blank` | Yes — optional |

| Addon | Relationship |
|---|---|
| `redis` | Independent (adds its own compose service) |
| `celery` | Independent (adds worker/beat services) |
| `github-actions` | Independent |
| `sentry` | Independent |
| `auth-manual` | Independent |


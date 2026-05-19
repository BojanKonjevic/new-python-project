# Getting Started

Get a project running in under five minutes.

---

## Requirements

- **Python 3.14+**
- **uv 0.4+** — [install](https://docs.astral.sh/uv/getting-started/installation/)
- **git**
- **just** — optional, but generated projects use it heavily
- **direnv** — optional, auto-activates the virtualenv on `cd`

The `fastapi` template additionally requires **Docker** running locally.

> [!NOTE]
> **NixOS:** set `UV_PYTHON_DOWNLOADS=never` before installing. Generated projects detect NixOS automatically and write a `shell.nix` + `.envrc` that activates the system Python via direnv.

---

## Install Zenit

Zenit is a dev-time tool. It is never a runtime dependency of the projects it generates.

```bash
uv tool install zenit
```

To run without installing:

```bash
uvx zenit my-project
```

Verify the installation:

```bash
zenit --version
```

---

## Create a project

```bash
zenit create my-api
```

Zenit will ask a few questions:

```
Template:
  ❯ fastapi
    blank

Addons (space to select, enter to confirm):
  ❯ ◉ docker
    ◉ redis
    ◯ celery
    ◯ auth-manual
    ◯ sentry
    ◯ github-actions

Project name [my-api]:
Package name [my_api]:
```

Select **fastapi** as the template, then **docker** and **redis** as addons. Press Enter to confirm each selection. Arrow keys navigate; in CI environments without a TTY, Zenit falls back to numbered input automatically.

> [!TIP]
> Set personal defaults in your config file so they appear pre-selected every time:
> ```toml
> # ~/.config/zenit/zenit.toml  (Linux / macOS)
> # %APPDATA%\zenit\zenit.toml  (Windows)
> default_template = "fastapi"
> default_addons = ["docker", "github-actions"]
> ```

---

## What was generated

```
my-api/
├── .zenit.toml              # Zenit's manifest — tracks what was generated
├── pyproject.toml           # Project metadata and dependencies
├── justfile                 # Task runner recipes (run, test, lint, …)
├── .env                     # Local environment variables (not committed)
├── .env.example             # Committed template for .env
├── .envrc                   # direnv hook (optional)
├── compose.yml              # Docker Compose — app + postgres + redis services
├── Dockerfile               # Multi-stage build for the API
├── .dockerignore
├── alembic.ini              # Database migration config
├── alembic/
│   └── env.py               # Alembic environment wired to async SQLAlchemy
├── my_api/
│   ├── main.py              # FastAPI app, lifespan, middleware
│   ├── settings.py          # Pydantic Settings — reads from .env
│   ├── lifecycle.py         # Redis connection pool (injected by redis addon)
│   ├── exceptions.py        # Global exception handlers
│   ├── api/
│   │   ├── router.py        # Registers all route groups
│   │   └── routes/
│   │       └── health.py    # GET /health — always generated
│   ├── db/
│   │   ├── base.py          # SQLAlchemy DeclarativeBase
│   │   └── session.py       # Async session factory and get_session dependency
│   ├── models/
│   │   └── mixins.py        # TimestampMixin (created_at, updated_at)
│   ├── schemas/
│   │   └── common.py        # PaginationParams, PaginatedResponse[T]
│   └── scripts/
│       └── wait_db.py       # Waits for postgres to be ready (used by justfile)
└── tests/
    ├── conftest.py          # pytest fixtures: async session, HTTP client
    └── test_health.py       # Smoke test for GET /health
```

`.zenit.toml` is the only file that links this project to Zenit. The rest is plain Python — no Zenit-specific imports, no runtime dependency on Zenit.

---

## Run it

```bash
cd my-api
just run
```

This starts the Postgres and Redis containers and launches the API server with hot-reload. Open `http://localhost:8000/health` to confirm it is running.

Other useful recipes:

```bash
just test      # run pytest
just lint      # ruff check
just fmt       # ruff format
just check     # mypy strict
```

---

## Next steps

- [Architecture Overview](./architecture/index.md) — understand how Zenit works internally and why it was designed this way
- [Commands Reference](./commands/index.md) — every flag and option for all five commands
- [Adding an addon](./commands/add.md) — add capabilities to an existing project with `zenit add`

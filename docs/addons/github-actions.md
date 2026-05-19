# github-actions

The `github-actions` addon adds a continuous integration workflow that runs lint, type-check, and test on every push and pull request to the `main` branch.

---

## When to use it

Choose `github-actions` when you want:

- Automated CI on GitHub without manual configuration
- Consistent lint, format check, type check, and test execution
- Service containers (PostgreSQL, Redis) automatically provisioned for tests
- `uv` caching for fast dependency installation

---

## What it adds

### Files

| File | Purpose |
|---|---|
| `.github/workflows/ci.yml` | GitHub Actions workflow definition |

### Workflow triggers

The workflow runs on:
- Push to `main`
- Pull requests targeting `main`

### Job steps

1. **Checkout** — `actions/checkout@v4`
2. **Install uv** — `astral-sh/setup-uv@v4` with caching
3. **Set up Python** — `uv python install 3.14`
4. **Install dependencies** — `uv sync --all-extras`
5. **Run migrations** (fastapi with postgres only) — `uv run alembic upgrade head`
6. **Lint** — `uv run ruff check .`
7. **Format check** — `uv run ruff format --check .`
8. **Type check** — `uv run mypy src/`
9. **Test** — `uv run pytest -v`

### Service containers

The workflow automatically provisions service containers based on installed addons:

**PostgreSQL** (fastapi template):
- Image: `postgres:16`
- Database: `<pkg_name>_test`
- Health checks configured

**Redis** (if `redis` addon installed):
- Image: `redis:7-alpine`
- Port 6379 exposed
- Health checks configured

### Environment variables in CI

The workflow sets the correct environment variables for test execution:

- `DATABASE_URL` — points to the service container
- `REDIS_URL` — points to the service container

---

## Post-installation

After adding the addon, push to GitHub:

```bash
git add .github/workflows/ci.yml
git commit -m "Add CI workflow"
git push
```

The workflow will run automatically on the next push or PR.

---

## Customisation

The generated workflow is a solid starting point. You can customise it by editing `.github/workflows/ci.yml` directly:

- Add deployment steps
- Add matrix builds across Python versions
- Add security scanning (bandit, safety)
- Adjust branch triggers

Zenit will not overwrite your changes on subsequent `zenit add` operations.

---

## Removing the addon

`zenit remove github-actions` will:

- Delete `.github/workflows/ci.yml`

If you customised the workflow and want to keep it, back it up before removing.

---

## Compatibility

| Template | Compatible |
|---|---|
| `fastapi` | Yes |
| `blank` | Yes |

| Addon | Relationship |
|---|---|
| `docker` | Independent |
| `redis` | Independent (adds Redis service container) |
| `celery` | Independent |
| `sentry` | Independent |
| `auth-manual` | Independent |


# sentry

The `sentry` addon adds Sentry error tracking and performance monitoring to any Zenit project. It initialises the Sentry SDK on application startup and captures exceptions, performance traces, and error context automatically.

---

## When to use it

Choose `sentry` when you want:

- Automatic error reporting with stack traces
- Performance monitoring for HTTP requests and database queries
- Release tracking and error aggregation
- Alerts for new or regressed issues

---

## What it adds

### Files

| File | Purpose |
|---|---|
| `src/{{pkg_name}}/integrations/__init__.py` | Package marker (if not present) |
| `src/{{pkg_name}}/integrations/sentry.py` | Sentry SDK initialisation with conditional enablement |

### Sentry initialisation

The generated `sentry.py`:

- Reads `SENTRY_DSN` from environment
- No-ops when `SENTRY_DSN` is empty (safe for local development)
- Configures environment, traces sample rate, and profiles sample rate
- For `fastapi` projects: includes `FastApiIntegration` and `SqlalchemyIntegration`
- For `blank` projects: basic Sentry SDK init

### Settings fields

Injects into `settings_fields`:

```python
sentry_dsn: str = ""
sentry_environment: str = "development"
```

### Environment variables

| Key | Default | Description |
|---|---|---|
| `SENTRY_DSN` | `""` | Sentry project DSN (empty = disabled) |
| `SENTRY_ENVIRONMENT` | `development` | Environment tag (production, staging, etc.) |

### Dependencies

- `sentry-sdk[fastapi]` — Sentry SDK with FastAPI integration

### Just recipes

| Recipe | Command |
|---|---|
| `just sentry-check` | Print installed sentry-sdk version |
| `just sentry-test` | Test Sentry initialisation and DSN configuration |

### Lifespan integration

- **FastAPI:** Injects `init_sentry()` into `lifespan_startup` in `lifecycle.py`
- **Blank:** Injects `init_sentry()` into `main()` before the return statement

---

## Configuration

### Getting a DSN

1. Create a project at [sentry.io](https://sentry.io)
2. Go to Settings → Projects → [your project] → Client Keys (DSN)
3. Copy the DSN and add it to `.env`:

```bash
SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
SENTRY_ENVIRONMENT=production
```

### Local development

Leave `SENTRY_DSN` empty in `.env` during local development. Sentry will be silently disabled and no errors are sent.

### Performance monitoring

The default configuration samples 100% of traces and profiles. Adjust in production:

```python
# In sentry.py, modify init_sentry():
sentry_sdk.init(
    dsn=dsn,
    traces_sample_rate=0.1,      # 10% of requests
    profiles_sample_rate=0.1,    # 10% of traced requests
    # ...
)
```

---

## Post-installation

After adding the addon:

```bash
just sentry-test   # Verify Sentry is configured correctly
```

For `fastapi` projects, the SDK is initialised automatically on startup. For `blank` projects, it runs on every `main()` invocation.

---

## Removing the addon

`zenit remove sentry` will:

- Delete `src/{{pkg_name}}/integrations/sentry.py`
- Remove `init_sentry()` calls from `lifecycle.py` (fastapi) or `main.py` (blank)
- Remove `sentry_dsn` and `sentry_environment` from settings
- Remove `SENTRY_DSN` and `SENTRY_ENVIRONMENT` from `.env` and `.env.example`
- Remove `sentry-sdk[fastapi]` from `pyproject.toml`
- Remove sentry just recipes

---

## Compatibility

| Template | Compatible |
|---|---|
| `fastapi` | Yes |
| `blank` | Yes |

| Addon | Relationship |
|---|---|
| `docker` | Independent |
| `redis` | Independent |
| `celery` | Independent |
| `github-actions` | Independent |
| `auth-manual` | Independent |


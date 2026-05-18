# zenit

Scaffold a new Python project with one command.

```
zenit my-project
```

Picks a template, applies addons, writes all files, generates `pyproject.toml` and `justfile`, runs `git init`, and tells you what to do next. Nothing network-dependent — you get a directory you can immediately work in.

---

## Requirements

- **Python 3.14+**
- **uv 0.4+** — [install](https://docs.astral.sh/uv/getting-started/installation/)
- **git**
- **just** — optional, but generated projects use it heavily
- **direnv** — optional, auto-activates the virtualenv on `cd`

The `fastapi` template additionally requires **Docker** running locally.

---

## Installation

```bash
uv tool install zenit

# or run without installing
uvx zenit my-project
```

**NixOS:** `UV_PYTHON_DOWNLOADS=never` must be set. Generated projects detect NixOS automatically and write a `shell.nix` + `.envrc` that works with the system Python.

---

## Usage

```
zenit create <name>                scaffold a new project

zenit add [addon]                  add an addon to the current project
zenit remove [addon]               remove an addon from the current project
zenit doctor                       check project health
zenit doctor --thorough            full fingerprint integrity check

zenit list-templates
zenit list-addons
zenit config                       show config file path and current settings
zenit --version
```

All commands that modify files support `--dry-run`. Interactive prompts use arrow keys; fall back to numbered input in CI.

---

## Templates

**`blank`** — minimal Python package with pytest, ruff, mypy, and a `justfile`.

**`fastapi`** — production-oriented FastAPI setup with SQLAlchemy (async), Alembic, asyncpg, pydantic-settings, a health endpoint, and test fixtures. Requires the `docker` addon.

---

## Addons

Addons can be selected at scaffold time or added/removed later with `zenit add` and `zenit remove`.

| Addon | Description |
|---|---|
| `docker` | Dockerfile, compose.yml, .dockerignore |
| `redis` | Async Redis connection helper + compose service |
| `celery` | Celery worker + beat, backed by Redis |
| `sentry` | Sentry SDK initialisation (no-ops when DSN is unset) |
| `github-actions` | CI workflow: lint, type-check, test on push/PR |
| `auth-manual` | JWT auth: register, login, refresh, logout (fastapi only) |

Dependencies are enforced (`celery` requires `redis`) and tracked in `.zenit.toml`.

---

## Adding and removing addons

```bash
cd my-project

zenit add              # interactive picker
zenit add redis        # direct
zenit add celery --dry-run

zenit remove sentry
```

Both commands update `.zenit.toml`, `pyproject.toml`, `justfile`, `compose.yml`, and `.env` as needed. Run `uv sync` after to install/uninstall packages.

---

## Health checks

```bash
zenit doctor
```

Checks that all expected files exist, manifest blocks are intact, dependencies match the installed addons, compose services are present, and env vars are defined. Exits with code 1 if errors are found.

```bash
zenit doctor --thorough
```

Adds a full fingerprint integrity pass for all Python blocks recorded in the manifest — useful after running a formatter or making manual edits.

---

## Configuration

Optional config file for personal defaults:

| Platform | Path |
|---|---|
| Linux / macOS | `~/.config/zenit/zenit.toml` |
| Windows | `%APPDATA%\zenit\zenit.toml` |

```toml
default_template = "fastapi"
default_addons = ["docker", "github-actions"]
```

Defaults appear as pre-selections in the interactive prompt — you can still change them before confirming.

---

## How zenit tracks your project

Every scaffolded project gets a `.zenit.toml` at the root with two sections.

### `[project]` — lockfile

```toml
[project]
template = "fastapi"
addons = ["docker", "redis"]
zenit_version = "1.0.8"
schema_version = 2
```

This is the source of truth for `zenit add`, `zenit remove`, and `zenit doctor`. Commit it. Don't edit it manually — use the CLI instead.

### `[manifest]` — injection registry

The manifest is zenit's record of everything it has injected into your project. It is written at scaffold time and updated on every `add` / `remove`. Each entry tracks what was injected, where, and a fingerprint so the code can be located reliably even after formatting.

```toml
[[manifest.python_blocks]]
addon = "redis"
point = "settings_fields"
file = "src/my_project/config.py"
lines = "14-14"
fingerprint = "sha256:abc123..."
fingerprint_normalised = "sha256:def456..."

[manifest.python_blocks.locator]
name = "after_last_class_attribute"
args = {class_name = "Settings"}

[[manifest.env]]
key = "REDIS_URL"
source = "addon"
addon = "redis"

[[manifest.dependencies]]
package = "redis"
spec = "redis>=5"
source = "addon"
addon = "redis"
dev = false

[[manifest.just_recipes]]
name = "redis-up"
source = "addon"
addon = "redis"
```

Do not edit the `[manifest]` section manually. Run `zenit doctor` after making any structural changes to confirm everything is consistent.

---

## How code injection works

When an addon adds code to an existing Python file, zenit uses a **CST + structural locator** pipeline instead of sentinel comments.

### Locators

Each template declares named injection points. A locator is a pure function that receives a parsed `libcst.Module` and returns the body index at which new statements should be inserted. The following locators are available:

| Locator | Description |
|---|---|
| `after_last_import` | After the last import statement at module level |
| `after_last_class_attribute` | After the last field/annotation in a named class |
| `after_statement_matching` | After the first top-level statement matching a regex |
| `before_yield_in_function` | Before the `yield` in an async generator (lifespan functions) |
| `before_return_in_function` | Before the first `return` in a named function |
| `in_function_body` | Before or after an anchor statement inside a named function |
| `at_module_end` | Append at the end of the module body |
| `at_file_end` | Append at the end of a non-Python file |

### File handlers

Injection and removal are dispatched through typed file handlers, one per file type. Each handler knows how to apply a snippet and how to undo it cleanly.

| Handler | Matches | Strategy |
|---|---|---|
| `PythonHandler` | `*.py` | libcst parse → locator → line-level splice |
| `TomlHandler` | `*.toml` | tomlkit round-trip; skips if top-level key already exists |
| `YamlHandler` | `*.yml`, `*.yaml` | Append; skips if first content key already present |
| `JustfileHandler` | `justfile` | Append; skips if any recipe name already exists |
| `EnvHandler` | `.env*` | Append; skips individual keys that are already defined |

### Removal

When an addon is removed, zenit uses the manifest entry to locate the injected block. It tries three stages in order:

1. **Exact fingerprint** — SHA-256 of the canonical libcst output matches the recorded value.
2. **Normalised fingerprint** — SHA-256 after stripping trailing whitespace and collapsing blank lines; resilient to formatter runs.
3. **Fuzzy match** — SequenceMatcher similarity ≥ 85 % within a 20-line window around the recorded position; prints a warning when used.

If none of the three stages succeed, zenit prints an error with manual recovery instructions rather than silently corrupting the file.

---

## Running from source

```bash
git clone https://github.com/BojanKonjevic/zenit.git
cd zenit
uv sync
uv run python main.py my-project
```

---

## License

MIT — see [LICENSE](LICENSE).

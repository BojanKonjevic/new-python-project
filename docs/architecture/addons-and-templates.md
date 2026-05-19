# Addons & Templates

This page describes the internal structure of templates and addons as source-code artifacts. It is the reference for anyone writing a new addon or template.

---

## Where they live

```
src/scaffolder/
├── templates/
│   ├── _common/             # files applied to every project regardless of template
│   │   ├── gitignore
│   │   ├── gitattributes
│   │   ├── envrc
│   │   ├── pre-commit-config.yaml
│   │   └── shell.nix
│   ├── blank/
│   │   ├── template.py      # template manifest
│   │   └── files/           # Jinja2 templates for generated files
│   └── fastapi/
│       ├── template.py
│       └── files/
└── addons/
    ├── _registry.py         # discovers and loads addon manifests
    ├── auth-manual/
    │   ├── addon.py         # addon manifest
    │   └── files/
    ├── celery/
    ├── docker/
    ├── github-actions/
    ├── redis/
    └── sentry/
```

Templates and addons are co-located with their files. A pull request that adds a new addon touches exactly one directory under `src/scaffolder/addons/`.

---

## Anatomy of a template

A template is a directory containing a `template.py` manifest and a `files/` subdirectory.

### `template.py`

The manifest is a Python module that exposes a `TemplateConfig` instance. It declares:

- the template's name and description
- which addons are compatible with it (empty list means all)
- the Jinja2 context variables it expects (project name, package name, etc.)
- the named injection points it exposes to addons

```python
from scaffolder.schema.models import TemplateConfig

config = TemplateConfig(
    name="fastapi",
    description="Production-oriented FastAPI with SQLAlchemy, Alembic, and asyncpg.",
    requires_addons=["docker"],          # docker is mandatory for fastapi
    injection_points=[
        "settings_fields",
        "lifespan_startup",
        "lifespan_shutdown",
        "router_registration",
        "after_last_import",
    ],
)
```

### `files/`

Every file under `files/` is either a plain file or a Jinja2 template. Files with a `.j2` extension are rendered using the project context (package name, project name, chosen addons). Files without `.j2` are copied verbatim.

Jinja2 templates use `(( ))` for variable substitution and `[% %]` for control flow — not the default `{{ }}` and `{% %}` — to avoid conflicts with files that contain those characters literally (e.g. GitHub Actions workflows, docker-compose files).

```
(( pkg_name ))          →   my_project
(( project_name ))      →   my-project
[% if "redis" in addons %]
...
[% endif %]
```

### `_common/`

Files in `_common/` are applied to every project regardless of which template is chosen. They include `.gitignore`, `.gitattributes`, `.envrc`, a pre-commit config, and `shell.nix` for NixOS. These are plain files, not Jinja2 templates.

---

## Anatomy of an addon

An addon is a directory containing an `addon.py` manifest and an optional `files/` subdirectory.

### `addon.py`

The manifest is a Python module that exposes an `AddonConfig` instance. It is the complete declarative description of everything the addon does.

```python
from scaffolder.schema.models import AddonConfig, AddonHooks

config = AddonConfig(
    name="redis",
    description="Async Redis connection helper with connection pooling and a FastAPI lifespan hook.",
    requires_template=[],               # empty = compatible with all templates
    requires_addons=[],                 # addon dependencies
    files=[...],                        # files to create
    injections=[...],                   # code blocks to inject
    dependencies=[...],                 # packages to add to pyproject.toml
    dev_dependencies=[],                # packages to add to dev dependencies
    compose_services=[...],             # docker-compose service definitions
    env_vars=[...],                     # keys to append to .env.example
    just_recipes=[...],                 # recipes to append to justfile
)
```

### Fields

**`name`** — string. The addon's identifier. Used in CLI commands (`zenit add redis`), in `.zenit.toml`, and in cross-addon references.

**`description`** — string. One sentence. Shown in `zenit list` output and in the interactive picker.

**`requires_template`** — list of strings. The templates this addon is compatible with. An empty list means all templates. If a user attempts to add an incompatible addon, Zenit exits with an error before making any changes.

```
Error: addon 'auth-manual' requires template 'fastapi', but this project uses 'blank'.
```

**`requires_addons`** — list of strings. Other addons that must be installed before this one. `celery` requires `redis`. If the dependency is not installed, Zenit installs it automatically as part of the same `add` invocation and records both in the manifest.

**`files`** — list of file specs. Each spec declares a destination path and a source path relative to the addon's `files/` directory. Files with `.j2` extensions are rendered as Jinja2 templates using the project context; others are copied verbatim.

**`injections`** — list of injection specs. Each spec declares:

| Field | Description |
|---|---|
| `point` | The named injection point in the template (e.g. `settings_fields`) |
| `file` | The target file, relative to the project root |
| `content` | The code to inject, as a string (may be a `.j2` template path) |
| `locator` | The locator to use and its arguments |

**`dependencies`** — list of package specifiers to add to `[project.dependencies]` in `pyproject.toml`, e.g. `["redis>=5"]`.

**`dev_dependencies`** — list of package specifiers to add to `[project.optional-dependencies.dev]`.

**`compose_services`** — list of service definitions to merge into `compose.yml`. Each service is a dict matching the Docker Compose service schema. The `YamlHandler` skips any service whose top-level key already exists.

**`env_vars`** — list of `{key, value, comment}` dicts. Appended to `.env.example`. The `EnvHandler` skips keys that are already defined.

**`just_recipes`** — list of `{name, content}` dicts. Appended to the `justfile`. The `JustfileHandler` skips recipes whose name already exists.

---

## How `zenit add` processes an addon

When you run `zenit add redis`, Zenit executes the following steps in order. If any step fails, all previous steps are rolled back before the error is reported.

1. **Load** the addon manifest from the registry.
2. **Validate compatibility** — check `requires_template` against the current project's template, and `requires_addons` against currently installed addons. Install missing addon dependencies first if needed.
3. **Check for conflicts** — if the addon is already installed, exit with an error.
4. **Write files** — render and write each file in `addon.files`. If a destination file already exists, exit with an error rather than overwriting it.
5. **Inject code** — for each injection spec, run the libcst pipeline against the target file (see [Code Injection](./injection.md)).
6. **Update `pyproject.toml`** — add declared dependencies and dev dependencies using tomlkit.
7. **Update `compose.yml`** — merge declared compose services using the `YamlHandler`.
8. **Update `.env.example`** — append declared env vars using the `EnvHandler`.
9. **Update `justfile`** — append declared recipes using the `JustfileHandler`.
10. **Update `.zenit.toml`** — add the addon to `[project].addons` and write manifest entries for every file, injection, dependency, env var, and recipe.

Step 10 is always last. If anything before it fails, the rollback leaves `.zenit.toml` unchanged, so the manifest always reflects the actual state of the project.

---

## How `zenit remove` reverses it

Removal executes the same steps in reverse order, reading from `.zenit.toml` rather than from the addon manifest directly. This means removal is driven by what was actually recorded at install time, not by the current state of the addon source — if the addon manifest has changed since installation, removal still uses the original recorded data.

1. **Read** all manifest entries for the addon from `.zenit.toml`.
2. **Confirm** — show the user the list of files, injections, packages, env vars, and recipes that will be removed, and ask for confirmation (skipped with `--yes`).
3. **Update `justfile`** — remove recorded recipes.
4. **Update `.env.example`** — remove recorded env var keys.
5. **Update `compose.yml`** — remove recorded compose services.
6. **Update `pyproject.toml`** — remove recorded dependencies.
7. **Excise injections** — run the fingerprint pipeline against each recorded injection (see [Code Injection](./injection.md)).
8. **Delete files** — delete each recorded file. If a file's content hash no longer matches, warn and ask for confirmation before deleting.
9. **Update `.zenit.toml`** — remove the addon from `[project].addons` and delete all its manifest entries.

---

## Why addons are declarative

Addons describe what they add. They do not run arbitrary Python code during `add` or `remove`. This is a deliberate constraint.

An imperative addon — one that executes a script — could do anything: make network requests, read environment variables, write to arbitrary paths. It would be impossible to guarantee that `zenit remove` could cleanly undo it, because the script's effects are not enumerable in advance.

A declarative addon is fully enumerable. Every file it creates, every line it injects, every package it installs is listed in the manifest before a single byte is written. This makes rollback exact, removal clean, and `zenit doctor` able to verify the complete state of the project against a known specification.

The tradeoff is flexibility. A declarative addon cannot conditionally inject different code based on runtime state, cannot fetch a dependency version from the internet, and cannot prompt the user for input mid-install. For the current set of addons this has not been a limitation. If a future addon genuinely requires imperative logic, the right approach is to extend the manifest schema with a new field type — not to add an escape hatch that bypasses the declarative model.

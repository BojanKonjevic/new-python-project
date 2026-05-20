# Addons & Templates

This page is the reference for writing a new addon. It covers the directory layout, every field in `AddonConfig`, the optional hook functions, and a complete walkthrough of building an addon from scratch.

---

## Directory layout

```
src/scaffolder/
├── templates/
│   ├── _common/          # copied to every project regardless of template
│   ├── blank/
│   │   ├── template.py   # TemplateConfig instance
│   │   └── files/        # Jinja2 templates and static files
│   └── fastapi/
│       ├── template.py
│       └── files/
└── addons/
    ├── _registry.py      # auto-discovers addon.py files
    ├── redis/
    │   ├── addon.py      # AddonConfig instance + optional hooks
    │   └── files/        # files this addon writes
    └── your-addon/
        ├── addon.py
        └── files/
```

A pull request adding a new addon touches exactly one directory under `src/scaffolder/addons/`. The registry discovers it automatically — no registration step required.

---

## How addons are discovered

`_registry.py` scans the `addons/` directory for subdirectories, imports `addon.py` from each one, reads the `config` attribute, and attaches any optional hook functions (`can_apply`, `can_remove`, `health_check`, `post_apply`). The result is a list of `AddonConfig` objects used everywhere in the CLI.

---

## `AddonConfig` reference

This is the complete type signature as defined in `scaffolder/schema/models.py`:

```python
@dataclass
class AddonConfig:
    id: str                              # CLI name: "zenit add <id>"
    description: str                     # one sentence, shown in zenit list
    requires: list[str]                  # addon dependencies, e.g. ["redis"]
    templates: list[str]                 # allowed templates; empty = all
    files: list[FileContribution]        # files to write
    compose_services: list[ComposeService]
    compose_volumes: list[str]           # named volume names
    env_vars: list[EnvVar]
    deps: list[str]                      # runtime deps, e.g. ["redis>=5"]
    dev_deps: list[str]
    just_recipes: list[str]
    injections: list[Injection]
    _module: AddonHooks | None           # populated by registry; not set manually
```

### `FileContribution`

```python
@dataclass
class FileContribution:
    dest: str           # path relative to project root; {{pkg_name}} is expanded
    source: str | None  # path to a source file (static copy or Jinja2 template)
    content: str | None # inline content (use for empty __init__.py stubs)
    template: bool      # True = render source as Jinja2; False = copy verbatim
```

Provide either `source` or `content`, not both. For an empty `__init__.py`:

```python
FileContribution(dest="src/{{pkg_name}}/mymodule/__init__.py", content="")
```

For a Jinja2 template:

```python
FileContribution(
    dest="src/{{pkg_name}}/integrations/redis.py",
    source=str(_HERE / "files" / "redis.py.j2"),
    template=True,
)
```

For a static file copied verbatim:

```python
FileContribution(
    dest=".dockerignore",
    source=str(_HERE / "files" / ".dockerignore"),
)
```

### `Injection`

```python
@dataclass
class Injection:
    point: str     # named injection point declared by the template
    content: str   # the code to inject (a string, including indentation)
    addon_id: str  # set automatically by the pipeline; leave as default ""
```

The `point` must be one of the injection points declared by the target template. The `content` string is inserted verbatim — include the correct indentation for the target scope.

See [Code Injection](./injection.md) for the full locator reference and how to choose the right one.

### `ComposeService`

```python
@dataclass
class ComposeService:
    name: str
    image: str | None               # docker image, e.g. "redis:7-alpine"
    build: str | None               # build context, e.g. "."
    ports: list[str]                # e.g. ["6379:6379"]
    volumes: list[str]              # e.g. ["redis-data:/data"]
    environment: dict[str, str]
    env_file: list[str]             # e.g. [".env"]
    command: str | None
    depends_on: list[str] | dict[str, dict[str, str]]
    develop_watch: list[dict[str, object]]
    healthcheck: dict[str, object] | None
```

### `EnvVar`

```python
@dataclass
class EnvVar:
    key: str      # e.g. "REDIS_URL"
    default: str  # e.g. "redis://localhost:6379/0"
    comment: str  # optional, appended as inline comment in .env.example
```

### `AddonHooks`

```python
@dataclass
class AddonHooks:
    post_apply:   Callable[[Context], None] | None
    health_check: Callable[[Path, ZenitLockfile], list[HealthIssue]] | None
    can_apply:    Callable[[Path, ZenitLockfile], str | None] | None
    can_remove:   Callable[[Path, ZenitLockfile], str | None] | None
```

These are optional module-level functions in `addon.py`. The registry attaches them automatically when it loads the module.

---

## Jinja2 template variables

Files rendered with `template=True` have access to these variables:

| Variable | Type | Example |
|---|---|---|
| `pkg_name` | `str` | `"my_project"` |
| `name` | `str` | `"my-project"` |
| `template` | `str` | `"fastapi"` or `"blank"` |
| `has_postgres` | `bool` | `True` if template is `fastapi` |
| `has_redis` | `bool` | `True` if `redis` addon is in the project |
| `addons` | `list[str]` | `["docker", "redis"]` |

Zenit uses non-standard Jinja2 delimiters to avoid conflicts with Python source and YAML files:

```
(( pkg_name ))         →  variable substitution  (instead of {{ }})
[% if has_redis %]     →  control flow           (instead of {% %})
[% endif %]
```

`dest` paths in `FileContribution` also support `{{pkg_name}}` expansion (note: double braces, not the Jinja2 `(( ))` syntax — this is resolved before rendering).

---

## Injection points

Injection points are named locations in template files where addons are permitted to insert code. They are declared by each template's `TemplateConfig` and backed by a specific locator.

### `fastapi` template injection points

| Point name | Target file | Locator | What goes here |
|---|---|---|---|
| `settings_fields` | `settings.py` | `after_last_class_attribute` on `Settings` | Pydantic settings fields |
| `lifespan_startup` | `lifecycle.py` | `before_yield_in_function` on `lifespan` | Startup hooks (before yield) |
| `lifespan_shutdown` | `lifecycle.py` | `in_function_body` after `yield` in `lifespan` | Shutdown hooks (after yield) |
| `router_imports` | `api/router.py` | `after_last_import` | Import statements for addon routers |
| `router_includes` | `api/router.py` | `after_statement_matching` on `include_router` | `include_router(...)` calls |
| `test_imports` | `tests/conftest.py` | `after_last_import` | Test fixture imports |
| `test_fixtures` | `tests/conftest.py` | `at_module_end` | Additional pytest fixtures |
| `exceptions` | `exceptions.py` | `at_module_end` | Custom exception classes |
| `env_vars` | `.env` | `at_file_end` | Environment variable definitions |

### `blank` template injection points

| Point name | Target file | Locator | What goes here |
|---|---|---|---|
| `main_startup` | `main.py` | `before_return_in_function` on `main` | Startup calls |
| `env_vars` | `.env` | `at_file_end` | Additional setup |

The `blank` template has minimal injection points by design. If you need more hooks, use `fastapi`, or contribute new injection points to `blank/template.py`.

---

## Optional hook functions

These are module-level functions you can define in `addon.py`. They're all optional.

### `can_apply(project_dir, lockfile) -> str | None`

Called before the addon pipeline runs. Return `None` to allow installation, or a descriptive error string to abort it. Use this to detect conflicts that would make the addon fail.

```python
def can_apply(project_dir: Path, lockfile: ZenitLockfile) -> str | None:
    target = project_dir / "src" / project_dir.name.replace("-", "_") / "my_file.py"
    if target.exists():
        return (
            f"{target.relative_to(project_dir)} already exists.\n"
            "    Remove it first if you want zenit to generate a fresh one:\n"
            f"      rm {target.relative_to(project_dir)}"
        )
    return None
```

### `can_remove(project_dir, lockfile) -> str | None`

Called before removal. Return `None` to allow it, or an error string to abort. Use this when other things depend on the addon's presence.

```python
def can_remove(project_dir: Path, lockfile: ZenitLockfile) -> str | None:
    if "celery" in lockfile.addons:
        return "Remove 'celery' first — it depends on this addon."
    return None
```

### `health_check(project_dir, lockfile) -> list[HealthIssue]`

Called by `zenit doctor`. Return a list of `HealthIssue` objects representing checks specific to this addon. Use `Severity.OK`, `Severity.WARN`, or `Severity.ERROR`.

```python
def health_check(project_dir: Path, lockfile: ZenitLockfile) -> list[HealthIssue]:
    issues: list[HealthIssue] = []
    env_path = project_dir / ".env"
    if env_path.exists() and "MY_KEY=" not in env_path.read_text():
        issues.append(HealthIssue(
            Severity.WARN,
            "MY_KEY is not set in .env",
            hint="Add MY_KEY=<value> to .env.",
        ))
    return issues
```

### `post_apply(ctx) -> None`

Called after the addon pipeline completes successfully. Receives the `Context` object. Use this for any post-install steps that can't be expressed declaratively (uncommon).

---

## Tutorial: building an addon from scratch

This walkthrough builds a minimal `hello` addon that injects a `print("hello")` call into `main()` on the `blank` template. By the end you will have a working addon you can install with `zenit add hello`.

### Step 1: create the directory

```bash
mkdir src/scaffolder/addons/hello
```

The registry discovers addons by scanning this directory. No registration step.

### Step 2: write `addon.py`

```python
# src/scaffolder/addons/hello/addon.py
from scaffolder.schema.models import AddonConfig, Injection

config = AddonConfig(
    id="hello",
    description="Injects a hello-world print into main().",
    templates=["blank"],  # only compatible with the blank template
    injections=[
        Injection(
            point="main_startup",
            content='    print("hello from zenit")',
        ),
    ],
)
```

That's a complete addon. No files, no dependencies, no compose services — just one injection.

### Step 3: test it

```bash
# Create a blank project to test against
zenit create hello-test
cd hello-test

# Preview what the addon would do
zenit add hello --dry-run

# Install it
zenit add hello

# Verify
cat src/hello_test/main.py
```

You should see `print("hello from zenit")` injected before the `return` in `main()`.

```bash
# Verify Zenit's records are clean
zenit doctor

# Remove it cleanly
zenit remove hello

# Verify it's gone
cat src/hello_test/main.py
```

### Step 4: add a file

Extend the addon to also write a helper file.

```python
# src/scaffolder/addons/hello/addon.py
from pathlib import Path
from scaffolder.schema.models import AddonConfig, FileContribution, Injection

_HERE = Path(__file__).parent.absolute()

config = AddonConfig(
    id="hello",
    description="Hello-world addon — writes a greeter module and wires it into main().",
    templates=["blank"],
    files=[
        FileContribution(
            dest="src/{{pkg_name}}/greeter.py",
            source=str(_HERE / "files" / "greeter.py"),
        ),
    ],
    injections=[
        Injection(
            point="main_startup",
            content="    from .greeter import greet\n    greet()",
        ),
    ],
)
```

Create the file:

```
src/scaffolder/addons/hello/
├── addon.py
└── files/
    └── greeter.py
```

```python
# src/scaffolder/addons/hello/files/greeter.py
def greet() -> None:
    print("hello from zenit")
```

### Step 5: make the file a Jinja2 template

If your file needs to reference the project's package name, use a `.j2` extension and set `template=True`:

```python
FileContribution(
    dest="src/{{pkg_name}}/greeter.py",
    source=str(_HERE / "files" / "greeter.py.j2"),
    template=True,
)
```

```python
# src/scaffolder/addons/hello/files/greeter.py.j2
def greet() -> None:
    print("hello from (( name ))")
```

### Step 6: add a preflight check

Prevent installation if the user already has a `greeter.py`:

```python
from pathlib import Path
from scaffolder.core.lockfile import ZenitLockfile

def can_apply(project_dir: Path, lockfile: ZenitLockfile) -> str | None:
    pkg_name = project_dir.name.replace("-", "_")
    target = project_dir / "src" / pkg_name / "greeter.py"
    if target.exists():
        return (
            f"{target.relative_to(project_dir)} already exists.\n"
            f"    Remove it first: rm {target.relative_to(project_dir)}"
        )
    return None
```

### Step 7: add a health check

```python
from scaffolder.doctor.doctor import HealthIssue, Severity

def health_check(project_dir: Path, lockfile: ZenitLockfile) -> list[HealthIssue]:
    pkg_name = project_dir.name.replace("-", "_")
    greeter = project_dir / "src" / pkg_name / "greeter.py"
    if greeter.exists():
        return [HealthIssue(Severity.OK, "greeter.py is present.")]
    return [HealthIssue(
        Severity.ERROR,
        "greeter.py is missing.",
        hint="Re-add the hello addon: zenit add hello",
    )]
```

### Complete `addon.py`

```python
from pathlib import Path

from scaffolder.core.lockfile import ZenitLockfile
from scaffolder.doctor.doctor import HealthIssue, Severity
from scaffolder.schema.models import AddonConfig, FileContribution, Injection

_HERE = Path(__file__).parent.absolute()

config = AddonConfig(
    id="hello",
    description="Hello-world addon — writes a greeter module and wires it into main().",
    templates=["blank"],
    files=[
        FileContribution(
            dest="src/{{pkg_name}}/greeter.py",
            source=str(_HERE / "files" / "greeter.py.j2"),
            template=True,
        ),
    ],
    injections=[
        Injection(
            point="main_startup",
            content="    from .greeter import greet\n    greet()",
        ),
    ],
)


def can_apply(project_dir: Path, lockfile: ZenitLockfile) -> str | None:
    pkg_name = project_dir.name.replace("-", "_")
    target = project_dir / "src" / pkg_name / "greeter.py"
    if target.exists():
        return (
            f"{target.relative_to(project_dir)} already exists.\n"
            f"    Remove it first: rm {target.relative_to(project_dir)}"
        )
    return None


def health_check(project_dir: Path, lockfile: ZenitLockfile) -> list[HealthIssue]:
    pkg_name = project_dir.name.replace("-", "_")
    greeter = project_dir / "src" / pkg_name / "greeter.py"
    if greeter.exists():
        return [HealthIssue(Severity.OK, "greeter.py is present.")]
    return [HealthIssue(
        Severity.ERROR,
        "greeter.py is missing.",
        hint="Re-add the hello addon: zenit add hello",
    )]
```

---

## Anatomy of a template

Templates are structured the same way as addons, but use `TemplateConfig` and additionally declare injection points.

### `TemplateConfig` reference

```python
@dataclass
class TemplateConfig:
    id: str
    description: str
    requires_addons: list[str]                   # addons forced at scaffold time
    injection_points: dict[str, InjectionPoint]  # name → InjectionPoint
    dirs: list[str]
    files: list[FileContribution]
    compose_services: list[ComposeService]
    compose_volumes: list[str]
    env_vars: list[EnvVar]
    deps: list[str]
    dev_deps: list[str]
    just_recipes: list[str]
    injections: list[Injection]
```

### `InjectionPoint`

```python
@dataclass
class InjectionPoint:
    file: str           # relative to project root; {{pkg_name}} is expanded
    locator: LocatorSpec

@dataclass
class LocatorSpec:
    name: str           # name of the locator function
    args: dict          # kwargs forwarded to the locator
```

### Example: declaring an injection point in a template

```python
# src/scaffolder/templates/blank/template.py
from scaffolder.schema.models import InjectionPoint, LocatorSpec, TemplateConfig

config = TemplateConfig(
    id="blank",
    description="Minimal Python package with pytest, ruff, mypy, and a justfile.",
    injection_points={
        "main_startup": InjectionPoint(
            file="src/{{pkg_name}}/main.py",
            locator=LocatorSpec(
                name="before_return_in_function",
                args={"function": "main"},
            ),
        ),
    },
    files=[...],
    deps=[...],
)
```

---

## What makes a good addon

**Minimal wiring, maximal files.** Injections should only wire a new module into the existing project structure (a router include, a lifespan hook, a settings field). The substance goes in files, not in injection content.

**Declare conflicts eagerly in `can_apply`.** The user gets a clear error before anything is written, rather than a failed rollback mid-install.

**Write a `health_check`.** It makes `zenit doctor` useful and gives future you a clear picture of what this addon expects.

**Test with `--dry-run` first.** Before committing an addon, `zenit add <id> --dry-run` on a fresh project shows exactly what would happen.

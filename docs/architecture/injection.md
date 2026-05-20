# Code Injection

Some addons need to modify files that already exist — files the template created that may already contain your code. The `redis` addon adds a settings field. The `auth-manual` addon registers its router. The `sentry` addon calls `init_sentry()` in the lifespan.

Naively appending or using sentinel comments breaks the moment the file is formatted, refactored, or edited. Zenit parses the target file into a concrete syntax tree, locates the insertion point structurally, splices in the code, and validates the result is still valid Python before writing anything.

---

## Why libcst

**Regex is positional.** It finds text at a known location. If the file is reformatted, the location changes. If the user adds an import above the target, everything shifts. Regex requires the file to be in a stable, known state — which source files never are.

**libcst is structural.** It understands "the body of function `lifespan`" or "after the last attribute in class `Settings`". The location doesn't change when the file is formatted, because the locator doesn't care about line numbers — it navigates the syntax tree.

---

## The injection pipeline

When `zenit add` applies an injection, the pipeline runs in this order:

1. Parse the target file into a libcst module.
2. Call the named locator to get an integer insertion index.
3. Splice the content at that index.
4. Parse the result to validate it's still valid Python. If not, abort — the file is not written.
5. Write the file and record a fingerprint of the injected block in `.zenit.toml`.

Steps 4 and 5 are atomic — either both happen or neither does.

---

## Handlers

Different file types use different strategies:

| Handler | File types | Strategy |
|---|---|---|
| `PythonHandler` | `*.py` | libcst structural injection |
| `TomlHandler` | `*.toml` | tomlkit append; skips if top-level key already exists |
| `YamlHandler` | `*.yml`, `*.yaml` | append block; skips if first content key is already present |
| `JustfileHandler` | `justfile` | append recipe; skips if recipe name already exists |
| `EnvHandler` | `.env*` | append `key=value`; skips keys already defined |

All handlers are idempotent: safe to call twice, they never overwrite existing content without confirmation, and they record what they wrote in the manifest.

---

## Locators

Locators are pure functions that take a parsed libcst module and keyword arguments, and return an integer body index at which to insert new code. All locators raise `LocatorError` with an actionable message on failure.

### Available locators

**`after_last_class_attribute`** — inserts after the last field in a class.

```python
# args: {class_name: "Settings"}
# Use for: adding settings fields, model fields
locator=LocatorSpec(
    name="after_last_class_attribute",
    args={"class_name": "Settings"},
)
```

```python
# Result: new field added after the last existing one
class Settings(BaseSettings):
    database_url: str = "..."
    redis_url: str = "..."     # ← injected here
```

---

**`before_yield_in_function`** — inserts before the `yield` in an async generator (lifespan startup).

```python
# args: {function: "lifespan"}
# Use for: startup hooks — code runs before the app starts serving
locator=LocatorSpec(
    name="before_yield_in_function",
    args={"function": "lifespan"},
)
```

```python
# Result: startup code added before yield
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    redis_pool = await create_redis_pool(...)  # ← injected here
    yield
    await redis_pool.aclose()
```

---

**`in_function_body`** — inserts before or after a specific statement inside a function.

```python
# args: {function: "lifespan", anchor_pattern: "yield", position: "after"}
# Use for: shutdown hooks — position="after" means after the yield
locator=LocatorSpec(
    name="in_function_body",
    args={"function": "lifespan", "anchor_pattern": "yield", "position": "after"},
)
```

```python
# Result: shutdown code added after yield
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    yield
    await redis_pool.aclose()  # ← injected here
```

---

**`after_statement_matching`** — inserts after the first top-level statement matching a regex.

```python
# args: {pattern: "api_router = APIRouter()"}
# Use for: inserting router includes after the router is instantiated
locator=LocatorSpec(
    name="after_statement_matching",
    args={"pattern": "api_router = APIRouter()"},
)
```

---

**`before_return_in_function`** — inserts before the first `return` in a named function.

```python
# args: {function: "main"}
# Use for: blank template startup — main() returns instead of yielding
locator=LocatorSpec(
    name="before_return_in_function",
    args={"function": "main"},
)
```

---

**`after_last_import`** — inserts after the last import statement at module level.

```python
locator=LocatorSpec(name="after_last_import", args={})
```

---

**`at_module_end`** — appends at the end of the module body.

```python
locator=LocatorSpec(name="at_module_end", args={})
```

---

### Choosing a locator

| What you want to inject | Locator |
|---|---|
| A field into a settings or config class | `after_last_class_attribute` + `class_name` |
| Startup code (before app starts) | `before_yield_in_function` + `function="lifespan"` |
| Shutdown code (after yield) | `in_function_body` + `position="after"`, `anchor_pattern="yield"` |
| A router include | `after_statement_matching` + pattern of the router variable |
| An import statement | `after_last_import` |
| Code in `main()` for blank template | `before_return_in_function` + `function="main"` |
| A top-level definition | `at_module_end` |

---

## What Zenit injects

Zenit injects infrastructure wiring only. It never injects into business logic, data models, or test files.

Injections are limited to: startup and shutdown hooks, router registration calls, middleware configuration, settings class fields, and module-level imports required by those. If an addon needs a file that contains logic — a Redis helper module, a Celery app definition, an auth router — it writes that as a new file, not as an injection.

---

## Removal and fingerprinting

When `zenit remove` processes an addon, it reverses each injection using a three-stage search:

**Stage A — exact fingerprint.** SHA-256 of the canonical libcst output. Matches when the block is untouched.

**Stage B — normalised fingerprint.** SHA-256 after stripping trailing whitespace and collapsing blank lines. Matches when a formatter has run over the file. Silent.

**Stage C — fuzzy match.** SequenceMatcher similarity ≥ 85% within a 20-line window around the recorded position. Used when the block has been lightly edited. Zenit warns and asks for confirmation.

If none succeed, Zenit prints the recorded block content, the file path, and asks you to remove it manually. It never silently corrupts a file.

After excising, the result is parsed to confirm it's still valid Python. If not, the operation aborts without writing.

---

## Debugging injection failures

**Use `--dry-run` first.** `zenit add <addon> --dry-run` shows exactly what would be injected and where, without writing anything.

**When `zenit doctor` shows a fingerprint mismatch:**
```
⚠ my_project/settings.py  injection: settings_fields — exact mismatch
```
This means the injected block has been modified since it was written. `zenit remove` will still work — it will use fuzzy matching and ask for confirmation.

**When `zenit remove` fails to locate a block:**
Zenit prints the original block content and the file it expected to find it in. Open the file, find the code manually (it will be similar to what was printed), remove it, then run `zenit doctor` to clear the error.

**Use `zenit doctor --thorough`** after running a formatter. It runs all three fingerprint strategies and reports which one matches, giving you confidence before running `zenit remove`.

# The Manifest

`.zenit.toml` lives at the root of every Zenit-managed project. It is the complete record of everything Zenit has done to the project — which template was used, which addons are installed, every file it created, every code block it injected, and every dependency it added.

`zenit add`, `zenit remove`, and `zenit doctor` all read from this file. Without it, Zenit cannot manage the project. The project itself is unaffected — it runs identically with or without `.zenit.toml`.

Commit it. Don't edit it manually. Use the CLI.

---

## Annotated example

The following is a complete `.zenit.toml` for a `fastapi` project with the `docker` and `redis` addons installed.

```toml
[project]
template = "fastapi"
addons = ["docker", "redis"]
zenit_version = "1.0.8"
schema_version = 2

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

[[manifest.env]]
key = "REDIS_POOL_SIZE"
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

---

## `[project]`

The lockfile section. Written once at scaffold time and updated on every `add` or `remove`.

| Field | Type | Description |
|---|---|---|
| `template` | string | The template used to scaffold the project. Never changes after creation. |
| `addons` | list of strings | The currently installed addons, in installation order. |
| `zenit_version` | string | The version of Zenit that last wrote this file. |
| `schema_version` | integer | The manifest format version. Used for migrations if the schema changes in a future release. |

---

## `[[manifest.python_blocks]]`

One entry per code block injected into a Python file. Each entry is everything Zenit needs to find the block again and remove it cleanly.

| Field | Type | Description |
|---|---|---|
| `addon` | string | The addon that produced this injection. |
| `point` | string | The named injection point declared by the template (e.g. `settings_fields`, `lifespan_startup`). |
| `file` | string | Path to the target file, relative to the project root. |
| `lines` | string | The line range where the block was written, e.g. `"14-14"`. Updated on each write; used as a starting hint for the locator during removal. |
| `fingerprint` | string | SHA-256 of the canonical libcst output of the injected block. Used for exact-match removal. |
| `fingerprint_normalised` | string | SHA-256 after stripping trailing whitespace and collapsing blank lines. Used when the file has been run through a formatter since injection. |
| `locator.name` | string | The locator function used to find the insertion point (see [Code Injection](./injection.md)). |
| `locator.args` | table | Arguments passed to the locator, e.g. `{class_name = "Settings"}`. |

### Fingerprints and what they protect

When you run `zenit remove redis`, Zenit needs to find the exact lines that were injected and remove only those — nothing more. It cannot rely on line numbers alone because the file may have been edited since injection. Instead it uses the fingerprint.

Removal tries three strategies in order:

1. **Exact fingerprint** — the block is found verbatim. Clean removal.
2. **Normalised fingerprint** — the block is found after normalising whitespace. Used when a formatter has run over the file. Removal proceeds silently.
3. **Fuzzy match** — SequenceMatcher similarity ≥ 85% within a 20-line window around the recorded position. Used when the block has been lightly edited. Zenit prints a warning identifying exactly what it found and asks for confirmation before removing.

If none of the three succeed, Zenit prints an error with the recorded block content and the file path, and asks you to remove it manually. It never silently corrupts a file.

---

## `[[manifest.env]]`

One entry per environment variable added by an addon.

| Field | Type | Description |
|---|---|---|
| `key` | string | The variable name, e.g. `REDIS_URL`. |
| `source` | string | Always `"addon"` for addon-added vars. |
| `addon` | string | The addon that added this variable. |

On removal, the corresponding line is deleted from `.env.example`. Keys that are already defined (from a prior manual edit or another addon) are skipped on add — Zenit never overwrites an existing env var.

---

## `[[manifest.dependencies]]`

One entry per package added to `pyproject.toml` by an addon.

| Field | Type | Description |
|---|---|---|
| `package` | string | The package name, e.g. `redis`. |
| `spec` | string | The version specifier written to `pyproject.toml`, e.g. `redis>=5`. |
| `source` | string | Always `"addon"`. |
| `addon` | string | The addon that added this package. |
| `dev` | boolean | `true` if added to `[project.optional-dependencies.dev]`, `false` for main dependencies. |

On removal, the entry is deleted from `pyproject.toml`. Zenit does not run `uv sync` automatically after removal — that is left to you, so you control when the environment changes.

---

## `[[manifest.just_recipes]]`

One entry per recipe appended to the `justfile` by an addon.

| Field | Type | Description |
|---|---|---|
| `name` | string | The recipe name, e.g. `redis-up`. |
| `source` | string | Always `"addon"`. |
| `addon` | string | The addon that added this recipe. |

On removal, the recipe block is deleted from the `justfile`. If a recipe name already exists in the `justfile`, the addon skips it rather than overwriting.

---

## Why TOML

TOML was chosen over JSON and YAML for three reasons.

JSON has no comments, no multiline strings without escaping, and trailing commas are a syntax error — all of which make it hostile to a file humans are expected to read and occasionally inspect.

YAML solves the comments problem but introduces its own: significant indentation, implicit type coercion (`yes` becomes `true`, bare numbers are parsed as integers), and a spec complex enough that different parsers disagree on edge cases.

TOML is unambiguous, has explicit types, supports comments, and is already the standard config format in Python tooling (`pyproject.toml`, `uv.toml`, `ruff.toml`). A developer reading `.zenit.toml` already knows the syntax. Zenit uses tomlkit specifically because it preserves formatting and comments on round-trip writes — editing one field does not reformat the entire file.

---

## If `.zenit.toml` is deleted

The project continues to work exactly as before. `main.py` still runs, tests still pass, `uv sync` still works. Zenit has no runtime presence.

What you lose is Zenit's ability to manage the project. `zenit add`, `zenit remove`, and `zenit doctor` all require `.zenit.toml` and will exit with an error if it is missing. If you want to re-enable management, the only option is to re-scaffold — there is no `zenit init` that reconstructs the manifest from an existing project.

This is intentional. The manifest is the source of truth. Reconstructing it by inspecting the project would require guessing what Zenit wrote versus what you wrote, which is exactly the kind of ambiguity Zenit is designed to avoid.

---

## If a file Zenit owns is modified externally

`zenit doctor` will flag it — the content hash no longer matches. This is not an error; it is expected that you will edit generated files. It is information: Zenit is telling you that its record of that file is stale.

`zenit remove` will warn specifically before deleting any file whose hash does not match:

```
app/redis.py has been modified since it was created by Zenit.
  recorded: sha256:abc123...
  current:  sha256:def456...
Remove anyway? [y/N]
```

It will never silently delete a file you have edited.

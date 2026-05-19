# Code Injection

Some addons need to modify files that already exist in the project — files created by the template that may already contain your code. The `redis` addon needs to add connection pool fields to your `Settings` class. The `auth-manual` addon needs to register its router. The `celery` addon needs a lifespan hook.

A naive approach would append to the file or replace a sentinel comment. Both break the moment the file is formatted, refactored, or edited in any way that moves the target location. Zenit uses a different approach: it parses the file into a concrete syntax tree, locates the insertion point structurally, splices in the new code, and validates that the result is syntactically valid Python before writing anything.

This page explains how that pipeline works and how removal reverses it.

---

## Why libcst

Zenit uses [libcst](https://libcst.readthedocs.io/) rather than regex or string replacement for two reasons.

**Regex and string replacement are positional.** They find text at a specific location in the file. If the file is reformatted, the location changes and the match fails. If the user adds an import above the target, everything shifts. These approaches require the file to be in a known, stable state — which source files never are.

**libcst is structural.** It parses Python source into a concrete syntax tree that preserves every byte of the original file — whitespace, comments, blank lines — while also understanding the code semantically. "After the last field in the `Settings` class" is a structural description that remains correct regardless of what the surrounding code looks like. The tree can be modified and serialised back to source without changing anything that wasn't explicitly touched.

libcst also validates. After injection, Zenit re-parses the result. If the output is not valid Python for any reason, the operation aborts before the file is written.

---

## The injection pipeline

When `zenit add` applies an addon that has injections, each injection goes through the following steps:

1. **Read** the target file from disk.
2. **Parse** it into a libcst `Module`.
3. **Run the locator** — a pure function that receives the module and returns the index in the module body at which to insert the new statements.
4. **Splice** the new statements into the tree at that index.
5. **Serialise** the modified tree back to source.
6. **Validate** by parsing the result. If parsing fails, abort and report the error — the original file is unchanged.
7. **Write** the result to disk.
8. **Record** the injection in `.zenit.toml`: the file path, the locator used, the line range written, and two fingerprints of the injected block.

Steps 6 and 7 are atomic from the user's perspective — either both happen or neither does.

---

## Locators

A locator is a pure function that takes a parsed `libcst.Module` and returns a body index. The template declares which named locators are available and which injection points map to which locators. Addons reference injection points by name — they do not specify locators directly.

The available locators are:

| Locator | Finds |
|---|---|
| `after_last_import` | After the last import statement at module level |
| `after_last_class_attribute` | After the last field or annotation in a named class |
| `after_statement_matching` | After the first top-level statement matching a regex |
| `before_yield_in_function` | Before the `yield` in an async generator (lifespan functions) |
| `before_return_in_function` | Before the first `return` in a named function |
| `in_function_body` | Before or after an anchor statement inside a named function |
| `at_module_end` | Appended at the end of the module body |
| `at_file_end` | Appended at the end of a non-Python file |

Most locators accept arguments. `after_last_class_attribute` takes a `class_name` so it can find the right class when a file contains more than one. `in_function_body` takes a function name and an anchor statement. These arguments are recorded in the manifest so the same locator can be reconstructed during removal.

---

## Non-Python files

Not all injections target Python files. The `docker`, `redis`, and `celery` addons also modify `compose.yml`, `justfile`, and `.env.example`. These use simpler typed handlers rather than the libcst pipeline:

| Handler | Matches | Strategy |
|---|---|---|
| `PythonHandler` | `*.py` | libcst parse → locator → splice → validate |
| `TomlHandler` | `*.toml` | tomlkit round-trip; skips if top-level key already exists |
| `YamlHandler` | `*.yml`, `*.yaml` | Append block; skips if first content key is already present |
| `JustfileHandler` | `justfile` | Append recipe; skips if recipe name already exists |
| `EnvHandler` | `.env*` | Append key=value; skips keys that are already defined |

All handlers share the same contract: they are idempotent (safe to call twice), they never overwrite existing content without confirmation, and they record what they wrote in the manifest.

---

## What Zenit injects

Zenit injects only infrastructure wiring. It never injects into existing business logic, data models, or test files. Some addons do create new test files — that is a file write, not an injection.

Concretely, injections are limited to:

- Startup and shutdown hooks in lifespan functions
- Router registration calls
- Middleware configuration
- Settings class fields for connection URLs and feature flags
- Module-level imports required by the above

If an addon needs a file that contains logic — a Redis helper module, a Celery app definition, an auth router — it writes that as a new file, not as an injection into an existing one. Injections are reserved for the minimal wiring needed to connect a new file into the existing project structure.

---

## Removal

When `zenit remove` processes an addon, it reverses each injection in the manifest. For Python files, the removal pipeline is:

1. **Read** the current file from disk.
2. **Locate the injected block** using the recorded fingerprint. Three strategies are tried in order:
   - **Exact fingerprint** — SHA-256 of the canonical libcst output matches the recorded value exactly.
   - **Normalised fingerprint** — SHA-256 after stripping trailing whitespace and collapsing blank lines. Succeeds when the file has been run through a formatter since injection.
   - **Fuzzy match** — SequenceMatcher similarity ≥ 85% within a 20-line window centred on the recorded line range. Used when the block has been lightly edited. Zenit prints a warning showing exactly what it found and requires confirmation before proceeding.
3. **Excise** the identified lines from the file.
4. **Validate** by parsing the result. If the remaining code is not valid Python, abort and report the error.
5. **Write** the result to disk.
6. **Remove** the manifest entry.

If none of the three fingerprint strategies succeed, Zenit prints the recorded block content alongside the file path and instructs you to remove it manually. It does not attempt a best-guess deletion.

---

## Edge cases

**What if the user edits code inside an injected block?**

`zenit doctor` will flag it — the fingerprint no longer matches. When `zenit remove` runs, the fuzzy match will likely still find the block (depending on how much was changed) and will warn before removing. If the edit was substantial enough that the fuzzy match fails, Zenit exits with an error and manual removal instructions.

**What if the target file doesn't exist?**

Addons declare their target files as dependencies. If a target file is missing when `zenit add` runs, the operation fails before any changes are made. `zenit doctor` will also flag missing injection targets as errors.

**What if two addons inject into the same file?**

Each injection has its own manifest entry and its own fingerprint. Injections are applied in the order the addons were installed and stack independently — each has a distinct location in the file. Removal of one does not affect the other. The locators are re-run at removal time against the current file state, so the recorded line ranges are only hints; the actual positions are resolved structurally.

**What if injection would produce invalid Python?**

The validation step catches this before the file is written. Zenit reports the error, shows the proposed output, and exits without modifying anything. This has never been observed in practice with the current set of addons, but the check exists because a corrupted source file would be significantly worse than a failed `add`.

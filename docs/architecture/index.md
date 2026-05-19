# Architecture Overview

Zenit is a code generator and manifest tracker. It writes files, edits `pyproject.toml`, and injects code into existing Python files. When it is done, it records everything it touched in `.zenit.toml`. That is the entirety of what it does — there is no runtime component, no framework to stay compatible with, no lock-in.

This page explains the mental model. The sub-pages cover each mechanism in depth.

---

## The three layers

```
Template
  └── defines the project's shape: directory structure, base files,
      dependencies, and named injection points

Addons
  └── each addon declares what it adds: files to create, packages to
      install, code to inject into template injection points,
      compose services, env vars

Your project
  └── plain Python — no imports from Zenit, no runtime dependency,
      works independently of Zenit from the moment it is created
```

**Templates** set the foundation. When you run `zenit create`, you pick one template. It determines the overall structure — whether you get a FastAPI app with SQLAlchemy and Alembic, or a minimal blank package. The template also declares the injection points that addons are allowed to target.

**Addons** are optional capabilities you layer on top. Each addon is self-contained: it knows exactly what files it creates, what code it injects, what packages it requires. Addons can be applied at creation time or added later with `zenit add`. They can also be removed cleanly with `zenit remove`.

**Your project** is the output. Once generated it has no connection to Zenit except `.zenit.toml`. Delete that file and nothing breaks — the project runs exactly the same. Zenit just can't manage it anymore.

---

## The removability constraint

Zenit's design is built around one hard constraint: **everything Zenit adds must be removable.**

This constraint exists because scaffolding tools have a long history of creating projects that are easy to start but hard to escape. The tool writes files in its own style, injects code the user doesn't fully understand, and then the user is stuck maintaining something they didn't choose to write. When the tool is abandoned or changes direction, those projects carry the debt forever.

Zenit takes the opposite position. At any point you can run `zenit remove <addon>` and the project returns to the state it was in before that addon was added — files deleted, injections excised, packages removed from `pyproject.toml`. You can also stop using Zenit entirely by deleting `.zenit.toml`. The project doesn't care.

This constraint shapes every design decision:

- Code injection uses a CST pipeline rather than string replacement, because removal has to be surgical — it must find exactly what was injected and remove only that, even after the file has been formatted or lightly edited.
- Addons are declarative rather than imperative — they describe what they add, they don't run arbitrary code. Declarative manifests are fully reversible; arbitrary code is not.
- `.zenit.toml` tracks content hashes for every file and injection. Without the hashes, removal would be guesswork.

---

## The three mechanisms

Zenit uses three distinct mechanisms to build a project. Each is handled separately and tracked separately in the manifest.

**File writes** are the simplest. Template and addon files are rendered from Jinja2 templates and written to disk. The manifest records the path and a content hash. On removal, the file is deleted — but only if the hash still matches. If you modified the file, Zenit warns you and asks for confirmation.

**Dependency edits** modify `pyproject.toml` directly using tomlkit, which preserves formatting and comments. Each addon declares the packages it requires; Zenit adds them to the appropriate section. The manifest records which packages came from which addon. On removal, those packages are removed from `pyproject.toml`. Zenit does not run `uv sync` automatically — that is left to you.

**Code injection** is the most complex mechanism. Some addons need to register routers, add lifespan hooks, or configure middleware in files that already exist — files that belong to the template and may already contain your code. Zenit uses libcst to parse the target file, locate the correct insertion point structurally, splice in the new code, and validate that the result is still syntactically valid Python. The manifest records a fingerprint of the injected block. On removal, that fingerprint is used to find and excise exactly the injected block.

---

## The role of `.zenit.toml`

`.zenit.toml` is the only artifact that connects a project to Zenit. It records:

- which template was used
- which addons are installed
- every file Zenit created, with a content hash
- every code injection, with a fingerprint and location metadata
- every dependency Zenit added, with the addon that added it

This is what makes `zenit remove`, `zenit doctor`, and safe re-management possible. Without it, Zenit has no way to know what it wrote and what you wrote.

Commit it. Don't edit it manually.

The sub-pages cover each topic in depth:

- [The Manifest](./manifest.md) — every field in `.zenit.toml`, with a full annotated example
- [Code Injection](./injection.md) — how libcst injection works, the locator system, and how removal is handled
- [Addons & Templates](./addons-and-templates.md) — the internal structure of a template and an addon, and how to write a new one

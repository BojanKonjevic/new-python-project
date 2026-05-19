# Contributing Guide

Zenit is currently a solo project. These guidelines exist so that if you want to contribute, the process is clear — and so the author doesn't forget his own conventions.

---

## Quick start for contributors

```bash
# Clone
git clone https://github.com/BojanKonjevic/zenit.git
cd zenit

# Install uv if you haven't already
curl -LsSf https://astral.sh/uv/install.sh | sh

# Sync dependencies and enter the environment
uv sync

# Run the test suite
just test

# Run lint, format, and type checks
just lint
just fmt
just check
```

---

## What to contribute

### Definitely welcome

- **Bug fixes** — especially edge cases in the injection/removal pipeline
- **Documentation** — typos, unclear explanations, missing examples
- **New addons** — see [Architecture: Addons & Templates](./architecture/addons-and-templates.md) for the declarative manifest format
- **Template improvements** — better defaults, clearer generated code
- **Test coverage** — every behavior change should include tests

### Discuss first

- **Core pipeline changes** — manifest schema, injection engine, rollback logic
- **New CLI commands** — the surface area is intentionally narrow
- **Breaking changes** — anything that would alter `.zenit.toml` schema or existing addon behavior

Open a GitHub Issue with your proposal. If it aligns with the project's direction, we'll hash out the approach before you write code.

---

## How to contribute

### Reporting bugs

Use [GitHub Issues](https://github.com/BojanKonjevic/zenit/issues). Include:

1. Zenit version (`zenit --version`)
2. Python version and OS
3. Minimal reproduction steps
4. Expected vs. actual behavior
5. If relevant, the contents of `.zenit.toml` and the output of `zenit doctor`

### Submitting changes

1. **Fork and branch** — `git checkout -b fix-something` or `git checkout -b add-something`
2. **Write the change** — follow the coding standards below
3. **Add tests** — every behavior change ships with tests. No exceptions
4. **Run the suite** — `just test` must pass, `just lint` and `just check` must be clean
5. **Open a PR** — describe what changed and why. Reference any related issues

PRs are reviewed before merge. Small, focused changes move faster than large refactors.

---

## Coding standards

### Type discipline

- Strict MyPy. No `Any` without `# type: ignore[...]` justification
- Use `from __future__ import annotations` when forward references are needed
- No bare `except:` or `except Exception:` unless re-raising immediately

### Code style

- Ruff handles formatting and import sorting. Run `just fmt` before committing
- Functions should be small and single-purpose. >30 lines is a smell
- Explicit type annotations on all signatures
- No star imports
- No file-header path comments or "obviously AI" comments

### Error handling

- Use the `ScaffoldError` hierarchy. No raw `ValueError` or `RuntimeError` in user-facing paths
- Error messages must be actionable: what failed, why it failed, and how to fix it

### Testing

Test layers, in order of preference:

| Layer | Scope | Speed |
|---|---|---|
| Unit | Single function/class, mocked | Fast |
| Integration | Multiple modules, real filesystem | Medium |
| Functional | End-to-end CLI invocation | Medium |
| Slow | I/O-heavy or network-tolerant | Slow |

Cover edge cases: empty input, malformed input, missing files, permission errors. Cover error paths: every `raise` and every `except` branch should have a test.

---

## Architecture principles

If you're modifying core code, keep these in mind:

1. **User trust & independence** — Zenit must never trap users. Removal must be trivial
2. **Declarative over imperative** — addons describe what they add, they don't run arbitrary code
3. **Everything must be removable** — the design constraint that shapes every decision
4. **Composition over inheritance** — extend via handlers and hooks, not subclassing
5. **Public API minimal and stable** — templates and core logic stay strictly separated

---

## Communication

- **Bug reports & feature requests:** [GitHub Issues](https://github.com/BojanKonjevic/zenit/issues)
- **Real-time chat:** Discord (coming if the project grows)
- **Security issues:** Email the maintainer directly (do not open public issues)

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](https://github.com/BojanKonjevic/zenit/blob/main/LICENSE). No CLA or DCO required.


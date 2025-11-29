# Repository Guidelines

## Project Structure & Module Organization
Treat the repository as a collection of small experiments. Create new work under `projects/<project-name>/`, each with a `README.md` describing the stack and purpose. Inside, keep `src/` for code, `tests/` for automated checks, `assets/` for static files, and `scripts/` for helper tooling. Shared utilities belong in `shared/` to avoid duplication. Keep the root clean: docs (`README.md`, `AGENTS.md`) and meta files only.

## Build, Test, and Development Commands
Add a lightweight Makefile or package script per project so contributors have consistent entrypoints. Expected targets:
- `make setup` installs dependencies (`pip install -r requirements.txt`, `npm install`, etc.).
- `make fmt` and `make lint` run formatters and linters.
- `make test` runs the full test suite.
- `make run` starts the demo/CLI for local inspection.
Run commands from the project folder, e.g., `cd projects/rogue-minesweeper && make test`.

## Coding Style & Naming Conventions
Prefer 4-space indentation for Python and 2 spaces for JS/TS; follow language defaults elsewhere. Use canonical formatters (Black/Ruff for Python, Prettier/ESLint for JS/TS) and check in their configs. Name directories with kebab-case; use PascalCase for classes/types, snake_case for Python functions/variables, and camelCase for JS/TS functions/variables. Keep files focused; split large modules when they exceed a single clear concern.

## Testing Guidelines
Default to the language’s mainstream runner (pytest for Python, vitest/jest for Node, cargo test for Rust). Place tests under `tests/` mirroring `src/` paths. Include negative and edge cases, and avoid network calls in unit tests. Target roughly 80% coverage for new modules and document any intentional gaps in the project README. Add smoke tests for CLIs or scripts invoked by `make run`.

## Commit & Pull Request Guidelines
Write commits in imperative mood with a concise scope, e.g., `feat: add board parser` or `fix: handle empty grid`. Keep changes atomic and add short context in the body when needed. PRs should summarize intent, list manual/automated test results, link issues, and attach screenshots or sample output for UI/CLI changes. Request review once checks pass and docs (project README) are updated.

## Security & Configuration Tips
Never commit secrets; use `.env.local` or tool-specific secrets stores and provide `.env.example` templates. Pin dependencies where possible and add lockfiles. Prefer local stubs/mocks over live service keys; rotate any accidentally exposed values immediately.

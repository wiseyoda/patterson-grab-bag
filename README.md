# patterson-grab-bag

Collection of small experiments and prototypes. Each project lives under `projects/<name>` with its own README and Makefile entrypoints.

## Projects
- `projects/secret-santa`: Next.js 16 Secret Santa gift-exchange app. Supporting docs live in `projects/secret-santa/docs/`.

## How to work in this repo
- Start from the project folder: `cd projects/<name>`.
- `make setup` installs dependencies, `make fmt` / `make lint` / `make test` keep code healthy, and `make run` starts local demos.
- Use `shared/` for cross-project utilities (none yet).
- See `AGENTS.md` for full contribution and structure conventions.

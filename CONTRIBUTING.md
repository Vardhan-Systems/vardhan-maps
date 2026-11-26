# Contributing to vardhan-maps

Thanks for your interest! vardhan-maps is a standard India map (state/district
boundaries + a self-hosted OpenStreetMap vector basemap) and contributions of all
sizes are welcome — bug reports, docs fixes, new features, and data improvements.

## Quick start

```bash
pnpm install
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest
pnpm build       # tsup → dist/
```

Package manager is **pnpm**. The build is **ESM-only** (so per-state district
chunks can code-split). See [README.md](./README.md) for the public API.

## Project layout

- `src/data/` — GeoJSON accessors + the generated dataset (`generated/`).
- `src/svg/`, `src/react/`, `src/react-native/`, `src/spec/` — renderers + the AI map spec.
- `scripts/` — the data pipeline (`build-data.mjs`) and the tile pipeline (`build-tiles.sh`).

## Ways to contribute

- **Bugs / features** — open an issue first for anything non-trivial, so we can
  agree on the approach before you invest time.
- **Docs** — fixes and clarifications are always welcome; just open a PR.
- **Boundary data** — the GeoJSON is generated from OpenStreetMap
  (`pnpm data:fetch && pnpm data:build`). Prefer fixing the upstream OSM data or a
  GoI override (`data/overrides/`) over hand-editing generated files.

## Pull requests

1. Branch off `main`, use **conventional-commit** messages (`feat:`, `fix:`, `docs:`, `chore:`).
2. Make sure `pnpm typecheck`, `pnpm test`, and `pnpm build` all pass.
3. Add or update tests for behavior changes.
4. Keep PRs focused; describe the change and the motivation.

CI runs typecheck + test + build on every PR.

## Code of conduct

Be kind and constructive. We want this to be a welcoming project for first-time
contributors.

## License

By contributing you agree your code is licensed under the project's **MIT** license,
and that any map data follows **ODbL 1.0** (© OpenStreetMap contributors) — see
[ATTRIBUTION.md](./ATTRIBUTION.md).

# Contributing to Doodlio

## Branch Strategy
- `main`: Production-ready code.
- `develop`: Active integration branch.
- `feature/<name>`: Feature branches created from `develop`.

## Coding Conventions
- Keep all shared types, constants, and Zod schemas in `packages/shared`.
- Never trust client-supplied scores, timers, or secret words.
- Run `pnpm typecheck`, `pnpm test`, and `pnpm build` before opening a pull request.

# Repository Guidelines

## Project Structure & Module Organization
- Source: `src/` (React + TypeScript). Key areas: `components/`, `pages/`, `hooks/`, `stores/`, `utils/`, `types/`, `lib/`.
- Tests: `src/__tests__/` (unit/integration) and `src/test/` (helpers). Mocks in `src/__mocks__/`.
- Static assets: `public/`. Build output: `dist/`.
- Platform/config: `supabase/`, `scripts/`, `.github/`, `docs/`.
- Module alias: use `@` (e.g., `import { fetchX } from '@/utils/fetchX'`).

## Build, Test, and Development Commands
- `npm run dev`: Start Vite dev server.
- `npm run build`: Type-check then build for production.
- `npm run preview`: Serve the production build locally.
- `npm run type-check`: Run TypeScript without emit.
- `npm run test` | `test:ui` | `test:coverage`: Run Vitest (CLI, UI, with coverage). Reports in `coverage/`.
- `npm run lint` | `lint:fix`: Lint code, optionally auto-fix.
- `npm run format`: Apply Prettier to `src/**/*`.
- Data/search ops: `npm run import-data`, `sync-algolia`, `configure-synonyms` (see `scripts/`).

## Coding Style & Naming Conventions
- Formatting: Prettier (2 spaces, single quotes, width 100, semicolons). Run `npm run format`.
- Linting: ESLint with TS, React, hooks, a11y, Prettier integration. Fix with `npm run lint:fix`.
- Components: PascalCase files in `src/components/...` (e.g., `LessonCard.tsx`).
- Hooks: `useCamelCase` in `src/hooks` (e.g., `useSearch.ts`).
- Utilities/types: camelCase functions in `src/utils`, PascalCase `Type`/`Interface` in `src/types`.

## Testing Guidelines
- Framework: Vitest + Testing Library (jsdom). Setup at `src/__tests__/setup.ts`.
- Name tests `*.test.ts(x)` near source or under `src/__tests__/`.
- Keep tests deterministic; mock Supabase as needed (see setup mocks).
- Generate coverage with `npm run test:coverage`.

## Commit & Pull Request Guidelines
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`). Keep scope concise.
- Branches: `feat/…`, `fix/…`, `chore/…` to match PRs.
- PRs: clear description, link issues (`Closes #123`), include screenshots for UI changes, and notes on tests/migrations.
- Ensure `lint`, `type-check`, and `test` pass before requesting review.

## Recursive Context Pattern (CLAUDE.md)
This project uses a recursive context pattern for AI agents (specifically Claude Code).
- **Root `CLAUDE.md`**: Contains high-level project rules, critical commands, and global context.
- **Directory-level `CLAUDE.md`**: Contains context specific to that directory (e.g., `src/components/CLAUDE.md` explains component patterns).
- **Usage**: Agents should read the root `CLAUDE.md` first, then the specific `CLAUDE.md` for the directory they are working in. This ensures they have the most relevant context without being overwhelmed by the entire codebase documentation.

## Security & Configuration Tips
- Never commit secrets. Use `.env*` files locally; update `*.example` when adding a new var.
- Required envs typically include Supabase and OpenAI keys (see `.env.example`).
- For deployments, see `netlify.toml`/`vercel.json` and ensure `npm run build` succeeds.

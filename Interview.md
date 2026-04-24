## Brandora Codebase Explanation (Interview Notes)

Use this section as your quick walkthrough script in the interview.

## 1) High-Level Architecture

- Frontend: Next.js App Router with one main dashboard client component.
- Backend: Next.js route handlers under `src/app/api/...`.
- Database: SQLite managed through Prisma ORM.
- External data source: Apify actor for Meta Ad Library scraping.
- AI layer: OpenAI Responses API for brand profiling, ad analysis, and grounded chat.

Flow:

1. Create brand (name + website URL).
2. Website content is fetched and turned into a stored brand profile.
3. Add competitors and ingest their recent ads.
4. Ads are normalized, persisted, and analyzed (copy + visual signals).
5. Chat endpoint builds structured context from stored profile + analyzed ads.

## 2) Root Files and Purpose

### `package.json`

- Defines project metadata, dependencies, and scripts.
- Key scripts: dev/build/lint and Prisma commands (`db:generate`, `db:migrate`, `db:studio`).

### `README.md`

- Main setup + run instructions.
- Documents architecture choices, tradeoffs, API surface, and Loom checklist.

### `Requirements.md`

- Assignment prompt and evaluation criteria.
- Now also includes this interview-ready codebase explanation.

### `AGENTS.md`

- Repository-level agent instruction warning that this Next.js version has breaking changes.

### `CLAUDE.md`

- Points to `AGENTS.md` (shared instruction source).

### `next.config.ts`

- Enables React Compiler (`reactCompiler: true`).
- Allows remote images from any HTTPS host via `images.remotePatterns`.

### `eslint.config.mjs`

- ESLint setup using Next Core Web Vitals + TypeScript presets.
- Defines global ignore patterns for build outputs.

### `postcss.config.mjs`

- PostCSS config enabling Tailwind v4 plugin.

### `tsconfig.json`

- TypeScript compiler settings (strict mode, bundler module resolution, Next plugin).
- Defines alias `@/* -> ./src/*`.

### `next-env.d.ts`

- Auto-generated Next.js TypeScript type references.
- Not meant to be manually edited.

## 3) Prisma/Data Layer

### `prisma/schema.prisma`

- Defines data model and relations:
  - `Brand`: website + extracted profile fields.
  - `Competitor`: belongs to a brand.
  - `Ad`: normalized competitor ad record.
  - `AdAsset`: image URLs for each ad.
  - `AdAnalysis`: copy/visual analysis results per ad.
  - `ChatMessage`: persisted user/assistant history by brand.
- Uses SQLite datasource and Prisma client generator.

### `prisma/migrations/migration_lock.toml`

- Prisma migration metadata (provider lock).

### `prisma/migrations/20260421184221_init/migration.sql`

- Initial SQL migration that creates all tables, foreign keys, and unique indexes.

## 4) App UI Layer

### `src/app/layout.tsx`

- Root layout for the app.
- Loads Google fonts, global CSS, and page metadata.

### `src/app/page.tsx`

- Server component entry page.
- Fetches initial brand list and first brand detail from Prisma.
- Passes data into the dashboard client component.

### `src/app/globals.css`

- Global visual system and all dashboard styles.
- Defines color variables, panel layout, cards, forms, responsive behavior.

### `src/components/brandora-dashboard.tsx`

- Main client UI and user interactions.
- Handles:
  - create brand
  - switch brand
  - add competitors
  - trigger ingestion/reanalysis
  - send chat message
- Calls backend routes with `fetch`, updates local UI state, and renders:
  - brand profile
  - competitor ads with analysis
  - chat history

## 5) API Route Handlers

### `src/app/api/brands/route.ts`

- `GET`: returns all brands with counts.
- `POST`: validates payload, builds profile from website, creates brand record.

### `src/app/api/brands/[brandId]/route.ts`

- `GET`: returns one brand with full detail:
  - competitors
  - ads + assets + analysis
  - chat messages

### `src/app/api/brands/[brandId]/competitors/route.ts`

- `GET`: list competitors for a brand.
- `POST`: validates and upserts competitors with max limit of 3 per brand.

### `src/app/api/brands/[brandId]/ingest/route.ts`

- Main ingestion pipeline endpoint.
- For each competitor:
  - cache-first behavior (reuse existing ads unless refresh requested)
  - fetch live ads from Apify (or fallback to mock ads when unavailable)
  - upsert ad records
  - replace asset rows
  - create/update ad analysis (AI or mock analysis)
- Returns per-competitor ingestion stats and mode (`cache-first`, `live-refresh`, `mock-fallback`).

### `src/app/api/brands/[brandId]/chat/route.ts`

- Validates user chat message.
- Loads brand context + recent analyzed ads.
- Persists user message, generates grounded assistant response, persists assistant message.

## 6) Shared Library Modules

### `src/lib/prisma.ts`

- Singleton Prisma client instance to avoid multiple connections in dev.

### `src/lib/http.ts`

- Small response helpers:
  - `ok(...)` for success JSON
  - `fail(...)` for standardized error shape

### `src/lib/schemas.ts`

- Zod schemas for runtime validation:
  - brand creation payload
  - competitor payload
  - chat payload

### `src/lib/env.ts`

- Validates and parses environment variables with Zod.
- Provides defaults for OpenAI models.

### `src/lib/brand-profile.ts`

- Builds brand profile from a real website URL.
- Steps:
  - fetch website HTML
  - heuristic extraction using Cheerio
  - optional OpenAI refinement to strict JSON profile
  - fallback to heuristic output on API/key issues

### `src/lib/apify.ts`

- Handles competitor ad retrieval + normalization.
- Includes:
  - actor ID normalization
  - item shape normalization into internal ad format
  - AdFormat mapping
  - clear unavailable-error detection
  - mock ad generator for fallback mode

### `src/lib/ad-analysis.ts`

- Analyzes each ad’s copy + visuals.
- Strategy:
  - heuristic analysis fallback always available
  - if OpenAI key exists, send copy + up to 4 images for structured JSON analysis
  - merge AI result with fallback defaults for robustness

### `src/lib/chat.ts`

- Builds compact text context from brand profile + competitor analyzed ads.
- Generates grounded response via OpenAI with strict instruction to use only provided context.
- Provides local fallback response when API key is missing.

## 7) Public Assets

### `public/*.svg`

- Static SVG assets generated by Next starter template (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`).
- Not core to Brandora logic.

## 8) How to Explain This in 60 Seconds

"This is a Next.js full-stack app where App Router route handlers act as my backend. I store everything in SQLite via Prisma so data survives refresh and chat stays grounded. The pipeline is: create brand from website -> add competitors -> ingest and normalize ads from Apify -> run ad-level copy and visual analysis -> persist structured outputs -> build chat context from those outputs and generate recommendations. I designed it cache-first and added safe fallbacks (mock ingestion and heuristic analysis) so the demo remains reliable even when external APIs are unavailable."

## 9) Interview Talking Points (Tradeoffs)

- Why SQLite + Prisma:
  - Fast local setup, relational structure, deterministic queries.
  - Good for assignment scope; easy to migrate later.
- Why no RAG/vector DB:
  - 2-3 competitors and 5-10 ads each fits prompt context.
  - Simpler architecture, faster delivery, fewer moving parts.
- Why cache-first ingestion:
  - Reduces paid scraping/API calls and improves responsiveness.
- Why fallback modes:
  - Keeps app usable without API keys or when providers fail.
  - Useful for demos and resilient developer experience.


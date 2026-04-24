# Brandora

Brandora is a lightweight competitive ad intelligence app that:

1. Creates a brand profile from a real website URL.
2. Pulls real competitor ads (Meta Ad Library) via Apify.
3. Runs copy + visual analysis for each ad.
4. Powers grounded creative chat using the stored brand + competitor intelligence.

## Stack

- Next.js App Router + React + TypeScript
- SQLite + Prisma
- Apify actor integration for ad ingestion
- OpenAI responses API for profile extraction, visual analysis, and grounded chat

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Fill required values in `.env`:

- `APIFY_ENABLED` (`false` by default, set to `true` only when you intentionally want to run paid actor jobs)
- `DATABASE_URL` (default local SQLite file works)
- `APIFY_TOKEN`
- `APIFY_ACTOR_ID`
- `OPENAI_API_KEY` (optional but recommended for high quality analysis/chat)

4. Run DB migration:

```bash
npm run db:migrate
```

5. Start app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Implemented Features

### 1) Brand Setup

- Input: brand name + website URL
- Website is fetched and parsed for:
	- product/category
	- positioning
	- tone
	- target audience
	- value propositions
	- visual style
- Profile is persisted in SQLite and rendered in the dashboard

### 2) Competitor Ad Library + Analysis

- Input: up to 3 competitors per brand
- Ingestion fetches 5-10 recent ads per competitor (default 8)
- Only image/carousel creatives are stored
- Per-ad analysis includes:
	- Copy: hook line, CTA, messaging angle
	- Visual: style, people presence, text overlay, production style, product visibility
	- Ad-level: format and creative category
- Analysis is persisted and shown next to each ad

### 3) Grounded Creative Chat

- Chat endpoint builds context from:
	- brand profile
	- analyzed competitor ads
- Response generation is grounded to stored context (no RAG/vector DB)
- Chat history is persisted per brand

## Multi-Brand Support

- Multiple brands are persisted
- Each brand has isolated competitors, ads, analyses, and chat messages
- UI supports switching between brands

## Data Model

Main Prisma entities:

- `Brand`
- `Competitor`
- `Ad`
- `AdAsset`
- `AdAnalysis`
- `ChatMessage`

Schema file: `prisma/schema.prisma`

## Architectural Choices and Tradeoffs

### Persistence choice: SQLite + Prisma

- Why: durable local persistence, easy setup, queryable structure, supports relational joins for grounded chat context.
- Tradeoff: not horizontally scalable by itself; good for assignment scope and local development.

### Ad schema design

- Raw payload is stored for traceability and future parser updates.
- Structured fields are normalized for deterministic analysis and chat context packing.
- Tradeoff: partial actor-shape variance requires defensive normalization logic.

### Model choice

- One provider (OpenAI) used for profile extraction, ad analysis, and chat to reduce integration complexity.
- Fallback heuristics exist when API key is not configured.
- Tradeoff: heuristics are less accurate than model-backed analysis.

### Context preparation for chat

- Data is compacted into structured text grouped by competitor + ad analysis signals.
- No vector store because assignment scope fits in model context for 2-3 competitors.
- Tradeoff: context length should be monitored if ad counts expand.

## API Surface

- `GET /api/brands`
- `POST /api/brands`
- `GET /api/brands/:brandId`
- `POST /api/brands/:brandId/competitors`
- `POST /api/brands/:brandId/ingest`
- `POST /api/brands/:brandId/chat`

## Useful Commands

```bash
npm run dev
npm run lint
npm run build
npm run db:generate
npm run db:migrate
npm run db:studio
```

## Loom Walkthrough Checklist

Cover these in your 5-10 min video:

1. Brand profile pipeline (website -> profile -> persistence).
2. Competitor ingestion and ad normalization flow.
3. How ad analysis is structured for useful chat outputs.
4. Grounded chat context construction from Task 1 + Task 2 data.
5. Key tradeoffs and what you would improve with more time.

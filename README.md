# Ad Intelligence

> A lightweight competitive ad intelligence platform that retrieves real Meta Ad Library ads, analyzes them with multimodal AI (copy + visuals), and powers grounded creative recommendations for brands.

**Live Repository:** https://github.com/harishghasolia07/ad-intelligence

---

## 🎯 What It Does

**Ad Intelligence** demonstrates how to build a full-stack AI application that:

1. **Creates brand profiles** from real website URLs (product, positioning, tone, audience, value props)
2. **Fetches real competitor ads** from Meta Ad Library via Apify (image + carousel only, no video/reels)
3. **Analyzes ads with multimodal AI** (copy insights + visual style via OpenAI vision)
4. **Powers grounded creative chat** using stored brand + competitor data (no RAG—just smart context packaging)

---

## 📊 Data Flow

```
Brand Website → Profile Extraction + AI Enrichment → Brand Profile
        ↓
Competitors → Apify Actor (Meta Ad Library) → Real Ads (5-10 per competitor)
        ↓
Ad Images + Copy → OpenAI Vision + Analysis → Structured Ad Insights
        ↓
Brand Profile + Ad Data → Chat Context → Grounded Creative Recommendations
```

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS |
| **Backend** | Next.js API Routes (TypeScript) |
| **Database** | SQLite + Prisma ORM |
| **AI/Analysis** | OpenAI Responses API (vision + embeddings) |
| **Ad Ingestion** | Apify Actor (Meta Ad Library) |
| **Web Scraping** | Cheerio (HTML parsing for brand profiles) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- `npm` or `yarn`
- OpenAI API key (for analysis + chat)
- Apify token + actor ID (for real ad ingestion)

### Setup

1. **Clone the repo:**
   ```bash
   git clone https://github.com/harishghasolia07/ad-intelligence.git
   cd ad-intelligence
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Fill in `.env`:**
   ```env
   DATABASE_URL="file:./dev.db"
   OPENAI_API_KEY=sk_...
   APIFY_ENABLED=true
   APIFY_TOKEN=apify_api_...
   APIFY_ACTOR_ID=<your-actor-id>
   ```

5. **Run database migration:**
   ```bash
   npm run db:migrate
   ```

6. **Start development server:**
   ```bash
   npm run dev
   ```

7. **Open in browser:**
   ```
   http://localhost:3000
   ```

---

## 💡 How to Use

### Step 1: Create a Brand
- Enter a brand name (e.g., "Warby Parker")
- Provide a website URL (e.g., `warbyparker.com`)
- App scrapes the site and extracts profile with AI enrichment
- Profile appears on dashboard

### Step 2: Add Competitors
- Add 2-3 competitor brands (e.g., Nike, Adidas)
- Click "Ingest Ads" to fetch real competitor ads from Meta Ad Library
- See 5-10 image/carousel ads per competitor with analysis

### Step 3: Chat with Grounded Intelligence
- Ask creative questions:
  - "What creative angles are my competitors using most?"
  - "Give me 3 ad concepts none of my competitors are running"
  - "What visual styles dominate this space?"
- Get brand-specific, data-backed answers

---

## ✨ Key Features

### Real Data Only
- No mock or dummy ads
- Enforces real Apify integration or fails gracefully with clear errors
- Fetches actual competitor ads from Meta Ad Library

### Multimodal Ad Analysis
- **Copy Analysis:** Hook lines, CTAs, messaging angles
- **Visual Analysis:** Style, people presence, text overlays, production quality, product visibility
- **Format Detection:** Single image vs. carousel detection

### Multi-Brand Support
- Manage multiple brands in one app
- Each brand has isolated competitors, ads, and chat history
- Clean UI for brand switching

### Persistent Storage
- SQLite database for durability
- Prisma ORM for type-safe queries
- Cascading deletes maintain referential integrity

### Grounded Chat
- Context window approach (no RAG/vector DB for this scope)
- Responses grounded in real brand profile + competitor ads
- Chat history persists per brand

---

## 📐 Data Model

**Prisma Schema Entities:**

```
Brand
├── Competitor
│   └── Ad
│       ├── AdAsset (images)
│       └── AdAnalysis (structured insights)
└── ChatMessage
```

**Why this structure:**
- Multi-brand isolation prevents cross-contamination
- Separating `Ad` and `AdAnalysis` allows reanalysis without re-fetching
- `AdAsset` normalizes multiple images per carousel ad

---

## 🎯 Architectural Decisions & Tradeoffs

### 1. **Real Data Only vs. Mock Fallback**
- **Choice:** Real data only
- **Why:** Requirements explicitly state "real data only"
- **Tradeoff:** If Apify quota exhausted, returns 0 ads with warning rather than fake data
- **Benefit:** Honest about data quality; no silent failures

### 2. **SQLite + Prisma vs. Cloud DB**
- **Choice:** Local SQLite
- **Why:** Zero-ops, durable, queryable, type-safe with Prisma
- **Tradeoff:** Not horizontally scalable
- **Benefit:** Perfect for assignment scope + local development

### 3. **Context Window vs. RAG/Vector Search**
- **Choice:** Structured text context window
- **Why:** 5-10 ads per competitor fits easily in model context; no indexing complexity needed
- **Tradeoff:** Wouldn't scale to 1000s of ads
- **Benefit:** Low latency, simple implementation, deterministic

### 4. **OpenAI Responses API**
- **Choice:** Single provider for all AI tasks
- **Why:** Unified integration, vision + text capabilities
- **Tradeoff:** Single dependency; cost per API call
- **Benefit:** Reduced complexity vs. multi-provider setup

### 5. **Synchronous Architecture**
- **Choice:** No async queues, no microservices
- **Why:** Simple, synchronous requests fit assignment scope
- **Tradeoff:** Ingestion may take 20-30s if API is slow
- **Benefit:** Easy to understand, debug, and reason about

---

## 📁 Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── brands/
│   │   │       ├── route.ts (GET/POST brands)
│   │   │       └── [brandId]/
│   │   │           ├── route.ts (GET brand)
│   │   │           ├── competitors/route.ts (POST competitors)
│   │   │           ├── ingest/route.ts (POST ingest ads)
│   │   │           └── chat/route.ts (POST chat)
│   │   ├── page.tsx (Dashboard UI)
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   └── brandora-dashboard.tsx (Main UI component)
│   └── lib/
│       ├── brand-profile.ts (Website scraping + profile extraction)
│       ├── apify.ts (Ad fetching + normalization)
│       ├── ad-analysis.ts (Multimodal analysis)
│       ├── chat.ts (Grounded response generation)
│       ├── prisma.ts (DB client)
│       ├── env.ts (Environment validation)
│       ├── http.ts (HTTP response helpers)
│       └── schemas.ts (Zod validation)
├── prisma/
│   ├── schema.prisma (Data model)
│   ├── migrations/ (Database history)
│   └── dev.db (SQLite database)
└── public/ (Static assets)
```

---

## 🔌 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/brands` | List all brands |
| `POST` | `/api/brands` | Create new brand |
| `GET` | `/api/brands/:brandId` | Get brand details |
| `POST` | `/api/brands/:brandId/competitors` | Add competitors |
| `POST` | `/api/brands/:brandId/ingest` | Fetch + analyze competitor ads |
| `POST` | `/api/brands/:brandId/chat` | Ask grounded questions |

---

## 📝 Useful Commands

```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run lint             # Run ESLint
npm run db:generate      # Generate Prisma types
npm run db:migrate       # Run database migrations
npm run db:studio        # Open Prisma Studio (visual DB browser)
```

---

## 🎬 Video Walkthrough

For a detailed walkthrough of:
- Architecture decisions
- Data flow from Task 1 → Task 2 → Task 3
- Schema design rationale
- Live feature demo

**See:** `VIDEO_WALKTHROUGH_SCRIPT.md` (5-10 min Loom script)

---

## ✅ Requirements Compliance

| Requirement | Status | Details |
|---|---|---|
| Brand Setup | ✅ | Website scrape, profile extraction, persistence, UI display |
| Competitor Ad Library | ✅ | Real Apify fetch, 5-10 image/carousel ads, video/reels filtered |
| Multimodal Analysis | ✅ | Copy + visual analysis via OpenAI vision API |
| Creative Chat | ✅ | Grounded responses from brand profile + competitor ads |
| Real Data Only | ✅ | No mock ads; enforces real Apify or explicit failure |
| Multi-Brand Support | ✅ | Isolated data per brand |
| Persistence | ✅ | SQLite + Prisma ORM |
| Architecture Docs | ✅ | Tradeoffs explained in this README |
| No Over-Engineering | ✅ | Simple, synchronous, single database |

---

## 🚨 Error Handling

- **Unreachable Website:** Returns 400 with user-friendly message + guidance
- **Apify Quota Exhausted:** Returns 0 ads with warning (real data only)
- **Missing API Keys:** Fails at startup with clear configuration error
- **OpenAI Analysis Fails:** Falls back to heuristic-based analysis

---

## 🔐 Security Notes

- `.env` file is in `.gitignore` (never committed)
- API keys should be rotated before sharing repo
- Input validation via Zod schemas
- No SQL injection risk (Prisma ORM)

---

## 🎓 What I'd Improve with More Time

1. **Real-time Updates:** WebSocket for live ingestion progress
2. **Batch Processing:** Task queues (Bull, Celery) for 100+ competitors
3. **Vector Search:** Semantic search on competitor ads
4. **Performance Prediction:** ML model to predict ad CTR/CPC
5. **Collaboration:** Multi-user brand analysis + real-time updates
6. **Mobile:** Responsive design refinement
7. **Analytics Dashboard:** Competitor trend analysis over time

---

## 📞 Questions?

For questions about:
- Schema design and why it powers grounded chat
- Context preparation replacing RAG
- Architectural tradeoffs
- Code walkthrough

Feel free to reach out!

---

## 📄 License

MIT

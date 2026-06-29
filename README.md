# FastTrack — AI-Assisted Damage Assessment

**FastTrack** is a working prototype of an AI-assisted vehicle damage claims assessment tool for Scale Car Insurance. A claims agent uploads damage photos for a reported claim; a vision model (or deterministic mock) returns a structured, confidence-scored assessment; the system prices the findings into a line-item estimate; a routing module assigns a tier; and the agent reviews, corrects, and routes the claim toward approval — all in a few minutes rather than days.

See [docs/prd.md](docs/prd.md) for what the product does and why, [docs/technical-spec.md](docs/technical-spec.md) for how it is built, and [docs/erd.md](docs/erd.md) for the entity-relationship diagram.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript |
| UI | Tailwind CSS v4, shadcn/ui, TanStack Query v5 |
| Database | PostgreSQL on Neon, accessed with Drizzle ORM |
| File storage | Vercel Blob (photos only; URLs stored in Postgres) |
| Contracts | Zod schemas in `shared/` — single source of truth for request/response types |
| Hosting | Vercel (GitHub auto-deploy) |

---

## Architecture

FastTrack is a **modular monolith**: one TypeScript application deployed as a single unit, organized internally into five domain modules. Each module owns its own tables and exposes a public `interface.ts`; nothing outside a module touches its tables or internal logic.

```
modules/
  claims/      — claim lifecycle, photo intake, agent review and corrections
  assessment/  — vision model integration (mock or real), structured findings
  estimate/    — prices findings into line items and a total
  routing/     — assigns a routing tier from confidence, cost, and fraud signal
  audit/       — append-only log of every AI output and human action
```

Route handlers in `app/api/` stay thin: they validate input against a Zod schema in `shared/` and call into a module interface. The `auth/` layer runs in front of every handler and checks the user's role. The module boundary is a convention held in code review; it is the seam a future service split would replace with a network call.

---

## Features

| PRD feature | Spec section | Status |
|---|---|---|
| Claim intake and photo ingestion | §13 Screens / Intake | In progress (Phase 4) |
| AI damage assessment — mock vision | §9 AI integration | In progress (Phase 3) |
| AI damage assessment — real vision (Claude API) | §9 AI integration | Optional / Phase 3 |
| Preliminary estimate generation | §13 Estimate pricing | In progress (Phase 3) |
| Confidence scoring and triage | §10 Routing logic | In progress (Phase 3) |
| Agent review and override workspace | §13 Screens / Claim detail | In progress (Phase 4) |
| Routing and auto-approval | §10 Routing logic | In progress (Phase 3) |
| Audit trail | §6 Modules / audit | In progress (Phase 3) |
| Role switcher (customer / agent / supervisor) | §7 Users and roles | In progress (Phase 3) |
| Fraud detection | PRD §3 P2 | Not built — P2 scope |
| Video / multi-angle capture | PRD §3 P2 | Not built — P2 scope |

---

## Seed scenarios

The database is pre-seeded with four claims that demonstrate every routing branch:

| Claim | Scenario | Routing | Estimate | Notes |
|---|---|---|---|---|
| CLM-2024-001 | Clean | auto-approved | ~$870 (mock) | Run assessment from the UI to trigger the auto-approve loop |
| CLM-2024-002 | Ambiguous | agent\_review | $3,120 | Confidence 0.72 — below threshold |
| CLM-2024-003 | Severe | senior\_adjuster | $10,440 | Exceeds $10k cost threshold; possible total loss |
| CLM-2024-004 | Fraud-flagged | senior\_adjuster | $2,340 | Fraud flag overrides cost |

Auto-approval is **off by default** so a person reviews every claim. The clean scenario (CLM-2024-001) has auto-approval enabled so the auto-approve branch can be demonstrated end to end.

---

## Local setup

### Prerequisites

- Node.js 20.9+
- A [Neon](https://neon.tech) PostgreSQL project (two connection strings)
- A [Vercel Blob](https://vercel.com/storage/blob) store

### 1. Clone and install

```bash
git clone https://github.com/12hicksj/FastTrack.git
cd FastTrack
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string (host contains `-pooler`) — used by the app at runtime |
| `DATABASE_URL_UNPOOLED` | Neon **direct** connection string — used by drizzle-kit for migrations |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token — used by the app and the seed script |
| `MOCK_VISION` | `true` (default) uses the deterministic mock; `false` calls the real Claude vision API |
| `AUTH_SECRET` | Secret for signing the mock session cookie |
| `ANTHROPIC_API_KEY` | Only required when `MOCK_VISION=false` |

### 3. Run migrations

```bash
npm run db:migrate
```

This runs drizzle-kit against `DATABASE_URL_UNPOOLED` (the direct Neon connection).

### 4. Seed the database

```bash
npm run db:seed
```

Inserts all lookup data, the three demo user accounts, four scenario claims with assessments and routing decisions, and uploads 16 placeholder photos to Vercel Blob.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app redirects to `/claims`.

---

## Seeded accounts

Switch between these with the role switcher in the app header — no passwords required:

| Role | Email |
|---|---|
| Customer | customer@scale.insurance |
| Agent | agent@scale.insurance |
| Supervisor | supervisor@scale.insurance |

---

## How to run tests

```bash
npm test
```

Unit tests cover the routing rules and the estimate pricing math.

---

## How to deploy to Vercel

1. Push this repository to GitHub.
2. Import the repo into [Vercel](https://vercel.com).
3. In the Vercel project settings → **Environment Variables**, add all six variables from `.env.example`.
4. Attach a Neon database and a Vercel Blob store to the project (Storage tab). Vercel sets `BLOB_READ_WRITE_TOKEN` automatically when you add the Blob store.
5. Run migrations and seed once against the Neon database:
   ```bash
   DATABASE_URL_UNPOOLED=<direct-string> npm run db:migrate
   BLOB_READ_WRITE_TOKEN=<token> npm run db:seed
   ```
6. Vercel deploys automatically on every push to `main`.

> Migrations are **not** wired into the Vercel build. Run the migration script manually before deploying a schema change.

---

## Repository structure

```
fasttrack/
├── docs/
│   ├── prd.md                 product requirements
│   ├── technical-spec.md      architecture, data model, acceptance criteria
│   └── erd.md                 entity-relationship diagram (Mermaid)
├── app/                       Next.js App Router — pages and API route handlers
│   ├── (claims)/              claim queue, detail/review, and intake screens
│   ├── api/                   route handlers (thin: validate → call module interface)
│   └── components/            reusable UI components
├── modules/                   backend domain modules
│   ├── claims/                claim lifecycle, photos, review, corrections
│   ├── assessment/            vision model (mock + optional real), findings
│   ├── estimate/              line-item pricing
│   ├── routing/               tier assignment and auto-approval
│   └── audit/                 append-only event log
├── auth/                      mock session, role check, role switcher
├── shared/                    Zod schemas — single definition for all API contracts
├── components/                shadcn/ui component library + TanStack Query provider
└── db/
    ├── schema/                Drizzle table definitions (one file per module owner)
    ├── migrations/            generated SQL migrations
    └── seed/                  lookup data, demo claims, and photo upload script
```

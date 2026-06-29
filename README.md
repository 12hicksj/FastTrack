# FastTrack — AI-Assisted Damage Assessment

**FastTrack** is a working prototype of an AI-assisted vehicle damage claims assessment tool for Scale Car Insurance. A claims agent uploads damage photos for a reported claim; a vision model (or deterministic mock) returns a structured, confidence-scored assessment; the system prices the findings into a line-item estimate; a routing module assigns a tier; and the agent reviews, corrects, and routes the claim toward approval — all in a few minutes rather than days.

See [docs/prd.md](docs/prd.md) for what the product does and why, [docs/technical-spec.md](docs/technical-spec.md) for how it is built, and [docs/erd.md](docs/erd.md) for the entity-relationship diagram.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript |
| UI | Tailwind CSS v4, shadcn/ui, TanStack Query v5, Inter + JetBrains Mono |
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
| Claim intake and photo ingestion | §13 Screens / Intake | Built |
| Agent files claim on behalf of customer | §13 Screens / Intake | Built — agent picks customer then that customer's vehicles |
| Photo upload to Vercel Blob | §13 Config | Built — browser uploads direct to Blob via signed token |
| Automated assessment on claim submission | §9 AI integration | Built — runs immediately on every new claim |
| AI damage assessment — mock vision | §9 AI integration | Built (`MOCK_VISION=true`, default) |
| AI damage assessment — real vision (Claude API) | §9 AI integration | Built — `MOCK_VISION=false` sends all photos to `claude-opus-4-8` |
| Image quality gate | §9 AI integration | Built — Claude rates each photo; flags written to DB |
| Cross-photo aggregation | §9 AI integration | Built — single Claude call sees all angles at once |
| Preliminary estimate generation | §13 Estimate pricing | Built — vehicle-aware pricing (make/year multipliers) |
| Confidence scoring and triage | §10 Routing logic | Built — includes `confidence_below_threshold` tier |
| Agent review and override workspace | §13 Screens / Claim detail | Built — damage type, severity, repair action, and part label all editable |
| Routing and auto-approval | §10 Routing logic | Built — auto-approval always on for eligible claims |
| Conditional escalation | §10 Routing logic | Built — Escalate option only shown for agent\_review / low-confidence claims not yet escalated |
| Audit trail | §6 Modules / audit | Built |
| Role switcher (customer / agent / supervisor) | §7 Users and roles | Built |
| Claims queue — sortable and filterable | §13 Screens / Queue | Built — sort by any column; filter by status, tier, and free text |
| Claims queue — approved amount column | §13 Screens / Queue | Built — shows agent-set total alongside AI estimate for approved claims |
| Claims queue — correct customer column | §13 Screens / Queue | Built — resolves policy holder via vehicle → policy, not claim submitter |
| License plate on vehicles | Data model | Built |
| Fraud detection | PRD §3 P2 | Not built — P2 scope |
| Video / multi-angle capture | PRD §3 P2 | Not built — P2 scope |

---

## Seed scenarios

The database is pre-seeded with two customer accounts and four claims that demonstrate every routing branch:

| Claim | Customer | Scenario | Routing | Estimate |
|---|---|---|---|---|
| CLM-2024-001 | Alex Rivera | Clean — run assessment to trigger auto-approve | auto\_approved | ~$924 (mock) |
| CLM-2024-002 | Alex Rivera | Ambiguous — confidence 0.72, below threshold | agent\_review | $3,120 |
| CLM-2024-003 | Sam Torres | Severe near-total-loss — exceeds $10k threshold | senior\_adjuster | $10,440 |
| CLM-2024-004 | Sam Torres | Fraud-flagged — flag overrides cost | senior\_adjuster | $2,340 |

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
| `ANTHROPIC_API_KEY` | Required when `MOCK_VISION=false` |

The app is served under the `/fasttrack` base path (set in `next.config.ts`). The full URL is `https://scalecarinsurance.com/fasttrack` when the custom domain is configured in Vercel.

### 3. Run migrations

```bash
npm run db:migrate
```

This runs drizzle-kit against `DATABASE_URL_UNPOOLED` (the direct Neon connection).

### 4. Seed the database

```bash
npm run db:seed
```

Inserts all lookup data, four demo user accounts (two customers, one agent, one supervisor), four scenario claims with assessments and routing decisions, and uses Pexels CDN photos for the seeded claims.

To wipe and re-seed from scratch:

```bash
npm run db:reset
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app redirects to `/select-role`.

---

## Seeded accounts

Switch between these with the role switcher in the app header — no passwords required:

| Role | Name | Email |
|---|---|---|
| Customer | Alex Rivera | customer@scale.insurance |
| Customer | Sam Torres | customer2@scale.insurance |
| Claims Agent | Jordan Chen | agent@scale.insurance |
| Senior Adjuster | Taylor Morgan | supervisor@scale.insurance |

Each customer sees only their own claims and vehicles. Agents and supervisors see all claims across all customers, with a Customer column in the claims queue.

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
   npm run db:seed
   ```
6. Vercel deploys automatically on every push to `main`.

> Migrations are **not** wired into the Vercel build. Run the migration script manually before deploying a schema change.
>
> To wipe and re-seed a deployed database: set `DATABASE_URL` to the pooled string and run `npm run db:reset`.
>
> **Custom domain**: configure `scalecarinsurance.com` (or your domain) under the Vercel project **Settings → Domains** tab so that production deployments update the domain automatically. If the domain is only set via a manual `vercel alias` command it will not update on future deploys and you will need to re-alias after each one.

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
│   └── select-role/           demo role/user picker (replaces login)
├── modules/                   backend domain modules
│   ├── claims/                claim lifecycle, photos, review, corrections
│   ├── assessment/            vision model (mock + optional real), findings
│   ├── estimate/              line-item pricing
│   ├── routing/               tier assignment and auto-approval
│   └── audit/                 append-only event log
├── auth/                      mock session, role check
├── shared/                    Zod schemas — single definition for all API contracts
├── components/                shadcn/ui component library + TanStack Query provider
└── db/
    ├── schema/                Drizzle table definitions (one file per module owner)
    ├── migrations/            generated SQL migrations
    └── seed/                  lookup data, demo claims (index.ts), and reset script (reset.ts)
```

# Garments ERP

> **Multi-tenant SaaS ERP purpose-built for the Bangladesh Ready-Made Garments (RMG) sector.**
> Order → BOM → Production → QC → Shipment → HR & Payroll, end-to-end. No Excel. No paper.

[![Angular](https://img.shields.io/badge/Angular-20-DD0031?logo=angular&logoColor=white)](https://angular.dev)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![Nx](https://img.shields.io/badge/Nx-Monorepo-143055?logo=nx&logoColor=white)](https://nx.dev)
[![PrimeNG](https://img.shields.io/badge/PrimeNG-Aura-007ad9)](https://primeng.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](#license)

---

## Why this exists

Bangladesh has **4,000+ active garments factories** — the country's largest export industry. Most SME-tier factories (50–500 machines) still run on Excel + paper. Existing solutions (SAP, BMSL, Fast React) are either too expensive or not tailored to BD workflows: T&A calendars, BGMEA UD compliance, BTMA, NBR VAT/AIT, GSP/CO export forms, BD bank EXP form, biometric attendance, piece-rate payroll, festival bonus, Eid leave.

**This ERP is built for them.** Modern Angular UI, multi-tenant SaaS architecture, and BD-first workflows baked in.

---

## What's been built

11 vertical-slice modules. Every slice = **DDL → shared types → NestJS module → Angular page → seed data → green build.**

### ✅ Phase 1 — Core ERP MVP (Order-to-Shipment)

| # | Module | What it does |
|---|---|---|
| 1 | **IAM & Auth** | JWT + refresh tokens, multi-tenant signup, RBAC roles (`tenant_owner`, etc.), guarded routes |
| 2 | **Masters** | Buyers, suppliers (fabric/trim/accessory), items, currencies, departments — single source of truth |
| 3 | **Merchandising** | Styles + tech-pack uploads + samples + **T&A calendar** (Time & Action — every BD factory's lifeblood) |
| 4 | **Orders** | Buyer POs with size breakdown, color combos, pricing, delivery dates |
| 5 | **BOM & Costing** | Fabric & trim consumption, **CM/FOB cost sheets**, profit margin calc |
| 6 | **Procurement** | PR → PO → GRN flow, supplier assignment, LC tracking-ready |
| 7 | **Inventory** | **4-point fabric inspection** (BD-mandatory), trim store, FIFO bin-card |
| 8 | **Production** | Cutting plan, line setup, **hourly board** (production tracking), bundle/style tracking |
| 9 | **Quality** | Inline QC, end-line QC with defect breakdown, **DHU board** (Defects Per Hundred Units), **AQL inspection** with auto-quote based on lot size, defect-code library |
| 10 | **Shipment** | Packing lists with carton-level detail (auto CBM/weight totals), shipments (sea/air/road, BL/AWB, ports), **export documents** (CO, GSP Form A, **BD bank EXP form**, commercial invoice — all BD compliance docs) |

### ✅ Phase 2 — In Progress

| # | Module | What it does |
|---|---|---|
| 11 | **HR & Payroll** | Departments, employees with **BD-specific fields** (NID, bKash, BRAC Bank, skill grades 1–7), **biometric attendance**, leave management (casual/sick/earned/maternity/paternity/festival/unpaid), **auto-compute payroll** that prorates basic + house rent + medical + transport + food allowance based on attendance days, OT at 2× hourly rate |

### 🚧 Coming next (queue)

- Finance & VAT (AR/AP, multi-currency FX, NBR VAT/AIT)
- Compliance vault (Accord/RSC/Sedex audit calendar)
- Buyer Portal (read-only WIP/shipment status)
- Analytics dashboards (buyer profitability, line efficiency, on-time shipment %)
- AWS CDK infra + Stripe billing for productization

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | Angular 20 (standalone components, signals, control flow) | Mature for enterprise UIs; reactive primitives |
| **UI Kit** | PrimeNG (Aura theme) + Tailwind CSS v3 | Best data-grids/forms for ERP; Tailwind for layout |
| **State** | Angular signals + computed | Lightweight, no NgRx ceremony |
| **Backend** | NestJS 11 (Node + TypeScript) | DI + decorators feel like Angular; shared DTOs via Nx |
| **ORM** | Prisma 6 + raw SQL where needed | Type-safe, but raw SQL for multi-schema `SET search_path` |
| **Database** | PostgreSQL 16 | Strong transactional ERP + JSONB for flexible fields |
| **Multi-tenancy** | **Schema-per-tenant** (`tenant_<id>`) | Strong isolation; per-tenant backup; compliance-friendly |
| **Cache/Queue** | Redis + BullMQ (planned) | Sessions, background jobs (PDF, exports) |
| **Realtime** | Socket.IO Gateway (planned) | Live hourly production board |
| **Repo** | Nx monorepo (`packages/api`, `packages/web`, `packages/shared-types`) | Shared DTOs = single source of truth at API boundary |
| **Validation** | class-validator + class-transformer | Auto-enforces DTO contracts at controllers |
| **Auth** | NestJS Passport + JWT + refresh tokens | Stateless, scales horizontally |

### Multi-tenancy approach

```
Postgres
├── public schema           ← tenants table, users (global identity), memberships
└── tenant_<id> schema      ← all business tables (orders, employees, payroll, …)
```

Every authenticated request resolves the tenant from JWT claims, then **`SET LOCAL search_path TO tenant_<id>, public`** is pinned for the request's transaction via `TenantRepository.withTx()`. This guarantees zero cross-tenant data leakage at the database level — no `WHERE tenant_id =` to forget.

---

## Project structure

```
garments-erp/
├── packages/
│   ├── api/                              # NestJS backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma             # public schema (tenants, users)
│   │   │   ├── tenant-schema.sql         # ~1100 lines, all tenant DDL + triggers
│   │   │   └── seed.ts                   # ~1100 lines, full sample factory data
│   │   └── src/
│   │       ├── core/                     # auth, tenancy, database (TenantRepository), prisma
│   │       ├── modules/
│   │       │   ├── iam/                  # users, roles
│   │       │   ├── masters/              # buyers, suppliers, items
│   │       │   ├── merchandising/        # styles, T&A calendar
│   │       │   ├── orders/               # buyer orders + size breakdown
│   │       │   ├── bom/                  # BOM + costing sheets
│   │       │   ├── procurement/          # PR → PO → GRN
│   │       │   ├── inventory/            # 4-point inspection, bin-card
│   │       │   ├── production/           # cutting, line setup, hourly board
│   │       │   ├── quality/              # DHU, end-line, inline, AQL
│   │       │   ├── shipment/             # packing lists, shipments, export docs
│   │       │   └── hr/                   # employees, attendance, leave, payroll
│   │       └── main.ts
│   ├── web/                              # Angular frontend
│   │   └── src/app/
│   │       ├── core/                     # interceptors (auth, tenant), guards
│   │       ├── layout/shell/             # sidebar, header, router-outlet
│   │       └── features/
│   │           ├── auth/                 # login, signup
│   │           ├── dashboard/
│   │           ├── masters/              ├── merchandising/   ├── orders/
│   │           ├── bom/                  ├── procurement/     ├── inventory/
│   │           ├── production/           ├── quality/         ├── shipment/
│   │           └── hr/                   # 5 tabs: employees, attendance, leave, payroll, departments
│   └── shared-types/                     # DTOs shared between api + web
│       └── src/lib/
│           ├── auth.types.ts             ├── masters.types.ts
│           ├── merchandising.types.ts    ├── orders.types.ts
│           ├── bom.types.ts              ├── procurement.types.ts
│           ├── inventory.types.ts        ├── production.types.ts
│           ├── quality.types.ts          ├── shipment.types.ts
│           └── hr.types.ts
├── docker-compose.yml                    # local Postgres + Redis
├── .env.example
├── nx.json
└── package.json
```

---

## Highlights & BD-specific touches

- **T&A calendar** — every BD merchandiser lives in this. Drives PO → ex-factory dates.
- **4-point fabric inspection** — BGMEA-mandated; not optional in BD.
- **DHU board (Defects Per Hundred Units)** — the metric BD QCs are measured on. Auto color-coded: ≤3 emerald, ≤7 amber, >7 rose.
- **AQL inspection** — sample size auto-quoted from lot size (BD's General Inspection Level II tables).
- **Export documents tab** — all four BD export docs in one place:
  - **CO** (Certificate of Origin) issued by BGMEA
  - **GSP Form A** (preferential tariff to EU) issued by EPB
  - **EXP form** (BD Bank export proceeds tracking) — *unique to BD*
  - **Commercial Invoice**
- **Packing list auto-totals** — type carton dimensions, system computes CBM = (L×W×H)/1,000,000 live in the dialog header.
- **Skill grades 1–7** — BD government-defined wage grades.
- **Piece-rate payroll** — separate from monthly basic; common for sewing operators.
- **bKash, BRAC Bank fields** — how BD factory workers actually get paid.
- **Festival leave type** — Eid-ul-Fitr, Eid-ul-Adha bonus structures.
- **Friday weekoff** — seed data correctly skips Fridays in attendance.

---

## Quickstart

```bash
# 1. Install
npm install

# 2. Start local Postgres + Redis
docker compose up -d

# 3. Configure env
cp .env.example .env

# 4. Apply Prisma migrations (creates `public` schema)
npx prisma migrate dev --schema packages/api/prisma/schema.prisma

# 5. Seed a demo factory ("Demo Garments Ltd.") with 11 modules of sample data
npx prisma db seed --schema packages/api/prisma/schema.prisma

# 6. Run API + Web together
npx nx run-many -t serve -p api,web
```

Then:

| Service | URL |
|---|---|
| **API** | http://localhost:3000/api |
| **Swagger docs** | http://localhost:3000/api/docs |
| **Web** | http://localhost:4200 |

**Demo login** (created by the seed):
- Email: `owner@demo.example`
- Password: `demo1234`

---

## Build & test

```bash
# Build everything
npx nx run-many -t build -p api,web

# Build just one package
NX_IGNORE_UNSUPPORTED_TS_SETUP=true npx nx build web
npx nx build api

# Type-check
npx tsc --noEmit -p packages/api/tsconfig.json

# Run tests
npx nx run-many -t test
```

---

## What you can actually do right now (with seed data)

After running the seed, log in and you can:

1. **Browse buyers** — H&M, Walmart, Zara — and suppliers — Square Textiles, YKK Bangladesh, Coats Threads
2. **Open a Style** — full tech-pack with size breakdown, fabric/trim BOM
3. **View a Buyer Order** — H&M PO for 120 pcs Navy/White cotton tees
4. **Cost the order** — fabric consumption, CM, FOB price
5. **Create a PR/PO/GRN** chain to suppliers
6. **Inspect incoming fabric** with the 4-point system
7. **Plan a cutting batch**, set up sewing lines, track hourly output
8. **Log defects** at end-line, watch the **DHU board** update live
9. **Run an AQL inspection** with auto-suggested sample size
10. **Build a packing list** — type cartons, see CBM totals compute live
11. **Generate a shipment** with BL/AWB, container, ports, ETD/ETA
12. **Issue export documents** — CO, GSP, EXP form, commercial invoice
13. **Manage 10 employees** across 7 departments
14. **View April 2026 attendance** (biometric source, with sample late/absent/OT days)
15. **Approve/reject leave requests** — including a real Eid-ul-Fitr 3-day leave
16. **Compute payroll** — click Compute on PAY-2026-04 and watch lines auto-generate from attendance with prorated basic, allowances, OT @ 2× hourly

---

## Roadmap

| Phase | Window | Deliverable |
|---|---|---|
| **Phase 0** | Wk 1–4 | ✅ Foundation — Nx, NestJS skeleton, Angular skeleton, multi-tenant signup |
| **Phase 1** | Wk 5–16 | ✅ 10 core ERP modules end-to-end → ready for pilot factory |
| **Phase 2** | Wk 17–28 | 🚧 HR/Payroll done → Finance, Compliance, Buyer Portal next |
| **Phase 3** | Wk 29–44 | Analytics, forecasting, mobile app (Flutter), integrations (ZKTeco, Tally, NBR e-invoice) |
| **Phase 4** | Wk 45+ | Productize SaaS — Stripe/SSL Wireless billing, onboarding wizard, white-label, SOC2 prep |

---

## Architecture decisions (the "why")

- **Schema-per-tenant over row-level**: Garments factories are paranoid about cost data and buyer relationships leaking. Per-tenant backup/restore is also a sales feature.
- **NestJS over Spring Boot**: One language across stack → faster context switching for solo founder. Shared DTOs via `@org/shared-types` workspace package = no API contract drift.
- **Prisma + raw SQL hybrid**: Prisma for the `public` schema (tenants/users), raw parameterized SQL inside `TenantRepository.withTx()` for tenant-scoped queries (because Prisma can't pin `search_path` per request cleanly).
- **Standalone Angular components**: No NgModules. Every feature is a lazy-loaded route.
- **Signals over RxJS for component state**: Less ceremony, better DX, automatic change detection.
- **CHECK constraints over enum types**: Easier to evolve (`ALTER TABLE … DROP CONSTRAINT … ADD CONSTRAINT`) than ALTER TYPE.
- **No comments in code**: identifiers explain the *what*, commit messages explain the *why*.

---

## Status

- **Code-complete locally**: 11 modules, ~30,000 lines TS/SQL, both `api` and `web` builds green.
- **Not yet deployed**: AWS CDK / staging URL is Phase 0 of cloud rollout — pending after Phase 2 wraps.
- **Pilot factory**: TBD.

---

## License

Proprietary. All rights reserved. No unauthorized use, copying, modification, or distribution.

---

<div align="center">

**Built with ☕ for Bangladesh's RMG sector.**
*From the floor of Gazipur to the buyers in Stockholm.*

</div>

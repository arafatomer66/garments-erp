# Garments ERP

> **Multi-tenant SaaS ERP purpose-built for the Bangladesh Ready-Made Garments (RMG) sector.**
> Buyer order → BOM → Procurement → Production → QC → Shipment → Finance → HR & Payroll, end-to-end. No Excel. No paper.

[![Angular](https://img.shields.io/badge/Angular-20-DD0031?logo=angular&logoColor=white)](https://angular.dev)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![Nx](https://img.shields.io/badge/Nx-Monorepo-143055?logo=nx&logoColor=white)](https://nx.dev)
[![PrimeNG](https://img.shields.io/badge/PrimeNG-Aura-007ad9)](https://primeng.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](#license)

---

## Table of contents

- [Why this exists](#why-this-exists)
- [What's inside](#whats-inside)
- [Stack](#stack)
- [Quickstart](#quickstart)
- [The end-to-end flow (real-life RMG walkthrough)](#the-end-to-end-flow-real-life-rmg-walkthrough)
- [User guide — every module explained](#user-guide--every-module-explained)
  1. [IAM & Auth](#1-iam--auth)
  2. [Masters](#2-masters)
  3. [Merchandising](#3-merchandising)
  4. [Orders](#4-orders)
  5. [BOM & Costing](#5-bom--costing)
  6. [Procurement](#6-procurement)
  7. [Inventory](#7-inventory)
  8. [Production](#8-production)
  9. [Quality](#9-quality)
  10. [Shipment](#10-shipment)
  11. [HR & Payroll](#11-hr--payroll)
  12. [Finance & VAT](#12-finance--vat)
  13. [Compliance](#13-compliance)
  14. [Buyer Portal](#14-buyer-portal)
  15. [Analytics](#15-analytics)
  16. [Forecasting](#16-forecasting)
  17. [Settings](#17-settings)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Roadmap](#roadmap)
- [License](#license)

---

## Why this exists

Bangladesh has **4,000+ active garments factories** — the country's largest export industry, contributing ~84% of national export revenue. Most SME-tier factories (50–500 machines) still run on **Excel + paper**. Existing solutions (SAP, BMSL, Fast React) are either too expensive (USD 50k–500k+) or not tailored to BD workflows: T&A calendars, BGMEA UD compliance, BTMA, NBR VAT/AIT, GSP/CO export forms, BD bank EXP form, biometric attendance, piece-rate payroll, festival bonus, Eid leave.

**This ERP is built for them.** Modern Angular UI, multi-tenant SaaS architecture, and BD-first workflows baked in.

---

## What's inside

**17 vertical-slice modules.** Every slice = DDL → shared types → NestJS module → Angular page → seed data → green build.

| Phase | Modules |
|---|---|
| **Phase 1 — Order-to-Shipment** | IAM, Masters, Merchandising, Orders, BOM, Procurement, Inventory, Production, Quality, Shipment |
| **Phase 2 — Back office** | HR & Payroll, Finance & VAT, Compliance, Buyer Portal |
| **Phase 3 — Intelligence** | Analytics, Forecasting |
| **Cross-cutting** | Settings (tenant/users/roles) |

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Angular 20** (standalone components, signals, zoneless) | Enterprise-ready, signals are perfect for ERP grids |
| UI kit | **PrimeNG** (Aura preset) + **Tailwind v3** | Best data-grid/forms/dialogs out of the box; Tailwind for layout |
| Backend | **NestJS 11** + TypeScript | Shares Angular paradigms (DI, decorators, modules); shared DTOs via `@org/shared-types` |
| ORM | **Prisma 6** + raw SQL via `TenantRepository` | Prisma for `public` schema, raw SQL with `SET LOCAL search_path` for tenant schemas |
| Database | **PostgreSQL 16** | Strong transactional core + JSONB flexibility; one schema per tenant |
| Multi-tenancy | **Schema-per-tenant** | Strong isolation; per-tenant backup/restore; offboard = drop schema |
| Cache/queue | **Redis** + **BullMQ** *(Phase 4)* | Sessions, rate limiting, PDF generation, exports |
| Realtime | **Socket.IO** *(Phase 1.5 hourly board)* | Live production updates |
| Monorepo | **Nx** | Atomic PRs across API + Web; shared types library |
| Auth | NestJS Passport + JWT (access 15 m / refresh 30 d) | Multi-tenant: token carries `tenantId`, `schemaName`, `roles` |

---

## Quickstart

```bash
# 1. Clone & install
git clone https://github.com/arafatomer66/garments-erp.git
cd garments-erp
npm install

# 2. Postgres (local, e.g. Postgres.app on :5432)
createdb garments_erp

# 3. Environment
cp .env.example .env   # adjust DATABASE_URL, JWT secrets

# 4. Migrate + seed (creates tenant_demo schema with realistic BD data)
npx nx run api:prisma-migrate
npx nx run api:seed

# 5. Run both dev servers
npx nx serve api          # NestJS on http://localhost:3000/api
npx nx serve web          # Angular on http://localhost:4200
```

**Demo login**

```
URL:      http://localhost:4200/auth/login
Email:    owner@demo.local
Password: demo-owner-pw1
Tenant:   Demo Garments Ltd. (BD, BDT, Asia/Dhaka)
```

Swagger docs: http://localhost:3000/api/docs

---

## The end-to-end flow (real-life RMG walkthrough)

Imagine you are **Demo Garments Ltd.**, a 300-machine factory in Gazipur. **H&M** sends you a purchase order for **18,000 pieces of basic crew-neck T-shirts** at **USD 5.65/pc FOB**, ship by **30 June 2026**. Here's how this ERP handles it from inquiry to bank realisation.

| # | Step | Module | What happens | Artifact produced |
|---|---|---|---|---|
| 1 | Buyer & supplier setup | **Masters** | Add H&M as buyer, BTMA-listed knit mill as fabric supplier, trim suppliers (YKK zips, button vendors) | Buyer code `BUY-001`, Supplier `SUP-KNIT-04` |
| 2 | Style created | **Merchandising** | Style `TS-CREW-180GSM` registered, tech-pack PDF + lab-dip photo uploaded, T&A calendar built (PP sample → fabric in-house → cutting → sewing → packing → shipment) | Style ID, T&A milestones |
| 3 | Buyer PO booked | **Orders** | PO `PO-HM-2026-001`, 18,000 pcs, size break (S/M/L/XL = 4500/5400/4500/3600), 3 colours, ex-factory 25 Jun 2026 | Order `PO-HM-2026-001` |
| 4 | BOM built | **BOM & Costing** | Fabric: single jersey 180 gsm, 0.22 kg/pc → 3,960 kg + 5% wastage. Trims: 1 main label, 2 size labels, 1 hangtag, polybag. CM cost computed at USD 0.85/pc; FOB margin 21% | BOM, costing sheet, FOB price `5.65 USD` |
| 5 | Procurement | **Procurement** | Purchase requisition → 3 supplier POs (fabric, trims, packing). Back-to-back LC tracked against master LC | PR-2026-001, PO-FAB-2026-002, etc. |
| 6 | Goods receipt | **Inventory** | Fabric arrives → **4-point inspection** (record defect points per 100 sq yd, accept/reject by buyer AQL); trims received → bin card updated | GRN-2026-001, fabric-roll inspection report |
| 7 | Cutting plan | **Production** | Cutting plan for 18,000 pcs across 3 markers, lay length, plies, expected pieces per ply; bundles printed with QR codes | Cutting plan + bundle QR labels |
| 8 | Sewing | **Production** | 2 sewing lines assigned (Line A, Line B), hourly board updates target vs actual every hour; line balancing tracks bottleneck SMV | Hourly board log, line efficiency % |
| 9 | Inline QC | **Quality** | Inline QC inspectors log defects by SMV operation; live DHU (Defects per Hundred Units) dashboard alerts when DHU > 8 | Inline inspections, DHU board |
| 10 | End-line QC + AQL final | **Quality** | Every garment checked end-line; final inspection runs AQL 2.5 sampling; pass → packing | End-line QC log, AQL pass/fail |
| 11 | Packing | **Shipment** | Packing list built carton-by-carton (assortment, GW/NW, dimensions); 600 cartons total | Packing list `PL-2026-001` |
| 12 | Export docs | **Shipment** | Commercial invoice, EXP form (Bangladesh Bank), CO/GSP issued (Form A for EU GSP), forwarder booked | Export-doc bundle |
| 13 | Shipment | **Shipment** | Truck to Chittagong port, FCL container, vessel ETA Hamburg 28 Jul | Shipment record, B/L number |
| 14 | Finance — AR | **Finance** | Commercial invoice posted in USD; AIT 0.50% on export proceeds, no VAT (export zero-rated) | Invoice `INV-2026-0001`, FX rate 110 BDT/USD |
| 15 | Finance — AP | **Finance** | Supplier bills posted in BDT, supplier payment via SCB account, source tax deducted | Bills, payments |
| 16 | Bank realisation | **Finance** | Bank credits BDT after H&M pays USD; FX gain/loss booked; receivable cleared | Payment receipt, FX adjustment |
| 17 | HR & Payroll | **HR & Payroll** | Operators paid hybrid: skill-grade base + piece-rate bonus; OT @ 2× per BD Labour Act; festival bonus before Eid | Payroll run `PAY-2026-06` |
| 18 | Compliance | **Compliance** | Sedex SMETA audit doc on file; Accord/RSC building safety renewals tracked with 30/15/7-day expiry alerts | Compliance vault, audit calendar |
| 19 | Buyer self-serve | **Buyer Portal** | H&M merchandiser logs in (read-only) and sees WIP %, sample status, shipment ETA without emailing the merchandiser | Buyer view of order |
| 20 | Look back | **Analytics** | Buyer profitability ranks H&M order; line efficiency averages 91%; on-time shipment % = 100% for the month | KPI dashboards |
| 21 | Look ahead | **Forecasting** | Linear regression on 12 months of H&M qty projects next 3 months; capacity utilisation shows Line A is 92% booked vs Line B at 70% — sales team pushes more orders to Line B | Demand forecast, capacity heat-map |

That single H&M order touches **every** module. The ERP's job is to make sure data entered once at step 3 (Orders) flows automatically to steps 4 (BOM), 11 (Packing), 14 (Invoice), 19 (Buyer Portal), and 20 (Analytics) — no re-typing, no Excel, no WhatsApp.

---

## User guide — every module explained

### 1. IAM & Auth

**What it is:** identity, login, multi-tenant signup, role-based access control (RBAC).

**Roles shipped:** `tenant_owner`, `merchandiser`, `production_manager`, `qc_lead`, `accountant`, `hr_manager`, `compliance_officer`, `buyer_user` (read-only).

**Real life:** the factory owner signs up at `/auth/signup`, picks a tenant slug (`demo-garments`), and a brand-new Postgres schema `tenant_demo_garments` is provisioned in milliseconds. He invites his merchandising manager (`mr.rahman@demo.com`, role = `merchandiser`) and his accountant (`fariha@demo.com`, role = `accountant`) — each gets a different sidebar based on permissions.

**Try it:** log in as `owner@demo.local` → top-right shows "Demo Garments Ltd." → all 17 modules visible (owner sees everything).

---

### 2. Masters

**What it is:** the single source of truth for **buyers, suppliers, items, currencies, departments, units of measure**.

**Real life:** before you can book any order, you set up:
- **Buyers** — H&M, Zara, Primark, Walmart, with billing/shipping addresses, payment terms (LC at sight, TT 60 days), default currency (USD).
- **Suppliers** — fabric mills (BTMA-registered), trim suppliers (YKK Bangladesh), accessory suppliers (poly bags, hangtags), packaging.
- **Items** — fabric types (single jersey, fleece, denim 12 oz), trims (woven label, care label, button 24 L), accessories (polybag size 30×40), with HS codes for export.
- **Currencies** — USD (export), BDT (local), CNY (some China-sourced trims), with FX rates.

**Why it matters:** every order, BOM, PO, GRN, invoice, and bill points back to a master record. Change "H&M" address once → all 200 historical invoices reflect it.

**Try it:** `/masters` → tabs for Buyers / Suppliers / Items → sample BD data already seeded.

---

### 3. Merchandising

**What it is:** **styles**, **tech-packs**, **samples**, and the all-important **T&A calendar** (Time & Action).

**T&A is the heart of every BD factory.** Every milestone from "buyer concept received" to "ex-factory" is timed and tracked. Miss the dyeing date by 2 days and shipment slips by 2 days — air-freight cost = USD 4 / kg × 4,000 kg = USD 16,000 burned.

**Real life:**
- Style `TS-CREW-180GSM`: H&M sends a tech-pack PDF (measurements, construction, fabric spec, label placement, packing instruction). Merchandiser uploads it.
- Sample workflow: PP (Pre-Production) sample → buyer comments → revised PP → approved → size-set sample → fit comments → photo sample → final approval. Each sample stage tracks send-date, courier AWB, buyer feedback, status.
- T&A milestones: order received → PP sent (D+10) → fabric in-house (D+25) → cutting start (D+30) → sewing (D+35) → finishing (D+50) → packing (D+55) → ex-factory (D+60).

**Try it:** `/merchandising` → tabs for Styles / Tech-packs / T&A.

---

### 4. Orders

**What it is:** buyer purchase orders with **size breakdown, colour combinations, pricing, ship dates**.

**Real life:**
- H&M PO `PO-HM-2026-001` for `TS-CREW-180GSM`: 18,000 pcs, 3 colours (Black 6,000 / White 6,000 / Heather Grey 6,000), 4 sizes (S=4500, M=5400, L=4500, XL=3600), FOB Chittagong USD 5.65/pc, ship-window 20–30 Jun 2026.
- The order line itself is the *contract*. Everything downstream (BOM, cost sheet, cutting plan, packing list) ties to the order line ID.

**Try it:** `/orders` → see seeded H&M order → click into it for size/colour matrix.

---

### 5. BOM & Costing

**What it is:** **bill of materials** (every fabric/trim that goes into a piece) and the **CM/FOB cost sheet** (your profit margin).

**Real life:**
- For 1 piece of `TS-CREW-180GSM`:
  - Fabric: 0.22 kg single jersey 180 gsm × USD 4.50/kg = USD 0.99 + 5% wastage = **USD 1.04**
  - Trims: main label USD 0.02, size label USD 0.01, hangtag USD 0.04, polybag USD 0.03 = **USD 0.10**
  - **CM (Cut & Make):** sewing labour USD 0.50, finishing USD 0.15, overhead USD 0.20 = **USD 0.85**
  - **Commercial:** freight USD 0.06, certificates USD 0.03, finance USD 0.04 = **USD 0.13**
  - **Total cost:** 1.04 + 0.10 + 0.85 + 0.13 = **USD 2.12**
  - **FOB price:** USD 5.65 → **Margin: 62%** (high because BD CM is competitive)
- The cost sheet flags if fabric price changes (mill quote up by 8%) and recomputes margin live.

**Try it:** `/bom` → Styles tab → click style → Costing tab.

---

### 6. Procurement

**What it is:** **PR (purchase requisition) → PO (purchase order) → GRN (goods receipt note)**, plus LC and back-to-back LC tracking.

**Real life:**
- BOM auto-suggests procurement: 3,960 kg fabric + 5% wastage = 4,158 kg.
- Merchandiser raises PR-2026-001 for fabric → procurement team converts to PO-FAB-2026-002 to BTMA-registered mill, payment terms 30% advance / 70% against B/L.
- For imported trims (YKK zippers from China): back-to-back LC opened against master export LC from H&M. Bank charges, LC opening fee, margin auto-tracked.
- Goods arrive → GRN posted → links back to PO and PR.

**Try it:** `/procurement` → tabs for PR / PO / GRN.

---

### 7. Inventory

**What it is:** **4-point fabric inspection** (BD-mandatory for export buyers), trim store, FIFO bin-card.

**4-point system explained:**
- Inspector lays out fabric on a light table. Defects scored:
  - ≤ 3 inches → 1 point
  - 3–6 inches → 2 points
  - 6–9 inches → 3 points
  - \> 9 inches or holes → 4 points
- Acceptable: ≤ 40 points per 100 sq yd (H&M, Zara typical AQL).
- Roll-by-roll log: roll number, batch, GSM, width, length, total points → accept/reject.

**Trim store:** every box of zippers, every reel of thread bin-carded with FIFO consumption (oldest stock issued first).

**Real life:** fabric arrives 4,158 kg in 92 rolls. Inspectors check every roll. 3 rolls fail (45+ points, dye streaks). Replacement claim raised against supplier within 3 days. Remaining 89 rolls released to cutting.

**Try it:** `/inventory` → Fabric inspection tab → see seeded rolls.

---

### 8. Production

**What it is:** **cutting plan, sewing line setup, hourly board, bundle/QR tracking**.

**Real life:**
- **Cutting plan**: marker length 6.5 m, 80 plies, 1 marker = 80 pcs × multiple sizes per marker. Total markers 225 → 18,000 pcs cut over 6 days.
- **Bundles**: cut pieces grouped into bundles of 30 pcs, each bundle gets a QR code with `style/colour/size/operation`.
- **Line setup**: Line A (35 operators, target 300 pcs/hr knit basics) gets Black + White; Line B (32 operators) gets Heather Grey + balance.
- **Hourly board**: at the end of every hour, line supervisor logs target vs actual. Live screen on the floor: Line A 285/300 (95%), Line B 243/275 (88%) — supervisor can see Line B is short and rebalance.
- **Line balancing** (Phase 2): SMV (Standard Minute Value) per operation lets the system flag bottlenecks (e.g. neck-rib SMV 0.65 vs sleeve-attach 0.42 → neck-rib is the bottleneck).

**Try it:** `/production` → Cutting plans / Sewing lines / Bundles tabs.

---

### 9. Quality

**What it is:** **inline QC, end-line QC, AQL final inspection, DHU dashboard**.

**Real life:**
- **Inline QC**: 2 QC inspectors per line spot-check every 30 minutes. Defects logged by operation (broken stitch, skip stitch, uneven hem, label mis-attached). DHU = (defects ÷ pieces checked) × 100.
- **End-line QC**: 100% inspection of every piece. Grade A → packing; Grade B → repair; Grade C → reject.
- **AQL 2.5 final inspection**: random sample (e.g. 200 pcs from 18,000) checked by buyer's QC team or 3rd-party (SGS, Bureau Veritas). Major defects ≤ 5 → pass.
- **DHU dashboard**: live trend per line, alerts when DHU > 8 (industry standard).
- **Defect codes**: master list — broken stitch, open seam, wrong label, dirty mark, oil mark, button missing, etc.

**Try it:** `/quality` → Defect codes / Inline / End-line / DHU board / AQL tabs.

---

### 10. Shipment

**What it is:** **packing list, export documents, shipment booking**.

**Real life:**
- **Packing list `PL-2026-001`**: 600 master cartons, each holding 30 pcs (mixed sizes per buyer's assortment). GW 18 kg, NW 16 kg, dim 60×40×40 cm. Solid colour or assorted? — driven by buyer pack-list spec.
- **Commercial invoice**: 18,000 pcs × USD 5.65 = USD 101,700 FOB Chittagong.
- **EXP form** (mandatory by Bangladesh Bank): bank reference number, exporter TIN, buyer name, shipment value. Filed before goods leave port.
- **CO / GSP Form A**: Certificate of Origin issued by EPB (Export Promotion Bureau) for EU GSP zero-duty access — saves buyer 12% duty.
- **Forwarder booking**: Maersk MSC etc., container number, B/L draft → final B/L → ETA destination.

**Try it:** `/shipment` → Packing lists / Shipments / Export documents.

---

### 11. HR & Payroll

**What it is:** **employees, biometric attendance, leaves, hybrid piece-rate + skill-grade payroll, OT, festival bonus**.

**BD specifics baked in:**
- **Skill grades 1–7** (BD Wages Board): Grade 7 helper BDT 8,000 → Grade 1 sr. operator BDT 22,000 base.
- **Piece-rate bonus**: above target output (e.g. 200 pcs/hr standard → 220 actual = bonus on extra 20).
- **Overtime**: 2× hourly rate per Bangladesh Labour Act 2006, capped at 2 hr/day.
- **Friday weekoff**, Eid-ul-Fitr 3 days, Eid-ul-Azha 3 days, festival bonus = 1 month basic before each Eid.
- **bKash/Nagad** mobile money payout supported alongside bank transfer.
- **Biometric**: ZKTeco device CSV import → punches → attendance compute (late, early-out, absent, half-day).

**Real life:**
- 850 employees: 700 operators, 80 helpers, 30 supervisors, 25 QC, 15 admin.
- April payroll run `PAY-2026-04`: gross BDT 84 lakh, OT BDT 6 lakh, Eid bonus BDT 70 lakh. Net to bKash 60%, bank 40%.

**Try it:** `/hr` → Employees / Attendance / Payroll tabs.

---

### 12. Finance & VAT

**What it is:** **multi-currency AR/AP, bank reconciliation, NBR VAT/AIT, costing-vs-actual margin**.

**BD specifics:**
- **Export AR** in USD; **local AP** in BDT; FX rate stored per invoice/bill so revaluation gain/loss is transparent.
- **VAT 15%** on local sales; export is **zero-rated**.
- **AIT 0.50%** advance income tax on export proceeds (deducted by bank at realisation).
- **Source tax** (5–10%) on supplier payments, deposited monthly to NBR.
- **Banks supported**: Standard Chartered, HSBC, BRAC Bank, City Bank — common ERQ (Exporter's Retention Quota) and back-to-back LC accounts.

**Real life:**
- Invoice `INV-2026-0001` posted USD 101,700, FX 110 BDT/USD = BDT 1,11,87,000.
- Bank realises 4 weeks later at FX 112 = BDT 1,13,90,400 → FX gain BDT 2,03,400 booked.
- AIT 0.50% = USD 508.50 deducted at source, recoverable via tax return.

**Try it:** `/finance` → Accounts / Tax codes / Invoices / Bills / Payments tabs.

---

### 13. Compliance

**What it is:** **document vault + audit calendar** for Accord/RSC, Sedex SMETA, BSCI, WRAP, ISO 9001, OEKO-TEX, etc.

**Real life:**
- Sedex SMETA 4-pillar audit valid till 15 Aug 2026 → calendar alerts at 30/15/7 days before expiry.
- Accord/RSC building & fire safety inspection report uploaded; CAPA (Corrective Action Plan) tracked: "fire-door installation deadline 30 Sep" → owner gets notified 14 days prior.
- Buyer COC (Code of Conduct) signed copies stored per buyer.
- Higg FEM, ZDHC chemical inventory (Phase 3 sustainability).

**Try it:** `/compliance` → Document vault + audit calendar.

---

### 14. Buyer Portal

**What it is:** read-only view for **buyer staff** to track their orders without emailing the merchandiser.

**Real life:**
- H&M's Dhaka office merchandiser logs in with `katarina@hm.com` (role = `buyer_user`, scoped to buyer = H&M only).
- She sees: every active H&M order, WIP % (cutting/sewing/finishing/packed), sample status, latest shipment ETA, latest QC AQL result.
- She **cannot** see other buyers' orders, factory cost data, or supplier info — strict ABAC scope by buyer ID.
- Reduces merchandiser email volume by 60%+ in pilot factories.

**Try it:** `/buyer-portal` → seeded buyer view.

---

### 15. Analytics

**What it is:** cross-module **KPI dashboards** for the MD/owner.

**KPIs shipped:**
- **Pipeline value** by status (draft / confirmed / in-production / shipped) — open exposure in USD.
- **Line efficiency** per day per line — % of target produced.
- **On-time shipment %** — last 90 days, with average delay days.
- **Buyer profitability** — top buyers by margin USD, profit %, on-time %.
- **Top styles** — units shipped × FOB.
- **Latest DHU** — last QC reading per line.

**Real life:** owner opens `/analytics` first thing in the morning over chai. Sees that **Walmart's profitability dropped to 14% last month** (vs 22% YoY) → drills in → finds fabric prices up 9% on cotton + Walmart held FOB flat → renegotiation discussion at next meeting.

**Try it:** `/analytics`.

---

### 16. Forecasting

**What it is:** **demand projection** (linear regression) + **capacity utilisation** + **order backlog with risk flags**.

**Real life:**
- 12-month qty history per buyer → linear regression (slope, intercept) → 3-month forward forecast.
- H&M trend: +2% slope/month → next quarter predicted 56k pcs.
- Capacity model: 10 hr/day × 26 working days × line capacity. Line A monthly capacity = 156,000 pcs; booked = 144,000 = 92% utilised.
- Backlog: order risk flagged as `late` (already past due), `tight` (≤ 14 days, < 80% complete), `on_track`.
- **Use case:** "Do we accept the new Primark order for Aug delivery?" → forecasting screen shows Line B at 70% utilised in Aug → yes, take it for Line B at FOB +3% premium for tight schedule.

**Try it:** `/forecasting` → Demand / Capacity / Backlog tabs.

---

### 17. Settings

**What it is:** **tenant configuration**, user invites, role assignment.

**Real life:**
- Tenant settings tab: country (BD), currency (BDT), timezone (Asia/Dhaka), legal name, BIN (VAT number), address.
- Users tab: invite by email, assign 1+ roles (multi-role), deactivate, reset password.
- Roles tab: read-only matrix of all available roles with description.

**Try it:** `/settings`.

---

## Architecture

### Multi-tenancy (schema-per-tenant)

```
postgres
├── public                ← global identity
│   ├── tenants
│   ├── users
│   └── memberships
├── tenant_demo           ← Demo Garments Ltd.
│   ├── buyers, suppliers, items, ...
│   ├── styles, buyer_orders, boms, ...
│   ├── purchase_orders, fabric_rolls, ...
│   ├── cutting_plans, sewing_lines, ...
│   └── invoices, bills, payments
└── tenant_acme           ← (next factory)
    └── ...
```

Every API request:
1. Tenancy middleware reads JWT → extracts `schemaName`.
2. `TenantRepository.withTx()` opens a transaction.
3. `SET LOCAL search_path TO "tenant_demo", public` — Postgres now resolves all unqualified tables to that schema.
4. Query runs in tenant scope. Zero risk of cross-tenant data leak.

### Request flow

```
[Angular] → POST /api/orders
   │ Authorization: Bearer eyJ...
   ▼
[NestJS]
  ├── TenancyMiddleware  → tenantStorage.run({ tenantId, schemaName, userId, roles })
  ├── ValidationPipe     → DTO checks (class-validator)
  ├── OrdersController   → @Post()
  ├── OrdersService      → withTx(async (tx) => { ... })
  │                          ↓
  │                       SET LOCAL search_path TO "tenant_demo", public
  │                          ↓
  │                       INSERT INTO buyer_orders (...)
  │                          ↓
  │                       camelize() rows → return DTO
  ▼
[Postgres] tenant_demo.buyer_orders
```

---

## Repository layout

```
garments-erp/
├── packages/
│   ├── api/                          ← NestJS 11
│   │   ├── prisma/
│   │   │   ├── schema.prisma         ← public schema (tenants, users)
│   │   │   ├── tenant-schema.sql     ← tenant schema DDL ("{{SCHEMA}}" placeholder)
│   │   │   └── seed.ts               ← Demo Garments Ltd. realistic seed
│   │   └── src/
│   │       ├── core/
│   │       │   ├── auth/             ← JWT, signup, login, refresh
│   │       │   ├── tenancy/          ← middleware, schema service, tenant-context (AsyncLocalStorage)
│   │       │   ├── database/         ← TenantRepository
│   │       │   └── prisma/
│   │       └── modules/              ← 17 feature modules (one folder each)
│   ├── web/                          ← Angular 20 (standalone, signals, zoneless)
│   │   └── src/app/
│   │       ├── core/                 ← interceptors, guards, AuthService
│   │       ├── layout/shell/         ← sidebar + topbar
│   │       └── features/             ← 17 lazy-loaded feature pages
│   └── shared-types/                 ← @org/shared-types — DTOs shared API ↔ Web
├── nx.json
├── package.json
└── README.md                          ← you are here
```

---

## Roadmap

| Phase | Status | Scope |
|---|---|---|
| Phase 0 — Foundation | ✅ Done | Nx monorepo, NestJS + Angular skeleton, multi-tenant signup, RBAC, dev DB, seed |
| Phase 1 — Order-to-Shipment (10 modules) | ✅ Done | IAM → Shipment, end-to-end |
| Phase 2 — Back office (4 modules) | ✅ Done | HR & Payroll, Finance, Compliance, Buyer Portal |
| Phase 3 — Intelligence (2 modules) | ✅ Done | Analytics, Forecasting |
| Phase 3.5 — Mobile | ⏳ Next | Flutter floor-supervisor app (offline-first, hourly board) |
| Phase 4 — Productize | 🟡 Plan | AWS CDK infra (ECS Fargate, RDS, Redis, S3, CloudFront), self-serve signup, Stripe/SSL Wireless billing, white-label, SOC2 prep |

---

## License

Proprietary © 2026 — all rights reserved. This repository is currently public for portfolio / due-diligence purposes only. Commercial use requires a license.

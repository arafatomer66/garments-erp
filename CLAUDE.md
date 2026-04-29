<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

# Garments ERP — Project Conventions

Multi-tenant SaaS ERP for Bangladesh RMG sector. **Default mode: autonomous** — build vertical slices end-to-end without confirming each step.

## Build commands
- API: `npx nx build api`
- Web: `NX_IGNORE_UNSUPPORTED_TS_SETUP=true npx nx build web`
- Both must be green before marking a slice complete.

## Vertical slice pattern (per module)
1. Append tables + triggers to `packages/api/prisma/tenant-schema.sql` (uses `"{{SCHEMA}}"` placeholder)
2. Add types to `packages/shared-types/src/lib/<module>.types.ts` and re-export from `shared-types.ts`
3. NestJS module: `packages/api/src/modules/<module>/{dto/, *.service.ts, *.controller.ts, *.module.ts}` — extend `TenantRepository`, register in `app.module.ts`
4. Angular page: `packages/web/src/app/features/<module>/` (standalone components, signals, PrimeNG tabs/tables/dialogs), add route + sidebar nav
5. Seed: append to `packages/api/prisma/seed.ts` `seedTenantData()` (idempotent — use `ON CONFLICT DO NOTHING` or existence checks)
6. Verify both builds green

## Backend conventions
- Severity/status columns: TEXT with CHECK constraints — no Postgres enum types
- DTOs: class-validator. Nested arrays need `@ValidateNested({ each: true })` + `@Type(() => Inner)` from `class-transformer`
- Multi-tenant queries: extend `TenantRepository`, use `query/exec/withTx` — `search_path` is auto-pinned via `SET LOCAL`
- Camelize SQL rows via `../masters/sql.util` `camelize` helper
- Schema name regex `^tenant_[a-z0-9_]+$` — never interpolate user input

## Frontend conventions
- Standalone components, `ChangeDetectionStrategy.OnPush`, signals + computed for state
- PrimeNG (Aura preset). Tailwind v3 for layout
- For PrimeNG `(onRowSelect)`: typed as `event: { data?: T | T[] }` (data may be undefined or array)
- Forms: `FormBuilder` from `@angular/forms`, `formControlName` bindings
- API services: HttpClient + `Observable<T>`, base path from environment

## BD-specific conventions
- Currency: USD for export AR / BDT for local AP; FX rate stored on each invoice/bill
- Banks: Standard Chartered, HSBC, BRAC Bank, City Bank common; ERQ/back-to-back LC purposes
- Tax: VAT 15%, AIT 0.50% (export), source tax on supplier payments
- HR: bKash for mobile money, skill grades 1-7, Friday weekoff, festival leave (Eid)
- Export docs: CO, GSP, EXP form, commercial invoice
- Naming for sample data: BD names + factory codes (PAY-2026-04, EMP-0001, INV-2026-0001)

## Git
- GitHub: https://github.com/arafatomer66/garments-erp (public)
- Single `main` branch. Commit per slice with descriptive message. No PR workflow yet.

## Demo seed login
`owner@demo.example` / `demo1234`

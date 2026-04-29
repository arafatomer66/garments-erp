import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TabsModule } from 'primeng/tabs';
import { PageIntroComponent } from '../../shared/page-intro.component';

interface FlowStep {
  n: number;
  module: string;
  icon: string;
  action: string;
  inputs: { label: string; value: string }[];
  outputs: { label: string; value: string }[];
  passesTo: string;
  hint?: string;
}

const STEPS: FlowStep[] = [
  {
    n: 1,
    module: 'Masters',
    icon: 'pi-database',
    action: 'Set up the buyer & suppliers (one-time setup, then reused forever)',
    inputs: [
      { label: 'Buyer name', value: 'H&M Hennes & Mauritz AB' },
      { label: 'Currency', value: 'USD' },
      { label: 'Payment terms', value: 'TT 60 days from B/L' },
      { label: 'Buyer code', value: 'BUY-001' },
    ],
    outputs: [
      { label: 'buyer.id', value: '6c9-…ec4d (UUID)' },
      { label: 'Suppliers seeded', value: 'BTMA Mill SUP-KNIT-04, YKK Bangladesh, Polybag vendor' },
    ],
    passesTo: 'Orders → uses buyer.id; BOM → uses item master; Procurement → uses supplier master',
    hint: 'Change H&M address once → 200 historical invoices update.',
  },
  {
    n: 2,
    module: 'Merchandising',
    icon: 'pi-palette',
    action: 'Register the style and upload the tech-pack',
    inputs: [
      { label: 'Style code', value: 'TS-CREW-180GSM' },
      { label: 'Buyer', value: 'BUY-001 (H&M)' },
      { label: 'Tech-pack', value: 'tech-pack-v3.pdf (12 MB)' },
      { label: 'Fabric spec', value: 'Single jersey 180 gsm, combed cotton' },
    ],
    outputs: [
      { label: 'style.id', value: 'STY-2026-014' },
      { label: 'T&A milestones created', value: 'PP D+10, fabric in-house D+25, ex-factory D+60' },
    ],
    passesTo: 'Orders → links order to style.id; BOM → BOM is built per style',
    hint: 'T&A misses cost USD 4/kg air-freight — alerts fire 3 days before each milestone.',
  },
  {
    n: 3,
    module: 'Orders',
    icon: 'pi-shopping-cart',
    action: 'Book the buyer purchase order',
    inputs: [
      { label: 'PO number', value: 'PO-HM-2026-001' },
      { label: 'Style', value: 'STY-2026-014' },
      { label: 'Quantity', value: '18,000 pcs' },
      { label: 'Sizes', value: 'S 4,500 / M 5,400 / L 4,500 / XL 3,600' },
      { label: 'Colours', value: 'Black 6,000 / White 6,000 / Heather 6,000' },
      { label: 'FOB price', value: 'USD 5.65/pc' },
      { label: 'Ship window', value: '20–30 Jun 2026' },
    ],
    outputs: [
      { label: 'order.id', value: 'ORD-2026-0001' },
      { label: 'Order value', value: 'USD 101,700' },
      { label: 'Status', value: 'confirmed' },
    ],
    passesTo: 'BOM, Production, Packing, Invoice — every downstream record links to ORD-2026-0001',
  },
  {
    n: 4,
    module: 'BOM & Costing',
    icon: 'pi-list',
    action: 'Build the bill of materials and cost sheet',
    inputs: [
      { label: 'Fabric', value: '0.22 kg/pc × 18,000 = 3,960 kg + 5% wastage = 4,158 kg' },
      { label: 'Trims', value: 'Main label, size label, hangtag, polybag' },
      { label: 'CM', value: 'Sewing 0.50 + finishing 0.15 + overhead 0.20 = USD 0.85' },
    ],
    outputs: [
      { label: 'Total cost / pc', value: 'USD 2.12' },
      { label: 'FOB / pc', value: 'USD 5.65' },
      { label: 'Margin', value: '62%' },
    ],
    passesTo: 'Procurement → auto-suggests 4,158 kg fabric + trim qty; Finance → variance report',
    hint: 'If fabric quote rises 8%, margin recomputes live before the order is confirmed.',
  },
  {
    n: 5,
    module: 'Procurement',
    icon: 'pi-truck',
    action: 'Raise PR → PO → GRN for fabric and trims',
    inputs: [
      { label: 'PR', value: 'PR-2026-001 — 4,158 kg fabric' },
      { label: 'Supplier', value: 'SUP-KNIT-04 (BTMA mill)' },
      { label: 'Payment terms', value: '30% advance, 70% against B/L' },
    ],
    outputs: [
      { label: 'PO created', value: 'PO-FAB-2026-002 — USD 18,711' },
      { label: 'Back-to-back LC', value: 'BTB-LC-2026-007 against H&M master LC' },
    ],
    passesTo: 'Inventory → GRN posts here when goods arrive; Finance → bill posted to AP',
  },
  {
    n: 6,
    module: 'Inventory',
    icon: 'pi-box',
    action: 'Receive fabric and run 4-point inspection',
    inputs: [
      { label: 'GRN', value: 'GRN-2026-001 — 92 rolls received' },
      { label: 'Inspection', value: '4-point system (BD-mandatory for export buyers)' },
    ],
    outputs: [
      { label: 'Pass', value: '89 rolls (≤ 40 points / 100 sq yd)' },
      { label: 'Reject', value: '3 rolls (45+ points, dye streaks)' },
      { label: 'Replacement claim', value: 'CLM-2026-003 to SUP-KNIT-04 within 3 days' },
    ],
    passesTo: 'Production → 89 rolls released to cutting; Finance → claim adjustment to bill',
  },
  {
    n: 7,
    module: 'Production',
    icon: 'pi-cog',
    action: 'Cut, bundle, and assign sewing lines',
    inputs: [
      { label: 'Cutting plan', value: '225 markers, 80 plies, 6 days' },
      { label: 'Bundles', value: '600 bundles × 30 pcs = 18,000 pcs' },
      { label: 'Lines', value: 'Line A (35 ops) → Black/White; Line B (32 ops) → Heather' },
    ],
    outputs: [
      { label: 'Hourly board (last hour)', value: 'Line A 285/300 (95%) • Line B 243/275 (88%)' },
      { label: 'Bundle QR codes', value: 'printed and tracked per operation' },
    ],
    passesTo: 'Quality → defects logged against bundles; Analytics → line efficiency aggregated',
    hint: 'Live Socket.IO board = supervisor sees Line B falling short → rebalance mid-shift.',
  },
  {
    n: 8,
    module: 'Quality',
    icon: 'pi-check-circle',
    action: 'Inline + end-line QC + final AQL',
    inputs: [
      { label: 'Inline QC', value: 'Sampling every 30 min per operation' },
      { label: 'End-line', value: '100% inspection — Grade A/B/C' },
      { label: 'AQL', value: '2.5 sample = 200 pcs from 18,000' },
    ],
    outputs: [
      { label: 'DHU last hour', value: 'Line A 4.2 • Line B 9.1 (alert raised on B)' },
      { label: 'AQL final', value: 'PASS (4 major / 5 allowed)' },
    ],
    passesTo: 'Shipment → only AQL-passed cartons go to packing list',
  },
  {
    n: 9,
    module: 'Shipment',
    icon: 'pi-send',
    action: 'Build packing list and export documents',
    inputs: [
      { label: 'Packing config', value: '30 pcs/carton, mixed assortment per buyer spec' },
      { label: 'Carton dim', value: '60×40×40 cm, GW 18 kg / NW 16 kg' },
    ],
    outputs: [
      { label: 'Packing list', value: 'PL-2026-001 — 600 cartons' },
      { label: 'Commercial invoice', value: 'USD 101,700 FOB Chittagong' },
      { label: 'EXP form', value: 'Filed with Bangladesh Bank ref EXP-SCB-2026-3402' },
      { label: 'GSP Form A', value: 'Saves H&M 12% EU duty' },
      { label: 'B/L', value: 'MAEU-9842117 (Maersk)' },
    ],
    passesTo: 'Finance → invoice triggers AR; Buyer Portal → ETA visible to H&M',
  },
  {
    n: 10,
    module: 'Finance & VAT',
    icon: 'pi-dollar',
    action: 'AR booking, AIT deduction, FX revaluation',
    inputs: [
      { label: 'Invoice', value: 'INV-2026-0001 USD 101,700' },
      { label: 'FX at posting', value: 'BDT 110.00 / USD' },
      { label: 'AIT (export)', value: '0.50% = USD 508.50' },
    ],
    outputs: [
      { label: 'BDT receivable', value: 'BDT 1,11,87,000' },
      { label: 'Bank realisation', value: '4 weeks later at FX 112.00' },
      { label: 'FX gain', value: 'BDT 2,03,400 booked' },
    ],
    passesTo: 'Analytics → buyer profitability; Forecasting → revenue trend',
  },
  {
    n: 11,
    module: 'HR & Payroll',
    icon: 'pi-users',
    action: 'Pay the operators who built the order',
    inputs: [
      { label: 'Headcount', value: '850 employees (700 ops, 80 helpers, 70 staff)' },
      { label: 'Attendance', value: 'ZKTeco biometric CSV → punches' },
      { label: 'Payroll model', value: 'Skill-grade base + piece-rate bonus' },
    ],
    outputs: [
      { label: 'Run', value: 'PAY-2026-04 — gross BDT 84 lakh' },
      { label: 'OT', value: 'BDT 6 lakh @ 2× rate' },
      { label: 'Eid bonus', value: 'BDT 70 lakh (1 month basic)' },
      { label: 'Disbursement', value: '60% bKash, 40% bank' },
    ],
    passesTo: 'Finance → payroll JV posted to AP',
  },
  {
    n: 12,
    module: 'Compliance',
    icon: 'pi-shield',
    action: 'Track audits & buyer codes of conduct',
    inputs: [
      { label: 'Sedex SMETA', value: 'Valid till 15 Aug 2026' },
      { label: 'Accord/RSC', value: 'Building & fire safety' },
      { label: 'CAPA', value: 'Fire-door installation by 30 Sep' },
    ],
    outputs: [
      { label: 'Alerts queued', value: '30 / 15 / 7 days before each expiry' },
      { label: 'Doc vault', value: 'Per-buyer COC, audit reports, photos' },
    ],
    passesTo: 'Buyer Portal → buyer sees compliance status of their factory',
  },
  {
    n: 13,
    module: 'Buyer Portal',
    icon: 'pi-id-card',
    action: 'H&M Dhaka office logs in (read-only, scoped to BUY-001)',
    inputs: [
      { label: 'Login', value: 'katarina@hm.com (role buyer_user)' },
    ],
    outputs: [
      { label: 'Sees', value: 'WIP %, sample status, AQL result, shipment ETA' },
      { label: 'Cannot see', value: 'Other buyers, factory cost data, supplier info' },
    ],
    passesTo: 'Reduces merchandiser email volume by 60%+',
  },
  {
    n: 14,
    module: 'Analytics',
    icon: 'pi-chart-bar',
    action: 'MD reviews KPIs the morning after shipment',
    inputs: [
      { label: 'Source', value: 'Aggregates from Orders + Production + Quality + Finance' },
    ],
    outputs: [
      { label: 'Buyer profitability', value: 'H&M margin 31% (above 25% target)' },
      { label: 'Line efficiency', value: 'Line A 95%, Line B 88% — Line B retraining queued' },
      { label: 'On-time %', value: '100% for the month' },
    ],
    passesTo: 'Forecasting → trend feeds linear regression',
  },
  {
    n: 15,
    module: 'Forecasting',
    icon: 'pi-chart-line',
    action: 'Decide whether to take the next Primark order',
    inputs: [
      { label: '12-month qty history', value: 'H&M, Zara, Walmart' },
      { label: 'Capacity model', value: '10 hr/day × 26 working days' },
    ],
    outputs: [
      { label: 'Demand forecast', value: 'H&M next quarter ~56,000 pcs (+2%/mo slope)' },
      { label: 'Line booking', value: 'Aug — Line A 92%, Line B 70%' },
      { label: 'Decision', value: 'Take Primark order onto Line B at FOB +3% premium' },
    ],
    passesTo: 'Sales pipeline → quote sent within 1 day instead of 3',
  },
  {
    n: 16,
    module: 'IAM & Settings',
    icon: 'pi-cog',
    action: 'Owner controls who sees what across all 16 modules',
    inputs: [
      { label: 'Role', value: 'merchandiser, accountant, qc_lead, buyer_user, …' },
    ],
    outputs: [
      { label: 'Per-user sidebar', value: 'Built dynamically from role permissions' },
      { label: 'Tenant config', value: 'Country BD, currency BDT, timezone Asia/Dhaka' },
    ],
    passesTo: 'Every API request — JWT carries roles + tenantId + schemaName',
  },
];

@Component({
  selector: 'app-user-guide',
  standalone: true,
  imports: [CommonModule, CardModule, TagModule, TabsModule, PageIntroComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-intro
        title="User Guide — How data flows end-to-end"
        icon="pi-book"
        description="Walk through one complete H&amp;M order — from buyer setup all the way to bank realisation — and watch the data flow through every menu in this ERP."
        [bullets]="[
          'Real PO: H&amp;M PO-HM-2026-001, 18,000 T-shirts at FOB USD 5.65',
          'See exactly which field is created in which module and where it goes next',
          'Visual flow chart shows the 16-step path with hand-offs',
          'Click any step below to expand its inputs / outputs / hand-offs'
        ]"
        example="A new merchandiser can read this guide once and understand the entire ERP without anyone training her. That's the bar."
      ></app-page-intro>

      <p-card>
        <p-tabs value="flow">
          <p-tablist>
            <p-tab value="flow">Flow chart</p-tab>
            <p-tab value="steps">Step-by-step (with sample data)</p-tab>
            <p-tab value="data">Where each field travels</p-tab>
          </p-tablist>
          <p-tabpanels>
            <!-- ==================== FLOW CHART ==================== -->
            <p-tabpanel value="flow">
              <div class="space-y-4">
                <p class="text-sm text-slate-700">
                  This diagram shows the data lineage of a single H&amp;M T-shirt order through all 16 menus.
                  Solid arrows = primary data flow. Dashed arrows = read-only sees / aggregation.
                </p>

                <div class="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <svg viewBox="0 0 1200 720" class="w-full min-w-[1100px]">
                    <!-- Lane backgrounds -->
                    <rect x="0" y="0" width="1200" height="180" fill="#eff6ff" opacity="0.5" />
                    <rect x="0" y="180" width="1200" height="180" fill="#f0fdf4" opacity="0.5" />
                    <rect x="0" y="360" width="1200" height="180" fill="#fef3c7" opacity="0.4" />
                    <rect x="0" y="540" width="1200" height="180" fill="#fce7f3" opacity="0.4" />

                    <text x="10" y="20" class="fill-slate-500" font-size="11" font-weight="600">PLAN</text>
                    <text x="10" y="200" class="fill-slate-500" font-size="11" font-weight="600">SOURCE &amp; MAKE</text>
                    <text x="10" y="380" class="fill-slate-500" font-size="11" font-weight="600">SHIP &amp; INVOICE</text>
                    <text x="10" y="560" class="fill-slate-500" font-size="11" font-weight="600">REVIEW &amp; PLAN AHEAD</text>

                    <defs>
                      <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f766e" />
                      </marker>
                      <marker id="arrowDashed" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                      </marker>
                    </defs>

                    <!-- Lane 1 — PLAN -->
                    <g>
                      <rect x="40" y="60" width="170" height="80" rx="10" class="fill-white stroke-brand-600" stroke-width="2" />
                      <text x="125" y="85" text-anchor="middle" class="fill-slate-900" font-size="13" font-weight="700">1. Masters</text>
                      <text x="125" y="105" text-anchor="middle" class="fill-slate-600" font-size="11">H&amp;M, BTMA mill</text>
                      <text x="125" y="120" text-anchor="middle" class="fill-slate-600" font-size="11">+ trim suppliers</text>

                      <rect x="260" y="60" width="170" height="80" rx="10" class="fill-white stroke-brand-600" stroke-width="2" />
                      <text x="345" y="85" text-anchor="middle" class="fill-slate-900" font-size="13" font-weight="700">2. Merchandising</text>
                      <text x="345" y="105" text-anchor="middle" class="fill-slate-600" font-size="11">Style TS-CREW-180GSM</text>
                      <text x="345" y="120" text-anchor="middle" class="fill-slate-600" font-size="11">Tech-pack, T&amp;A</text>

                      <rect x="480" y="60" width="170" height="80" rx="10" class="fill-white stroke-brand-600" stroke-width="2" />
                      <text x="565" y="85" text-anchor="middle" class="fill-slate-900" font-size="13" font-weight="700">3. Orders</text>
                      <text x="565" y="105" text-anchor="middle" class="fill-slate-600" font-size="11">PO-HM-2026-001</text>
                      <text x="565" y="120" text-anchor="middle" class="fill-slate-600" font-size="11">18,000 pcs · USD 101,700</text>

                      <rect x="700" y="60" width="170" height="80" rx="10" class="fill-white stroke-brand-600" stroke-width="2" />
                      <text x="785" y="85" text-anchor="middle" class="fill-slate-900" font-size="13" font-weight="700">4. BOM &amp; Costing</text>
                      <text x="785" y="105" text-anchor="middle" class="fill-slate-600" font-size="11">4,158 kg fabric</text>
                      <text x="785" y="120" text-anchor="middle" class="fill-slate-600" font-size="11">FOB 5.65 · margin 62%</text>

                      <line x1="210" y1="100" x2="260" y2="100" stroke="#0f766e" stroke-width="2" marker-end="url(#arrow)" />
                      <line x1="430" y1="100" x2="480" y2="100" stroke="#0f766e" stroke-width="2" marker-end="url(#arrow)" />
                      <line x1="650" y1="100" x2="700" y2="100" stroke="#0f766e" stroke-width="2" marker-end="url(#arrow)" />
                    </g>

                    <!-- Lane 2 — SOURCE & MAKE -->
                    <g>
                      <rect x="40" y="240" width="170" height="80" rx="10" class="fill-white stroke-emerald-600" stroke-width="2" />
                      <text x="125" y="265" text-anchor="middle" class="fill-slate-900" font-size="13" font-weight="700">5. Procurement</text>
                      <text x="125" y="285" text-anchor="middle" class="fill-slate-600" font-size="11">PR → PO → GRN</text>
                      <text x="125" y="300" text-anchor="middle" class="fill-slate-600" font-size="11">Back-to-back LC</text>

                      <rect x="260" y="240" width="170" height="80" rx="10" class="fill-white stroke-emerald-600" stroke-width="2" />
                      <text x="345" y="265" text-anchor="middle" class="fill-slate-900" font-size="13" font-weight="700">6. Inventory</text>
                      <text x="345" y="285" text-anchor="middle" class="fill-slate-600" font-size="11">4-point: 89 pass / 3 fail</text>
                      <text x="345" y="300" text-anchor="middle" class="fill-slate-600" font-size="11">FIFO bin-card</text>

                      <rect x="480" y="240" width="170" height="80" rx="10" class="fill-white stroke-emerald-600" stroke-width="2" />
                      <text x="565" y="265" text-anchor="middle" class="fill-slate-900" font-size="13" font-weight="700">7. Production</text>
                      <text x="565" y="285" text-anchor="middle" class="fill-slate-600" font-size="11">600 bundles · 2 lines</text>
                      <text x="565" y="300" text-anchor="middle" class="fill-slate-600" font-size="11">Hourly board live</text>

                      <rect x="700" y="240" width="170" height="80" rx="10" class="fill-white stroke-emerald-600" stroke-width="2" />
                      <text x="785" y="265" text-anchor="middle" class="fill-slate-900" font-size="13" font-weight="700">8. Quality</text>
                      <text x="785" y="285" text-anchor="middle" class="fill-slate-600" font-size="11">DHU, AQL 2.5 PASS</text>
                      <text x="785" y="300" text-anchor="middle" class="fill-slate-600" font-size="11">Defect codes</text>

                      <line x1="785" y1="140" x2="125" y2="240" stroke="#0f766e" stroke-width="2" stroke-dasharray="4 3" marker-end="url(#arrow)" />
                      <line x1="210" y1="280" x2="260" y2="280" stroke="#0f766e" stroke-width="2" marker-end="url(#arrow)" />
                      <line x1="430" y1="280" x2="480" y2="280" stroke="#0f766e" stroke-width="2" marker-end="url(#arrow)" />
                      <line x1="650" y1="280" x2="700" y2="280" stroke="#0f766e" stroke-width="2" marker-end="url(#arrow)" />
                    </g>

                    <!-- Lane 3 — SHIP & INVOICE -->
                    <g>
                      <rect x="40" y="420" width="170" height="80" rx="10" class="fill-white stroke-amber-600" stroke-width="2" />
                      <text x="125" y="445" text-anchor="middle" class="fill-slate-900" font-size="13" font-weight="700">9. Shipment</text>
                      <text x="125" y="465" text-anchor="middle" class="fill-slate-600" font-size="11">PL-2026-001 · 600 ctn</text>
                      <text x="125" y="480" text-anchor="middle" class="fill-slate-600" font-size="11">EXP, GSP, B/L</text>

                      <rect x="260" y="420" width="170" height="80" rx="10" class="fill-white stroke-amber-600" stroke-width="2" />
                      <text x="345" y="445" text-anchor="middle" class="fill-slate-900" font-size="13" font-weight="700">10. Finance</text>
                      <text x="345" y="465" text-anchor="middle" class="fill-slate-600" font-size="11">INV-2026-0001 USD 101.7k</text>
                      <text x="345" y="480" text-anchor="middle" class="fill-slate-600" font-size="11">AIT 0.5% · FX gain BDT 2L</text>

                      <rect x="480" y="420" width="170" height="80" rx="10" class="fill-white stroke-amber-600" stroke-width="2" />
                      <text x="565" y="445" text-anchor="middle" class="fill-slate-900" font-size="13" font-weight="700">11. HR &amp; Payroll</text>
                      <text x="565" y="465" text-anchor="middle" class="fill-slate-600" font-size="11">PAY-2026-04 BDT 84L</text>
                      <text x="565" y="480" text-anchor="middle" class="fill-slate-600" font-size="11">Eid bonus + bKash</text>

                      <rect x="700" y="420" width="170" height="80" rx="10" class="fill-white stroke-amber-600" stroke-width="2" />
                      <text x="785" y="445" text-anchor="middle" class="fill-slate-900" font-size="13" font-weight="700">12. Compliance</text>
                      <text x="785" y="465" text-anchor="middle" class="fill-slate-600" font-size="11">Sedex, Accord, BSCI</text>
                      <text x="785" y="480" text-anchor="middle" class="fill-slate-600" font-size="11">CAPA + alerts</text>

                      <line x1="785" y1="320" x2="125" y2="420" stroke="#0f766e" stroke-width="2" stroke-dasharray="4 3" marker-end="url(#arrow)" />
                      <line x1="210" y1="460" x2="260" y2="460" stroke="#0f766e" stroke-width="2" marker-end="url(#arrow)" />
                    </g>

                    <!-- Lane 4 — REVIEW -->
                    <g>
                      <rect x="40" y="600" width="170" height="80" rx="10" class="fill-white stroke-rose-500" stroke-width="2" />
                      <text x="125" y="625" text-anchor="middle" class="fill-slate-900" font-size="13" font-weight="700">13. Buyer Portal</text>
                      <text x="125" y="645" text-anchor="middle" class="fill-slate-600" font-size="11">H&amp;M sees WIP, ETA</text>
                      <text x="125" y="660" text-anchor="middle" class="fill-slate-600" font-size="11">scoped to BUY-001</text>

                      <rect x="260" y="600" width="170" height="80" rx="10" class="fill-white stroke-rose-500" stroke-width="2" />
                      <text x="345" y="625" text-anchor="middle" class="fill-slate-900" font-size="13" font-weight="700">14. Analytics</text>
                      <text x="345" y="645" text-anchor="middle" class="fill-slate-600" font-size="11">Buyer profitability</text>
                      <text x="345" y="660" text-anchor="middle" class="fill-slate-600" font-size="11">Line efficiency, on-time</text>

                      <rect x="480" y="600" width="170" height="80" rx="10" class="fill-white stroke-rose-500" stroke-width="2" />
                      <text x="565" y="625" text-anchor="middle" class="fill-slate-900" font-size="13" font-weight="700">15. Forecasting</text>
                      <text x="565" y="645" text-anchor="middle" class="fill-slate-600" font-size="11">Demand projection 3 mo</text>
                      <text x="565" y="660" text-anchor="middle" class="fill-slate-600" font-size="11">Capacity vs booking</text>

                      <rect x="700" y="600" width="170" height="80" rx="10" class="fill-white stroke-rose-500" stroke-width="2" />
                      <text x="785" y="625" text-anchor="middle" class="fill-slate-900" font-size="13" font-weight="700">16. IAM &amp; Settings</text>
                      <text x="785" y="645" text-anchor="middle" class="fill-slate-600" font-size="11">Roles, users, tenant</text>
                      <text x="785" y="660" text-anchor="middle" class="fill-slate-600" font-size="11">JWT scopes every call</text>

                      <line x1="125" y1="500" x2="125" y2="600" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#arrowDashed)" />
                      <line x1="345" y1="500" x2="345" y2="600" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#arrowDashed)" />
                      <line x1="430" y1="640" x2="480" y2="640" stroke="#0f766e" stroke-width="2" marker-end="url(#arrow)" />
                    </g>

                    <!-- Cross-stage spans -->
                    <g>
                      <text x="950" y="370" class="fill-slate-700" font-size="12" font-weight="600">Underneath</text>
                      <text x="950" y="390" class="fill-slate-600" font-size="11">every step:</text>
                      <text x="950" y="410" class="fill-slate-600" font-size="11">• Postgres schema_per_tenant</text>
                      <text x="950" y="425" class="fill-slate-600" font-size="11">• JWT carries tenantId</text>
                      <text x="950" y="440" class="fill-slate-600" font-size="11">• SET LOCAL search_path</text>
                      <text x="950" y="455" class="fill-slate-600" font-size="11">• Audit log on writes</text>
                    </g>
                  </svg>
                </div>

                <div class="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div class="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
                    <div class="font-semibold text-blue-900">PLAN</div>
                    <div class="text-blue-800 mt-1">Masters → Merchandising → Orders → BOM</div>
                  </div>
                  <div class="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
                    <div class="font-semibold text-emerald-900">SOURCE &amp; MAKE</div>
                    <div class="text-emerald-800 mt-1">Procurement → Inventory → Production → Quality</div>
                  </div>
                  <div class="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                    <div class="font-semibold text-amber-900">SHIP &amp; INVOICE</div>
                    <div class="text-amber-800 mt-1">Shipment → Finance → HR → Compliance</div>
                  </div>
                  <div class="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm">
                    <div class="font-semibold text-rose-900">REVIEW &amp; PLAN AHEAD</div>
                    <div class="text-rose-800 mt-1">Buyer Portal → Analytics → Forecasting → Settings</div>
                  </div>
                </div>
              </div>
            </p-tabpanel>

            <!-- ==================== STEPS ==================== -->
            <p-tabpanel value="steps">
              <div class="space-y-3">
                <p class="text-sm text-slate-700">
                  Click any step to see the actual data going in, the records produced, and where each piece of data is consumed next.
                </p>
                <div *ngFor="let s of steps" class="rounded-lg border border-slate-200 bg-white">
                  <button
                    type="button"
                    class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                    (click)="toggle(s.n)"
                  >
                    <div class="flex items-center gap-3">
                      <span
                        class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white"
                      >{{ s.n }}</span>
                      <i class="pi {{ s.icon }} text-slate-500"></i>
                      <div>
                        <div class="font-semibold text-slate-900">{{ s.module }}</div>
                        <div class="text-sm text-slate-600">{{ s.action }}</div>
                      </div>
                    </div>
                    <i class="pi" [class.pi-chevron-down]="open() !== s.n" [class.pi-chevron-up]="open() === s.n"></i>
                  </button>
                  <div *ngIf="open() === s.n" class="border-t border-slate-200 bg-slate-50 px-4 py-4">
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          <i class="pi pi-arrow-down-left mr-1"></i>Inputs (what you enter)
                        </div>
                        <ul class="space-y-1 text-sm">
                          <li *ngFor="let i of s.inputs" class="flex gap-2">
                            <span class="min-w-[140px] text-slate-500">{{ i.label }}</span>
                            <span class="font-medium text-slate-900">{{ i.value }}</span>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
                          <i class="pi pi-arrow-up-right mr-1"></i>Outputs (records produced)
                        </div>
                        <ul class="space-y-1 text-sm">
                          <li *ngFor="let o of s.outputs" class="flex gap-2">
                            <span class="min-w-[140px] text-slate-500">{{ o.label }}</span>
                            <span class="font-medium text-slate-900">{{ o.value }}</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div class="mt-4 rounded border border-brand-200 bg-white p-3 text-sm text-slate-700">
                      <span class="font-medium text-brand-700">Passes to →</span> {{ s.passesTo }}
                    </div>
                    <div *ngIf="s.hint" class="mt-2 text-xs italic text-slate-500">
                      <i class="pi pi-lightbulb mr-1"></i>{{ s.hint }}
                    </div>
                  </div>
                </div>
              </div>
            </p-tabpanel>

            <!-- ==================== DATA-FIELD JOURNEY ==================== -->
            <p-tabpanel value="data">
              <div class="space-y-4">
                <p class="text-sm text-slate-700">
                  Trace any single field from where it's first entered to every screen that consumes it.
                </p>
                <div class="overflow-x-auto rounded-lg border border-slate-200">
                  <table class="min-w-full text-sm">
                    <thead class="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-700">
                      <tr>
                        <th class="px-4 py-2">Field</th>
                        <th class="px-4 py-2">First entered in</th>
                        <th class="px-4 py-2">Sample value</th>
                        <th class="px-4 py-2">Then read by</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200 bg-white">
                      <tr *ngFor="let r of fieldFlow">
                        <td class="px-4 py-2 font-medium text-slate-900">{{ r.field }}</td>
                        <td class="px-4 py-2 text-slate-700">{{ r.source }}</td>
                        <td class="px-4 py-2 font-mono text-xs text-slate-600">{{ r.value }}</td>
                        <td class="px-4 py-2 text-slate-700">{{ r.readers }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </p-card>
    </div>
  `,
})
export class UserGuideComponent {
  readonly steps = STEPS;
  readonly open = signal<number | null>(1);

  readonly fieldFlow = [
    {
      field: 'buyer.id',
      source: 'Masters / Buyers',
      value: 'BUY-001 (H&M)',
      readers: 'Orders, BOM, Procurement (back-to-back LC), Finance (AR), Buyer Portal scope, Analytics (profitability)',
    },
    {
      field: 'style.id',
      source: 'Merchandising / Styles',
      value: 'STY-2026-014 (TS-CREW-180GSM)',
      readers: 'Orders, BOM, Cutting plan, Bundles, QC, Packing list, Analytics top-styles',
    },
    {
      field: 'order.id + qty',
      source: 'Orders',
      value: 'ORD-2026-0001 · 18,000 pcs',
      readers: 'BOM auto-suggest, Cutting plan, Hourly board target, Packing list, Invoice, Buyer Portal',
    },
    {
      field: 'fabric_required_kg',
      source: 'BOM',
      value: '4,158 kg (incl. 5% wastage)',
      readers: 'Procurement PR auto-fill, Inventory expected GRN, Costing variance',
    },
    {
      field: 'GRN qty + 4-point pass',
      source: 'Inventory',
      value: '89 of 92 rolls accepted',
      readers: 'Production cutting (releases stock), Procurement claim, Finance bill payment',
    },
    {
      field: 'bundle QR + operation',
      source: 'Production',
      value: 'BND-001-A-S → neck-rib',
      readers: 'Inline QC, End-line QC, Hourly board, DHU calc',
    },
    {
      field: 'AQL pass',
      source: 'Quality',
      value: 'AQL 2.5 — 4 major / 5 allowed → PASS',
      readers: 'Shipment (only AQL-passed cartons can be packed), Buyer Portal status',
    },
    {
      field: 'B/L number + ship date',
      source: 'Shipment',
      value: 'MAEU-9842117 · 25 Jun 2026',
      readers: 'Finance (triggers AR), Buyer Portal ETA, Analytics on-time %, EXP form filing',
    },
    {
      field: 'invoice.amount + FX',
      source: 'Finance',
      value: 'USD 101,700 @ FX 110.00',
      readers: 'Bank reconciliation, AIT report, Analytics buyer profitability, Forecasting revenue trend',
    },
    {
      field: 'employee.skillGrade',
      source: 'HR — Employees',
      value: 'Grade 3 sr. operator — base BDT 14,000',
      readers: 'Payroll calc (base), OT calc (2× hourly), Production line assignment',
    },
    {
      field: 'role + tenantId',
      source: 'IAM — JWT',
      value: 'roles: [tenant_owner], tenantId: 6c9-…',
      readers: 'EVERY API request — middleware sets search_path; sidebar built from roles',
    },
  ];

  toggle(n: number): void {
    this.open.update((cur) => (cur === n ? null : n));
  }
}

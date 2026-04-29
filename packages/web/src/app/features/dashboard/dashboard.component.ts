import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import type { AnalyticsOverview } from '@org/shared-types';
import { AnalyticsApiService } from '../analytics/analytics.service';
import { PageIntroComponent } from '../../shared/page-intro.component';

interface LineRollup {
  lineCode: string;
  lineName: string;
  avgEfficiency: number;
  totalProduced: number;
  totalTarget: number;
  lastDayEfficiency: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    CardModule,
    TagModule,
    ProgressBarModule,
    ProgressSpinnerModule,
    PageIntroComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">
      <app-page-intro
        title="Dashboard"
        icon="pi-th-large"
        description="One-glance factory pulse — the MD's morning view. Pipeline value, WIP, line efficiency, on-time shipment, defect rate, and the alerts that matter today."
        [bullets]="[
          'Eight headline KPIs across orders, production, quality, shipment',
          'Live line efficiency strip + WIP funnel',
          'DHU 14-day sparkline + on-time donut',
          'Alerts: lines under 75%, DHU spikes, late shipments'
        ]"
        example="07:45 — MD opens dashboard. Line 4 is at 64% (alert), DHU yesterday spiked to 6.8% (alert), one shipment is 3 days late. He calls the sewing PM before he's even sat down."
      ></app-page-intro>

      <div *ngIf="loading()" class="flex justify-center py-16">
        <p-progressSpinner styleClass="w-10 h-10" />
      </div>

      <div *ngIf="!loading() && data() as d" class="space-y-5">
        <!-- ============ KPI Strip (8 tiles) ============ -->
        <div class="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <div class="kpi-tile">
            <div class="kpi-icon bg-brand-50 text-brand-700">
              <i class="pi pi-shopping-cart"></i>
            </div>
            <div class="kpi-label">Active Orders</div>
            <div class="kpi-value">{{ activeOrders() | number }}</div>
            <div class="kpi-sub">{{ totalOrders() }} total</div>
          </div>

          <div class="kpi-tile">
            <div class="kpi-icon bg-emerald-50 text-emerald-700">
              <i class="pi pi-dollar"></i>
            </div>
            <div class="kpi-label">Open Pipeline</div>
            <div class="kpi-value">\${{ openPipelineValue() | number:'1.0-0' }}</div>
            <div class="kpi-sub">USD FOB exposure</div>
          </div>

          <div class="kpi-tile">
            <div class="kpi-icon bg-violet-50 text-violet-700">
              <i class="pi pi-box"></i>
            </div>
            <div class="kpi-label">WIP Units</div>
            <div class="kpi-value">{{ totalWip() | number:'1.0-0' }}</div>
            <div class="kpi-sub">across all stages</div>
          </div>

          <div class="kpi-tile">
            <div class="kpi-icon bg-amber-50 text-amber-700">
              <i class="pi pi-cog"></i>
            </div>
            <div class="kpi-label">Avg Line Eff.</div>
            <div class="kpi-value">
              <span [class]="effClass(avgEfficiency())">{{ avgEfficiency() | number:'1.1-1' }}%</span>
            </div>
            <div class="kpi-sub">{{ activeLineCount() }} lines · 14d</div>
          </div>

          <div class="kpi-tile">
            <div class="kpi-icon bg-sky-50 text-sky-700">
              <i class="pi pi-send"></i>
            </div>
            <div class="kpi-label">On-Time %</div>
            <div class="kpi-value">
              <span [class]="onTimeClass()">{{ d.onTimeShipment.onTimePercent | number:'1.1-1' }}%</span>
            </div>
            <div class="kpi-sub">{{ d.onTimeShipment.onTime }}/{{ d.onTimeShipment.totalShipped }} shipped</div>
          </div>

          <div class="kpi-tile">
            <div class="kpi-icon bg-rose-50 text-rose-700">
              <i class="pi pi-exclamation-triangle"></i>
            </div>
            <div class="kpi-label">Avg Delay</div>
            <div class="kpi-value">{{ d.onTimeShipment.averageDelayDays | number:'1.1-1' }}d</div>
            <div class="kpi-sub">{{ d.onTimeShipment.late }} late</div>
          </div>

          <div class="kpi-tile">
            <div class="kpi-icon bg-fuchsia-50 text-fuchsia-700">
              <i class="pi pi-check-circle"></i>
            </div>
            <div class="kpi-label">Latest DHU</div>
            <div class="kpi-value">
              <span [class]="dhuClass(latestDhu())">{{ latestDhu() | number:'1.2-2' }}%</span>
            </div>
            <div class="kpi-sub">{{ dhuDirectionLabel() }}</div>
          </div>

          <div class="kpi-tile">
            <div class="kpi-icon bg-gold-500/10 text-gold-600">
              <i class="pi pi-star"></i>
            </div>
            <div class="kpi-label">Top Buyer</div>
            <div class="kpi-value text-base">{{ topBuyerName() || '—' }}</div>
            <div class="kpi-sub">\${{ topBuyerRevenue() | number:'1.0-0' }} · {{ topBuyerMargin() | number:'1.1-1' }}%</div>
          </div>
        </div>

        <!-- ============ Alerts Bar ============ -->
        <div *ngIf="alerts().length > 0" class="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <div class="flex items-center gap-2 text-sm font-semibold text-amber-900 px-2 mb-2">
            <i class="pi pi-bell"></i>
            Today's alerts
            <span class="ml-auto text-xs font-normal text-amber-700">{{ alerts().length }} item(s) need attention</span>
          </div>
          <div class="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            <div
              *ngFor="let a of alerts()"
              class="flex items-start gap-2 rounded-lg bg-white border border-amber-200 px-3 py-2"
            >
              <i class="pi text-sm mt-0.5" [class]="a.icon" [style.color]="a.color"></i>
              <div class="flex-1">
                <div class="text-xs font-semibold text-ink-900">{{ a.title }}</div>
                <div class="text-[11px] text-ink-500">{{ a.detail }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- ============ Production Monitoring ============ -->
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <!-- Line efficiency strip -->
          <p-card styleClass="col-span-2" header="Production Lines — last 14 days">
            <ng-container *ngIf="lineRollup().length > 0; else noLines">
              <div class="space-y-3">
                <div *ngFor="let l of lineRollup()" class="grid grid-cols-12 items-center gap-2 text-sm">
                  <div class="col-span-3">
                    <div class="font-medium text-ink-900">{{ l.lineName }}</div>
                    <div class="font-mono text-[11px] text-ink-500">{{ l.lineCode }}</div>
                  </div>
                  <div class="col-span-6">
                    <div class="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
                      <div
                        class="h-full rounded-full transition-[width] duration-300"
                        [style.width.%]="capPct(l.avgEfficiency)"
                        [style.background]="effBar(l.avgEfficiency)"
                      ></div>
                    </div>
                    <div class="mt-1 flex justify-between text-[11px] text-ink-500">
                      <span>{{ l.totalProduced | number:'1.0-0' }} / {{ l.totalTarget | number:'1.0-0' }} pcs</span>
                      <span>last day {{ l.lastDayEfficiency | number:'1.1-1' }}%</span>
                    </div>
                  </div>
                  <div class="col-span-3 text-right">
                    <p-tag
                      [severity]="effSeverity(l.avgEfficiency)"
                      [value]="(l.avgEfficiency | number:'1.1-1') + '%'"
                    />
                  </div>
                </div>
              </div>
            </ng-container>
            <ng-template #noLines>
              <div class="py-8 text-center text-sm text-ink-500">No hourly production logs in window.</div>
            </ng-template>
          </p-card>

          <!-- WIP funnel -->
          <p-card header="WIP Funnel">
            <div class="space-y-3">
              <div *ngFor="let w of d.wipByStage; let i = index">
                <div class="flex items-center justify-between text-sm">
                  <span class="flex items-center gap-2 capitalize text-ink-700">
                    <span
                      class="h-1.5 w-1.5 rounded-full"
                      [style.background]="stageColor(i)"
                    ></span>
                    {{ w.stage }}
                  </span>
                  <span class="font-medium text-ink-900">{{ w.qty | number:'1.0-0' }}</span>
                </div>
                <div class="mt-1 h-2 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    class="h-full rounded-full"
                    [style.width.%]="wipPct(w.qty)"
                    [style.background]="stageColor(i)"
                  ></div>
                </div>
                <div *ngIf="w.estimatedValueUsd > 0" class="mt-0.5 text-[11px] text-ink-500">
                  est. \${{ w.estimatedValueUsd | number:'1.0-0' }}
                </div>
              </div>
              <div *ngIf="d.wipByStage.length === 0" class="py-6 text-center text-sm text-ink-500">No WIP yet.</div>
            </div>
          </p-card>
        </div>

        <!-- ============ Quality & Shipment ============ -->
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <!-- DHU sparkline -->
          <p-card styleClass="col-span-2" header="DHU Trend (Defects per 100 Units inspected) — 14 days">
            <ng-container *ngIf="d.dhuTrend.length > 1; else noDhu">
              <svg [attr.viewBox]="'0 0 ' + dhuChart().w + ' ' + dhuChart().h" class="w-full" [style.height.px]="160">
                <!-- 5% threshold line -->
                <line
                  [attr.x1]="0"
                  [attr.x2]="dhuChart().w"
                  [attr.y1]="dhuChart().thresholdY"
                  [attr.y2]="dhuChart().thresholdY"
                  stroke="#fbbf24"
                  stroke-width="1"
                  stroke-dasharray="3 3"
                />
                <!-- area fill -->
                <path [attr.d]="dhuChart().areaPath" fill="rgba(244, 63, 94, 0.08)" />
                <!-- line -->
                <path [attr.d]="dhuChart().linePath" fill="none" stroke="#e11d48" stroke-width="2" />
                <!-- points -->
                <circle
                  *ngFor="let p of dhuChart().points"
                  [attr.cx]="p.x"
                  [attr.cy]="p.y"
                  r="3"
                  fill="#e11d48"
                />
                <!-- value labels for last point -->
                <text
                  [attr.x]="dhuChart().points[dhuChart().points.length - 1].x - 4"
                  [attr.y]="dhuChart().points[dhuChart().points.length - 1].y - 8"
                  text-anchor="end"
                  font-size="11"
                  fill="#0f172a"
                  font-weight="600"
                >{{ latestDhu() | number:'1.2-2' }}%</text>
              </svg>
              <div class="mt-2 flex justify-between text-[11px] text-ink-500">
                <span>{{ d.dhuTrend[0].logDate }}</span>
                <span><span class="inline-block h-1.5 w-3 rounded-sm bg-amber-400 align-middle"></span> 5% threshold</span>
                <span>{{ d.dhuTrend[d.dhuTrend.length - 1].logDate }}</span>
              </div>
            </ng-container>
            <ng-template #noDhu>
              <div class="py-12 text-center text-sm text-ink-500">Need more QC records to render trend.</div>
            </ng-template>
          </p-card>

          <!-- On-time donut -->
          <p-card header="On-Time Shipment">
            <div class="flex flex-col items-center justify-center py-2">
              <svg viewBox="0 0 120 120" class="h-32 w-32">
                <circle cx="60" cy="60" r="48" fill="none" stroke="#e2e8f0" stroke-width="14" />
                <circle
                  cx="60" cy="60" r="48" fill="none"
                  [attr.stroke]="onTimeColor()"
                  stroke-width="14"
                  stroke-linecap="round"
                  [attr.stroke-dasharray]="onTimeArc()"
                  transform="rotate(-90 60 60)"
                />
                <text x="60" y="58" text-anchor="middle" font-size="20" font-weight="700" fill="#0f172a">
                  {{ d.onTimeShipment.onTimePercent | number:'1.0-0' }}%
                </text>
                <text x="60" y="76" text-anchor="middle" font-size="10" fill="#64748b">on time</text>
              </svg>
              <div class="mt-3 grid w-full grid-cols-2 gap-2 text-center text-xs">
                <div class="rounded-md bg-emerald-50 py-2">
                  <div class="font-bold text-emerald-700">{{ d.onTimeShipment.onTime }}</div>
                  <div class="text-emerald-600">on time</div>
                </div>
                <div class="rounded-md bg-rose-50 py-2">
                  <div class="font-bold text-rose-700">{{ d.onTimeShipment.late }}</div>
                  <div class="text-rose-600">late</div>
                </div>
              </div>
            </div>
          </p-card>
        </div>

        <!-- ============ Order pipeline + Top buyers ============ -->
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <p-card header="Order Pipeline by Status">
            <div class="space-y-3">
              <div *ngFor="let p of d.pipeline">
                <div class="flex items-center justify-between text-sm">
                  <span class="flex items-center gap-2 capitalize text-ink-700">
                    <span
                      class="h-1.5 w-1.5 rounded-full"
                      [style.background]="statusColor(p.status)"
                    ></span>
                    {{ p.status.replace('_', ' ') }}
                  </span>
                  <span class="text-ink-500">
                    {{ p.count }} ord · \${{ p.totalValueUsd | number:'1.0-0' }}
                  </span>
                </div>
                <div class="mt-1 h-2 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    class="h-full rounded-full"
                    [style.width.%]="pipelinePct(p.totalValueUsd)"
                    [style.background]="statusColor(p.status)"
                  ></div>
                </div>
              </div>
              <div *ngIf="d.pipeline.length === 0" class="py-6 text-center text-sm text-ink-500">No orders yet.</div>
            </div>
          </p-card>

          <p-card header="Top Buyers (by Revenue)">
            <div class="space-y-2">
              <div *ngFor="let b of topBuyers(); let i = index" class="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-ink-50">
                <div
                  class="flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold"
                  [style.background]="rankBg(i)"
                  [style.color]="rankFg(i)"
                >
                  {{ i + 1 }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="truncate text-sm font-medium text-ink-900">{{ b.buyerName }}</div>
                  <div class="font-mono text-[11px] text-ink-500">{{ b.buyerCode }} · {{ b.totalOrders }} orders</div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-semibold text-ink-900">\${{ b.totalRevenueUsd | number:'1.0-0' }}</div>
                  <p-tag
                    [severity]="marginSeverity(b.marginPercent)"
                    [value]="(b.marginPercent | number:'1.1-1') + '%'"
                  />
                </div>
              </div>
              <div *ngIf="topBuyers().length === 0" class="py-6 text-center text-sm text-ink-500">No buyer data.</div>
            </div>
          </p-card>
        </div>

        <!-- ============ Top styles ============ -->
        <p-card header="Top Styles in Pipeline">
          <div class="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            <div
              *ngFor="let s of d.topStyles.slice(0, 6); let i = index"
              class="rounded-lg border border-ink-200 bg-white p-3 hover:border-brand-300 hover:shadow-soft transition"
            >
              <div class="flex items-start justify-between">
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-semibold text-ink-900">{{ s.styleName }}</div>
                  <div class="mt-0.5 truncate font-mono text-[11px] text-ink-500">{{ s.styleCode }}</div>
                </div>
                <span class="text-[11px] font-semibold text-brand-700">#{{ i + 1 }}</span>
              </div>
              <div class="mt-2 flex items-end justify-between">
                <div>
                  <div class="text-[11px] text-ink-500">{{ s.buyerName || '—' }}</div>
                  <div class="text-[11px] text-ink-500">{{ s.totalQty | number:'1.0-0' }} pcs</div>
                </div>
                <div class="text-sm font-bold text-ink-900">\${{ s.totalValueUsd | number:'1.0-0' }}</div>
              </div>
            </div>
            <div *ngIf="d.topStyles.length === 0" class="col-span-full py-6 text-center text-sm text-ink-500">No styles yet.</div>
          </div>
        </p-card>
      </div>
    </div>
  `,
  styles: [
    `
      :host ::ng-deep .p-card {
        border: 1px solid #e2e8f0;
      }
      .kpi-tile {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 0.875rem 1rem;
        box-shadow: 0 1px 2px 0 rgba(15, 23, 42, 0.04);
        transition: box-shadow 150ms ease, border-color 150ms ease, transform 150ms ease;
      }
      .kpi-tile:hover {
        border-color: #cbd5e1;
        box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.06);
        transform: translateY(-1px);
      }
      .kpi-icon {
        display: inline-flex;
        height: 1.75rem;
        width: 1.75rem;
        align-items: center;
        justify-content: center;
        border-radius: 0.5rem;
        font-size: 0.75rem;
      }
      .kpi-label {
        margin-top: 0.5rem;
        font-size: 0.6875rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #64748b;
      }
      .kpi-value {
        margin-top: 0.125rem;
        font-size: 1.375rem;
        font-weight: 700;
        color: #0f172a;
        line-height: 1.2;
      }
      .kpi-sub {
        margin-top: 0.125rem;
        font-size: 0.6875rem;
        color: #94a3b8;
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(AnalyticsApiService);

  readonly loading = signal(true);
  readonly data = signal<AnalyticsOverview | null>(null);

  // ===== Order metrics =====
  readonly totalOrders = computed(() =>
    (this.data()?.pipeline ?? []).reduce((a, p) => a + p.count, 0),
  );
  readonly activeOrders = computed(() =>
    (this.data()?.pipeline ?? [])
      .filter((p) => ['draft', 'confirmed', 'in_production'].includes(p.status))
      .reduce((a, p) => a + p.count, 0),
  );
  readonly openPipelineValue = computed(() =>
    (this.data()?.pipeline ?? [])
      .filter((p) => ['draft', 'confirmed', 'in_production'].includes(p.status))
      .reduce((a, p) => a + p.totalValueUsd, 0),
  );

  // ===== Production metrics =====
  readonly lineRollup = computed<LineRollup[]>(() => {
    const pts = this.data()?.efficiency ?? [];
    if (pts.length === 0) return [];
    const byLine = new Map<string, LineRollup & { lastDate: string | null }>();
    for (const p of pts) {
      const cur = byLine.get(p.lineCode) ?? {
        lineCode: p.lineCode,
        lineName: p.lineName,
        avgEfficiency: 0,
        totalProduced: 0,
        totalTarget: 0,
        lastDayEfficiency: 0,
        lastDate: null as string | null,
      };
      cur.totalProduced += p.producedPcs;
      cur.totalTarget += p.targetPcs;
      if (cur.lastDate === null || p.logDate >= cur.lastDate) {
        cur.lastDate = p.logDate;
        cur.lastDayEfficiency = p.efficiencyPercent;
      }
      byLine.set(p.lineCode, cur);
    }
    return Array.from(byLine.values())
      .map((l) => ({
        lineCode: l.lineCode,
        lineName: l.lineName,
        totalProduced: l.totalProduced,
        totalTarget: l.totalTarget,
        avgEfficiency:
          l.totalTarget > 0
            ? Math.round((l.totalProduced / l.totalTarget) * 1000) / 10
            : 0,
        lastDayEfficiency: l.lastDayEfficiency,
      }))
      .sort((a, b) => b.avgEfficiency - a.avgEfficiency);
  });
  readonly avgEfficiency = computed(() => {
    const lines = this.lineRollup();
    if (lines.length === 0) return 0;
    const sum = lines.reduce((a, l) => a + l.avgEfficiency, 0);
    return Math.round((sum / lines.length) * 10) / 10;
  });
  readonly activeLineCount = computed(() => this.lineRollup().length);
  readonly totalWip = computed(() =>
    (this.data()?.wipByStage ?? []).reduce((a, w) => a + w.qty, 0),
  );

  // ===== Quality metrics =====
  readonly latestDhu = computed(() => {
    const t = this.data()?.dhuTrend ?? [];
    return t.length > 0 ? t[t.length - 1].dhu : 0;
  });
  readonly previousDhu = computed(() => {
    const t = this.data()?.dhuTrend ?? [];
    return t.length > 1 ? t[t.length - 2].dhu : 0;
  });
  readonly dhuDirectionLabel = computed(() => {
    const cur = this.latestDhu();
    const prev = this.previousDhu();
    if (prev === 0 && cur === 0) return '7-day trend';
    const diff = cur - prev;
    if (Math.abs(diff) < 0.05) return 'flat vs yesterday';
    return diff > 0
      ? `↑ ${diff.toFixed(2)}% vs yesterday`
      : `↓ ${Math.abs(diff).toFixed(2)}% vs yesterday`;
  });

  // ===== Buyer metrics =====
  readonly topBuyers = computed(() =>
    (this.data()?.buyerProfitability ?? []).slice(0, 5),
  );
  readonly topBuyerName = computed(() => this.topBuyers()[0]?.buyerName ?? '');
  readonly topBuyerRevenue = computed(
    () => this.topBuyers()[0]?.totalRevenueUsd ?? 0,
  );
  readonly topBuyerMargin = computed(
    () => this.topBuyers()[0]?.marginPercent ?? 0,
  );

  // ===== Alerts =====
  readonly alerts = computed(() => {
    const out: { icon: string; color: string; title: string; detail: string }[] =
      [];
    for (const l of this.lineRollup()) {
      if (l.avgEfficiency < 75 && l.totalTarget > 0) {
        out.push({
          icon: 'pi-exclamation-circle',
          color: '#dc2626',
          title: `${l.lineName} below target`,
          detail: `14d avg ${l.avgEfficiency.toFixed(1)}% — investigate operator skill / WIP feed`,
        });
      }
    }
    if (this.latestDhu() > 5) {
      out.push({
        icon: 'pi-times-circle',
        color: '#dc2626',
        title: 'DHU above 5% threshold',
        detail: `Latest reading ${this.latestDhu().toFixed(2)}% — review top defect reason`,
      });
    }
    const onTime = this.data()?.onTimeShipment;
    if (onTime && onTime.late > 0) {
      out.push({
        icon: 'pi-clock',
        color: '#d97706',
        title: `${onTime.late} late shipment(s)`,
        detail: `Avg delay ${onTime.averageDelayDays.toFixed(1)} days — call forwarder + buyer`,
      });
    }
    return out;
  });

  // ===== DHU sparkline =====
  readonly dhuChart = computed(() => {
    const w = 600;
    const h = 140;
    const padX = 8;
    const padY = 12;
    const trend = this.data()?.dhuTrend ?? [];
    if (trend.length < 2) {
      return {
        w,
        h,
        points: [],
        linePath: '',
        areaPath: '',
        thresholdY: h - padY,
      };
    }
    const maxY = Math.max(5, ...trend.map((p) => p.dhu)) * 1.15;
    const stepX = (w - padX * 2) / (trend.length - 1);
    const yFor = (v: number) => h - padY - (v / maxY) * (h - padY * 2);
    const points = trend.map((p, i) => ({ x: padX + i * stepX, y: yFor(p.dhu) }));
    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`)
      .join(' ');
    const areaPath = `${linePath} L${points[points.length - 1].x},${h - padY} L${points[0].x},${h - padY} Z`;
    const thresholdY = yFor(5);
    return { w, h, points, linePath, areaPath, thresholdY };
  });

  // ===== Donut =====
  readonly onTimeArc = computed(() => {
    const pct = this.data()?.onTimeShipment.onTimePercent ?? 0;
    const C = 2 * Math.PI * 48;
    return `${(pct / 100) * C} ${C}`;
  });
  readonly onTimeColor = computed(() => {
    const pct = this.data()?.onTimeShipment.onTimePercent ?? 0;
    if (pct >= 95) return '#10b981';
    if (pct >= 80) return '#f59e0b';
    return '#e11d48';
  });
  readonly onTimeClass = computed(() => {
    const pct = this.data()?.onTimeShipment.onTimePercent ?? 0;
    if (pct >= 95) return 'text-emerald-600';
    if (pct >= 80) return 'text-amber-600';
    return 'text-rose-600';
  });

  ngOnInit(): void {
    this.api.getOverview().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // ===== Helpers =====
  capPct(v: number): number {
    return Math.min(100, Math.max(0, v));
  }
  pipelinePct(value: number): number {
    const max = (this.data()?.pipeline ?? []).reduce(
      (m, p) => Math.max(m, p.totalValueUsd),
      0,
    );
    return max > 0 ? Math.round((value / max) * 100) : 0;
  }
  wipPct(qty: number): number {
    const max = (this.data()?.wipByStage ?? []).reduce(
      (m, w) => Math.max(m, w.qty),
      0,
    );
    return max > 0 ? Math.round((qty / max) * 100) : 0;
  }
  effSeverity(eff: number): 'success' | 'warn' | 'danger' {
    if (eff >= 80) return 'success';
    if (eff >= 65) return 'warn';
    return 'danger';
  }
  effClass(eff: number): string {
    if (eff >= 80) return 'text-emerald-600';
    if (eff >= 65) return 'text-amber-600';
    return 'text-rose-600';
  }
  effBar(eff: number): string {
    if (eff >= 80) return 'linear-gradient(90deg, #10b981, #059669)';
    if (eff >= 65) return 'linear-gradient(90deg, #f59e0b, #d97706)';
    return 'linear-gradient(90deg, #f43f5e, #e11d48)';
  }
  dhuClass(dhu: number): string {
    if (dhu <= 3) return 'text-emerald-600';
    if (dhu <= 5) return 'text-amber-600';
    return 'text-rose-600';
  }
  marginSeverity(m: number): 'success' | 'warn' | 'danger' {
    if (m >= 15) return 'success';
    if (m >= 5) return 'warn';
    return 'danger';
  }
  statusColor(s: string): string {
    return (
      {
        draft: '#94a3b8',
        confirmed: '#3b82f6',
        in_production: '#f59e0b',
        shipped: '#10b981',
        closed: '#475569',
        cancelled: '#e11d48',
      }[s] ?? '#94a3b8'
    );
  }
  stageColor(i: number): string {
    return ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'][i % 4];
  }
  rankBg(i: number): string {
    return ['#fef3c7', '#e0e7ff', '#dbeafe', '#f1f5f9', '#f1f5f9'][i] ?? '#f1f5f9';
  }
  rankFg(i: number): string {
    return ['#b45309', '#4338ca', '#1d4ed8', '#475569', '#475569'][i] ?? '#475569';
  }
}

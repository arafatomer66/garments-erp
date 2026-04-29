import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ProgressBarModule } from 'primeng/progressbar';
import type { AnalyticsOverview } from '@org/shared-types';
import { AnalyticsApiService } from './analytics.service';

interface LineSeries {
  lineCode: string;
  lineName: string;
  avgEfficiency: number;
  totalProduced: number;
  totalTarget: number;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    CardModule,
    TableModule,
    TagModule,
    ProgressSpinnerModule,
    ProgressBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">Analytics</h1>

      <div *ngIf="loading()" class="flex justify-center py-12">
        <p-progressSpinner styleClass="w-8 h-8" />
      </div>

      <div *ngIf="!loading() && data() as d" class="space-y-4">
        <!-- KPI tiles -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
            <div class="text-xs font-medium text-emerald-700 uppercase">On-time Shipment</div>
            <div class="text-2xl font-bold text-emerald-900 mt-1">{{ d.onTimeShipment.onTimePercent | number:'1.1-1' }}%</div>
            <div class="text-xs text-emerald-600 mt-1">
              {{ d.onTimeShipment.onTime }} on time / {{ d.onTimeShipment.totalShipped }} shipped
            </div>
          </div>
          <div class="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <div class="text-xs font-medium text-amber-700 uppercase">Average Delay</div>
            <div class="text-2xl font-bold text-amber-900 mt-1">{{ d.onTimeShipment.averageDelayDays | number:'1.1-1' }}d</div>
            <div class="text-xs text-amber-600 mt-1">{{ d.onTimeShipment.late }} late shipments</div>
          </div>
          <div class="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div class="text-xs font-medium text-blue-700 uppercase">Open Pipeline</div>
            <div class="text-2xl font-bold text-blue-900 mt-1">\${{ openPipelineValue() | number:'1.0-0' }}</div>
            <div class="text-xs text-blue-600 mt-1">{{ openPipelineOrders() }} active orders</div>
          </div>
          <div class="rounded-lg bg-violet-50 border border-violet-200 p-4">
            <div class="text-xs font-medium text-violet-700 uppercase">Latest DHU</div>
            <div class="text-2xl font-bold text-violet-900 mt-1">{{ latestDhu() | number:'1.2-2' }}%</div>
            <div class="text-xs text-violet-600 mt-1">7-day trend</div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Order pipeline by status -->
          <p-card header="Order Pipeline by Status">
            <div class="space-y-2">
              <div *ngFor="let p of d.pipeline" class="space-y-1">
                <div class="flex items-center justify-between text-sm">
                  <span class="font-medium capitalize text-slate-700">{{ p.status.replace('_', ' ') }}</span>
                  <span class="text-slate-600">{{ p.count }} orders · \${{ p.totalValueUsd | number:'1.0-0' }}</span>
                </div>
                <p-progressBar
                  [value]="pipelinePercent(p.totalValueUsd)"
                  [showValue]="false"
                  styleClass="!h-2"
                />
              </div>
              <div *ngIf="d.pipeline.length === 0" class="text-sm text-slate-500 text-center py-4">No orders yet.</div>
            </div>
          </p-card>

          <!-- WIP by stage -->
          <p-card header="WIP by Production Stage">
            <p-table [value]="d.wipByStage" stripedRows>
              <ng-template pTemplate="header">
                <tr>
                  <th>Stage</th>
                  <th class="text-right">Quantity (pcs)</th>
                  <th class="text-right">Est. Value (USD)</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-w>
                <tr>
                  <td class="capitalize font-medium text-slate-700">{{ w.stage }}</td>
                  <td class="text-right">{{ w.qty | number:'1.0-0' }}</td>
                  <td class="text-right">{{ w.estimatedValueUsd > 0 ? '$' + (w.estimatedValueUsd | number:'1.0-0') : '—' }}</td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr><td colspan="3" class="text-center text-slate-500 py-4">No WIP data.</td></tr>
              </ng-template>
            </p-table>
          </p-card>
        </div>

        <!-- Line efficiency rollup -->
        <p-card header="Line Efficiency (last 14 days)">
          <p-table [value]="lineRollup()" stripedRows>
            <ng-template pTemplate="header">
              <tr>
                <th>Line</th>
                <th>Name</th>
                <th class="text-right">Target</th>
                <th class="text-right">Produced</th>
                <th class="text-right">Avg Efficiency</th>
                <th>Performance</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-l>
              <tr>
                <td class="font-mono text-xs">{{ l.lineCode }}</td>
                <td>{{ l.lineName }}</td>
                <td class="text-right">{{ l.totalTarget | number:'1.0-0' }}</td>
                <td class="text-right">{{ l.totalProduced | number:'1.0-0' }}</td>
                <td class="text-right">
                  <p-tag
                    [severity]="effSeverity(l.avgEfficiency)"
                    [value]="(l.avgEfficiency | number:'1.1-1') + '%'"
                  />
                </td>
                <td><p-progressBar [value]="capPct(l.avgEfficiency)" styleClass="!h-2" [showValue]="false" /></td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="6" class="text-center text-slate-500 py-4">No production logs in window.</td></tr>
            </ng-template>
          </p-table>
        </p-card>

        <!-- DHU trend table -->
        <p-card header="DHU Trend (last 14 days)">
          <p-table [value]="d.dhuTrend" stripedRows>
            <ng-template pTemplate="header">
              <tr>
                <th>Date</th>
                <th class="text-right">Inspected</th>
                <th class="text-right">Defects</th>
                <th class="text-right">DHU %</th>
                <th>Trend</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-d>
              <tr>
                <td>{{ d.logDate }}</td>
                <td class="text-right">{{ d.inspected | number:'1.0-0' }}</td>
                <td class="text-right">{{ d.defects | number:'1.0-0' }}</td>
                <td class="text-right">
                  <p-tag
                    [severity]="dhuSeverity(d.dhu)"
                    [value]="(d.dhu | number:'1.2-2') + '%'"
                  />
                </td>
                <td><p-progressBar [value]="dhuPct(d.dhu)" styleClass="!h-2" [showValue]="false" /></td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="5" class="text-center text-slate-500 py-4">No QC records in window.</td></tr>
            </ng-template>
          </p-table>
        </p-card>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Buyer profitability -->
          <p-card header="Buyer Profitability (Top 20)">
            <p-table [value]="d.buyerProfitability" stripedRows scrollable scrollHeight="360px">
              <ng-template pTemplate="header">
                <tr>
                  <th>Buyer</th>
                  <th class="text-right">Orders</th>
                  <th class="text-right">Revenue</th>
                  <th class="text-right">Margin %</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-b>
                <tr>
                  <td>
                    <div class="font-medium text-slate-700">{{ b.buyerName }}</div>
                    <div class="text-xs font-mono text-slate-500">{{ b.buyerCode }}</div>
                  </td>
                  <td class="text-right">{{ b.totalOrders }}</td>
                  <td class="text-right">\${{ b.totalRevenueUsd | number:'1.0-0' }}</td>
                  <td class="text-right">
                    <p-tag
                      [severity]="marginSeverity(b.marginPercent)"
                      [value]="(b.marginPercent | number:'1.1-1') + '%'"
                    />
                  </td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr><td colspan="4" class="text-center text-slate-500 py-4">No buyer data.</td></tr>
              </ng-template>
            </p-table>
          </p-card>

          <!-- Top styles -->
          <p-card header="Top Styles by Order Value">
            <p-table [value]="d.topStyles" stripedRows scrollable scrollHeight="360px">
              <ng-template pTemplate="header">
                <tr>
                  <th>Style</th>
                  <th>Buyer</th>
                  <th class="text-right">Qty</th>
                  <th class="text-right">Value</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-s>
                <tr>
                  <td>
                    <div class="font-medium text-slate-700">{{ s.styleName }}</div>
                    <div class="text-xs font-mono text-slate-500">{{ s.styleCode }}</div>
                  </td>
                  <td class="text-sm">{{ s.buyerName || '—' }}</td>
                  <td class="text-right">{{ s.totalQty | number:'1.0-0' }}</td>
                  <td class="text-right font-medium">\${{ s.totalValueUsd | number:'1.0-0' }}</td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr><td colspan="4" class="text-center text-slate-500 py-4">No styles yet.</td></tr>
              </ng-template>
            </p-table>
          </p-card>
        </div>
      </div>
    </div>
  `,
})
export class AnalyticsComponent implements OnInit {
  private readonly api = inject(AnalyticsApiService);

  readonly loading = signal(true);
  readonly data = signal<AnalyticsOverview | null>(null);

  readonly maxPipelineValue = computed(() => {
    const d = this.data();
    if (!d) return 0;
    return d.pipeline.reduce((max, p) => Math.max(max, p.totalValueUsd), 0);
  });

  readonly openPipelineValue = computed(() => {
    const d = this.data();
    if (!d) return 0;
    return d.pipeline
      .filter((p) => ['draft', 'confirmed', 'in_production'].includes(p.status))
      .reduce((sum, p) => sum + p.totalValueUsd, 0);
  });

  readonly openPipelineOrders = computed(() => {
    const d = this.data();
    if (!d) return 0;
    return d.pipeline
      .filter((p) => ['draft', 'confirmed', 'in_production'].includes(p.status))
      .reduce((sum, p) => sum + p.count, 0);
  });

  readonly latestDhu = computed(() => {
    const d = this.data();
    if (!d || d.dhuTrend.length === 0) return 0;
    return d.dhuTrend[d.dhuTrend.length - 1].dhu;
  });

  readonly lineRollup = computed<LineSeries[]>(() => {
    const d = this.data();
    if (!d) return [];
    const byLine = new Map<string, LineSeries>();
    for (const p of d.efficiency) {
      const cur = byLine.get(p.lineCode) ?? {
        lineCode: p.lineCode,
        lineName: p.lineName,
        avgEfficiency: 0,
        totalProduced: 0,
        totalTarget: 0,
      };
      cur.totalProduced += p.producedPcs;
      cur.totalTarget += p.targetPcs;
      byLine.set(p.lineCode, cur);
    }
    return Array.from(byLine.values())
      .map((l) => ({
        ...l,
        avgEfficiency: l.totalTarget > 0 ? Math.round((l.totalProduced / l.totalTarget) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.avgEfficiency - a.avgEfficiency);
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

  pipelinePercent(value: number): number {
    const max = this.maxPipelineValue();
    return max > 0 ? Math.round((value / max) * 100) : 0;
  }

  capPct(v: number): number {
    return Math.min(100, Math.max(0, v));
  }

  effSeverity(eff: number): 'success' | 'warn' | 'danger' {
    if (eff >= 75) return 'success';
    if (eff >= 50) return 'warn';
    return 'danger';
  }

  dhuSeverity(dhu: number): 'success' | 'warn' | 'danger' {
    if (dhu <= 3) return 'success';
    if (dhu <= 7) return 'warn';
    return 'danger';
  }

  dhuPct(dhu: number): number {
    return Math.min(100, dhu * 10);
  }

  marginSeverity(margin: number): 'success' | 'warn' | 'danger' {
    if (margin >= 15) return 'success';
    if (margin >= 5) return 'warn';
    return 'danger';
  }
}

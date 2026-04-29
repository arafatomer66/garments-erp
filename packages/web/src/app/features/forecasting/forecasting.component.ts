import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TabsModule } from 'primeng/tabs';
import type { CapacityUtilizationRow, ForecastingOverview, OrderBacklogRow } from '@org/shared-types';
import { ForecastingApiService } from './forecasting.service';
import { PageIntroComponent } from '../../shared/page-intro.component';

@Component({
  selector: 'app-forecasting',
  standalone: true,
  imports: [
    CommonModule, DecimalPipe,
    CardModule, TableModule, TagModule, ProgressBarModule, ProgressSpinnerModule, TabsModule,
    PageIntroComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-intro
        title="Forecasting"
        icon="pi-chart-line"
        description="Demand projection (linear regression), capacity utilisation per line, and order-backlog risk flags. Use it to decide whether to take that next Primark order."
        [bullets]="[
          '12-month qty history → 3-month forward forecast per buyer',
          'Line monthly capacity (10 hr × 26 days)',
          'Booked vs available capacity for next 30 days',
          'Late / tight / on-track risk flag per order'
        ]"
        example="Line A 92% booked for Aug; Line B 70%. Sales takes new Primark order onto Line B at FOB +3% premium for tight schedule."
      ></app-page-intro>

      <div *ngIf="loading()" class="flex justify-center py-12">
        <p-progressSpinner styleClass="w-8 h-8" />
      </div>

      <div *ngIf="!loading() && data() as d" class="space-y-4">
        <!-- KPI summary -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="rounded-lg bg-slate-50 border border-slate-200 p-4">
            <div class="text-xs font-medium text-slate-600 uppercase">Monthly Capacity</div>
            <div class="text-2xl font-bold text-slate-900 mt-1">{{ d.totalMonthlyCapacityPcs | number:'1.0-0' }} pcs</div>
            <div class="text-xs text-slate-500 mt-1">26 working days × 10 hr/day across active lines</div>
          </div>
          <div class="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div class="text-xs font-medium text-blue-700 uppercase">Booked Next 30 Days</div>
            <div class="text-2xl font-bold text-blue-900 mt-1">{{ d.totalBookedNext30dPcs | number:'1.0-0' }} pcs</div>
            <div class="text-xs text-blue-600 mt-1">Active line assignments with delivery in window</div>
          </div>
          <div
            class="rounded-lg border p-4"
            [class.bg-emerald-50]="utilSeverity() === 'success'"
            [class.border-emerald-200]="utilSeverity() === 'success'"
            [class.bg-amber-50]="utilSeverity() === 'warn'"
            [class.border-amber-200]="utilSeverity() === 'warn'"
            [class.bg-red-50]="utilSeverity() === 'danger'"
            [class.border-red-200]="utilSeverity() === 'danger'"
          >
            <div class="text-xs font-medium uppercase">Overall Utilization</div>
            <div class="text-2xl font-bold mt-1">{{ d.overallUtilizationPercent | number:'1.1-1' }}%</div>
            <div class="text-xs mt-1">
              <span *ngIf="d.overallUtilizationPercent >= 100">Overbooked — capacity exceeded</span>
              <span *ngIf="d.overallUtilizationPercent < 100 && d.overallUtilizationPercent >= 70">Healthy load</span>
              <span *ngIf="d.overallUtilizationPercent < 70">Spare capacity available</span>
            </div>
          </div>
        </div>

        <p-card>
          <p-tabs value="demand">
            <p-tablist>
              <p-tab value="demand">Demand Forecast</p-tab>
              <p-tab value="capacity">Line Capacity</p-tab>
              <p-tab value="backlog">Order Backlog</p-tab>
            </p-tablist>
            <p-tabpanels>
              <!-- Demand -->
              <p-tabpanel value="demand">
                <p class="text-sm text-slate-600 mb-3">
                  3-month demand projection per buyer, derived from 12 months of order history (linear regression on monthly qty).
                </p>
                <p-table [value]="d.buyerForecasts" stripedRows>
                  <ng-template pTemplate="header">
                    <tr>
                      <th>Buyer</th>
                      <th class="text-right">12mo Avg/mo</th>
                      <th class="text-right">Trend</th>
                      <th class="text-right">Next Month</th>
                      <th>Months Ahead</th>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-b>
                    <tr>
                      <td>
                        <div class="font-medium">{{ b.buyerName }}</div>
                        <div class="text-xs font-mono text-slate-500">{{ b.buyerCode }}</div>
                      </td>
                      <td class="text-right">{{ b.monthlyAverage | number:'1.0-0' }}</td>
                      <td class="text-right">
                        <p-tag
                          [severity]="b.trendSlope > 50 ? 'success' : b.trendSlope < -50 ? 'danger' : 'info'"
                          [value]="(b.trendSlope > 0 ? '+' : '') + (b.trendSlope | number:'1.0-0') + ' / mo'"
                        />
                      </td>
                      <td class="text-right font-bold">{{ b.nextMonthForecastQty | number:'1.0-0' }}</td>
                      <td>
                        <div class="flex gap-1 text-xs">
                          <div *ngFor="let f of b.forecast" class="rounded bg-violet-50 border border-violet-200 px-2 py-1">
                            <span class="text-violet-700 font-mono">{{ f.monthLabel }}</span>:
                            <span class="font-bold">{{ f.totalQty | number:'1.0-0' }}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="emptymessage">
                    <tr><td colspan="5" class="text-center text-slate-500 py-4">No order history yet — forecast unavailable.</td></tr>
                  </ng-template>
                </p-table>
              </p-tabpanel>

              <!-- Capacity -->
              <p-tabpanel value="capacity">
                <p class="text-sm text-slate-600 mb-3">
                  Sewing line utilization based on active assignments with delivery within 30 days.
                  Capacity assumes 10 hr/day × 26 working days/month.
                </p>
                <p-table [value]="d.capacity" stripedRows>
                  <ng-template pTemplate="header">
                    <tr>
                      <th>Line</th>
                      <th>Name</th>
                      <th class="text-right">Hourly</th>
                      <th class="text-right">Monthly Cap</th>
                      <th class="text-right">Booked (30d)</th>
                      <th>Utilization</th>
                      <th>Status</th>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-c>
                    <tr>
                      <td class="font-mono text-xs">{{ c.lineCode }}</td>
                      <td>{{ c.lineName }}</td>
                      <td class="text-right">{{ c.capacityPcsPerHour | number:'1.0-0' }}</td>
                      <td class="text-right">{{ c.monthlyCapacityPcs | number:'1.0-0' }}</td>
                      <td class="text-right">{{ c.bookedPcsNext30d | number:'1.0-0' }}</td>
                      <td>
                        <p-progressBar
                          [value]="capPct(c.utilizationPercent)"
                          [showValue]="true"
                          styleClass="!h-3"
                        />
                      </td>
                      <td><p-tag [severity]="capacitySeverity(c)" [value]="c.status" /></td>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="emptymessage">
                    <tr><td colspan="7" class="text-center text-slate-500 py-4">No active sewing lines.</td></tr>
                  </ng-template>
                </p-table>
              </p-tabpanel>

              <!-- Backlog -->
              <p-tabpanel value="backlog">
                <p class="text-sm text-slate-600 mb-3">
                  Confirmed and in-production orders, ranked by delivery urgency. Late = overdue, Tight = ≤14 days.
                </p>
                <p-table [value]="d.backlog" stripedRows>
                  <ng-template pTemplate="header">
                    <tr>
                      <th>Buyer</th>
                      <th>PO #</th>
                      <th>Style</th>
                      <th class="text-right">Order Qty</th>
                      <th>Delivery</th>
                      <th class="text-right">Days</th>
                      <th>Risk</th>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-b>
                    <tr>
                      <td>
                        <div class="text-sm font-medium">{{ b.buyerName }}</div>
                        <div class="text-xs font-mono text-slate-500">{{ b.buyerCode }}</div>
                      </td>
                      <td class="font-mono text-xs">{{ b.poNumber }}</td>
                      <td>
                        <div class="text-sm">{{ b.styleName }}</div>
                        <div class="text-xs font-mono text-slate-500">{{ b.styleCode }}</div>
                      </td>
                      <td class="text-right">{{ b.orderQty | number:'1.0-0' }}</td>
                      <td class="text-sm">{{ b.deliveryDate || '—' }}</td>
                      <td class="text-right">
                        <span *ngIf="b.daysToDelivery !== null">{{ b.daysToDelivery }}</span>
                        <span *ngIf="b.daysToDelivery === null" class="text-slate-400">—</span>
                      </td>
                      <td><p-tag [severity]="riskSeverity(b.riskLevel)" [value]="formatRisk(b.riskLevel)" /></td>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="emptymessage">
                    <tr><td colspan="7" class="text-center text-slate-500 py-4">No active backlog.</td></tr>
                  </ng-template>
                </p-table>
              </p-tabpanel>
            </p-tabpanels>
          </p-tabs>
        </p-card>
      </div>
    </div>
  `,
})
export class ForecastingComponent implements OnInit {
  private readonly api = inject(ForecastingApiService);

  readonly loading = signal(true);
  readonly data = signal<ForecastingOverview | null>(null);

  readonly utilSeverity = computed<'success' | 'warn' | 'danger'>(() => {
    const u = this.data()?.overallUtilizationPercent ?? 0;
    if (u >= 100) return 'danger';
    if (u >= 70) return 'success';
    return 'warn';
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

  capPct(v: number): number {
    return Math.min(100, Math.max(0, v));
  }

  capacitySeverity(c: CapacityUtilizationRow): 'success' | 'warn' | 'danger' | 'secondary' {
    if (c.status === 'overbooked') return 'danger';
    if (c.status === 'healthy') return 'success';
    return 'secondary';
  }

  riskSeverity(r: OrderBacklogRow['riskLevel']): 'success' | 'warn' | 'danger' {
    if (r === 'late') return 'danger';
    if (r === 'tight') return 'warn';
    return 'success';
  }

  formatRisk(r: OrderBacklogRow['riskLevel']): string {
    return r.replace('_', ' ');
  }
}

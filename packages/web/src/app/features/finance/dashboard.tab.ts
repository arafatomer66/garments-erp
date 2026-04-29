import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import type { FinanceSummary } from '@org/shared-types';
import { FinanceApiService } from './finance.service';

@Component({
  selector: 'app-finance-dashboard-tab',
  standalone: true,
  imports: [CommonModule, CardModule, ProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div *ngIf="loading()" class="flex justify-center py-8">
      <p-progressSpinner styleClass="w-8 h-8" />
    </div>
    <div *ngIf="!loading() && summary() as s" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
          <div class="text-xs font-medium text-emerald-700 uppercase">Receivable (USD)</div>
          <div class="text-2xl font-bold text-emerald-900 mt-1">
            \${{ s.totalReceivable | number:'1.0-0' }}
          </div>
          <div class="text-xs text-emerald-600 mt-1">
            {{ s.invoicesOutstanding }} open invoices
            <span *ngIf="s.overdueInvoices > 0" class="text-red-600 ml-2">({{ s.overdueInvoices }} overdue)</span>
          </div>
        </div>
        <div class="rounded-lg bg-rose-50 border border-rose-200 p-4">
          <div class="text-xs font-medium text-rose-700 uppercase">Payable (BDT)</div>
          <div class="text-2xl font-bold text-rose-900 mt-1">
            ৳{{ s.totalPayable | number:'1.0-0' }}
          </div>
          <div class="text-xs text-rose-600 mt-1">
            {{ s.billsOutstanding }} open bills
            <span *ngIf="s.overdueBills > 0" class="text-red-700 ml-2">({{ s.overdueBills }} overdue)</span>
          </div>
        </div>
        <div class="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <div class="text-xs font-medium text-blue-700 uppercase">Bank Balance (BDT)</div>
          <div class="text-2xl font-bold text-blue-900 mt-1">
            ৳{{ s.bankBalanceBdt | number:'1.0-0' }}
          </div>
          <div class="text-xs text-blue-600 mt-1">Across all BDT accounts</div>
        </div>
        <div class="rounded-lg bg-indigo-50 border border-indigo-200 p-4">
          <div class="text-xs font-medium text-indigo-700 uppercase">Bank Balance (USD)</div>
          <div class="text-2xl font-bold text-indigo-900 mt-1">
            \${{ s.bankBalanceUsd | number:'1.0-0' }}
          </div>
          <div class="text-xs text-indigo-600 mt-1">Export proceeds + ERQ</div>
        </div>
      </div>

      <div class="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
        <div class="font-medium text-slate-800 mb-1">BD Tax Notes</div>
        <ul class="list-disc list-inside space-y-1">
          <li>VAT 15% standard; 0% on direct exports</li>
          <li>AIT 0.50% deducted at source by bank on export proceeds</li>
          <li>Source tax on local supplier payments per NBR rate schedule</li>
        </ul>
      </div>
    </div>
  `,
})
export class FinanceDashboardTabComponent implements OnInit {
  private readonly api = inject(FinanceApiService);
  readonly summary = signal<FinanceSummary | null>(null);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.refresh();
  }
  refresh(): void {
    this.loading.set(true);
    this.api.getSummary().subscribe({
      next: (s) => { this.summary.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}

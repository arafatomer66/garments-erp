import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import type { ComplianceSummary } from '@org/shared-types';
import { ComplianceApiService } from './compliance.service';

@Component({
  selector: 'app-compliance-dashboard-tab',
  standalone: true,
  imports: [CommonModule, CardModule, TableModule, TagModule, ProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div *ngIf="loading()" class="flex justify-center py-8">
      <p-progressSpinner styleClass="w-8 h-8" />
    </div>
    <div *ngIf="!loading() && summary() as s" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div class="rounded-lg bg-slate-50 border border-slate-200 p-4">
          <div class="text-xs font-medium text-slate-600 uppercase">Standards</div>
          <div class="text-2xl font-bold text-slate-900 mt-1">{{ s.totalStandards }}</div>
          <div class="text-xs text-slate-500 mt-1">Active</div>
        </div>
        <div class="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
          <div class="text-xs font-medium text-emerald-700 uppercase">Active Audits</div>
          <div class="text-2xl font-bold text-emerald-900 mt-1">{{ s.activeAudits }}</div>
          <div class="text-xs text-emerald-600 mt-1">Passed / in progress</div>
        </div>
        <div class="rounded-lg bg-amber-50 border border-amber-200 p-4">
          <div class="text-xs font-medium text-amber-700 uppercase">Expiring Soon</div>
          <div class="text-2xl font-bold text-amber-900 mt-1">{{ s.expiringSoon }}</div>
          <div class="text-xs text-amber-600 mt-1">Within 60 days</div>
        </div>
        <div class="rounded-lg bg-red-50 border border-red-200 p-4">
          <div class="text-xs font-medium text-red-700 uppercase">Expired</div>
          <div class="text-2xl font-bold text-red-900 mt-1">{{ s.expired }}</div>
          <div class="text-xs text-red-600 mt-1">Past valid_until</div>
        </div>
        <div class="rounded-lg bg-orange-50 border border-orange-200 p-4">
          <div class="text-xs font-medium text-orange-700 uppercase">Open Findings</div>
          <div class="text-2xl font-bold text-orange-900 mt-1">{{ s.openFindings }}</div>
          <div class="text-xs text-orange-600 mt-1">Open / in progress CAPA</div>
        </div>
        <div class="rounded-lg bg-rose-50 border border-rose-200 p-4">
          <div class="text-xs font-medium text-rose-700 uppercase">Overdue Findings</div>
          <div class="text-2xl font-bold text-rose-900 mt-1">{{ s.overdueFindings }}</div>
          <div class="text-xs text-rose-600 mt-1">Past target close date</div>
        </div>
      </div>

      <p-card header="Upcoming Audit Expiries (next 90 days)">
        <p-table [value]="s.upcomingAudits" stripedRows>
          <ng-template pTemplate="header">
            <tr>
              <th>Audit #</th><th>Standard</th><th>Type</th>
              <th>Valid Until</th><th>Days</th><th>Status</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-a>
            <tr>
              <td class="font-mono text-sm">{{ a.auditNumber }}</td>
              <td>{{ a.standardCode }} — {{ a.standardName }}</td>
              <td><p-tag [value]="a.auditType" severity="info" /></td>
              <td>{{ a.validUntil }}</td>
              <td>
                <p-tag *ngIf="a.daysToExpiry !== null && a.daysToExpiry <= 7" [value]="a.daysToExpiry + 'd'" severity="danger" />
                <p-tag *ngIf="a.daysToExpiry !== null && a.daysToExpiry > 7 && a.daysToExpiry <= 30" [value]="a.daysToExpiry + 'd'" severity="warn" />
                <p-tag *ngIf="a.daysToExpiry !== null && a.daysToExpiry > 30" [value]="a.daysToExpiry + 'd'" severity="success" />
              </td>
              <td><p-tag [value]="a.status" /></td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="6" class="text-center text-slate-500 py-4">No audits expiring in next 90 days.</td></tr>
          </ng-template>
        </p-table>
      </p-card>

      <p-card header="Documents Expiring (next 60 days)">
        <p-table [value]="s.expiringDocuments" stripedRows>
          <ng-template pTemplate="header">
            <tr>
              <th>Document #</th><th>Title</th><th>Type</th>
              <th>Expiry Date</th><th>Days</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-d>
            <tr>
              <td class="font-mono text-sm">{{ d.documentNumber }}</td>
              <td>{{ d.title }}</td>
              <td><p-tag [value]="d.documentType" severity="info" /></td>
              <td>{{ d.expiryDate }}</td>
              <td>
                <p-tag *ngIf="d.daysToExpiry !== null && d.daysToExpiry <= 7" [value]="d.daysToExpiry + 'd'" severity="danger" />
                <p-tag *ngIf="d.daysToExpiry !== null && d.daysToExpiry > 7 && d.daysToExpiry <= 30" [value]="d.daysToExpiry + 'd'" severity="warn" />
                <p-tag *ngIf="d.daysToExpiry !== null && d.daysToExpiry > 30" [value]="d.daysToExpiry + 'd'" severity="success" />
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="5" class="text-center text-slate-500 py-4">No documents expiring in next 60 days.</td></tr>
          </ng-template>
        </p-table>
      </p-card>

      <div class="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
        <div class="font-medium text-slate-800 mb-1">BD Compliance Reminder</div>
        <ul class="list-disc list-inside space-y-1">
          <li>Accord/RSC inspections recur on 6-12 month cycles — escalate at 30/15/7 days before expiry.</li>
          <li>Sedex SMETA validity is 12 months from audit completion date.</li>
          <li>BSCI audit cycle: 1-2 years depending on rating; A/B = 2 years, C = 1 year, D/E = 1 year + follow-up.</li>
          <li>Maintain Fire Safety License (BNBC), Boiler Permit, Environmental Clearance per DoE.</li>
        </ul>
      </div>
    </div>
  `,
})
export class ComplianceDashboardTabComponent implements OnInit {
  private readonly api = inject(ComplianceApiService);
  readonly summary = signal<ComplianceSummary | null>(null);
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

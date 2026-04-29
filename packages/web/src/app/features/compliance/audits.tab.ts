import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import type {
  ComplianceAudit,
  ComplianceAuditStatus,
  ComplianceAuditType,
  ComplianceStandard,
  CreateComplianceAuditDto,
} from '@org/shared-types';
import { ComplianceApiService } from './compliance.service';

@Component({
  selector: 'app-compliance-audits-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule, InputNumberModule,
    TextareaModule, SelectModule, TagModule, DatePickerModule, ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3">
      <div class="flex justify-end">
        <p-button label="New Audit" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows>
        <ng-template pTemplate="header">
          <tr>
            <th>Audit #</th><th>Standard</th><th>Type</th>
            <th>Audit Date</th><th>Valid Until</th>
            <th>Days</th><th>Status</th><th>Score</th>
            <th class="w-20"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr>
            <td class="font-mono text-sm">{{ r.auditNumber }}</td>
            <td>
              <div class="font-medium">{{ r.standardCode }}</div>
              <div class="text-xs text-slate-500">{{ r.standardName }}</div>
            </td>
            <td><p-tag [value]="r.auditType" severity="info" /></td>
            <td class="text-sm">{{ r.auditDate }}</td>
            <td class="text-sm">{{ r.validUntil }}</td>
            <td>
              <ng-container *ngIf="r.daysToExpiry !== null && r.daysToExpiry !== undefined">
                <p-tag *ngIf="r.daysToExpiry < 0" [value]="r.daysToExpiry + 'd'" severity="danger" />
                <p-tag *ngIf="r.daysToExpiry >= 0 && r.daysToExpiry <= 7" [value]="r.daysToExpiry + 'd'" severity="danger" />
                <p-tag *ngIf="r.daysToExpiry > 7 && r.daysToExpiry <= 30" [value]="r.daysToExpiry + 'd'" severity="warn" />
                <p-tag *ngIf="r.daysToExpiry > 30" [value]="r.daysToExpiry + 'd'" severity="success" />
              </ng-container>
            </td>
            <td><p-tag [value]="r.status" [severity]="statusSeverity(r.status)" /></td>
            <td class="font-mono text-sm">{{ r.score }}</td>
            <td>
              <p-button icon="pi pi-trash" severity="danger" text rounded size="small" (onClick)="confirmDelete(r)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="9" class="text-center text-slate-500 py-8">No audits yet.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '40rem' }" header="New Audit">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Audit Number *</label>
            <input pInputText class="w-full" formControlName="auditNumber" placeholder="AUDIT-2026-001" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Standard *</label>
            <p-select [options]="standardOptions()" formControlName="standardId"
              optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Type</label>
            <p-select [options]="types" formControlName="auditType"
              optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Status</label>
            <p-select [options]="statuses" formControlName="status"
              optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Score</label>
            <p-inputNumber formControlName="score" [minFractionDigits]="0" [maxFractionDigits]="2"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Audit Date *</label>
            <p-datepicker formControlName="auditDate" dateFormat="yy-mm-dd" styleClass="w-full" appendTo="body" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Valid Until</label>
            <p-datepicker formControlName="validUntil" dateFormat="yy-mm-dd" styleClass="w-full" appendTo="body" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Next Audit Due</label>
            <p-datepicker formControlName="nextAuditDue" dateFormat="yy-mm-dd" styleClass="w-full" appendTo="body" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Auditor Name</label>
            <input pInputText class="w-full" formControlName="auditorName" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Audit Firm</label>
            <input pInputText class="w-full" formControlName="auditFirm" placeholder="SGS / Bureau Veritas" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Rating</label>
            <input pInputText class="w-full" formControlName="rating" placeholder="A / B / C" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Summary</label>
          <textarea pTextarea class="w-full" rows="2" formControlName="summary"></textarea>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t">
          <p-button label="Cancel" severity="secondary" (onClick)="dialogOpen = false" />
          <p-button type="submit" label="Save" [loading]="saving()" [disabled]="form.invalid" />
        </div>
      </form>
    </p-dialog>

    <p-confirmDialog />
  `,
})
export class ComplianceAuditsTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ComplianceApiService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<ComplianceAudit[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly standards = signal<ComplianceStandard[]>([]);
  readonly standardOptions = signal<{ label: string; value: string }[]>([]);

  readonly types: { label: string; value: ComplianceAuditType }[] = [
    { label: 'Initial', value: 'initial' },
    { label: 'Follow-up', value: 'follow_up' },
    { label: 'Surveillance', value: 'surveillance' },
    { label: 'Recertification', value: 'recertification' },
    { label: 'Unannounced', value: 'unannounced' },
  ];
  readonly statuses: { label: string; value: ComplianceAuditStatus }[] = [
    { label: 'Scheduled', value: 'scheduled' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Passed', value: 'passed' },
    { label: 'Conditional', value: 'conditional' },
    { label: 'Failed', value: 'failed' },
    { label: 'Expired', value: 'expired' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  dialogOpen = false;

  readonly form = this.fb.group({
    auditNumber: ['', [Validators.required, Validators.maxLength(64)]],
    standardId: ['', Validators.required],
    auditType: ['surveillance' as ComplianceAuditType, Validators.required],
    status: ['scheduled' as ComplianceAuditStatus],
    auditDate: [null as Date | null, Validators.required],
    validUntil: [null as Date | null],
    nextAuditDue: [null as Date | null],
    auditorName: [''],
    auditFirm: [''],
    rating: [''],
    score: [null as number | null],
    summary: [''],
  });

  ngOnInit(): void {
    this.refresh();
    this.loadStandards();
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listAudits().subscribe({
      next: (r) => { this.rows.set(r); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  loadStandards(): void {
    this.api.listStandards().subscribe({
      next: (r) => {
        this.standards.set(r);
        this.standardOptions.set(
          r.filter((s) => s.isActive).map((s) => ({ label: `${s.code} — ${s.name}`, value: s.id })),
        );
      },
    });
  }

  statusSeverity(s: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    if (s === 'passed') return 'success';
    if (s === 'in_progress' || s === 'scheduled') return 'info';
    if (s === 'conditional') return 'warn';
    if (s === 'failed' || s === 'expired') return 'danger';
    return 'secondary';
  }

  openCreate(): void {
    this.form.reset({
      auditNumber: '',
      standardId: '',
      auditType: 'surveillance',
      status: 'scheduled',
      auditDate: null,
      validUntil: null,
      nextAuditDue: null,
      auditorName: '',
      auditFirm: '',
      rating: '',
      score: null,
      summary: '',
    });
    this.dialogOpen = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const dto: CreateComplianceAuditDto = {
      auditNumber: v.auditNumber!,
      standardId: v.standardId!,
      auditType: v.auditType || 'surveillance',
      status: v.status || 'scheduled',
      auditDate: this.toIso(v.auditDate)!,
      validUntil: this.toIso(v.validUntil),
      nextAuditDue: this.toIso(v.nextAuditDue),
      auditorName: v.auditorName || null,
      auditFirm: v.auditFirm || null,
      rating: v.rating || null,
      score: v.score ?? null,
      summary: v.summary || null,
    };
    this.api.createAudit(dto).subscribe({
      next: () => { this.saving.set(false); this.dialogOpen = false; this.refresh(); },
      error: () => this.saving.set(false),
    });
  }

  toIso(d: Date | null | undefined): string | null {
    if (!d) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  confirmDelete(r: ComplianceAudit): void {
    this.confirm.confirm({
      message: `Delete audit "${r.auditNumber}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteAudit(r.id).subscribe({ next: () => this.refresh() }),
    });
  }
}

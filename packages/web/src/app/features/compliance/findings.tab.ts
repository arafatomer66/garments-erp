import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import type {
  ComplianceAudit,
  ComplianceFinding,
  ComplianceFindingSeverity,
  ComplianceFindingStatus,
  CreateComplianceFindingDto,
} from '@org/shared-types';
import { ComplianceApiService } from './compliance.service';

@Component({
  selector: 'app-compliance-findings-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule,
    TextareaModule, SelectModule, TagModule, DatePickerModule, ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3">
      <div class="flex justify-end">
        <p-button label="New Finding" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows>
        <ng-template pTemplate="header">
          <tr>
            <th>Finding #</th><th>Audit</th><th>Severity</th>
            <th>Description</th><th>Owner</th>
            <th>Target Close</th><th>Status</th>
            <th class="w-20"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr>
            <td class="font-mono text-sm">{{ r.findingNumber }}</td>
            <td class="font-mono text-xs">{{ r.auditNumber }}</td>
            <td><p-tag [value]="r.severity" [severity]="severitySeverity(r.severity)" /></td>
            <td class="text-sm max-w-md truncate" [title]="r.description">{{ r.description }}</td>
            <td class="text-sm">{{ r.responsiblePerson }}</td>
            <td class="text-sm">{{ r.targetCloseDate }}</td>
            <td><p-tag [value]="r.status" [severity]="statusSeverity(r.status)" /></td>
            <td>
              <p-button icon="pi pi-trash" severity="danger" text rounded size="small" (onClick)="confirmDelete(r)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8" class="text-center text-slate-500 py-8">No findings logged.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '40rem' }" header="New Finding (CAPA)">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Finding # *</label>
            <input pInputText class="w-full" formControlName="findingNumber" placeholder="NCR-2026-001" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Audit *</label>
            <p-select [options]="auditOptions()" formControlName="auditId"
              optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Severity *</label>
            <p-select [options]="severities" formControlName="severity"
              optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Status</label>
            <p-select [options]="statuses" formControlName="status"
              optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Category</label>
            <input pInputText class="w-full" formControlName="category" placeholder="Health & Safety" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Description *</label>
          <textarea pTextarea class="w-full" rows="3" formControlName="description"></textarea>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Root Cause</label>
          <textarea pTextarea class="w-full" rows="2" formControlName="rootCause"></textarea>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Corrective Action</label>
          <textarea pTextarea class="w-full" rows="2" formControlName="correctiveAction"></textarea>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Responsible Person</label>
            <input pInputText class="w-full" formControlName="responsiblePerson" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Target Close</label>
            <p-datepicker formControlName="targetCloseDate" dateFormat="yy-mm-dd" styleClass="w-full" appendTo="body" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Actual Close</label>
            <p-datepicker formControlName="actualCloseDate" dateFormat="yy-mm-dd" styleClass="w-full" appendTo="body" />
          </div>
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
export class ComplianceFindingsTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ComplianceApiService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<ComplianceFinding[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly auditOptions = signal<{ label: string; value: string }[]>([]);

  readonly severities: { label: string; value: ComplianceFindingSeverity }[] = [
    { label: 'Critical', value: 'critical' },
    { label: 'Major', value: 'major' },
    { label: 'Minor', value: 'minor' },
    { label: 'Observation', value: 'observation' },
    { label: 'Opportunity', value: 'opportunity' },
  ];
  readonly statuses: { label: string; value: ComplianceFindingStatus }[] = [
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Closed', value: 'closed' },
    { label: 'Verified', value: 'verified' },
    { label: 'Overdue', value: 'overdue' },
  ];

  dialogOpen = false;

  readonly form = this.fb.group({
    findingNumber: ['', [Validators.required, Validators.maxLength(64)]],
    auditId: ['', Validators.required],
    severity: ['minor' as ComplianceFindingSeverity, Validators.required],
    status: ['open' as ComplianceFindingStatus],
    category: [''],
    description: ['', Validators.required],
    rootCause: [''],
    correctiveAction: [''],
    responsiblePerson: [''],
    targetCloseDate: [null as Date | null],
    actualCloseDate: [null as Date | null],
  });

  ngOnInit(): void {
    this.refresh();
    this.loadAudits();
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listFindings().subscribe({
      next: (r) => { this.rows.set(r); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  loadAudits(): void {
    this.api.listAudits().subscribe({
      next: (r: ComplianceAudit[]) => {
        this.auditOptions.set(
          r.map((a) => ({ label: `${a.auditNumber} (${a.standardCode})`, value: a.id })),
        );
      },
    });
  }

  severitySeverity(s: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    if (s === 'critical') return 'danger';
    if (s === 'major') return 'warn';
    if (s === 'minor') return 'info';
    return 'secondary';
  }

  statusSeverity(s: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    if (s === 'closed' || s === 'verified') return 'success';
    if (s === 'in_progress') return 'info';
    if (s === 'open') return 'warn';
    if (s === 'overdue') return 'danger';
    return 'secondary';
  }

  openCreate(): void {
    this.form.reset({
      findingNumber: '',
      auditId: '',
      severity: 'minor',
      status: 'open',
      category: '',
      description: '',
      rootCause: '',
      correctiveAction: '',
      responsiblePerson: '',
      targetCloseDate: null,
      actualCloseDate: null,
    });
    this.dialogOpen = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const dto: CreateComplianceFindingDto = {
      findingNumber: v.findingNumber!,
      auditId: v.auditId!,
      severity: v.severity || 'minor',
      status: v.status || 'open',
      category: v.category || null,
      description: v.description!,
      rootCause: v.rootCause || null,
      correctiveAction: v.correctiveAction || null,
      responsiblePerson: v.responsiblePerson || null,
      targetCloseDate: this.toIso(v.targetCloseDate),
      actualCloseDate: this.toIso(v.actualCloseDate),
    };
    this.api.createFinding(dto).subscribe({
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

  confirmDelete(r: ComplianceFinding): void {
    this.confirm.confirm({
      message: `Delete finding "${r.findingNumber}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteFinding(r.id).subscribe({ next: () => this.refresh() }),
    });
  }
}

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
  ComplianceDocument,
  ComplianceDocumentType,
  ComplianceStandard,
  CreateComplianceDocumentDto,
} from '@org/shared-types';
import { ComplianceApiService } from './compliance.service';

@Component({
  selector: 'app-compliance-documents-tab',
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
        <p-button label="New Document" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows>
        <ng-template pTemplate="header">
          <tr>
            <th>Document #</th><th>Title</th><th>Type</th>
            <th>Standard</th><th>Issued</th><th>Expires</th>
            <th>Days</th>
            <th class="w-20"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr [class.opacity-50]="r.isArchived">
            <td class="font-mono text-sm">{{ r.documentNumber }}</td>
            <td class="font-medium">
              {{ r.title }}
              <a *ngIf="r.fileUrl" [href]="r.fileUrl" target="_blank" class="ml-2 text-blue-600">
                <i class="pi pi-external-link text-xs"></i>
              </a>
            </td>
            <td><p-tag [value]="r.documentType" severity="info" /></td>
            <td class="font-mono text-sm">{{ r.standardCode }}</td>
            <td class="text-sm">{{ r.issuedDate }}</td>
            <td class="text-sm">{{ r.expiryDate }}</td>
            <td>
              <ng-container *ngIf="r.daysToExpiry !== null && r.daysToExpiry !== undefined">
                <p-tag *ngIf="r.daysToExpiry < 0" [value]="r.daysToExpiry + 'd'" severity="danger" />
                <p-tag *ngIf="r.daysToExpiry >= 0 && r.daysToExpiry <= 7" [value]="r.daysToExpiry + 'd'" severity="danger" />
                <p-tag *ngIf="r.daysToExpiry > 7 && r.daysToExpiry <= 30" [value]="r.daysToExpiry + 'd'" severity="warn" />
                <p-tag *ngIf="r.daysToExpiry > 30" [value]="r.daysToExpiry + 'd'" severity="success" />
              </ng-container>
            </td>
            <td>
              <p-button icon="pi pi-trash" severity="danger" text rounded size="small" (onClick)="confirmDelete(r)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8" class="text-center text-slate-500 py-8">No documents in vault yet.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '40rem' }" header="New Document">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Document # *</label>
            <input pInputText class="w-full" formControlName="documentNumber" placeholder="DOC-2026-001" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Type</label>
            <p-select [options]="docTypes" formControlName="documentType"
              optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Title *</label>
          <input pInputText class="w-full" formControlName="title" placeholder="Sedex SMETA Audit Report 2026" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Standard</label>
            <p-select [options]="standardOptions()" formControlName="standardId"
              optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" [showClear]="true" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Audit</label>
            <p-select [options]="auditOptions()" formControlName="auditId"
              optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" [showClear]="true" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Issued Date</label>
            <p-datepicker formControlName="issuedDate" dateFormat="yy-mm-dd" styleClass="w-full" appendTo="body" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Expiry Date</label>
            <p-datepicker formControlName="expiryDate" dateFormat="yy-mm-dd" styleClass="w-full" appendTo="body" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">File URL (S3)</label>
          <input pInputText class="w-full" formControlName="fileUrl" placeholder="s3://garments-erp/compliance/..." />
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Notes</label>
          <textarea pTextarea class="w-full" rows="2" formControlName="notes"></textarea>
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
export class ComplianceDocumentsTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ComplianceApiService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<ComplianceDocument[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly standardOptions = signal<{ label: string; value: string }[]>([]);
  readonly auditOptions = signal<{ label: string; value: string }[]>([]);

  readonly docTypes: { label: string; value: ComplianceDocumentType }[] = [
    { label: 'Certificate', value: 'certificate' },
    { label: 'Report', value: 'report' },
    { label: 'Policy', value: 'policy' },
    { label: 'SOP', value: 'sop' },
    { label: 'Training Record', value: 'training_record' },
    { label: 'Permit', value: 'permit' },
    { label: 'License', value: 'license' },
    { label: 'Other', value: 'other' },
  ];

  dialogOpen = false;

  readonly form = this.fb.group({
    documentNumber: ['', [Validators.required, Validators.maxLength(64)]],
    documentType: ['certificate' as ComplianceDocumentType, Validators.required],
    title: ['', [Validators.required, Validators.maxLength(200)]],
    standardId: [null as string | null],
    auditId: [null as string | null],
    issuedDate: [null as Date | null],
    expiryDate: [null as Date | null],
    fileUrl: [''],
    notes: [''],
  });

  ngOnInit(): void {
    this.refresh();
    this.loadOptions();
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listDocuments().subscribe({
      next: (r) => { this.rows.set(r); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  loadOptions(): void {
    this.api.listStandards().subscribe({
      next: (r: ComplianceStandard[]) => {
        this.standardOptions.set(
          r.filter((s) => s.isActive).map((s) => ({ label: `${s.code} — ${s.name}`, value: s.id })),
        );
      },
    });
    this.api.listAudits().subscribe({
      next: (r: ComplianceAudit[]) => {
        this.auditOptions.set(
          r.map((a) => ({ label: `${a.auditNumber} (${a.standardCode})`, value: a.id })),
        );
      },
    });
  }

  openCreate(): void {
    this.form.reset({
      documentNumber: '',
      documentType: 'certificate',
      title: '',
      standardId: null,
      auditId: null,
      issuedDate: null,
      expiryDate: null,
      fileUrl: '',
      notes: '',
    });
    this.dialogOpen = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const dto: CreateComplianceDocumentDto = {
      documentNumber: v.documentNumber!,
      documentType: v.documentType || 'certificate',
      title: v.title!,
      standardId: v.standardId || null,
      auditId: v.auditId || null,
      issuedDate: this.toIso(v.issuedDate),
      expiryDate: this.toIso(v.expiryDate),
      fileUrl: v.fileUrl || null,
      notes: v.notes || null,
    };
    this.api.createDocument(dto).subscribe({
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

  confirmDelete(r: ComplianceDocument): void {
    this.confirm.confirm({
      message: `Delete document "${r.documentNumber}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteDocument(r.id).subscribe({ next: () => this.refresh() }),
    });
  }
}

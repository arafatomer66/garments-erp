import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
  CreateLetterOfCreditDto,
  LetterOfCredit,
  LetterOfCreditStatus,
  LetterOfCreditType,
  PurchaseOrder,
} from '@org/shared-types';
import { ProcurementService } from './procurement.service';

const TYPES: { label: string; value: LetterOfCreditType }[] = [
  { label: 'Master', value: 'master' },
  { label: 'Back-to-Back', value: 'back_to_back' },
  { label: 'Transferable', value: 'transferable' },
  { label: 'Sight', value: 'sight' },
  { label: 'Usance', value: 'usance' },
];

const STATUSES: { label: string; value: LetterOfCreditStatus }[] = [
  { label: 'Draft', value: 'draft' },
  { label: 'Opened', value: 'opened' },
  { label: 'Amended', value: 'amended' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Negotiated', value: 'negotiated' },
  { label: 'Paid', value: 'paid' },
  { label: 'Expired', value: 'expired' },
  { label: 'Cancelled', value: 'cancelled' },
];

const STATUS_SEVERITY: Record<LetterOfCreditStatus, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
  draft: 'secondary',
  opened: 'info',
  amended: 'warn',
  shipped: 'info',
  negotiated: 'info',
  paid: 'success',
  expired: 'danger',
  cancelled: 'danger',
};

@Component({
  selector: 'app-lc-tab',
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
        <p-button label="New LC" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows>
        <ng-template pTemplate="header">
          <tr>
            <th>LC #</th><th>Type</th><th>Beneficiary</th><th>Issuing Bank</th>
            <th>Amount</th><th>Issue</th><th>Expiry</th><th>Status</th><th class="w-32">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-mono text-sm">{{ row.lcNumber }}</td>
            <td>{{ row.lcType }}</td>
            <td>{{ row.beneficiary || '—' }}</td>
            <td>{{ row.issuingBank || '—' }}</td>
            <td>{{ row.currencyCode }} {{ row.amount | number:'1.2-2' }}</td>
            <td>{{ row.issueDate ? (row.issueDate | date:'mediumDate') : '—' }}</td>
            <td>{{ row.expiryDate ? (row.expiryDate | date:'mediumDate') : '—' }}</td>
            <td><p-tag [value]="row.status" [severity]="severityFor(row.status)" /></td>
            <td>
              <p-button icon="pi pi-pencil" severity="secondary" text rounded (onClick)="openEdit(row)" />
              <p-button icon="pi pi-trash" severity="danger" text rounded (onClick)="confirmDelete(row)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="9" class="text-center text-slate-500 py-8">No LCs yet.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '52rem' }"
      [header]="editingId() ? 'Edit LC' : 'New Letter of Credit'">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">LC Number *</label>
            <input pInputText class="w-full" formControlName="lcNumber" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Type</label>
            <p-select [options]="types" formControlName="lcType" optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Status</label>
            <p-select [options]="statuses" formControlName="status" optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Beneficiary</label>
            <input pInputText class="w-full" formControlName="beneficiary" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Applicant</label>
            <input pInputText class="w-full" formControlName="applicant" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Issuing Bank</label>
            <input pInputText class="w-full" formControlName="issuingBank" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Advising Bank</label>
            <input pInputText class="w-full" formControlName="advisingBank" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Amount</label>
            <p-inputNumber formControlName="amount" [min]="0" mode="decimal" [minFractionDigits]="2" [maxFractionDigits]="4"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Currency</label>
            <input pInputText class="w-full" formControlName="currencyCode" maxlength="3" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Linked PO</label>
            <p-select [options]="pos()" formControlName="poId" optionLabel="poNumber" optionValue="id"
              [showClear]="true" placeholder="None" styleClass="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Issue Date</label>
            <p-datepicker formControlName="issueDate" appendTo="body" dateFormat="yy-mm-dd" styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Expiry Date</label>
            <p-datepicker formControlName="expiryDate" appendTo="body" dateFormat="yy-mm-dd" styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Latest Shipment</label>
            <p-datepicker formControlName="latestShipmentDate" appendTo="body" dateFormat="yy-mm-dd" styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
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
export class LcTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProcurementService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<LetterOfCredit[]>([]);
  readonly pos = signal<PurchaseOrder[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly types = TYPES;
  readonly statuses = STATUSES;

  dialogOpen = false;

  readonly form: FormGroup = this.fb.group({
    lcNumber: ['', [Validators.required, Validators.maxLength(80)]],
    lcType: ['master' as LetterOfCreditType, Validators.required],
    status: ['draft' as LetterOfCreditStatus, Validators.required],
    issuingBank: [''],
    advisingBank: [''],
    beneficiary: [''],
    applicant: [''],
    poId: [null as string | null],
    amount: [0, [Validators.min(0)]],
    currencyCode: ['USD', Validators.required],
    issueDate: [null as Date | null],
    expiryDate: [null as Date | null],
    latestShipmentDate: [null as Date | null],
    notes: [''],
  });

  ngOnInit(): void {
    this.refresh();
    this.api.listPos().subscribe((p) => this.pos.set(p));
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listLcs().subscribe({
      next: (r) => {
        this.rows.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  severityFor(s: LetterOfCreditStatus) {
    return STATUS_SEVERITY[s] ?? 'info';
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      lcNumber: '', lcType: 'master', status: 'draft',
      issuingBank: '', advisingBank: '', beneficiary: '', applicant: '',
      poId: null, amount: 0, currencyCode: 'USD',
      issueDate: null, expiryDate: null, latestShipmentDate: null, notes: '',
    });
    this.dialogOpen = true;
  }

  openEdit(row: LetterOfCredit): void {
    this.editingId.set(row.id);
    this.form.patchValue({
      lcNumber: row.lcNumber,
      lcType: row.lcType,
      status: row.status,
      issuingBank: row.issuingBank ?? '',
      advisingBank: row.advisingBank ?? '',
      beneficiary: row.beneficiary ?? '',
      applicant: row.applicant ?? '',
      poId: row.poId,
      amount: Number(row.amount ?? 0),
      currencyCode: row.currencyCode,
      issueDate: row.issueDate ? new Date(row.issueDate) : null,
      expiryDate: row.expiryDate ? new Date(row.expiryDate) : null,
      latestShipmentDate: row.latestShipmentDate ? new Date(row.latestShipmentDate) : null,
      notes: row.notes ?? '',
    });
    this.dialogOpen = true;
  }

  private toIso(d: Date | null | undefined): string | undefined {
    if (!d) return undefined;
    return d.toISOString().slice(0, 10);
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const dto: CreateLetterOfCreditDto = {
      lcNumber: v.lcNumber,
      lcType: v.lcType,
      status: v.status,
      issuingBank: v.issuingBank || undefined,
      advisingBank: v.advisingBank || undefined,
      beneficiary: v.beneficiary || undefined,
      applicant: v.applicant || undefined,
      poId: v.poId || undefined,
      amount: Number(v.amount ?? 0),
      currencyCode: v.currencyCode,
      issueDate: this.toIso(v.issueDate),
      expiryDate: this.toIso(v.expiryDate),
      latestShipmentDate: this.toIso(v.latestShipmentDate),
      notes: v.notes || undefined,
    };
    const op$ = this.editingId()
      ? this.api.updateLc(this.editingId()!, dto)
      : this.api.createLc(dto);
    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(row: LetterOfCredit): void {
    this.confirm.confirm({
      message: `Delete LC "${row.lcNumber}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteLc(row.id).subscribe({ next: () => this.refresh() }),
    });
  }
}

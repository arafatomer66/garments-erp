import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import type {
  BillStatus,
  CreateFinBillDto,
  FinBill,
  FinTaxCode,
  Supplier,
} from '@org/shared-types';
import { FinanceApiService } from './finance.service';
import { MastersService } from '../masters/masters.service';

const STATUS_SEVERITY: Record<BillStatus, 'info' | 'success' | 'warn' | 'danger' | 'secondary'> = {
  draft: 'secondary',
  received: 'info',
  partial: 'warn',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'secondary',
};

@Component({
  selector: 'app-finance-bills-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule, InputNumberModule,
    TextareaModule, SelectModule, DatePickerModule, TagModule, ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3">
      <div class="flex justify-end">
        <p-button label="New Bill" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows>
        <ng-template pTemplate="header">
          <tr>
            <th>Bill #</th><th>Supplier</th><th>PO #</th>
            <th>Date</th><th>Due</th><th>Curr.</th>
            <th class="text-right">Subtotal</th>
            <th class="text-right">Tax</th>
            <th class="text-right">Total</th>
            <th class="text-right">Paid</th>
            <th class="text-right">Due</th>
            <th>Status</th>
            <th class="w-20"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr>
            <td class="font-mono text-sm">{{ r.billNumber }}</td>
            <td>{{ r.supplierName || '—' }}</td>
            <td class="text-sm">{{ r.purchaseOrderNumber || '—' }}</td>
            <td class="text-sm">{{ r.billDate | date:'mediumDate' }}</td>
            <td class="text-sm">{{ r.dueDate ? (r.dueDate | date:'mediumDate') : '—' }}</td>
            <td class="text-sm">{{ r.currencyCode }}</td>
            <td class="text-right font-mono">{{ r.subtotal | number:'1.2-2' }}</td>
            <td class="text-right font-mono">{{ r.taxTotal | number:'1.2-2' }}</td>
            <td class="text-right font-mono font-semibold">{{ r.total | number:'1.2-2' }}</td>
            <td class="text-right font-mono text-emerald-700">{{ r.amountPaid | number:'1.2-2' }}</td>
            <td class="text-right font-mono text-rose-700">{{ r.amountDue | number:'1.2-2' }}</td>
            <td><p-tag [value]="r.status" [severity]="severity(r.status)" /></td>
            <td>
              <p-button icon="pi pi-trash" severity="danger" text rounded size="small" (onClick)="confirmDelete(r)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="13" class="text-center text-slate-500 py-8">No bills yet.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '52rem' }" header="New Bill (AP)">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Bill # *</label>
            <input pInputText class="w-full" formControlName="billNumber" placeholder="BILL-2026-0001" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Supplier</label>
            <p-select [options]="suppliers()" formControlName="supplierId" optionLabel="name" optionValue="id"
              [showClear]="true" placeholder="Select supplier" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Currency</label>
            <p-select [options]="currencies" formControlName="currencyCode"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Bill Date</label>
            <p-datepicker formControlName="billDate" dateFormat="yy-mm-dd" styleClass="w-full" appendTo="body" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Due Date</label>
            <p-datepicker formControlName="dueDate" dateFormat="yy-mm-dd" styleClass="w-full" appendTo="body" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">FX Rate (to BDT)</label>
            <p-inputNumber formControlName="fxRate" [minFractionDigits]="2" [maxFractionDigits]="4"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
        </div>

        <div class="border-t pt-3">
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-medium text-slate-800">Line Items</h4>
            <p-button label="Add Line" icon="pi pi-plus" size="small" severity="secondary" (onClick)="addLine()" />
          </div>
          <table class="w-full text-sm">
            <thead class="text-xs text-slate-600">
              <tr>
                <th class="text-left p-1">Description</th>
                <th class="text-right p-1 w-24">Qty</th>
                <th class="text-right p-1 w-32">Unit Price</th>
                <th class="text-left p-1 w-40">Tax</th>
                <th class="w-8"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let line of lines(); let i = index" class="border-t">
                <td class="p-1"><input pInputText [(ngModel)]="line.description" [ngModelOptions]="{standalone:true}" class="w-full" placeholder="Fabric / Trim / Service" /></td>
                <td class="p-1"><input type="number" [(ngModel)]="line.quantity" [ngModelOptions]="{standalone:true}" class="w-full text-right border rounded px-2 py-1" /></td>
                <td class="p-1"><input type="number" [(ngModel)]="line.unitPrice" [ngModelOptions]="{standalone:true}" class="w-full text-right border rounded px-2 py-1" step="0.01" /></td>
                <td class="p-1">
                  <p-select [options]="taxCodes()" [(ngModel)]="line.taxCodeId" [ngModelOptions]="{standalone:true}"
                    optionLabel="name" optionValue="id" [showClear]="true" placeholder="None" styleClass="w-full" appendTo="body" />
                </td>
                <td class="p-1 text-center"><button type="button" class="text-rose-600" (click)="removeLine(i)"><i class="pi pi-times"></i></button></td>
              </tr>
              <tr *ngIf="lines().length === 0"><td colspan="5" class="text-center text-slate-400 py-4">No line items. Click "Add Line".</td></tr>
            </tbody>
          </table>
          <div class="flex justify-end mt-2 text-sm">
            <div class="text-right space-y-1">
              <div>Subtotal: <strong class="font-mono">{{ subtotal() | number:'1.2-2' }}</strong></div>
              <div>Tax: <strong class="font-mono">{{ taxTotal() | number:'1.2-2' }}</strong></div>
              <div class="text-base">Total: <strong class="font-mono">{{ total() | number:'1.2-2' }}</strong></div>
            </div>
          </div>
        </div>

        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Notes</label>
          <textarea pTextarea class="w-full" rows="2" formControlName="notes"></textarea>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t">
          <p-button label="Cancel" severity="secondary" (onClick)="dialogOpen = false" />
          <p-button type="submit" label="Create" [loading]="saving()" [disabled]="form.invalid || lines().length === 0" />
        </div>
      </form>
    </p-dialog>

    <p-confirmDialog />
  `,
})
export class FinanceBillsTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(FinanceApiService);
  private readonly masters = inject(MastersService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<FinBill[]>([]);
  readonly suppliers = signal<Supplier[]>([]);
  readonly taxCodes = signal<FinTaxCode[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly currencies = [
    { label: 'BDT', value: 'BDT' },
    { label: 'USD', value: 'USD' },
    { label: 'EUR', value: 'EUR' },
  ];

  readonly lines = signal<{ description: string; quantity: number; unitPrice: number; taxCodeId?: string | null }[]>([]);

  readonly subtotal = computed(() =>
    this.lines().reduce((s, l) => s + Number(l.quantity || 0) * Number(l.unitPrice || 0), 0),
  );
  readonly taxTotal = computed(() => {
    const codes = this.taxCodes();
    return this.lines().reduce((s, l) => {
      const lineTotal = Number(l.quantity || 0) * Number(l.unitPrice || 0);
      const tax = l.taxCodeId ? codes.find((c) => c.id === l.taxCodeId) : null;
      return s + (tax ? (lineTotal * Number(tax.ratePercent)) / 100 : 0);
    }, 0);
  });
  readonly total = computed(() => this.subtotal() + this.taxTotal());

  dialogOpen = false;

  readonly form = this.fb.group({
    billNumber: ['', [Validators.required, Validators.maxLength(60)]],
    supplierId: [null as string | null],
    currencyCode: ['BDT'],
    billDate: [new Date()],
    dueDate: [null as Date | null],
    fxRate: [1.0],
    notes: [''],
  });

  ngOnInit(): void {
    this.refresh();
    this.masters.listSuppliers().subscribe((s) => this.suppliers.set(s));
    this.api.listTaxCodes().subscribe((t) => this.taxCodes.set(t.filter((x) => x.appliesTo !== 'sales' && x.isActive)));
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listBills().subscribe({
      next: (r) => { this.rows.set(r); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  severity(s: BillStatus) { return STATUS_SEVERITY[s]; }

  openCreate(): void {
    this.lines.set([]);
    this.form.reset({
      billNumber: '',
      supplierId: null,
      currencyCode: 'BDT',
      billDate: new Date(),
      dueDate: null,
      fxRate: 1.0,
      notes: '',
    });
    this.dialogOpen = true;
  }

  addLine(): void {
    this.lines.update((l) => [...l, { description: '', quantity: 1, unitPrice: 0, taxCodeId: null }]);
  }
  removeLine(i: number): void {
    this.lines.update((l) => l.filter((_, idx) => idx !== i));
  }

  submit(): void {
    if (this.form.invalid || this.lines().length === 0) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const dto: CreateFinBillDto = {
      billNumber: v.billNumber!,
      supplierId: v.supplierId,
      currencyCode: v.currencyCode || 'BDT',
      billDate: v.billDate ? toIso(v.billDate) : undefined,
      dueDate: v.dueDate ? toIso(v.dueDate) : null,
      fxRate: Number(v.fxRate || 1),
      notes: v.notes || undefined,
      lines: this.lines().map((l, i) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        taxCodeId: l.taxCodeId || null,
        sortOrder: i,
      })),
    };
    this.api.createBill(dto).subscribe({
      next: () => { this.saving.set(false); this.dialogOpen = false; this.refresh(); },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(r: FinBill): void {
    this.confirm.confirm({
      message: `Delete bill "${r.billNumber}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteBill(r.id).subscribe({ next: () => this.refresh() }),
    });
  }
}

function toIso(d: Date | string): string {
  if (typeof d === 'string') return d;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

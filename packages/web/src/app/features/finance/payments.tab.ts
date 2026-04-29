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
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import type {
  CreateFinPaymentDto,
  FinBankAccount,
  FinBill,
  FinInvoice,
  FinPayment,
  PaymentDirection,
  PaymentMethod,
} from '@org/shared-types';
import { FinanceApiService } from './finance.service';

@Component({
  selector: 'app-finance-payments-tab',
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
      <div class="flex justify-end gap-2">
        <p-button label="Receive Payment" icon="pi pi-arrow-down" severity="success" (onClick)="openCreate('inbound')" />
        <p-button label="Make Payment" icon="pi pi-arrow-up" severity="danger" (onClick)="openCreate('outbound')" />
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows>
        <ng-template pTemplate="header">
          <tr>
            <th>Payment #</th><th>Date</th><th>Direction</th>
            <th>Method</th><th>Bank</th>
            <th>Invoice / Bill</th>
            <th>Party</th>
            <th>Curr.</th>
            <th class="text-right">Amount</th>
            <th>Reference</th>
            <th class="w-20"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr>
            <td class="font-mono text-sm">{{ r.paymentNumber }}</td>
            <td class="text-sm">{{ r.paymentDate | date:'mediumDate' }}</td>
            <td>
              <p-tag *ngIf="r.direction === 'inbound'" value="IN" severity="success" />
              <p-tag *ngIf="r.direction === 'outbound'" value="OUT" severity="danger" />
            </td>
            <td class="text-sm">{{ r.method }}</td>
            <td class="text-sm">{{ r.bankAccountName || '—' }}</td>
            <td class="text-sm font-mono">{{ r.invoiceNumber || r.billNumber || '—' }}</td>
            <td class="text-sm">{{ r.partyName || '—' }}</td>
            <td class="text-sm">{{ r.currencyCode }}</td>
            <td class="text-right font-mono font-semibold"
                [class.text-emerald-700]="r.direction === 'inbound'"
                [class.text-rose-700]="r.direction === 'outbound'">
              {{ r.amount | number:'1.2-2' }}
            </td>
            <td class="text-sm text-slate-600">{{ r.referenceNumber || '—' }}</td>
            <td>
              <p-button icon="pi pi-trash" severity="danger" text rounded size="small" (onClick)="confirmDelete(r)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="11" class="text-center text-slate-500 py-8">No payments yet.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '36rem' }"
              [header]="form.value.direction === 'inbound' ? 'Receive Payment' : 'Make Payment'">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Payment # *</label>
            <input pInputText class="w-full" formControlName="paymentNumber" placeholder="PAY-2026-0001" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Date</label>
            <p-datepicker formControlName="paymentDate" dateFormat="yy-mm-dd" styleClass="w-full" appendTo="body" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Method</label>
            <p-select [options]="methods" formControlName="method"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Bank Account</label>
            <p-select [options]="banks()" formControlName="bankAccountId"
              optionLabel="bankName" optionValue="id" [showClear]="true" placeholder="Select bank"
              styleClass="w-full" appendTo="body" />
          </div>
        </div>

        <div *ngIf="form.value.direction === 'inbound'">
          <label class="text-sm font-medium text-slate-700 mb-1 block">Apply to Invoice</label>
          <p-select [options]="openInvoices()" formControlName="invoiceId"
            [showClear]="true" placeholder="Select invoice"
            styleClass="w-full" appendTo="body">
            <ng-template let-i pTemplate="item">
              <span class="font-mono">{{ i.invoiceNumber }}</span>
              — {{ i.buyerName }} —
              <span class="text-rose-700">Due: {{ i.amountDue | number:'1.2-2' }} {{ i.currencyCode }}</span>
            </ng-template>
            <ng-template let-i pTemplate="selectedItem">
              <span class="font-mono">{{ i.invoiceNumber }}</span> — Due {{ i.amountDue | number:'1.2-2' }} {{ i.currencyCode }}
            </ng-template>
          </p-select>
        </div>
        <div *ngIf="form.value.direction === 'outbound'">
          <label class="text-sm font-medium text-slate-700 mb-1 block">Apply to Bill</label>
          <p-select [options]="openBills()" formControlName="billId"
            [showClear]="true" placeholder="Select bill"
            styleClass="w-full" appendTo="body">
            <ng-template let-b pTemplate="item">
              <span class="font-mono">{{ b.billNumber }}</span>
              — {{ b.supplierName }} —
              <span class="text-rose-700">Due: {{ b.amountDue | number:'1.2-2' }} {{ b.currencyCode }}</span>
            </ng-template>
            <ng-template let-b pTemplate="selectedItem">
              <span class="font-mono">{{ b.billNumber }}</span> — Due {{ b.amountDue | number:'1.2-2' }} {{ b.currencyCode }}
            </ng-template>
          </p-select>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Currency</label>
            <p-select [options]="currencies" formControlName="currencyCode"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Amount *</label>
            <p-inputNumber formControlName="amount" [minFractionDigits]="2" [maxFractionDigits]="2"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">FX Rate</label>
            <p-inputNumber formControlName="fxRate" [minFractionDigits]="2" [maxFractionDigits]="4"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
        </div>

        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Party Name</label>
          <input pInputText class="w-full" formControlName="partyName" placeholder="Buyer / Supplier name" />
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Reference #</label>
          <input pInputText class="w-full" formControlName="referenceNumber" placeholder="Cheque/TT/MFS reference" />
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
export class FinancePaymentsTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(FinanceApiService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<FinPayment[]>([]);
  readonly banks = signal<FinBankAccount[]>([]);
  readonly openInvoices = signal<FinInvoice[]>([]);
  readonly openBills = signal<FinBill[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly methods: { label: string; value: PaymentMethod }[] = [
    { label: 'Bank Transfer', value: 'bank_transfer' },
    { label: 'TT', value: 'tt' },
    { label: 'LC', value: 'lc' },
    { label: 'Cheque', value: 'cheque' },
    { label: 'Cash', value: 'cash' },
    { label: 'MFS (bKash/Nagad)', value: 'mfs' },
    { label: 'Other', value: 'other' },
  ];
  readonly currencies = [
    { label: 'BDT', value: 'BDT' },
    { label: 'USD', value: 'USD' },
    { label: 'EUR', value: 'EUR' },
  ];

  dialogOpen = false;

  readonly form = this.fb.group({
    paymentNumber: ['', [Validators.required, Validators.maxLength(60)]],
    paymentDate: [new Date()],
    direction: ['inbound' as PaymentDirection],
    method: ['bank_transfer' as PaymentMethod],
    bankAccountId: [null as string | null],
    invoiceId: [null as string | null],
    billId: [null as string | null],
    partyName: [''],
    currencyCode: ['BDT'],
    fxRate: [1.0],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    referenceNumber: [''],
    notes: [''],
  });

  ngOnInit(): void {
    this.refresh();
    this.api.listBankAccounts().subscribe((b) => this.banks.set(b.filter((x) => x.isActive)));
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listPayments().subscribe({
      next: (r) => { this.rows.set(r); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.api.listInvoices().subscribe((inv) =>
      this.openInvoices.set(inv.filter((i) => i.status !== 'paid' && i.status !== 'cancelled')),
    );
    this.api.listBills().subscribe((b) =>
      this.openBills.set(b.filter((x) => x.status !== 'paid' && x.status !== 'cancelled')),
    );
  }

  openCreate(direction: PaymentDirection): void {
    const today = new Date();
    const yyyy = today.getFullYear();
    const seq = String(this.rows().length + 1).padStart(4, '0');
    this.form.reset({
      paymentNumber: `PMT-${yyyy}-${seq}`,
      paymentDate: today,
      direction,
      method: 'bank_transfer',
      bankAccountId: null,
      invoiceId: null,
      billId: null,
      partyName: '',
      currencyCode: 'BDT',
      fxRate: 1.0,
      amount: 0,
      referenceNumber: '',
      notes: '',
    });
    this.dialogOpen = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const dto: CreateFinPaymentDto = {
      paymentNumber: v.paymentNumber!,
      paymentDate: v.paymentDate ? toIso(v.paymentDate) : undefined,
      direction: v.direction || 'inbound',
      method: v.method || 'bank_transfer',
      bankAccountId: v.bankAccountId || null,
      invoiceId: v.direction === 'inbound' ? v.invoiceId || null : null,
      billId: v.direction === 'outbound' ? v.billId || null : null,
      partyName: v.partyName || null,
      currencyCode: v.currencyCode || 'BDT',
      fxRate: Number(v.fxRate || 1),
      amount: Number(v.amount),
      referenceNumber: v.referenceNumber || null,
      notes: v.notes || null,
    };
    this.api.createPayment(dto).subscribe({
      next: () => { this.saving.set(false); this.dialogOpen = false; this.refresh(); },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(r: FinPayment): void {
    this.confirm.confirm({
      message: `Delete payment "${r.paymentNumber}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deletePayment(r.id).subscribe({ next: () => this.refresh() }),
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

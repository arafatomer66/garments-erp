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
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import type {
  BankPurpose,
  CreateFinBankAccountDto,
  FinBankAccount,
} from '@org/shared-types';
import { FinanceApiService } from './finance.service';

@Component({
  selector: 'app-finance-banks-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule, InputNumberModule,
    TextareaModule, SelectModule, TagModule, ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3">
      <div class="flex justify-end">
        <p-button label="Add Bank Account" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows>
        <ng-template pTemplate="header">
          <tr>
            <th>Code</th><th>Bank</th><th>Branch</th>
            <th>Account #</th><th>Curr.</th><th>Purpose</th>
            <th class="text-right">Opening</th>
            <th class="text-right">Current</th>
            <th class="w-20"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr>
            <td class="font-mono text-sm">{{ r.code }}</td>
            <td class="font-medium">{{ r.bankName }}</td>
            <td class="text-sm">{{ r.branch || '—' }}</td>
            <td class="font-mono text-sm">{{ r.accountNumber }}</td>
            <td class="text-sm">{{ r.currencyCode }}</td>
            <td><p-tag [value]="r.purpose" severity="info" /></td>
            <td class="text-right font-mono">{{ r.openingBalance | number:'1.2-2' }}</td>
            <td class="text-right font-mono font-semibold">{{ r.currentBalance | number:'1.2-2' }}</td>
            <td>
              <p-button icon="pi pi-trash" severity="danger" text rounded size="small" (onClick)="confirmDelete(r)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="9" class="text-center text-slate-500 py-8">No bank accounts yet.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '36rem' }" header="New Bank Account">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Code *</label>
            <input pInputText class="w-full" formControlName="code" placeholder="BANK-SCB-USD" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Bank Name *</label>
            <input pInputText class="w-full" formControlName="bankName" placeholder="Standard Chartered" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Branch</label>
            <input pInputText class="w-full" formControlName="branch" placeholder="Gulshan" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Account Number *</label>
            <input pInputText class="w-full" formControlName="accountNumber" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Currency</label>
            <p-select [options]="currencies" formControlName="currencyCode"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Purpose</label>
            <p-select [options]="purposes" formControlName="purpose"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Opening Balance</label>
            <p-inputNumber formControlName="openingBalance" [minFractionDigits]="2"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">SWIFT Code</label>
            <input pInputText class="w-full" formControlName="swiftCode" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Routing #</label>
            <input pInputText class="w-full" formControlName="routingNumber" />
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
export class FinanceBanksTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(FinanceApiService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<FinBankAccount[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly currencies = [
    { label: 'BDT', value: 'BDT' },
    { label: 'USD', value: 'USD' },
    { label: 'EUR', value: 'EUR' },
  ];
  readonly purposes: { label: string; value: BankPurpose }[] = [
    { label: 'Operational', value: 'operational' },
    { label: 'Export Proceeds', value: 'export_proceeds' },
    { label: 'ERQ', value: 'erq' },
    { label: 'Back-to-Back LC', value: 'back_to_back_lc' },
    { label: 'Payroll', value: 'payroll' },
    { label: 'Other', value: 'other' },
  ];

  dialogOpen = false;

  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(32)]],
    bankName: ['', [Validators.required, Validators.maxLength(120)]],
    branch: [''],
    accountNumber: ['', [Validators.required]],
    currencyCode: ['BDT'],
    purpose: ['operational' as BankPurpose],
    openingBalance: [0],
    swiftCode: [''],
    routingNumber: [''],
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listBankAccounts().subscribe({
      next: (r) => { this.rows.set(r); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.form.reset({
      code: '',
      bankName: '',
      branch: '',
      accountNumber: '',
      currencyCode: 'BDT',
      purpose: 'operational',
      openingBalance: 0,
      swiftCode: '',
      routingNumber: '',
    });
    this.dialogOpen = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const dto: CreateFinBankAccountDto = {
      code: v.code!,
      bankName: v.bankName!,
      branch: v.branch || null,
      accountNumber: v.accountNumber!,
      currencyCode: v.currencyCode || 'BDT',
      purpose: v.purpose || 'operational',
      openingBalance: Number(v.openingBalance || 0),
      swiftCode: v.swiftCode || null,
      routingNumber: v.routingNumber || null,
    };
    this.api.createBankAccount(dto).subscribe({
      next: () => { this.saving.set(false); this.dialogOpen = false; this.refresh(); },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(r: FinBankAccount): void {
    this.confirm.confirm({
      message: `Delete bank account "${r.code}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteBankAccount(r.id).subscribe({ next: () => this.refresh() }),
    });
  }
}

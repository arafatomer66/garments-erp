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
  CreateFinTaxCodeDto,
  FinTaxCode,
  TaxAppliesTo,
  TaxType,
} from '@org/shared-types';
import { FinanceApiService } from './finance.service';

@Component({
  selector: 'app-finance-tax-codes-tab',
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
        <p-button label="New Tax Code" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows>
        <ng-template pTemplate="header">
          <tr>
            <th>Code</th><th>Name</th><th>Type</th>
            <th class="text-right">Rate %</th>
            <th>Applies To</th><th>Active</th>
            <th class="w-20"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr>
            <td class="font-mono text-sm">{{ r.code }}</td>
            <td class="font-medium">{{ r.name }}</td>
            <td><p-tag [value]="r.taxType" severity="info" /></td>
            <td class="text-right font-mono">{{ r.ratePercent | number:'1.2-4' }}</td>
            <td class="text-sm">{{ r.appliesTo }}</td>
            <td>
              <p-tag *ngIf="r.isActive" value="Active" severity="success" />
              <p-tag *ngIf="!r.isActive" value="Inactive" severity="secondary" />
            </td>
            <td>
              <p-button icon="pi pi-trash" severity="danger" text rounded size="small" (onClick)="confirmDelete(r)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7" class="text-center text-slate-500 py-8">No tax codes yet.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '32rem' }" header="New Tax Code">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Code *</label>
            <input pInputText class="w-full" formControlName="code" placeholder="VAT-15" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Name *</label>
            <input pInputText class="w-full" formControlName="name" placeholder="VAT 15%" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Type</label>
            <p-select [options]="types" formControlName="taxType"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Rate %</label>
            <p-inputNumber formControlName="ratePercent" [minFractionDigits]="2" [maxFractionDigits]="4"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Applies To</label>
            <p-select [options]="appliesTo" formControlName="appliesTo"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Description</label>
          <textarea pTextarea class="w-full" rows="2" formControlName="description"></textarea>
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
export class FinanceTaxCodesTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(FinanceApiService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<FinTaxCode[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly types: { label: string; value: TaxType }[] = [
    { label: 'VAT', value: 'vat' },
    { label: 'AIT', value: 'ait' },
    { label: 'Source Tax', value: 'source_tax' },
    { label: 'Withholding', value: 'withholding' },
    { label: 'Other', value: 'other' },
  ];
  readonly appliesTo: { label: string; value: TaxAppliesTo }[] = [
    { label: 'Sales (Invoices)', value: 'sales' },
    { label: 'Purchase (Bills)', value: 'purchase' },
    { label: 'Both', value: 'both' },
  ];

  dialogOpen = false;

  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(32)]],
    name: ['', [Validators.required, Validators.maxLength(80)]],
    taxType: ['vat' as TaxType, Validators.required],
    ratePercent: [15, [Validators.required, Validators.min(0)]],
    appliesTo: ['both' as TaxAppliesTo],
    description: [''],
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listTaxCodes().subscribe({
      next: (r) => { this.rows.set(r); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.form.reset({
      code: '', name: '', taxType: 'vat', ratePercent: 15, appliesTo: 'both', description: '',
    });
    this.dialogOpen = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const dto: CreateFinTaxCodeDto = {
      code: v.code!,
      name: v.name!,
      taxType: v.taxType || 'vat',
      ratePercent: Number(v.ratePercent),
      appliesTo: v.appliesTo || 'both',
      description: v.description || null,
    };
    this.api.createTaxCode(dto).subscribe({
      next: () => { this.saving.set(false); this.dialogOpen = false; this.refresh(); },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(r: FinTaxCode): void {
    this.confirm.confirm({
      message: `Delete tax code "${r.code}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteTaxCode(r.id).subscribe({ next: () => this.refresh() }),
    });
  }
}

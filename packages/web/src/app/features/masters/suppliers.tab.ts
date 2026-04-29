import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import type { CreateSupplierDto, Supplier, SupplierType } from '@org/shared-types';
import { MastersService } from './masters.service';

const SUPPLIER_TYPES: { label: string; value: SupplierType }[] = [
  { label: 'Fabric', value: 'fabric' },
  { label: 'Trim', value: 'trim' },
  { label: 'Accessory', value: 'accessory' },
  { label: 'Service', value: 'service' },
  { label: 'Other', value: 'other' },
];

@Component({
  selector: 'app-suppliers-tab',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    TagModule,
    SelectModule,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-slate-900">Suppliers</h2>
      <p-button label="New Supplier" icon="pi pi-plus" (onClick)="openCreate()" />
    </div>

    <p-table [value]="rows()" [loading]="loading()" stripedRows>
      <ng-template pTemplate="header">
        <tr>
          <th>Code</th>
          <th>Name</th>
          <th>Type</th>
          <th>Country</th>
          <th>Contact</th>
          <th>Status</th>
          <th class="w-32">Actions</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-row>
        <tr>
          <td class="font-mono text-sm">{{ row.code }}</td>
          <td>{{ row.name }}</td>
          <td><p-tag [value]="row.type" severity="info" /></td>
          <td>{{ row.country || '—' }}</td>
          <td>{{ row.contactPerson || '—' }}</td>
          <td>
            <p-tag
              [value]="row.isActive ? 'Active' : 'Inactive'"
              [severity]="row.isActive ? 'success' : 'secondary'"
            />
          </td>
          <td>
            <p-button icon="pi pi-pencil" severity="secondary" text rounded (onClick)="openEdit(row)" />
            <p-button icon="pi pi-trash" severity="danger" text rounded (onClick)="confirmDelete(row)" />
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="7" class="text-center text-slate-500 py-8">No suppliers yet.</td>
        </tr>
      </ng-template>
    </p-table>

    <p-dialog
      [(visible)]="dialogOpen"
      [modal]="true"
      [style]="{ width: '32rem' }"
      [header]="editingId() ? 'Edit Supplier' : 'New Supplier'"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Code *</label>
            <input pInputText class="w-full" formControlName="code" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Type *</label>
            <p-select [options]="types" formControlName="type" optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Name *</label>
          <input pInputText class="w-full" formControlName="name" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Country (ISO-2)</label>
            <input pInputText class="w-full" formControlName="country" maxlength="2" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Contact Person</label>
            <input pInputText class="w-full" formControlName="contactPerson" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Email</label>
            <input pInputText class="w-full" formControlName="email" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Phone</label>
            <input pInputText class="w-full" formControlName="phone" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Payment Terms</label>
          <input pInputText class="w-full" formControlName="paymentTerms" />
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Notes</label>
          <textarea pTextarea class="w-full" rows="2" formControlName="notes"></textarea>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <p-button label="Cancel" severity="secondary" (onClick)="dialogOpen = false" />
          <p-button type="submit" label="Save" [loading]="saving()" [disabled]="form.invalid" />
        </div>
      </form>
    </p-dialog>

    <p-confirmDialog />
  `,
})
export class SuppliersTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(MastersService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<Supplier[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly types = SUPPLIER_TYPES;

  dialogOpen = false;

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(32)]],
    name: ['', [Validators.required, Validators.maxLength(160)]],
    type: ['fabric' as SupplierType, [Validators.required]],
    country: [''],
    contactPerson: [''],
    email: [''],
    phone: [''],
    paymentTerms: [''],
    notes: [''],
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listSuppliers().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      code: '',
      name: '',
      type: 'fabric',
      country: '',
      contactPerson: '',
      email: '',
      phone: '',
      paymentTerms: '',
      notes: '',
    });
    this.dialogOpen = true;
  }

  openEdit(row: Supplier): void {
    this.editingId.set(row.id);
    this.form.patchValue({
      code: row.code,
      name: row.name,
      type: row.type,
      country: row.country ?? '',
      contactPerson: row.contactPerson ?? '',
      email: row.email ?? '',
      phone: row.phone ?? '',
      paymentTerms: row.paymentTerms ?? '',
      notes: row.notes ?? '',
    });
    this.dialogOpen = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const value = this.form.getRawValue();
    const dto: CreateSupplierDto = {
      code: value.code,
      name: value.name,
      type: value.type,
      country: value.country || undefined,
      contactPerson: value.contactPerson || undefined,
      email: value.email || undefined,
      phone: value.phone || undefined,
      paymentTerms: value.paymentTerms || undefined,
      notes: value.notes || undefined,
    };
    const op$ = this.editingId()
      ? this.api.updateSupplier(this.editingId()!, dto)
      : this.api.createSupplier(dto);
    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(row: Supplier): void {
    this.confirm.confirm({
      message: `Delete supplier "${row.name}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.api.deleteSupplier(row.id).subscribe({ next: () => this.refresh() });
      },
    });
  }
}

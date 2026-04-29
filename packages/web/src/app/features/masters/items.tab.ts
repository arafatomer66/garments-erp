import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import type { CreateItemDto, Item, ItemCategory, Supplier } from '@org/shared-types';
import { MastersService } from './masters.service';

const ITEM_CATEGORIES: { label: string; value: ItemCategory }[] = [
  { label: 'Fabric', value: 'fabric' },
  { label: 'Trim', value: 'trim' },
  { label: 'Accessory', value: 'accessory' },
  { label: 'Packing', value: 'packing' },
  { label: 'Finished Good', value: 'finished_good' },
  { label: 'Other', value: 'other' },
];

@Component({
  selector: 'app-items-tab',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    TagModule,
    SelectModule,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-slate-900">Items</h2>
      <p-button label="New Item" icon="pi pi-plus" (onClick)="openCreate()" />
    </div>

    <p-table [value]="rows()" [loading]="loading()" stripedRows>
      <ng-template pTemplate="header">
        <tr>
          <th>Code</th>
          <th>Name</th>
          <th>Category</th>
          <th>UoM</th>
          <th>Standard Cost</th>
          <th>Reorder Lvl</th>
          <th>Status</th>
          <th class="w-32">Actions</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-row>
        <tr>
          <td class="font-mono text-sm">{{ row.code }}</td>
          <td>{{ row.name }}</td>
          <td><p-tag [value]="row.category" severity="info" /></td>
          <td>{{ row.uom }}</td>
          <td>
            <span *ngIf="row.standardCost != null">{{ row.currencyCode }} {{ row.standardCost | number:'1.2-4' }}</span>
            <span *ngIf="row.standardCost == null">—</span>
          </td>
          <td>{{ row.reorderLevel }}</td>
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
          <td colspan="8" class="text-center text-slate-500 py-8">No items yet.</td>
        </tr>
      </ng-template>
    </p-table>

    <p-dialog
      [(visible)]="dialogOpen"
      [modal]="true"
      [style]="{ width: '36rem' }"
      [header]="editingId() ? 'Edit Item' : 'New Item'"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Code *</label>
            <input pInputText class="w-full" formControlName="code" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Category *</label>
            <p-select [options]="categories" formControlName="category" optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Name *</label>
          <input pInputText class="w-full" formControlName="name" />
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">UoM *</label>
            <input pInputText class="w-full" formControlName="uom" placeholder="pcs, m, kg" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Currency</label>
            <input pInputText class="w-full" formControlName="currencyCode" maxlength="3" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Default Supplier</label>
            <p-select
              [options]="suppliers()"
              formControlName="defaultSupplierId"
              optionLabel="name"
              optionValue="id"
              [showClear]="true"
              placeholder="—"
              styleClass="w-full"
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Standard Cost</label>
            <p-inputNumber
              formControlName="standardCost"
              mode="decimal"
              [minFractionDigits]="2"
              [maxFractionDigits]="4"
              styleClass="w-full"
              [inputStyle]="{ width: '100%' }"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Reorder Level</label>
            <p-inputNumber
              formControlName="reorderLevel"
              mode="decimal"
              [minFractionDigits]="0"
              [maxFractionDigits]="4"
              styleClass="w-full"
              [inputStyle]="{ width: '100%' }"
            />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Description</label>
          <textarea pTextarea class="w-full" rows="2" formControlName="description"></textarea>
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
export class ItemsTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(MastersService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<Item[]>([]);
  readonly suppliers = signal<Supplier[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly categories = ITEM_CATEGORIES;

  dialogOpen = false;

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(48)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    category: ['fabric' as ItemCategory, [Validators.required]],
    uom: ['pcs', [Validators.required, Validators.maxLength(16)]],
    currencyCode: ['USD', [Validators.required]],
    defaultSupplierId: [null as string | null],
    standardCost: [null as number | null],
    reorderLevel: [0 as number],
    description: [''],
  });

  ngOnInit(): void {
    this.refresh();
    this.api.listSuppliers().subscribe((s) => this.suppliers.set(s));
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listItems().subscribe({
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
      category: 'fabric',
      uom: 'pcs',
      currencyCode: 'USD',
      defaultSupplierId: null,
      standardCost: null,
      reorderLevel: 0,
      description: '',
    });
    this.dialogOpen = true;
  }

  openEdit(row: Item): void {
    this.editingId.set(row.id);
    this.form.patchValue({
      code: row.code,
      name: row.name,
      category: row.category,
      uom: row.uom,
      currencyCode: row.currencyCode,
      defaultSupplierId: row.defaultSupplierId ?? null,
      standardCost: row.standardCost ?? null,
      reorderLevel: row.reorderLevel,
      description: row.description ?? '',
    });
    this.dialogOpen = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const value = this.form.getRawValue();
    const dto: CreateItemDto = {
      code: value.code,
      name: value.name,
      category: value.category,
      uom: value.uom,
      currencyCode: value.currencyCode,
      defaultSupplierId: value.defaultSupplierId ?? undefined,
      standardCost: value.standardCost ?? undefined,
      reorderLevel: value.reorderLevel,
      description: value.description || undefined,
    };
    const op$ = this.editingId()
      ? this.api.updateItem(this.editingId()!, dto)
      : this.api.createItem(dto);
    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(row: Item): void {
    this.confirm.confirm({
      message: `Delete item "${row.name}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.api.deleteItem(row.id).subscribe({ next: () => this.refresh() });
      },
    });
  }
}

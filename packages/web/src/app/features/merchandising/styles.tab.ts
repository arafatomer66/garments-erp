import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
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
import type { Buyer, CreateStyleDto, Style, StyleStatus } from '@org/shared-types';
import { MerchandisingService } from './merchandising.service';
import { MastersService } from '../masters/masters.service';

const STATUS_OPTIONS: { label: string; value: StyleStatus }[] = [
  { label: 'Development', value: 'development' },
  { label: 'Sampling', value: 'sampling' },
  { label: 'Approved', value: 'approved' },
  { label: 'In Production', value: 'in_production' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Cancelled', value: 'cancelled' },
];

const STATUS_SEVERITY: Record<StyleStatus, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
  development: 'info',
  sampling: 'warn',
  approved: 'success',
  in_production: 'success',
  shipped: 'secondary',
  cancelled: 'danger',
};

@Component({
  selector: 'app-styles-tab',
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
      <h2 class="text-lg font-semibold text-slate-900">Styles</h2>
      <p-button label="New Style" icon="pi pi-plus" (onClick)="openCreate()" />
    </div>

    <p-table [value]="rows()" [loading]="loading()" stripedRows
      selectionMode="single" [(selection)]="selectedRow"
      (onRowSelect)="emitSelected()" dataKey="id">
      <ng-template pTemplate="header">
        <tr>
          <th>Code</th><th>Name</th><th>Buyer</th><th>Season</th>
          <th>Type</th><th>Status</th><th>Target FOB</th>
          <th class="w-32">Actions</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-row>
        <tr [pSelectableRow]="row">
          <td class="font-mono text-sm">{{ row.code }}</td>
          <td>{{ row.name }}</td>
          <td>{{ buyerName(row.buyerId) }}</td>
          <td>{{ row.season || '—' }}</td>
          <td>{{ row.productType || '—' }}</td>
          <td><p-tag [value]="row.status" [severity]="severityFor(row.status)" /></td>
          <td>
            <span *ngIf="row.targetFob != null">{{ row.currencyCode }} {{ row.targetFob | number:'1.2-2' }}</span>
            <span *ngIf="row.targetFob == null">—</span>
          </td>
          <td>
            <p-button icon="pi pi-pencil" severity="secondary" text rounded (onClick)="openEdit(row); $event.stopPropagation()" />
            <p-button icon="pi pi-trash" severity="danger" text rounded (onClick)="confirmDelete(row); $event.stopPropagation()" />
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr><td colspan="8" class="text-center text-slate-500 py-8">No styles yet.</td></tr>
      </ng-template>
    </p-table>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '40rem' }"
      [header]="editingId() ? 'Edit Style' : 'New Style'">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Code *</label>
            <input pInputText class="w-full" formControlName="code" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Buyer *</label>
            <p-select [options]="buyers()" formControlName="buyerId" optionLabel="name" optionValue="id" styleClass="w-full" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Name *</label>
          <input pInputText class="w-full" formControlName="name" />
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Season</label>
            <input pInputText class="w-full" formControlName="season" placeholder="SS26, FW25"/>
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Product Type</label>
            <input pInputText class="w-full" formControlName="productType" placeholder="T-shirt, Polo"/>
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Status</label>
            <p-select [options]="statuses" formControlName="status" optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Target FOB</label>
            <p-inputNumber formControlName="targetFob" mode="decimal" [minFractionDigits]="2" [maxFractionDigits]="4"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Currency</label>
            <input pInputText class="w-full" formControlName="currencyCode" maxlength="3" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Fabric Summary</label>
          <textarea pTextarea class="w-full" rows="2" formControlName="fabricSummary"></textarea>
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
export class StylesTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(MerchandisingService);
  private readonly mastersApi = inject(MastersService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<Style[]>([]);
  readonly buyers = signal<Buyer[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly statuses = STATUS_OPTIONS;

  selectedRow: Style | null = null;
  dialogOpen = false;

  readonly buyerLookup = computed(() => {
    const map = new Map<string, string>();
    for (const b of this.buyers()) map.set(b.id, b.name);
    return map;
  });

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(48)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    buyerId: ['', [Validators.required]],
    season: [''],
    productType: [''],
    status: ['development' as StyleStatus, [Validators.required]],
    targetFob: [null as number | null],
    currencyCode: ['USD', [Validators.required]],
    fabricSummary: [''],
    description: [''],
  });

  ngOnInit(): void {
    this.refresh();
    this.mastersApi.listBuyers().subscribe((b) => this.buyers.set(b));
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listStyles().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  buyerName(id: string): string {
    return this.buyerLookup().get(id) ?? '—';
  }
  severityFor(s: StyleStatus) {
    return STATUS_SEVERITY[s] ?? 'info';
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      code: '', name: '', buyerId: '',
      season: '', productType: '', status: 'development',
      targetFob: null, currencyCode: 'USD', fabricSummary: '', description: '',
    });
    this.dialogOpen = true;
  }

  openEdit(row: Style): void {
    this.editingId.set(row.id);
    this.form.patchValue({
      code: row.code,
      name: row.name,
      buyerId: row.buyerId,
      season: row.season ?? '',
      productType: row.productType ?? '',
      status: row.status,
      targetFob: row.targetFob ?? null,
      currencyCode: row.currencyCode,
      fabricSummary: row.fabricSummary ?? '',
      description: row.description ?? '',
    });
    this.dialogOpen = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const dto: CreateStyleDto = {
      code: v.code,
      name: v.name,
      buyerId: v.buyerId,
      season: v.season || undefined,
      productType: v.productType || undefined,
      fabricSummary: v.fabricSummary || undefined,
      description: v.description || undefined,
      targetFob: v.targetFob ?? undefined,
      currencyCode: v.currencyCode,
      status: v.status,
    };
    const op$ = this.editingId()
      ? this.api.updateStyle(this.editingId()!, dto)
      : this.api.createStyle(dto);
    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(row: Style): void {
    this.confirm.confirm({
      message: `Delete style "${row.name}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteStyle(row.id).subscribe({ next: () => this.refresh() }),
    });
  }

  emitSelected(): void {
    /* selection is read by parent via @Output if needed; left in-place for visual cue */
  }
}

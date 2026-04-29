import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
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
  CreatePurchaseOrderDto,
  Item,
  PurchaseOrder,
  PurchaseOrderStatus,
  Supplier,
} from '@org/shared-types';
import { ProcurementService } from './procurement.service';
import { MastersService } from '../masters/masters.service';

const STATUSES: { label: string; value: PurchaseOrderStatus }[] = [
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Partially Received', value: 'partially_received' },
  { label: 'Received', value: 'received' },
  { label: 'Closed', value: 'closed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const STATUS_SEVERITY: Record<PurchaseOrderStatus, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
  draft: 'secondary',
  sent: 'info',
  partially_received: 'warn',
  received: 'success',
  closed: 'success',
  cancelled: 'danger',
};

@Component({
  selector: 'app-po-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    TableModule, ButtonModule, CardModule, DialogModule, InputTextModule, InputNumberModule,
    TextareaModule, SelectModule, TagModule, DatePickerModule, ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3">
      <div class="flex justify-end">
        <p-button label="New PO" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows>
        <ng-template pTemplate="header">
          <tr>
            <th>PO #</th><th>Supplier</th><th>Order Date</th><th>Expected</th>
            <th>Items</th><th>Total</th><th>Status</th><th class="w-32">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-mono text-sm">{{ row.poNumber }}</td>
            <td>{{ supplierName(row.supplierId) }}</td>
            <td>{{ row.orderDate | date:'mediumDate' }}</td>
            <td>{{ row.expectedDelivery ? (row.expectedDelivery | date:'mediumDate') : '—' }}</td>
            <td>{{ row.items.length }}</td>
            <td>{{ row.currencyCode }} {{ row.totalValue | number:'1.2-2' }}</td>
            <td><p-tag [value]="row.status" [severity]="severityFor(row.status)" /></td>
            <td>
              <p-button icon="pi pi-pencil" severity="secondary" text rounded (onClick)="openEdit(row)" />
              <p-button icon="pi pi-trash" severity="danger" text rounded (onClick)="confirmDelete(row)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8" class="text-center text-slate-500 py-8">No purchase orders yet.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '54rem' }"
      [header]="editingId() ? 'Edit PO' : 'New Purchase Order'">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">PO Number *</label>
            <input pInputText class="w-full" formControlName="poNumber" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Supplier *</label>
            <p-select [options]="suppliers()" formControlName="supplierId" optionLabel="name" optionValue="id"
              [filter]="true" filterBy="code,name" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Status</label>
            <p-select [options]="statuses" formControlName="status" optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-4 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Order Date</label>
            <p-datepicker formControlName="orderDate" appendTo="body" dateFormat="yy-mm-dd" styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Expected Delivery</label>
            <p-datepicker formControlName="expectedDelivery" appendTo="body" dateFormat="yy-mm-dd" styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Currency</label>
            <input pInputText class="w-full" formControlName="currencyCode" maxlength="3" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Incoterm</label>
            <input pInputText class="w-full" formControlName="incoterm" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Payment Terms</label>
          <input pInputText class="w-full" formControlName="paymentTerms" />
        </div>

        <div class="border-t pt-3">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-base font-semibold text-slate-900">Line Items</h3>
            <p-button label="Add Item" icon="pi pi-plus" size="small" severity="secondary" (onClick)="addItem()" />
          </div>
          <div formArrayName="items" class="space-y-2">
            <div *ngFor="let it of items.controls; let i = index" [formGroupName]="i"
              class="grid grid-cols-12 gap-2 items-end border border-slate-200 rounded p-2 bg-slate-50">
              <div class="col-span-4">
                <label class="text-xs font-medium text-slate-700 mb-1 block">Item *</label>
                <p-select [options]="itemList()" formControlName="itemId" optionLabel="name" optionValue="id"
                  [filter]="true" filterBy="code,name" styleClass="w-full" />
              </div>
              <div class="col-span-2">
                <label class="text-xs font-medium text-slate-700 mb-1 block">Qty *</label>
                <p-inputNumber formControlName="quantity" [min]="0" mode="decimal" [maxFractionDigits]="4"
                  styleClass="w-full" [inputStyle]="{ width: '100%' }" />
              </div>
              <div class="col-span-2">
                <label class="text-xs font-medium text-slate-700 mb-1 block">UOM</label>
                <input pInputText class="w-full" formControlName="uom" maxlength="16" />
              </div>
              <div class="col-span-2">
                <label class="text-xs font-medium text-slate-700 mb-1 block">Unit Price *</label>
                <p-inputNumber formControlName="unitPrice" [min]="0" mode="decimal" [minFractionDigits]="2" [maxFractionDigits]="4"
                  styleClass="w-full" [inputStyle]="{ width: '100%' }" />
              </div>
              <div class="col-span-2 flex justify-end">
                <p-button icon="pi pi-trash" severity="danger" text rounded (onClick)="removeItem(i)" />
              </div>
            </div>
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
export class PoTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProcurementService);
  private readonly mastersApi = inject(MastersService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<PurchaseOrder[]>([]);
  readonly suppliers = signal<Supplier[]>([]);
  readonly itemList = signal<Item[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly statuses = STATUSES;

  readonly supplierLookup = computed(() => {
    const map = new Map<string, string>();
    for (const s of this.suppliers()) map.set(s.id, s.name);
    return map;
  });

  dialogOpen = false;

  readonly form: FormGroup = this.fb.group({
    poNumber: ['', [Validators.required, Validators.maxLength(60)]],
    supplierId: ['', Validators.required],
    orderDate: [new Date()],
    expectedDelivery: [null as Date | null],
    incoterm: [''],
    paymentTerms: [''],
    currencyCode: ['USD', [Validators.required]],
    status: ['draft' as PurchaseOrderStatus, Validators.required],
    notes: [''],
    items: this.fb.array([this.makeItem()]),
  });

  get items(): FormArray<FormGroup> {
    return this.form.get('items') as FormArray<FormGroup>;
  }

  ngOnInit(): void {
    this.refresh();
    this.mastersApi.listSuppliers().subscribe((s) => this.suppliers.set(s));
    this.mastersApi.listItems().subscribe((it) => this.itemList.set(it));
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listPos().subscribe({
      next: (r) => {
        this.rows.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  supplierName(id: string): string {
    return this.supplierLookup().get(id) ?? '—';
  }
  severityFor(s: PurchaseOrderStatus) {
    return STATUS_SEVERITY[s] ?? 'info';
  }

  private makeItem(): FormGroup {
    return this.fb.group({
      itemId: ['', Validators.required],
      quantity: [0, [Validators.required, Validators.min(0)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      uom: ['pcs', [Validators.required, Validators.maxLength(16)]],
      notes: [''],
    });
  }

  addItem(): void {
    this.items.push(this.makeItem());
  }
  removeItem(i: number): void {
    if (this.items.length === 1) return;
    this.items.removeAt(i);
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      poNumber: '', supplierId: '', orderDate: new Date(), expectedDelivery: null,
      incoterm: '', paymentTerms: '', currencyCode: 'USD', status: 'draft', notes: '',
    });
    this.items.clear();
    this.addItem();
    this.dialogOpen = true;
  }

  openEdit(row: PurchaseOrder): void {
    this.editingId.set(row.id);
    this.form.patchValue({
      poNumber: row.poNumber,
      supplierId: row.supplierId,
      orderDate: row.orderDate ? new Date(row.orderDate) : null,
      expectedDelivery: row.expectedDelivery ? new Date(row.expectedDelivery) : null,
      incoterm: row.incoterm ?? '',
      paymentTerms: row.paymentTerms ?? '',
      currencyCode: row.currencyCode,
      status: row.status,
      notes: row.notes ?? '',
    });
    this.items.clear();
    for (const it of row.items) {
      const g = this.makeItem();
      g.patchValue({
        itemId: it.itemId,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        uom: it.uom,
        notes: it.notes ?? '',
      });
      this.items.push(g);
    }
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
    const dto: CreatePurchaseOrderDto = {
      poNumber: v.poNumber,
      supplierId: v.supplierId,
      orderDate: this.toIso(v.orderDate),
      expectedDelivery: this.toIso(v.expectedDelivery),
      incoterm: v.incoterm || undefined,
      paymentTerms: v.paymentTerms || undefined,
      currencyCode: v.currencyCode,
      status: v.status,
      notes: v.notes || undefined,
      items: (v.items as Array<{ itemId: string; quantity: number; unitPrice: number; uom: string; notes: string }>).map((it) => ({
        itemId: it.itemId,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        uom: it.uom,
        notes: it.notes || undefined,
      })),
    };
    const op$ = this.editingId()
      ? this.api.updatePo(this.editingId()!, dto)
      : this.api.createPo(dto);
    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(row: PurchaseOrder): void {
    this.confirm.confirm({
      message: `Delete PO "${row.poNumber}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deletePo(row.id).subscribe({ next: () => this.refresh() }),
    });
  }
}

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
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
  CreateGoodsReceiptNoteDto,
  GoodsReceiptNote,
  GoodsReceiptStatus,
  PurchaseOrder,
} from '@org/shared-types';
import { ProcurementService } from './procurement.service';

const STATUSES: { label: string; value: GoodsReceiptStatus }[] = [
  { label: 'Received', value: 'received' },
  { label: 'Inspected', value: 'inspected' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Partial', value: 'partial' },
];

const STATUS_SEVERITY: Record<GoodsReceiptStatus, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
  received: 'info',
  inspected: 'info',
  accepted: 'success',
  rejected: 'danger',
  partial: 'warn',
};

@Component({
  selector: 'app-grn-tab',
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
        <p-button label="New GRN" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows>
        <ng-template pTemplate="header">
          <tr>
            <th>GRN #</th><th>PO #</th><th>Received Date</th><th>Invoice</th>
            <th>Items</th><th>Status</th><th class="w-32">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-mono text-sm">{{ row.grnNumber }}</td>
            <td class="font-mono text-sm">{{ row.poNumber }}</td>
            <td>{{ row.receivedDate | date:'mediumDate' }}</td>
            <td>{{ row.invoiceNumber || '—' }}</td>
            <td>{{ row.items.length }}</td>
            <td><p-tag [value]="row.status" [severity]="severityFor(row.status)" /></td>
            <td>
              <p-button icon="pi pi-trash" severity="danger" text rounded (onClick)="confirmDelete(row)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7" class="text-center text-slate-500 py-8">No GRNs yet.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '54rem' }" header="New GRN">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">GRN Number *</label>
            <input pInputText class="w-full" formControlName="grnNumber" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Against PO *</label>
            <p-select [options]="pos()" formControlName="poId" optionLabel="poNumber" optionValue="id"
              [filter]="true" filterBy="poNumber" placeholder="Select PO" styleClass="w-full"
              (onChange)="onPoChange()" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Status</label>
            <p-select [options]="statuses" formControlName="status" optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Received Date</label>
            <p-datepicker formControlName="receivedDate" appendTo="body" dateFormat="yy-mm-dd" styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Received By</label>
            <input pInputText class="w-full" formControlName="receivedBy" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Invoice #</label>
            <input pInputText class="w-full" formControlName="invoiceNumber" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Challan #</label>
          <input pInputText class="w-full" formControlName="challanNumber" />
        </div>

        <div class="border-t pt-3">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-base font-semibold text-slate-900">Receipt Lines</h3>
          </div>
          <div *ngIf="items.length === 0" class="text-center text-slate-500 py-4 text-sm">
            Select a PO above to load its items.
          </div>
          <div formArrayName="items" class="space-y-2">
            <div *ngFor="let it of items.controls; let i = index" [formGroupName]="i"
              class="grid grid-cols-12 gap-2 items-end border border-slate-200 rounded p-2 bg-slate-50">
              <div class="col-span-4">
                <div class="text-xs font-medium text-slate-700 mb-1">Item</div>
                <div class="font-medium">{{ itemNameFor(i) }}</div>
                <div class="text-xs text-slate-500 font-mono">{{ itemCodeFor(i) }}</div>
              </div>
              <div class="col-span-2">
                <label class="text-xs font-medium text-slate-700 mb-1 block">Ordered</label>
                <div class="text-sm">{{ orderedFor(i) }}</div>
              </div>
              <div class="col-span-2">
                <label class="text-xs font-medium text-slate-700 mb-1 block">Received *</label>
                <p-inputNumber formControlName="receivedQuantity" [min]="0" mode="decimal" [maxFractionDigits]="4"
                  styleClass="w-full" [inputStyle]="{ width: '100%' }" />
              </div>
              <div class="col-span-2">
                <label class="text-xs font-medium text-slate-700 mb-1 block">Accepted</label>
                <p-inputNumber formControlName="acceptedQuantity" [min]="0" mode="decimal" [maxFractionDigits]="4"
                  styleClass="w-full" [inputStyle]="{ width: '100%' }" />
              </div>
              <div class="col-span-2">
                <label class="text-xs font-medium text-slate-700 mb-1 block">Rejected</label>
                <p-inputNumber formControlName="rejectedQuantity" [min]="0" mode="decimal" [maxFractionDigits]="4"
                  styleClass="w-full" [inputStyle]="{ width: '100%' }" />
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
          <p-button type="submit" label="Save" [loading]="saving()" [disabled]="form.invalid || items.length === 0" />
        </div>
      </form>
    </p-dialog>

    <p-confirmDialog />
  `,
})
export class GrnTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProcurementService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<GoodsReceiptNote[]>([]);
  readonly pos = signal<PurchaseOrder[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly statuses = STATUSES;

  dialogOpen = false;
  selectedPo: PurchaseOrder | null = null;

  readonly form: FormGroup = this.fb.group({
    grnNumber: ['', [Validators.required, Validators.maxLength(60)]],
    poId: ['', Validators.required],
    receivedDate: [new Date()],
    receivedBy: [''],
    invoiceNumber: [''],
    challanNumber: [''],
    status: ['received' as GoodsReceiptStatus, Validators.required],
    notes: [''],
    items: this.fb.array<FormGroup>([]),
  });

  get items(): FormArray<FormGroup> {
    return this.form.get('items') as FormArray<FormGroup>;
  }

  ngOnInit(): void {
    this.refresh();
    this.api.listPos().subscribe((p) =>
      this.pos.set(p.filter((po) => po.status !== 'cancelled' && po.status !== 'closed')),
    );
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listGrns().subscribe({
      next: (r) => {
        this.rows.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  severityFor(s: GoodsReceiptStatus) {
    return STATUS_SEVERITY[s] ?? 'info';
  }

  onPoChange(): void {
    const poId = this.form.get('poId')?.value as string;
    const po = this.pos().find((p) => p.id === poId) ?? null;
    this.selectedPo = po;
    this.items.clear();
    if (!po) return;
    for (const it of po.items) {
      const remaining = Math.max(0, Number(it.quantity) - Number(it.receivedQuantity ?? 0));
      this.items.push(
        this.fb.group({
          poItemId: [it.id],
          itemId: [it.itemId],
          receivedQuantity: [remaining, [Validators.required, Validators.min(0)]],
          acceptedQuantity: [remaining, [Validators.min(0)]],
          rejectedQuantity: [0, [Validators.min(0)]],
        }),
      );
    }
  }

  itemNameFor(i: number): string {
    if (!this.selectedPo) return '—';
    const it = this.selectedPo.items[i];
    return it?.itemName ?? '—';
  }
  itemCodeFor(i: number): string {
    if (!this.selectedPo) return '';
    return this.selectedPo.items[i]?.itemCode ?? '';
  }
  orderedFor(i: number): string {
    if (!this.selectedPo) return '—';
    const it = this.selectedPo.items[i];
    return `${it?.quantity ?? 0} ${it?.uom ?? ''}`;
  }

  openCreate(): void {
    this.form.reset({
      grnNumber: '', poId: '', receivedDate: new Date(),
      receivedBy: '', invoiceNumber: '', challanNumber: '',
      status: 'received', notes: '',
    });
    this.items.clear();
    this.selectedPo = null;
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
    const dto: CreateGoodsReceiptNoteDto = {
      grnNumber: v.grnNumber,
      poId: v.poId,
      receivedDate: this.toIso(v.receivedDate),
      receivedBy: v.receivedBy || undefined,
      invoiceNumber: v.invoiceNumber || undefined,
      challanNumber: v.challanNumber || undefined,
      status: v.status,
      notes: v.notes || undefined,
      items: (v.items as Array<{
        poItemId: string;
        itemId: string;
        receivedQuantity: number;
        acceptedQuantity: number;
        rejectedQuantity: number;
      }>).map((it) => ({
        poItemId: it.poItemId,
        itemId: it.itemId,
        receivedQuantity: Number(it.receivedQuantity),
        acceptedQuantity: Number(it.acceptedQuantity ?? 0),
        rejectedQuantity: Number(it.rejectedQuantity ?? 0),
      })),
    };
    this.api.createGrn(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(row: GoodsReceiptNote): void {
    this.confirm.confirm({
      message: `Delete GRN "${row.grnNumber}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteGrn(row.id).subscribe({ next: () => this.refresh() }),
    });
  }
}

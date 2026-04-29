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
  BuyerOrder,
  CreateShipmentDto,
  PackingList,
  Shipment,
  ShipmentMode,
  ShipmentStatus,
} from '@org/shared-types';
import { ShipmentApiService } from './shipment.service';
import { OrdersService } from '../orders/orders.service';

const MODES: { label: string; value: ShipmentMode }[] = [
  { label: 'Sea', value: 'sea' },
  { label: 'Air', value: 'air' },
  { label: 'Road', value: 'road' },
];

const STATUSES: { label: string; value: ShipmentStatus }[] = [
  { label: 'Planned', value: 'planned' },
  { label: 'In Transit', value: 'in_transit' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

const STATUS_SEVERITY: Record<ShipmentStatus, 'info' | 'success' | 'warn' | 'danger' | 'secondary'> = {
  planned: 'secondary',
  in_transit: 'warn',
  delivered: 'success',
  cancelled: 'danger',
};

@Component({
  selector: 'app-shipments-tab',
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
        <p-button label="New Shipment" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows>
        <ng-template pTemplate="header">
          <tr>
            <th>Shipment #</th><th>Order</th><th>PL</th><th>Mode</th>
            <th>Forwarder</th><th>BL/AWB</th>
            <th>POL → POD</th>
            <th>ETD</th><th>ETA</th>
            <th class="text-right">Invoice (USD)</th>
            <th>Status</th>
            <th class="w-16"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-mono text-sm">{{ row.shipmentNumber }}</td>
            <td><span class="font-mono text-xs">{{ row.buyerOrderNumber || '—' }}</span></td>
            <td><span class="font-mono text-xs">{{ row.packingListNumber || '—' }}</span></td>
            <td><p-tag [value]="row.mode" severity="info" /></td>
            <td class="text-sm">{{ row.forwarder || '—' }}</td>
            <td class="font-mono text-xs">{{ row.blAwbNumber || '—' }}</td>
            <td class="text-xs">
              <span *ngIf="row.portOfLoading || row.portOfDischarge">
                {{ row.portOfLoading || '?' }} → {{ row.portOfDischarge || '?' }}
              </span>
              <span *ngIf="!row.portOfLoading && !row.portOfDischarge" class="text-slate-400">—</span>
            </td>
            <td class="text-sm">{{ row.etd || '—' }}</td>
            <td class="text-sm">{{ row.eta || '—' }}</td>
            <td class="text-right">
              <span *ngIf="row.invoiceValueUsd !== null">$ {{ row.invoiceValueUsd | number:'1.2-2' }}</span>
              <span *ngIf="row.invoiceValueUsd === null" class="text-slate-400">—</span>
            </td>
            <td><p-tag [value]="row.status" [severity]="statusSeverity(row.status)" /></td>
            <td>
              <p-button icon="pi pi-trash" severity="danger" text rounded size="small"
                (onClick)="confirmDelete(row)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="12" class="text-center text-slate-500 py-8">No shipments yet.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '52rem' }" header="New Shipment">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Shipment # *</label>
            <input pInputText class="w-full" formControlName="shipmentNumber" placeholder="SHP-2026-001" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Mode</label>
            <p-select [options]="modes" formControlName="mode"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Status</label>
            <p-select [options]="statuses" formControlName="status"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Buyer Order</label>
            <p-select [options]="orders()" formControlName="buyerOrderId"
              optionLabel="orderNumber" optionValue="id" [filter]="true" filterBy="orderNumber"
              [showClear]="true" placeholder="(optional)" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Packing List</label>
            <p-select [options]="packingLists()" formControlName="packingListId"
              optionLabel="plNumber" optionValue="id" [filter]="true" filterBy="plNumber"
              [showClear]="true" placeholder="(optional)" styleClass="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Forwarder</label>
            <input pInputText class="w-full" formControlName="forwarder" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">BL / AWB #</label>
            <input pInputText class="w-full" formControlName="blAwbNumber" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Container</label>
            <input pInputText class="w-full" formControlName="containerNumber" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Port of Loading</label>
            <input pInputText class="w-full" formControlName="portOfLoading" placeholder="Chittagong" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Port of Discharge</label>
            <input pInputText class="w-full" formControlName="portOfDischarge" placeholder="Hamburg" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">ETD</label>
            <p-datepicker formControlName="etd" appendTo="body" dateFormat="yy-mm-dd"
              [inputStyle]="{ width: '100%' }" [showClear]="true" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">ETA</label>
            <p-datepicker formControlName="eta" appendTo="body" dateFormat="yy-mm-dd"
              [inputStyle]="{ width: '100%' }" [showClear]="true" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Actual Ship Date</label>
            <p-datepicker formControlName="actualShipDate" appendTo="body" dateFormat="yy-mm-dd"
              [inputStyle]="{ width: '100%' }" [showClear]="true" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Invoice #</label>
            <input pInputText class="w-full" formControlName="invoiceNumber" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Invoice Value (USD)</label>
            <p-inputNumber formControlName="invoiceValueUsd" [min]="0" [maxFractionDigits]="2"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" mode="currency" currency="USD" />
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
export class ShipmentsTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ShipmentApiService);
  private readonly ordersApi = inject(OrdersService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<Shipment[]>([]);
  readonly orders = signal<BuyerOrder[]>([]);
  readonly packingLists = signal<PackingList[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly modes = MODES;
  readonly statuses = STATUSES;

  dialogOpen = false;

  readonly form = this.fb.group({
    shipmentNumber: ['', [Validators.required, Validators.maxLength(40)]],
    buyerOrderId: [null as string | null],
    packingListId: [null as string | null],
    mode: ['sea' as ShipmentMode],
    forwarder: [''],
    blAwbNumber: [''],
    containerNumber: [''],
    portOfLoading: [''],
    portOfDischarge: [''],
    eta: [null as Date | null],
    etd: [null as Date | null],
    actualShipDate: [null as Date | null],
    invoiceNumber: [''],
    invoiceValueUsd: [null as number | null],
    status: ['planned' as ShipmentStatus],
    notes: [''],
  });

  ngOnInit(): void {
    this.refresh();
    this.ordersApi.list().subscribe((o) => this.orders.set(o));
    this.api.listPackingLists().subscribe((p) => this.packingLists.set(p));
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listShipments().subscribe({
      next: (r) => {
        this.rows.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  statusSeverity(s: ShipmentStatus): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
    return STATUS_SEVERITY[s];
  }

  openCreate(): void {
    const seq = String(this.rows().length + 1).padStart(3, '0');
    this.form.reset({
      shipmentNumber: `SHP-${new Date().getFullYear()}-${seq}`,
      buyerOrderId: null,
      packingListId: null,
      mode: 'sea',
      forwarder: '',
      blAwbNumber: '',
      containerNumber: '',
      portOfLoading: 'Chittagong',
      portOfDischarge: '',
      eta: null,
      etd: null,
      actualShipDate: null,
      invoiceNumber: '',
      invoiceValueUsd: null,
      status: 'planned',
      notes: '',
    });
    this.dialogOpen = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const dto: CreateShipmentDto = {
      shipmentNumber: v.shipmentNumber!,
      buyerOrderId: v.buyerOrderId || undefined,
      packingListId: v.packingListId || undefined,
      mode: v.mode || 'sea',
      forwarder: v.forwarder || undefined,
      blAwbNumber: v.blAwbNumber || undefined,
      containerNumber: v.containerNumber || undefined,
      portOfLoading: v.portOfLoading || undefined,
      portOfDischarge: v.portOfDischarge || undefined,
      eta: v.eta ? this.toIso(v.eta) : undefined,
      etd: v.etd ? this.toIso(v.etd) : undefined,
      actualShipDate: v.actualShipDate ? this.toIso(v.actualShipDate) : undefined,
      invoiceNumber: v.invoiceNumber || undefined,
      invoiceValueUsd: v.invoiceValueUsd !== null && v.invoiceValueUsd !== undefined ? Number(v.invoiceValueUsd) : undefined,
      status: v.status || 'planned',
      notes: v.notes || undefined,
    };
    this.api.createShipment(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(row: Shipment): void {
    this.confirm.confirm({
      message: `Delete shipment "${row.shipmentNumber}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteShipment(row.id).subscribe({ next: () => this.refresh() }),
    });
  }

  private toIso(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}

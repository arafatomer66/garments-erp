import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import type {
  BuyerOrder,
  CreateExportDocumentDto,
  ExportDocStatus,
  ExportDocType,
  ExportDocument,
  Shipment,
} from '@org/shared-types';
import { ShipmentApiService } from './shipment.service';
import { OrdersService } from '../orders/orders.service';

const TYPES: { label: string; value: ExportDocType }[] = [
  { label: 'Certificate of Origin (CO)', value: 'co' },
  { label: 'GSP Form A', value: 'gsp' },
  { label: 'EXP Form (BD Bank)', value: 'exp' },
  { label: 'Commercial Invoice', value: 'commercial_invoice' },
  { label: 'Packing List Document', value: 'packing_list_doc' },
  { label: 'BL / AWB', value: 'bl_awb' },
  { label: 'Other', value: 'other' },
];

const STATUSES: { label: string; value: ExportDocStatus }[] = [
  { label: 'Draft', value: 'draft' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const STATUS_SEVERITY: Record<ExportDocStatus, 'info' | 'success' | 'warn' | 'danger' | 'secondary'> = {
  draft: 'secondary',
  submitted: 'info',
  approved: 'success',
  rejected: 'danger',
};

@Component({
  selector: 'app-export-documents-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule,
    TextareaModule, SelectModule, DatePickerModule, TagModule, ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3">
      <div class="flex justify-end">
        <p-button label="New Document" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows>
        <ng-template pTemplate="header">
          <tr>
            <th>Doc #</th><th>Type</th><th>Order</th><th>Shipment</th>
            <th>Issued</th><th>Issued By</th>
            <th>Reference</th><th>Expiry</th>
            <th>Status</th><th>File</th>
            <th class="w-16"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-mono text-sm">{{ row.docNumber }}</td>
            <td><p-tag [value]="docTypeLabel(row.docType)" severity="info" /></td>
            <td><span class="font-mono text-xs">{{ row.buyerOrderNumber || '—' }}</span></td>
            <td><span class="font-mono text-xs">{{ row.shipmentNumber || '—' }}</span></td>
            <td class="text-sm">{{ row.issuedDate }}</td>
            <td class="text-sm">{{ row.issuedBy || '—' }}</td>
            <td class="text-sm">{{ row.referenceNumber || '—' }}</td>
            <td class="text-sm">{{ row.expiryDate || '—' }}</td>
            <td><p-tag [value]="row.status" [severity]="statusSeverity(row.status)" /></td>
            <td>
              <a *ngIf="row.fileUrl" [href]="row.fileUrl" target="_blank"
                class="text-blue-600 hover:underline text-sm flex items-center gap-1">
                <i class="pi pi-external-link text-xs"></i> View
              </a>
              <span *ngIf="!row.fileUrl" class="text-slate-400">—</span>
            </td>
            <td>
              <p-button icon="pi pi-trash" severity="danger" text rounded size="small"
                (onClick)="confirmDelete(row)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="11" class="text-center text-slate-500 py-8">No export documents yet.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '40rem' }" header="New Export Document">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Doc # *</label>
            <input pInputText class="w-full" formControlName="docNumber" placeholder="CO-2026-001" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Type *</label>
            <p-select [options]="types" formControlName="docType"
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
            <label class="text-sm font-medium text-slate-700 mb-1 block">Shipment</label>
            <p-select [options]="shipments()" formControlName="shipmentId"
              optionLabel="shipmentNumber" optionValue="id" [filter]="true" filterBy="shipmentNumber"
              [showClear]="true" placeholder="(optional)" styleClass="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Issued Date</label>
            <p-datepicker formControlName="issuedDate" appendTo="body" dateFormat="yy-mm-dd"
              [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Expiry Date</label>
            <p-datepicker formControlName="expiryDate" appendTo="body" dateFormat="yy-mm-dd"
              [inputStyle]="{ width: '100%' }" [showClear]="true" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Status</label>
            <p-select [options]="statuses" formControlName="status"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Issued By</label>
            <input pInputText class="w-full" formControlName="issuedBy" placeholder="BGMEA / EPB / Bank" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Reference #</label>
            <input pInputText class="w-full" formControlName="referenceNumber" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">File URL</label>
          <input pInputText class="w-full" formControlName="fileUrl" placeholder="https://… (S3 link or scan)" />
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
export class ExportDocumentsTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ShipmentApiService);
  private readonly ordersApi = inject(OrdersService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<ExportDocument[]>([]);
  readonly orders = signal<BuyerOrder[]>([]);
  readonly shipments = signal<Shipment[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly types = TYPES;
  readonly statuses = STATUSES;

  dialogOpen = false;

  readonly form = this.fb.group({
    docNumber: ['', [Validators.required, Validators.maxLength(60)]],
    docType: ['co' as ExportDocType, Validators.required],
    buyerOrderId: [null as string | null],
    shipmentId: [null as string | null],
    issuedDate: [new Date()],
    expiryDate: [null as Date | null],
    issuedBy: [''],
    referenceNumber: [''],
    fileUrl: [''],
    status: ['draft' as ExportDocStatus],
    notes: [''],
  });

  ngOnInit(): void {
    this.refresh();
    this.ordersApi.list().subscribe((o) => this.orders.set(o));
    this.api.listShipments().subscribe((s) => this.shipments.set(s));
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listExportDocuments().subscribe({
      next: (r) => {
        this.rows.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  docTypeLabel(t: ExportDocType): string {
    return TYPES.find((x) => x.value === t)?.label ?? t;
  }

  statusSeverity(s: ExportDocStatus): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
    return STATUS_SEVERITY[s];
  }

  openCreate(): void {
    const seq = String(this.rows().length + 1).padStart(3, '0');
    this.form.reset({
      docNumber: `DOC-${new Date().getFullYear()}-${seq}`,
      docType: 'co',
      buyerOrderId: null,
      shipmentId: null,
      issuedDate: new Date(),
      expiryDate: null,
      issuedBy: '',
      referenceNumber: '',
      fileUrl: '',
      status: 'draft',
      notes: '',
    });
    this.dialogOpen = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const dto: CreateExportDocumentDto = {
      docNumber: v.docNumber!,
      docType: v.docType!,
      buyerOrderId: v.buyerOrderId || undefined,
      shipmentId: v.shipmentId || undefined,
      issuedDate: v.issuedDate ? this.toIso(v.issuedDate) : undefined,
      expiryDate: v.expiryDate ? this.toIso(v.expiryDate) : undefined,
      issuedBy: v.issuedBy || undefined,
      referenceNumber: v.referenceNumber || undefined,
      fileUrl: v.fileUrl || undefined,
      status: v.status || 'draft',
      notes: v.notes || undefined,
    };
    this.api.createExportDocument(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(row: ExportDocument): void {
    this.confirm.confirm({
      message: `Delete document "${row.docNumber}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteExportDocument(row.id).subscribe({ next: () => this.refresh() }),
    });
  }

  private toIso(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}

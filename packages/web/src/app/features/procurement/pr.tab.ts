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
  CreatePurchaseRequisitionDto,
  Item,
  PurchaseRequisition,
  PurchaseRequisitionStatus,
  Style,
} from '@org/shared-types';
import { ProcurementService } from './procurement.service';
import { MastersService } from '../masters/masters.service';
import { MerchandisingService } from '../merchandising/merchandising.service';

const STATUSES: { label: string; value: PurchaseRequisitionStatus }[] = [
  { label: 'Draft', value: 'draft' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Approved', value: 'approved' },
  { label: 'Converted', value: 'converted' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Cancelled', value: 'cancelled' },
];

const STATUS_SEVERITY: Record<PurchaseRequisitionStatus, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
  draft: 'secondary',
  submitted: 'info',
  approved: 'success',
  converted: 'success',
  rejected: 'danger',
  cancelled: 'danger',
};

@Component({
  selector: 'app-pr-tab',
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
        <p-button label="New PR" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows>
        <ng-template pTemplate="header">
          <tr>
            <th>PR #</th><th>Date</th><th>Required By</th><th>Style</th>
            <th>Items</th><th>Est. Cost</th><th>Status</th><th class="w-32">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-mono text-sm">{{ row.prNumber }}</td>
            <td>{{ row.requestDate | date:'mediumDate' }}</td>
            <td>{{ row.requiredBy ? (row.requiredBy | date:'mediumDate') : '—' }}</td>
            <td>{{ styleName(row.styleId) }}</td>
            <td>{{ row.items.length }}</td>
            <td>{{ row.totalEstimatedCost | number:'1.2-2' }}</td>
            <td><p-tag [value]="row.status" [severity]="severityFor(row.status)" /></td>
            <td>
              <p-button icon="pi pi-pencil" severity="secondary" text rounded (onClick)="openEdit(row)" />
              <p-button icon="pi pi-trash" severity="danger" text rounded (onClick)="confirmDelete(row)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8" class="text-center text-slate-500 py-8">No purchase requisitions yet.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '50rem' }"
      [header]="editingId() ? 'Edit PR' : 'New Purchase Requisition'">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">PR Number *</label>
            <input pInputText class="w-full" formControlName="prNumber" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Status</label>
            <p-select [options]="statuses" formControlName="status" optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Department</label>
            <input pInputText class="w-full" formControlName="department" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Requested By</label>
            <input pInputText class="w-full" formControlName="requestedBy" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Request Date</label>
            <p-datepicker formControlName="requestDate" appendTo="body" dateFormat="yy-mm-dd" styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Required By</label>
            <p-datepicker formControlName="requiredBy" appendTo="body" dateFormat="yy-mm-dd" styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Style (optional)</label>
          <p-select [options]="styles()" formControlName="styleId" optionLabel="name" optionValue="id"
            [showClear]="true" placeholder="Link to a style" styleClass="w-full" />
        </div>

        <div class="border-t pt-3">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-base font-semibold text-slate-900">Items</h3>
            <p-button label="Add Item" icon="pi pi-plus" size="small" severity="secondary" (onClick)="addItem()" />
          </div>
          <div formArrayName="items" class="space-y-2">
            <div *ngFor="let it of items.controls; let i = index" [formGroupName]="i"
              class="grid grid-cols-12 gap-2 items-end border border-slate-200 rounded p-2 bg-slate-50">
              <div class="col-span-4">
                <label class="text-xs font-medium text-slate-700 mb-1 block">Item *</label>
                <p-select [options]="itemList()" formControlName="itemId" optionLabel="name" optionValue="id"
                  [filter]="true" filterBy="code,name" placeholder="Select" styleClass="w-full" />
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
                <label class="text-xs font-medium text-slate-700 mb-1 block">Est. Cost</label>
                <p-inputNumber formControlName="estimatedCost" [min]="0" mode="decimal" [minFractionDigits]="2" [maxFractionDigits]="4"
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
export class PrTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProcurementService);
  private readonly mastersApi = inject(MastersService);
  private readonly mdApi = inject(MerchandisingService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<PurchaseRequisition[]>([]);
  readonly itemList = signal<Item[]>([]);
  readonly styles = signal<Style[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly statuses = STATUSES;

  readonly styleLookup = computed(() => {
    const map = new Map<string, string>();
    for (const s of this.styles()) map.set(s.id, s.code);
    return map;
  });

  dialogOpen = false;

  readonly form: FormGroup = this.fb.group({
    prNumber: ['', [Validators.required, Validators.maxLength(60)]],
    requestedBy: [''],
    department: [''],
    styleId: [null as string | null],
    requestDate: [new Date()],
    requiredBy: [null as Date | null],
    status: ['draft' as PurchaseRequisitionStatus, Validators.required],
    notes: [''],
    items: this.fb.array([this.makeItem()]),
  });

  get items(): FormArray<FormGroup> {
    return this.form.get('items') as FormArray<FormGroup>;
  }

  ngOnInit(): void {
    this.refresh();
    this.mastersApi.listItems().subscribe((it) => this.itemList.set(it));
    this.mdApi.listStyles().subscribe((s) => this.styles.set(s));
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listPrs().subscribe({
      next: (r) => {
        this.rows.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  styleName(id: string | null): string {
    if (!id) return '—';
    return this.styleLookup().get(id) ?? '—';
  }
  severityFor(s: PurchaseRequisitionStatus) {
    return STATUS_SEVERITY[s] ?? 'info';
  }

  private makeItem(): FormGroup {
    return this.fb.group({
      itemId: ['', Validators.required],
      quantity: [0, [Validators.required, Validators.min(0)]],
      uom: ['pcs', [Validators.required, Validators.maxLength(16)]],
      estimatedCost: [0],
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
      prNumber: '', requestedBy: '', department: '', styleId: null,
      requestDate: new Date(), requiredBy: null, status: 'draft', notes: '',
    });
    this.items.clear();
    this.addItem();
    this.dialogOpen = true;
  }

  openEdit(row: PurchaseRequisition): void {
    this.editingId.set(row.id);
    this.form.patchValue({
      prNumber: row.prNumber,
      requestedBy: row.requestedBy ?? '',
      department: row.department ?? '',
      styleId: row.styleId,
      requestDate: row.requestDate ? new Date(row.requestDate) : null,
      requiredBy: row.requiredBy ? new Date(row.requiredBy) : null,
      status: row.status,
      notes: row.notes ?? '',
    });
    this.items.clear();
    for (const it of row.items) {
      const g = this.makeItem();
      g.patchValue({
        itemId: it.itemId,
        quantity: Number(it.quantity),
        uom: it.uom,
        estimatedCost: Number(it.estimatedCost ?? 0),
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
    const dto: CreatePurchaseRequisitionDto = {
      prNumber: v.prNumber,
      requestedBy: v.requestedBy || undefined,
      department: v.department || undefined,
      styleId: v.styleId || undefined,
      requestDate: this.toIso(v.requestDate),
      requiredBy: this.toIso(v.requiredBy),
      status: v.status,
      notes: v.notes || undefined,
      items: (v.items as Array<{ itemId: string; quantity: number; uom: string; estimatedCost: number; notes: string }>).map((it) => ({
        itemId: it.itemId,
        quantity: Number(it.quantity),
        uom: it.uom,
        estimatedCost: Number(it.estimatedCost ?? 0),
        notes: it.notes || undefined,
      })),
    };
    const op$ = this.editingId()
      ? this.api.updatePr(this.editingId()!, dto)
      : this.api.createPr(dto);
    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(row: PurchaseRequisition): void {
    this.confirm.confirm({
      message: `Delete PR "${row.prNumber}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deletePr(row.id).subscribe({ next: () => this.refresh() }),
    });
  }
}

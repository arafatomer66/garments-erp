import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
  CreatePackingListCartonDto,
  CreatePackingListDto,
  PackingList,
  PackingListStatus,
  Style,
} from '@org/shared-types';
import { ShipmentApiService } from './shipment.service';
import { OrdersService } from '../orders/orders.service';
import { MerchandisingService } from '../merchandising/merchandising.service';

const STATUSES: { label: string; value: PackingListStatus }[] = [
  { label: 'Draft', value: 'draft' },
  { label: 'Finalized', value: 'finalized' },
  { label: 'Shipped', value: 'shipped' },
];

const STATUS_SEVERITY: Record<PackingListStatus, 'info' | 'success' | 'secondary'> = {
  draft: 'secondary',
  finalized: 'info',
  shipped: 'success',
};

interface CartonFormShape {
  cartonNumber: FormControl<string>;
  sizeLabel: FormControl<string | null>;
  color: FormControl<string | null>;
  quantity: FormControl<number>;
  grossWeightKg: FormControl<number>;
  netWeightKg: FormControl<number>;
  lengthCm: FormControl<number | null>;
  widthCm: FormControl<number | null>;
  heightCm: FormControl<number | null>;
}

@Component({
  selector: 'app-packing-lists-tab',
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
        <p-button label="New Packing List" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows
        [expandedRowKeys]="expanded" dataKey="id">
        <ng-template pTemplate="header">
          <tr>
            <th class="w-8"></th>
            <th>PL #</th><th>Order</th><th>Style</th><th>Pack Date</th>
            <th class="text-right">Cartons</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Gross Wt</th>
            <th class="text-right">CBM</th>
            <th>Status</th>
            <th class="w-16"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td>
              <p-button [icon]="isExpanded(row.id) ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                text rounded size="small" (onClick)="toggleRow(row.id)" />
            </td>
            <td class="font-mono text-sm">{{ row.plNumber }}</td>
            <td><span class="font-mono text-xs">{{ row.buyerOrderNumber || '—' }}</span></td>
            <td><span class="font-mono text-xs">{{ row.styleCode || '—' }}</span></td>
            <td class="text-sm">{{ row.packDate }}</td>
            <td class="text-right">{{ row.totalCartons | number }}</td>
            <td class="text-right font-semibold">{{ row.totalQuantity | number }}</td>
            <td class="text-right">{{ row.grossWeightKg | number:'1.2-2' }} kg</td>
            <td class="text-right">{{ row.cbm | number:'1.2-4' }}</td>
            <td><p-tag [value]="row.status" [severity]="statusSeverity(row.status)" /></td>
            <td>
              <p-button icon="pi pi-trash" severity="danger" text rounded size="small"
                (onClick)="confirmDelete(row)" />
            </td>
          </tr>
          <tr *ngIf="isExpanded(row.id) && row.cartons?.length">
            <td colspan="11" class="bg-slate-50 p-3">
              <div class="text-xs uppercase text-slate-500 mb-2 font-medium">Cartons</div>
              <div class="overflow-x-auto">
                <table class="w-full text-sm border border-slate-200 rounded bg-white">
                  <thead class="text-left text-xs text-slate-600 border-b border-slate-200">
                    <tr>
                      <th class="px-2 py-1">Carton #</th>
                      <th class="px-2 py-1">Size</th>
                      <th class="px-2 py-1">Color</th>
                      <th class="px-2 py-1 text-right">Qty</th>
                      <th class="px-2 py-1 text-right">Gross (kg)</th>
                      <th class="px-2 py-1 text-right">Net (kg)</th>
                      <th class="px-2 py-1 text-right">L×W×H (cm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let c of row.cartons" class="border-b border-slate-100 last:border-0">
                      <td class="px-2 py-1 font-mono">{{ c.cartonNumber }}</td>
                      <td class="px-2 py-1">{{ c.sizeLabel || '—' }}</td>
                      <td class="px-2 py-1">{{ c.color || '—' }}</td>
                      <td class="px-2 py-1 text-right">{{ c.quantity | number }}</td>
                      <td class="px-2 py-1 text-right">{{ c.grossWeightKg | number:'1.2-2' }}</td>
                      <td class="px-2 py-1 text-right">{{ c.netWeightKg | number:'1.2-2' }}</td>
                      <td class="px-2 py-1 text-right text-xs">
                        <span *ngIf="c.lengthCm">{{ c.lengthCm }} × {{ c.widthCm }} × {{ c.heightCm }}</span>
                        <span *ngIf="!c.lengthCm" class="text-slate-400">—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="11" class="text-center text-slate-500 py-8">No packing lists yet.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '64rem' }" header="New Packing List">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">PL # *</label>
            <input pInputText class="w-full" formControlName="plNumber" placeholder="PL-2026-001" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Pack Date</label>
            <p-datepicker formControlName="packDate" appendTo="body" dateFormat="yy-mm-dd"
              [inputStyle]="{ width: '100%' }" />
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
            <label class="text-sm font-medium text-slate-700 mb-1 block">Style</label>
            <p-select [options]="styles()" formControlName="styleId"
              optionLabel="name" optionValue="id" [filter]="true" filterBy="code,name"
              [showClear]="true" placeholder="(optional)" styleClass="w-full" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Invoice Number</label>
          <input pInputText class="w-full" formControlName="invoiceNumber" />
        </div>

        <div class="border-t pt-3 space-y-2">
          <div class="flex items-center justify-between">
            <div class="text-sm font-medium text-slate-700">Cartons</div>
            <div class="flex items-center gap-2 text-xs text-slate-600">
              <span>Total: <strong>{{ totals().qty | number }}</strong> pcs in <strong>{{ totals().count }}</strong> cartons</span>
              <span>·</span>
              <span>{{ totals().gross | number:'1.2-2' }} kg gross</span>
              <p-button label="Add Carton" icon="pi pi-plus" size="small"
                severity="secondary" (onClick)="addCarton()" />
            </div>
          </div>
          <div formArrayName="cartons" class="space-y-2 max-h-[28rem] overflow-y-auto">
            <div *ngFor="let g of cartons.controls; let i = index" [formGroupName]="i"
              class="grid grid-cols-12 gap-2 items-end bg-slate-50 rounded p-2">
              <div class="col-span-2">
                <label class="text-xs text-slate-600 block mb-1">Carton # *</label>
                <input pInputText class="w-full" formControlName="cartonNumber" />
              </div>
              <div class="col-span-1">
                <label class="text-xs text-slate-600 block mb-1">Size</label>
                <input pInputText class="w-full" formControlName="sizeLabel" />
              </div>
              <div class="col-span-1">
                <label class="text-xs text-slate-600 block mb-1">Color</label>
                <input pInputText class="w-full" formControlName="color" />
              </div>
              <div class="col-span-1">
                <label class="text-xs text-slate-600 block mb-1">Qty *</label>
                <p-inputNumber formControlName="quantity" [min]="1"
                  styleClass="w-full" [inputStyle]="{ width: '100%' }" />
              </div>
              <div class="col-span-1">
                <label class="text-xs text-slate-600 block mb-1">Gross kg</label>
                <p-inputNumber formControlName="grossWeightKg" [min]="0" [maxFractionDigits]="2"
                  styleClass="w-full" [inputStyle]="{ width: '100%' }" />
              </div>
              <div class="col-span-1">
                <label class="text-xs text-slate-600 block mb-1">Net kg</label>
                <p-inputNumber formControlName="netWeightKg" [min]="0" [maxFractionDigits]="2"
                  styleClass="w-full" [inputStyle]="{ width: '100%' }" />
              </div>
              <div class="col-span-1">
                <label class="text-xs text-slate-600 block mb-1">L cm</label>
                <p-inputNumber formControlName="lengthCm" [min]="0"
                  styleClass="w-full" [inputStyle]="{ width: '100%' }" />
              </div>
              <div class="col-span-1">
                <label class="text-xs text-slate-600 block mb-1">W cm</label>
                <p-inputNumber formControlName="widthCm" [min]="0"
                  styleClass="w-full" [inputStyle]="{ width: '100%' }" />
              </div>
              <div class="col-span-1">
                <label class="text-xs text-slate-600 block mb-1">H cm</label>
                <p-inputNumber formControlName="heightCm" [min]="0"
                  styleClass="w-full" [inputStyle]="{ width: '100%' }" />
              </div>
              <div class="col-span-2 text-right">
                <p-button icon="pi pi-trash" severity="danger" text rounded size="small"
                  (onClick)="removeCarton(i)" />
              </div>
            </div>
            <div *ngIf="cartons.length === 0" class="text-sm text-slate-500 italic px-2 py-3">
              No cartons added. Click "Add Carton" to start.
            </div>
          </div>
        </div>

        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Notes</label>
          <textarea pTextarea class="w-full" rows="2" formControlName="notes"></textarea>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t">
          <p-button label="Cancel" severity="secondary" (onClick)="dialogOpen = false" />
          <p-button type="submit" label="Save" [loading]="saving()"
            [disabled]="form.invalid || cartons.length === 0" />
        </div>
      </form>
    </p-dialog>

    <p-confirmDialog />
  `,
})
export class PackingListsTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ShipmentApiService);
  private readonly ordersApi = inject(OrdersService);
  private readonly merch = inject(MerchandisingService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<PackingList[]>([]);
  readonly orders = signal<BuyerOrder[]>([]);
  readonly styles = signal<Style[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly statuses = STATUSES;
  readonly cartonsLive = signal<unknown[]>([]);

  readonly totals = computed(() => {
    const list = (this.cartonsLive() as { quantity: number; grossWeightKg: number }[]) ?? [];
    let qty = 0;
    let gross = 0;
    for (const c of list) {
      qty += Number(c.quantity || 0);
      gross += Number(c.grossWeightKg || 0);
    }
    return { count: list.length, qty, gross };
  });

  dialogOpen = false;
  expanded: { [k: string]: boolean } = {};

  readonly form = this.fb.group({
    plNumber: ['', [Validators.required, Validators.maxLength(40)]],
    buyerOrderId: [null as string | null],
    styleId: [null as string | null],
    invoiceNumber: [''],
    packDate: [new Date()],
    status: ['draft' as PackingListStatus],
    notes: [''],
    cartons: this.fb.array<FormGroup<CartonFormShape>>([]),
  });

  get cartons(): FormArray<FormGroup<CartonFormShape>> {
    return this.form.controls.cartons as FormArray<FormGroup<CartonFormShape>>;
  }

  ngOnInit(): void {
    this.refresh();
    this.ordersApi.list().subscribe((o) => this.orders.set(o));
    this.merch.listStyles().subscribe((s) => this.styles.set(s));
    this.cartons.valueChanges.subscribe((v) => this.cartonsLive.set(v));
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listPackingLists().subscribe({
      next: (r) => {
        this.rows.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleRow(id: string): void {
    this.expanded = { ...this.expanded, [id]: !this.expanded[id] };
  }

  isExpanded(id: string): boolean {
    return !!this.expanded[id];
  }

  statusSeverity(s: PackingListStatus): 'info' | 'success' | 'secondary' {
    return STATUS_SEVERITY[s];
  }

  openCreate(): void {
    while (this.cartons.length) this.cartons.removeAt(0);
    const seq = String(this.rows().length + 1).padStart(3, '0');
    this.form.reset({
      plNumber: `PL-${new Date().getFullYear()}-${seq}`,
      buyerOrderId: null,
      styleId: null,
      invoiceNumber: '',
      packDate: new Date(),
      status: 'draft',
      notes: '',
      cartons: [],
    });
    this.dialogOpen = true;
  }

  addCarton(): void {
    const next = String(this.cartons.length + 1).padStart(3, '0');
    this.cartons.push(
      this.fb.nonNullable.group<CartonFormShape>({
        cartonNumber: this.fb.nonNullable.control(`CTN-${next}`, [Validators.required, Validators.maxLength(40)]),
        sizeLabel: this.fb.control<string | null>(''),
        color: this.fb.control<string | null>(''),
        quantity: this.fb.nonNullable.control(1, [Validators.required, Validators.min(1)]),
        grossWeightKg: this.fb.nonNullable.control(0, Validators.min(0)),
        netWeightKg: this.fb.nonNullable.control(0, Validators.min(0)),
        lengthCm: this.fb.control<number | null>(null),
        widthCm: this.fb.control<number | null>(null),
        heightCm: this.fb.control<number | null>(null),
      })
    );
  }

  removeCarton(i: number): void {
    this.cartons.removeAt(i);
  }

  submit(): void {
    if (this.form.invalid || this.cartons.length === 0) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const cartonDtos: CreatePackingListCartonDto[] = (v.cartons || []).map((c, i) => ({
      cartonNumber: c.cartonNumber!,
      sizeLabel: c.sizeLabel || undefined,
      color: c.color || undefined,
      quantity: Number(c.quantity ?? 0),
      grossWeightKg: Number(c.grossWeightKg ?? 0),
      netWeightKg: Number(c.netWeightKg ?? 0),
      lengthCm: c.lengthCm !== null && c.lengthCm !== undefined ? Number(c.lengthCm) : undefined,
      widthCm: c.widthCm !== null && c.widthCm !== undefined ? Number(c.widthCm) : undefined,
      heightCm: c.heightCm !== null && c.heightCm !== undefined ? Number(c.heightCm) : undefined,
      sortOrder: i + 1,
    }));
    const dto: CreatePackingListDto = {
      plNumber: v.plNumber!,
      buyerOrderId: v.buyerOrderId || undefined,
      styleId: v.styleId || undefined,
      invoiceNumber: v.invoiceNumber || undefined,
      packDate: v.packDate ? this.toIso(v.packDate) : undefined,
      status: v.status || 'draft',
      notes: v.notes || undefined,
      cartons: cartonDtos,
    };
    this.api.createPackingList(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(row: PackingList): void {
    this.confirm.confirm({
      message: `Delete packing list "${row.plNumber}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deletePackingList(row.id).subscribe({ next: () => this.refresh() }),
    });
  }

  private toIso(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}

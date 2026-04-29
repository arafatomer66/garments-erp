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
import { DialogModule } from 'primeng/dialog';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { PageIntroComponent } from '../../shared/page-intro.component';
import type {
  Buyer,
  BuyerOrder,
  BuyerOrderStatus,
  CreateBuyerOrderDto,
  Style,
} from '@org/shared-types';
import { OrdersService } from './orders.service';
import { MastersService } from '../masters/masters.service';
import { MerchandisingService } from '../merchandising/merchandising.service';

const STATUS_OPTIONS: { label: string; value: BuyerOrderStatus }[] = [
  { label: 'Draft', value: 'draft' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'In Production', value: 'in_production' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Closed', value: 'closed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const STATUS_SEVERITY: Record<BuyerOrderStatus, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
  draft: 'secondary',
  confirmed: 'info',
  in_production: 'warn',
  shipped: 'success',
  closed: 'success',
  cancelled: 'danger',
};

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    CardModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    TagModule,
    SelectModule,
    DatePickerModule,
    ConfirmDialogModule,
    PageIntroComponent,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-intro
        title="Orders"
        icon="pi-shopping-cart"
        description="Buyer purchase orders with size break, colour combinations, FOB pricing, and ship-window dates. Every downstream module ties to the order line."
        [bullets]="[
          'Multi-size / multi-colour quantity matrix',
          'FOB or CIF pricing in buyer currency',
          'Status: draft → confirmed → in-production → shipped',
          'Auto-link to BOM, packing list, and invoice'
        ]"
        example="H&amp;M PO-HM-2026-001 for 18,000 pcs of TS-CREW-180GSM, 4 sizes × 3 colours, FOB Chittagong USD 5.65/pc, ship 20–30 Jun."
      ></app-page-intro>
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-slate-900">Order list</h2>
        <p-button label="New Order" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      <p-card>
        <p-table [value]="rows()" [loading]="loading()" stripedRows>
          <ng-template pTemplate="header">
            <tr>
              <th>PO #</th><th>Buyer</th><th>Order Date</th><th>Delivery</th>
              <th>Lines</th><th>Total Qty</th><th>Total Value</th><th>Status</th>
              <th class="w-32">Actions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr>
              <td class="font-mono text-sm">{{ row.poNumber }}</td>
              <td>{{ buyerName(row.buyerId) }}</td>
              <td>{{ row.orderDate | date:'mediumDate' }}</td>
              <td>{{ row.deliveryDate ? (row.deliveryDate | date:'mediumDate') : '—' }}</td>
              <td>{{ row.lines.length }}</td>
              <td>{{ row.totalQuantity | number }}</td>
              <td>{{ row.currencyCode }} {{ row.totalValue | number:'1.2-2' }}</td>
              <td><p-tag [value]="row.status" [severity]="severityFor(row.status)" /></td>
              <td>
                <p-button icon="pi pi-pencil" severity="secondary" text rounded (onClick)="openEdit(row)" />
                <p-button icon="pi pi-trash" severity="danger" text rounded (onClick)="confirmDelete(row)" />
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="9" class="text-center text-slate-500 py-8">No orders yet.</td></tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '60rem' }"
      [header]="editingId() ? 'Edit Order' : 'New Buyer Order'">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">PO Number *</label>
            <input pInputText class="w-full" formControlName="poNumber" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Buyer *</label>
            <p-select [options]="buyers()" formControlName="buyerId" optionLabel="name" optionValue="id"
              styleClass="w-full" (onChange)="onBuyerChange()" />
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
            <label class="text-sm font-medium text-slate-700 mb-1 block">Delivery Date</label>
            <p-datepicker formControlName="deliveryDate" appendTo="body" dateFormat="yy-mm-dd" styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Incoterm</label>
            <input pInputText class="w-full" formControlName="incoterm" placeholder="FOB, CIF..."/>
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Currency</label>
            <input pInputText class="w-full" formControlName="currencyCode" maxlength="3" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Payment Terms</label>
          <input pInputText class="w-full" formControlName="paymentTerms" />
        </div>

        <div class="border-t pt-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-base font-semibold text-slate-900">Order Lines</h3>
            <p-button label="Add Line" icon="pi pi-plus" size="small" severity="secondary" (onClick)="addLine()" />
          </div>

          <div formArrayName="lines" class="space-y-3">
            <div *ngFor="let lineCtrl of lines.controls; let i = index" [formGroupName]="i"
              class="border border-slate-200 rounded-md p-3 bg-slate-50">
              <div class="grid grid-cols-12 gap-2 items-end">
                <div class="col-span-4">
                  <label class="text-xs font-medium text-slate-700 mb-1 block">Style *</label>
                  <p-select [options]="filteredStyles()" formControlName="styleId"
                    optionLabel="name" optionValue="id" styleClass="w-full" />
                </div>
                <div class="col-span-2">
                  <label class="text-xs font-medium text-slate-700 mb-1 block">Color</label>
                  <input pInputText class="w-full" formControlName="color" />
                </div>
                <div class="col-span-2">
                  <label class="text-xs font-medium text-slate-700 mb-1 block">Quantity *</label>
                  <p-inputNumber formControlName="quantity" [min]="0" styleClass="w-full" [inputStyle]="{ width: '100%' }" />
                </div>
                <div class="col-span-2">
                  <label class="text-xs font-medium text-slate-700 mb-1 block">Unit Price *</label>
                  <p-inputNumber formControlName="unitPrice" mode="decimal" [minFractionDigits]="2" [maxFractionDigits]="4"
                    [min]="0" styleClass="w-full" [inputStyle]="{ width: '100%' }" />
                </div>
                <div class="col-span-2 flex justify-end">
                  <p-button icon="pi pi-trash" severity="danger" text rounded (onClick)="removeLine(i)" />
                </div>
              </div>

              <div class="mt-3">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-medium text-slate-700">Size Breakdown</span>
                  <p-button label="Add Size" icon="pi pi-plus" size="small" severity="secondary" text
                    (onClick)="addSize(i)" />
                </div>
                <div formArrayName="sizes" class="grid grid-cols-6 gap-2">
                  <ng-container *ngFor="let sz of getSizes(i).controls; let j = index" [formGroupName]="j">
                    <div class="col-span-2 flex gap-1 items-end">
                      <input pInputText class="w-20" formControlName="sizeLabel" placeholder="S/M/L"/>
                      <p-inputNumber formControlName="quantity" [min]="0" [inputStyle]="{ width: '6rem' }" />
                      <p-button icon="pi pi-times" severity="secondary" text rounded size="small" (onClick)="removeSize(i, j)" />
                    </div>
                  </ng-container>
                </div>
                <div *ngIf="sizeMismatch(i) as msg" class="text-xs text-amber-700 mt-1">{{ msg }}</div>
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
export class OrdersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(OrdersService);
  private readonly mastersApi = inject(MastersService);
  private readonly mdApi = inject(MerchandisingService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<BuyerOrder[]>([]);
  readonly buyers = signal<Buyer[]>([]);
  readonly allStyles = signal<Style[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly statuses = STATUS_OPTIONS;
  readonly selectedBuyerId = signal<string | null>(null);

  readonly buyerLookup = computed(() => {
    const map = new Map<string, string>();
    for (const b of this.buyers()) map.set(b.id, b.name);
    return map;
  });

  readonly filteredStyles = computed(() => {
    const buyerId = this.selectedBuyerId();
    if (!buyerId) return this.allStyles();
    return this.allStyles().filter((s) => s.buyerId === buyerId);
  });

  dialogOpen = false;

  readonly form: FormGroup = this.fb.group({
    poNumber: ['', [Validators.required, Validators.maxLength(60)]],
    buyerId: ['', [Validators.required]],
    orderDate: [new Date()],
    deliveryDate: [null as Date | null],
    incoterm: [''],
    paymentTerms: [''],
    currencyCode: ['USD', [Validators.required]],
    status: ['draft' as BuyerOrderStatus, [Validators.required]],
    notes: [''],
    lines: this.fb.array([this.makeLine()]),
  });

  get lines(): FormArray<FormGroup> {
    return this.form.get('lines') as FormArray<FormGroup>;
  }

  ngOnInit(): void {
    this.refresh();
    this.mastersApi.listBuyers().subscribe((b) => this.buyers.set(b));
    this.mdApi.listStyles().subscribe((s) => this.allStyles.set(s));
  }

  refresh(): void {
    this.loading.set(true);
    this.api.list().subscribe({
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
  severityFor(s: BuyerOrderStatus) {
    return STATUS_SEVERITY[s] ?? 'info';
  }

  private makeLine(): FormGroup {
    return this.fb.group({
      styleId: ['', Validators.required],
      color: [''],
      quantity: [0, [Validators.required, Validators.min(0)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      notes: [''],
      sizes: this.fb.array<FormGroup>([]),
    });
  }

  private makeSize(): FormGroup {
    return this.fb.group({
      sizeLabel: ['', [Validators.required, Validators.maxLength(24)]],
      quantity: [0, [Validators.required, Validators.min(0)]],
    });
  }

  addLine(): void {
    this.lines.push(this.makeLine());
  }
  removeLine(i: number): void {
    if (this.lines.length === 1) return;
    this.lines.removeAt(i);
  }
  getSizes(i: number): FormArray<FormGroup> {
    return this.lines.at(i).get('sizes') as FormArray<FormGroup>;
  }
  addSize(i: number): void {
    this.getSizes(i).push(this.makeSize());
  }
  removeSize(i: number, j: number): void {
    this.getSizes(i).removeAt(j);
  }

  sizeMismatch(i: number): string | null {
    const lineQty = Number(this.lines.at(i).get('quantity')?.value ?? 0);
    const sizes = this.getSizes(i).controls;
    if (sizes.length === 0) return null;
    const sum = sizes.reduce((s, c) => s + Number(c.get('quantity')?.value ?? 0), 0);
    if (Math.abs(sum - lineQty) < 0.0001) return null;
    return `Size total ${sum} ≠ line qty ${lineQty}`;
  }

  onBuyerChange(): void {
    const buyerId = this.form.get('buyerId')?.value as string | null;
    this.selectedBuyerId.set(buyerId);
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      poNumber: '', buyerId: '', orderDate: new Date(), deliveryDate: null,
      incoterm: '', paymentTerms: '', currencyCode: 'USD', status: 'draft', notes: '',
    });
    this.lines.clear();
    this.addLine();
    this.selectedBuyerId.set(null);
    this.dialogOpen = true;
  }

  openEdit(row: BuyerOrder): void {
    this.editingId.set(row.id);
    this.form.patchValue({
      poNumber: row.poNumber,
      buyerId: row.buyerId,
      orderDate: row.orderDate ? new Date(row.orderDate) : null,
      deliveryDate: row.deliveryDate ? new Date(row.deliveryDate) : null,
      incoterm: row.incoterm ?? '',
      paymentTerms: row.paymentTerms ?? '',
      currencyCode: row.currencyCode,
      status: row.status,
      notes: row.notes ?? '',
    });
    this.lines.clear();
    for (const ln of row.lines) {
      const lineGroup = this.makeLine();
      lineGroup.patchValue({
        styleId: ln.styleId,
        color: ln.color ?? '',
        quantity: Number(ln.quantity),
        unitPrice: Number(ln.unitPrice),
        notes: ln.notes ?? '',
      });
      const sizesArr = lineGroup.get('sizes') as FormArray<FormGroup>;
      for (const s of ln.sizes) {
        const sg = this.makeSize();
        sg.patchValue({ sizeLabel: s.sizeLabel, quantity: Number(s.quantity) });
        sizesArr.push(sg);
      }
      this.lines.push(lineGroup);
    }
    this.selectedBuyerId.set(row.buyerId);
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
    const dto: CreateBuyerOrderDto = {
      poNumber: v.poNumber,
      buyerId: v.buyerId,
      orderDate: this.toIso(v.orderDate),
      deliveryDate: this.toIso(v.deliveryDate),
      incoterm: v.incoterm || undefined,
      paymentTerms: v.paymentTerms || undefined,
      currencyCode: v.currencyCode,
      status: v.status,
      notes: v.notes || undefined,
      lines: (v.lines as Array<{
        styleId: string;
        color?: string;
        quantity: number;
        unitPrice: number;
        notes?: string;
        sizes?: Array<{ sizeLabel: string; quantity: number }>;
      }>).map((l, idx) => ({
        styleId: l.styleId,
        color: l.color || undefined,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        notes: l.notes || undefined,
        sizes: (l.sizes ?? []).map((s, sIdx) => ({
          sizeLabel: s.sizeLabel,
          quantity: Number(s.quantity),
          sortOrder: sIdx,
        })),
      })).filter((_, idx) => idx >= 0),
    };
    const op$ = this.editingId()
      ? this.api.update(this.editingId()!, dto)
      : this.api.create(dto);
    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(row: BuyerOrder): void {
    this.confirm.confirm({
      message: `Delete order "${row.poNumber}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.remove(row.id).subscribe({ next: () => this.refresh() }),
    });
  }
}

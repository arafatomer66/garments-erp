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
  CreateCuttingPlanDto,
  CuttingPlan,
  CuttingPlanStatus,
  StockLot,
  Style,
} from '@org/shared-types';
import { ProductionService } from './production.service';
import { MerchandisingService } from '../merchandising/merchandising.service';
import { InventoryService } from '../inventory/inventory.service';

const STATUSES: { label: string; value: CuttingPlanStatus }[] = [
  { label: 'Planned', value: 'planned' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const STATUS_SEVERITY: Record<CuttingPlanStatus, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
  planned: 'secondary',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'danger',
};

@Component({
  selector: 'app-cutting-plans-tab',
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
        <p-button label="New Cutting Plan" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows
        selectionMode="single" [(selection)]="selectedPlan" (selectionChange)="onPlanSelect()">
        <ng-template pTemplate="header">
          <tr>
            <th>Plan #</th><th>Style</th><th>Plan Date</th>
            <th class="text-right">Target</th><th class="text-right">Cut</th>
            <th>Fabric Lot</th><th>Status</th><th class="w-32">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr [pSelectableRow]="row">
            <td class="font-mono text-sm">{{ row.planNumber }}</td>
            <td>
              <div class="font-medium">{{ row.styleCode }}</div>
              <div class="text-xs text-slate-500">{{ row.styleName }}</div>
            </td>
            <td>{{ row.planDate | date:'mediumDate' }}</td>
            <td class="text-right">{{ row.targetQuantity | number }}</td>
            <td class="text-right">{{ row.cutQuantity | number }}</td>
            <td class="font-mono text-xs">{{ row.fabricLotNumber || '—' }}</td>
            <td><p-tag [value]="row.status" [severity]="severityFor(row.status)" /></td>
            <td>
              <p-button icon="pi pi-pencil" severity="secondary" text rounded
                (onClick)="openEdit(row, $event)" />
              <p-button icon="pi pi-trash" severity="danger" text rounded
                (onClick)="confirmDelete(row, $event)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8" class="text-center text-slate-500 py-8">No cutting plans yet.</td></tr>
        </ng-template>
      </p-table>

      <p-card *ngIf="selectedPlan">
        <ng-template pTemplate="header">
          <div class="px-4 pt-3">
            <h3 class="text-base font-semibold text-slate-900">
              Items — {{ selectedPlan.planNumber }}
            </h3>
          </div>
        </ng-template>
        <p-table [value]="selectedPlan.items" stripedRows>
          <ng-template pTemplate="header">
            <tr>
              <th>Size</th><th>Color</th>
              <th class="text-right">Target</th><th class="text-right">Cut</th>
              <th class="text-right">Remaining</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr>
              <td class="font-mono text-sm">{{ row.sizeLabel }}</td>
              <td>{{ row.color || '—' }}</td>
              <td class="text-right">{{ row.targetQuantity | number }}</td>
              <td class="text-right">{{ row.cutQuantity | number }}</td>
              <td class="text-right">{{ row.targetQuantity - row.cutQuantity | number }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="5" class="text-center text-slate-500 py-4">No items.</td></tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '54rem' }"
      [header]="editingId() ? 'Edit Cutting Plan' : 'New Cutting Plan'">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Plan Number *</label>
            <input pInputText class="w-full" formControlName="planNumber" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Style *</label>
            <p-select [options]="styles()" formControlName="styleId" optionLabel="name" optionValue="id"
              [filter]="true" filterBy="code,name" placeholder="Select Style" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Status</label>
            <p-select [options]="statuses" formControlName="status" optionLabel="label" optionValue="value"
              styleClass="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Plan Date</label>
            <p-datepicker formControlName="planDate" appendTo="body" dateFormat="yy-mm-dd"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Fabric Lot</label>
            <p-select [options]="fabricLots()" formControlName="fabricLotId"
              optionLabel="lotNumber" optionValue="id"
              [filter]="true" filterBy="lotNumber,itemCode" placeholder="(optional)"
              [showClear]="true" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Marker Eff. %</label>
            <p-inputNumber formControlName="markerEfficiencyPct" [min]="0" [max]="100"
              mode="decimal" [maxFractionDigits]="2"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
        </div>

        <div class="border-t pt-3">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-base font-semibold text-slate-900">Sizes & Colors</h3>
            <div class="text-sm text-slate-500">
              Total target: <span class="font-mono font-semibold">{{ totalTarget() }}</span>
            </div>
            <p-button label="Add Row" icon="pi pi-plus" size="small" severity="secondary" (onClick)="addItem()" />
          </div>
          <div formArrayName="items" class="space-y-2">
            <div *ngFor="let it of items.controls; let i = index" [formGroupName]="i"
              class="grid grid-cols-12 gap-2 items-end border border-slate-200 rounded p-2 bg-slate-50">
              <div class="col-span-3">
                <label class="text-xs font-medium text-slate-700 mb-1 block">Size *</label>
                <input pInputText class="w-full" formControlName="sizeLabel" placeholder="M" />
              </div>
              <div class="col-span-3">
                <label class="text-xs font-medium text-slate-700 mb-1 block">Color</label>
                <input pInputText class="w-full" formControlName="color" placeholder="Navy" />
              </div>
              <div class="col-span-2">
                <label class="text-xs font-medium text-slate-700 mb-1 block">Target *</label>
                <p-inputNumber formControlName="targetQuantity" [min]="0"
                  styleClass="w-full" [inputStyle]="{ width: '100%' }" />
              </div>
              <div class="col-span-2">
                <label class="text-xs font-medium text-slate-700 mb-1 block">Cut</label>
                <p-inputNumber formControlName="cutQuantity" [min]="0"
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
export class CuttingPlansTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProductionService);
  private readonly merch = inject(MerchandisingService);
  private readonly inventory = inject(InventoryService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<CuttingPlan[]>([]);
  readonly styles = signal<Style[]>([]);
  readonly fabricLots = signal<StockLot[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly statuses = STATUSES;

  selectedPlan: CuttingPlan | null = null;
  dialogOpen = false;

  readonly form: FormGroup = this.fb.group({
    planNumber: ['', [Validators.required, Validators.maxLength(60)]],
    styleId: ['', Validators.required],
    planDate: [new Date()],
    fabricLotId: [null as string | null],
    markerEfficiencyPct: [null as number | null],
    status: ['planned' as CuttingPlanStatus, Validators.required],
    notes: [''],
    items: this.fb.array([this.makeItem()]),
  });

  get items(): FormArray<FormGroup> {
    return this.form.get('items') as FormArray<FormGroup>;
  }

  readonly totalTarget = computed(() => {
    const sig = this.itemsSig();
    return sig.reduce((s, it) => s + Number(it.targetQuantity || 0), 0);
  });

  private readonly itemsSig = signal<{ targetQuantity: number }[]>([]);

  ngOnInit(): void {
    this.refresh();
    this.merch.listStyles().subscribe((s) => this.styles.set(s));
    this.inventory.listLots().subscribe((l) => this.fabricLots.set(l));
    this.items.valueChanges.subscribe((v) => this.itemsSig.set(v as { targetQuantity: number }[]));
    this.itemsSig.set(this.items.value as { targetQuantity: number }[]);
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listPlans().subscribe({
      next: (r) => {
        this.rows.set(r);
        this.loading.set(false);
        if (this.selectedPlan) {
          const updated = r.find((p) => p.id === this.selectedPlan!.id) ?? null;
          this.selectedPlan = updated;
        }
      },
      error: () => this.loading.set(false),
    });
  }

  severityFor(s: CuttingPlanStatus) {
    return STATUS_SEVERITY[s] ?? 'info';
  }

  onPlanSelect(): void {
    // selection drives the items card under the table
  }

  private makeItem(): FormGroup {
    return this.fb.group({
      sizeLabel: ['', [Validators.required, Validators.maxLength(20)]],
      color: [''],
      targetQuantity: [0, [Validators.required, Validators.min(0)]],
      cutQuantity: [0, [Validators.min(0)]],
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
      planNumber: '', styleId: '', planDate: new Date(), fabricLotId: null,
      markerEfficiencyPct: null, status: 'planned', notes: '',
    });
    this.items.clear();
    this.addItem();
    this.dialogOpen = true;
  }

  openEdit(row: CuttingPlan, event: Event): void {
    event.stopPropagation();
    this.editingId.set(row.id);
    this.form.patchValue({
      planNumber: row.planNumber,
      styleId: row.styleId,
      planDate: row.planDate ? new Date(row.planDate) : null,
      fabricLotId: row.fabricLotId,
      markerEfficiencyPct: row.markerEfficiencyPct,
      status: row.status,
      notes: row.notes ?? '',
    });
    this.items.clear();
    if (row.items.length === 0) {
      this.addItem();
    } else {
      for (const it of row.items) {
        const g = this.makeItem();
        g.patchValue({
          sizeLabel: it.sizeLabel,
          color: it.color ?? '',
          targetQuantity: Number(it.targetQuantity),
          cutQuantity: Number(it.cutQuantity),
        });
        this.items.push(g);
      }
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
    const itemList = (v.items as Array<{
      sizeLabel: string;
      color: string;
      targetQuantity: number;
      cutQuantity: number;
    }>).map((it) => ({
      sizeLabel: it.sizeLabel,
      color: it.color || undefined,
      targetQuantity: Number(it.targetQuantity),
      cutQuantity: Number(it.cutQuantity),
    }));
    const dto: CreateCuttingPlanDto = {
      planNumber: v.planNumber,
      styleId: v.styleId,
      planDate: this.toIso(v.planDate),
      fabricLotId: v.fabricLotId || undefined,
      markerEfficiencyPct: v.markerEfficiencyPct ?? undefined,
      status: v.status,
      notes: v.notes || undefined,
      items: itemList,
    };
    const op$ = this.editingId()
      ? this.api.updatePlan(this.editingId()!, dto)
      : this.api.createPlan(dto);
    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(row: CuttingPlan, event: Event): void {
    event.stopPropagation();
    this.confirm.confirm({
      message: `Delete cutting plan "${row.planNumber}"? Items and bundles will be removed.`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () =>
        this.api.deletePlan(row.id).subscribe({
          next: () => {
            if (this.selectedPlan?.id === row.id) this.selectedPlan = null;
            this.refresh();
          },
        }),
    });
  }
}

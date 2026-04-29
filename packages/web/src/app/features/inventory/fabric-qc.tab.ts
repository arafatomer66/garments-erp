import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
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
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import type {
  CreateFabricInspectionDto,
  FabricDefectSize,
  FabricInspection,
  FabricInspectionResult,
  Item,
} from '@org/shared-types';
import { InventoryService } from './inventory.service';
import { MastersService } from '../masters/masters.service';

const DEFECT_SIZES: { label: string; value: FabricDefectSize; points: number }[] = [
  { label: 'Up to 3 in', value: 'upto_3in', points: 1 },
  { label: '3 to 6 in', value: '3_to_6in', points: 2 },
  { label: '6 to 9 in', value: '6_to_9in', points: 3 },
  { label: 'Over 9 in', value: 'over_9in', points: 4 },
  { label: 'Hole', value: 'hole', points: 4 },
];

const POINTS: Record<FabricDefectSize, number> = {
  upto_3in: 1,
  '3_to_6in': 2,
  '6_to_9in': 3,
  over_9in: 4,
  hole: 4,
};

const RESULT_SEVERITY: Record<FabricInspectionResult, 'success' | 'danger' | 'warn' | 'info'> = {
  pass: 'success',
  fail: 'danger',
  conditional: 'warn',
  pending: 'info',
};

@Component({
  selector: 'app-fabric-qc-tab',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, CardModule, DialogModule, InputTextModule, InputNumberModule,
    TextareaModule, SelectModule, TagModule, ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3">
      <div class="flex justify-end">
        <p-button label="New Inspection" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows>
        <ng-template pTemplate="header">
          <tr>
            <th>Inspection #</th><th>Item</th><th>Roll</th>
            <th class="text-right">Inspected</th><th class="text-right">Width</th>
            <th class="text-right">Points</th><th class="text-right">Pts/100sqyd</th>
            <th>Result</th><th class="w-16"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-mono text-sm">{{ row.inspectionNumber }}</td>
            <td>
              <div class="font-medium">{{ row.itemName }}</div>
              <div class="text-xs text-slate-500 font-mono">{{ row.itemCode }}</div>
            </td>
            <td>{{ row.rollNumber || '—' }}</td>
            <td class="text-right">{{ row.inspectedQuantity | number:'1.0-2' }} {{ row.inspectedUom }}</td>
            <td class="text-right">{{ row.widthInches ? (row.widthInches | number:'1.0-2') + ' in' : '—' }}</td>
            <td class="text-right">{{ row.pointsTotal }}</td>
            <td class="text-right">
              <span [class.text-rose-600]="row.pointsPer100Sqyd > row.threshold"
                    [class.font-semibold]="row.pointsPer100Sqyd > row.threshold">
                {{ row.pointsPer100Sqyd | number:'1.0-2' }}
              </span>
              <span class="text-xs text-slate-400"> / {{ row.threshold }}</span>
            </td>
            <td><p-tag [value]="row.result" [severity]="severityFor(row.result)" /></td>
            <td>
              <p-button icon="pi pi-trash" severity="danger" text rounded size="small"
                (onClick)="confirmDelete(row)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="9" class="text-center text-slate-500 py-8">No inspections yet.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '52rem' }" header="New Fabric Inspection">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Inspection # *</label>
            <input pInputText class="w-full" formControlName="inspectionNumber" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Item *</label>
            <p-select [options]="items()" formControlName="itemId" optionLabel="name" optionValue="id"
              [filter]="true" filterBy="name,code" placeholder="Select Item" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Roll #</label>
            <input pInputText class="w-full" formControlName="rollNumber" />
          </div>
        </div>
        <div class="grid grid-cols-4 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Quantity (yd) *</label>
            <p-inputNumber formControlName="inspectedQuantity" [min]="0.0001" mode="decimal" [maxFractionDigits]="4"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Width (in)</label>
            <p-inputNumber formControlName="widthInches" [min]="0" mode="decimal" [maxFractionDigits]="2"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Threshold</label>
            <p-inputNumber formControlName="threshold" [min]="1" mode="decimal" [maxFractionDigits]="0"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Lot #</label>
            <input pInputText class="w-full" formControlName="lotNumber" />
          </div>
        </div>

        <div class="border-t pt-3">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-base font-semibold text-slate-900">Defects</h3>
            <p-button label="Add Defect" icon="pi pi-plus" size="small" (onClick)="addDefect()" />
          </div>
          <div formArrayName="defects" class="space-y-2">
            <div *ngFor="let d of defects.controls; let i = index" [formGroupName]="i"
              class="grid grid-cols-12 gap-2 items-end border border-slate-200 rounded p-2 bg-slate-50">
              <div class="col-span-4">
                <label class="text-xs font-medium text-slate-700 mb-1 block">Size</label>
                <p-select [options]="defectSizes" formControlName="defectSize"
                  optionLabel="label" optionValue="value" styleClass="w-full" />
              </div>
              <div class="col-span-2">
                <label class="text-xs font-medium text-slate-700 mb-1 block">Count</label>
                <p-inputNumber formControlName="count" [min]="1" mode="decimal" [maxFractionDigits]="0"
                  styleClass="w-full" [inputStyle]="{ width: '100%' }" />
              </div>
              <div class="col-span-5">
                <label class="text-xs font-medium text-slate-700 mb-1 block">Description</label>
                <input pInputText class="w-full" formControlName="description" />
              </div>
              <div class="col-span-1">
                <p-button icon="pi pi-trash" severity="danger" text rounded (onClick)="removeDefect(i)" />
              </div>
            </div>
          </div>
        </div>

        <p-card>
          <div class="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div class="text-slate-500 mb-1">Total Points</div>
              <div class="text-xl font-semibold">{{ liveTotalPoints() }}</div>
            </div>
            <div>
              <div class="text-slate-500 mb-1">Points / 100 sqyd</div>
              <div class="text-xl font-semibold">{{ liveScore() | number:'1.0-2' }}</div>
            </div>
            <div>
              <div class="text-slate-500 mb-1">Predicted Result</div>
              <p-tag [value]="liveResult()" [severity]="severityFor(liveResult())" />
            </div>
          </div>
        </p-card>

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
export class FabricQcTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(InventoryService);
  private readonly masters = inject(MastersService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<FabricInspection[]>([]);
  readonly items = signal<Item[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly defectSizes = DEFECT_SIZES;

  dialogOpen = false;

  private readonly formSig = signal(0);

  readonly form: FormGroup = this.fb.group({
    inspectionNumber: ['', [Validators.required, Validators.maxLength(60)]],
    itemId: ['', Validators.required],
    rollNumber: [''],
    lotNumber: [''],
    inspectedQuantity: [100, [Validators.required, Validators.min(0.0001)]],
    widthInches: [60, [Validators.min(0)]],
    threshold: [40, [Validators.required, Validators.min(1)]],
    notes: [''],
    defects: this.fb.array<FormGroup>([]),
  });

  readonly liveTotalPoints = computed(() => {
    this.formSig();
    return (this.defects.controls as FormGroup[]).reduce((sum, g) => {
      const size = g.get('defectSize')?.value as FabricDefectSize | null;
      const count = Number(g.get('count')?.value ?? 0);
      if (!size || count <= 0) return sum;
      return sum + POINTS[size] * count;
    }, 0);
  });

  readonly liveScore = computed(() => {
    this.formSig();
    const qty = Number(this.form.get('inspectedQuantity')?.value ?? 0);
    const width = Number(this.form.get('widthInches')?.value ?? 0);
    const total = this.liveTotalPoints();
    if (qty <= 0 || width <= 0) return 0;
    return (total * 3600) / (qty * width);
  });

  readonly liveResult = computed<FabricInspectionResult>(() => {
    this.formSig();
    const width = Number(this.form.get('widthInches')?.value ?? 0);
    const threshold = Number(this.form.get('threshold')?.value ?? 40);
    if (width <= 0) return 'pending';
    return this.liveScore() <= threshold ? 'pass' : 'fail';
  });

  get defects(): FormArray<FormGroup> {
    return this.form.get('defects') as FormArray<FormGroup>;
  }

  ngOnInit(): void {
    this.refresh();
    this.masters.listItems().subscribe((i) => this.items.set(i));
    this.form.valueChanges.subscribe(() => this.formSig.update((n) => n + 1));
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listInspections().subscribe({
      next: (r) => {
        this.rows.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  severityFor(r: FabricInspectionResult): 'success' | 'danger' | 'warn' | 'info' {
    return RESULT_SEVERITY[r] ?? 'info';
  }

  addDefect(): void {
    this.defects.push(
      this.fb.group({
        defectSize: ['upto_3in' as FabricDefectSize, Validators.required],
        count: [1, [Validators.required, Validators.min(1)]],
        description: [''],
      }),
    );
  }

  removeDefect(i: number): void {
    this.defects.removeAt(i);
  }

  openCreate(): void {
    this.form.reset({
      inspectionNumber: '', itemId: '', rollNumber: '', lotNumber: '',
      inspectedQuantity: 100, widthInches: 60, threshold: 40, notes: '',
    });
    this.defects.clear();
    this.dialogOpen = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const dto: CreateFabricInspectionDto = {
      inspectionNumber: v.inspectionNumber,
      itemId: v.itemId,
      rollNumber: v.rollNumber || undefined,
      lotNumber: v.lotNumber || undefined,
      inspectedQuantity: Number(v.inspectedQuantity),
      widthInches: v.widthInches ? Number(v.widthInches) : undefined,
      threshold: Number(v.threshold),
      notes: v.notes || undefined,
      defects: (v.defects as Array<{ defectSize: FabricDefectSize; count: number; description: string }>).map(
        (d) => ({
          defectSize: d.defectSize,
          count: Number(d.count),
          description: d.description || undefined,
        }),
      ),
    };
    this.api.createInspection(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(row: FabricInspection): void {
    this.confirm.confirm({
      message: `Delete inspection "${row.inspectionNumber}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteInspection(row.id).subscribe({ next: () => this.refresh() }),
    });
  }
}

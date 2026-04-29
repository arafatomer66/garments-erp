import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import type {
  BomLine,
  CostingSheet,
  CreateBomLineDto,
  Item,
  Style,
  UpsertCostingSheetDto,
} from '@org/shared-types';
import { BomService } from './bom.service';
import { MerchandisingService } from '../merchandising/merchandising.service';
import { MastersService } from '../masters/masters.service';
import { PageIntroComponent } from '../../shared/page-intro.component';

@Component({
  selector: 'app-bom',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    CardModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    SelectModule,
    ConfirmDialogModule,
    TagModule,
    DividerModule,
    PageIntroComponent,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-intro
        title="BOM &amp; Costing"
        icon="pi-list"
        description="Build the bill of materials per style and compute the CM/FOB cost sheet that shows your real margin. Recomputes live when fabric or trim prices change."
        [bullets]="[
          'Fabric &amp; trim consumption per piece, with wastage %',
          'CM (cut-and-make) labour + overhead build-up',
          'FOB price + margin %, in buyer currency',
          'Costing-vs-actual variance after production'
        ]"
        example="For 1 pc of TS-CREW-180GSM: fabric 1.04 + trims 0.10 + CM 0.85 + commercial 0.13 = USD 2.12. FOB 5.65 → margin 62%."
      ></app-page-intro>
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-slate-900">Style selection</h2>
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium text-slate-700">Style:</label>
          <p-select
            [options]="styles()"
            [ngModel]="selectedStyleId()"
            (ngModelChange)="onStyleChange($event)"
            optionLabel="name"
            optionValue="id"
            [filter]="true"
            filterBy="code,name"
            placeholder="Select a style"
            styleClass="w-96"
          >
            <ng-template let-s pTemplate="item">
              <div class="flex flex-col">
                <span class="font-medium">{{ s.name }}</span>
                <span class="text-xs text-slate-500 font-mono">{{ s.code }}</span>
              </div>
            </ng-template>
          </p-select>
        </div>
      </div>

      <div *ngIf="!selectedStyleId()" class="text-center text-slate-500 py-12">
        Select a style to view its bill of materials and costing sheet.
      </div>

      <div *ngIf="selectedStyleId()" class="grid grid-cols-12 gap-4">
        <p-card styleClass="col-span-12 xl:col-span-8" header="Consumption Lines">
          <ng-template pTemplate="header">
            <div class="flex items-center justify-between p-4 border-b">
              <h3 class="text-base font-semibold text-slate-900">Consumption Lines</h3>
              <p-button label="Add Line" icon="pi pi-plus" size="small" (onClick)="openCreate()" />
            </div>
          </ng-template>

          <p-table [value]="lines()" [loading]="loadingLines()" stripedRows>
            <ng-template pTemplate="header">
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th class="text-right">Qty / Unit</th>
                <th class="text-right">Wastage %</th>
                <th class="text-right">Effective Qty</th>
                <th class="text-right">Std. Cost</th>
                <th class="text-right">Line Cost</th>
                <th class="w-28">Actions</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr>
                <td>
                  <div class="flex flex-col">
                    <span class="font-medium">{{ row.itemName }}</span>
                    <span class="text-xs text-slate-500 font-mono">{{ row.itemCode }}</span>
                  </div>
                </td>
                <td>
                  <p-tag [value]="row.itemCategory ?? '—'" severity="secondary" />
                </td>
                <td class="text-right">{{ row.quantityPerUnit | number: '1.0-4' }} {{ row.uom }}</td>
                <td class="text-right">{{ row.wastagePct | number: '1.0-2' }}%</td>
                <td class="text-right">{{ row.effectiveQuantity | number: '1.0-4' }}</td>
                <td class="text-right">
                  {{ row.itemCurrencyCode || 'USD' }} {{ row.itemStandardCost | number: '1.2-4' }}
                </td>
                <td class="text-right font-medium">
                  {{ row.itemCurrencyCode || 'USD' }} {{ row.lineCost | number: '1.2-4' }}
                </td>
                <td>
                  <p-button icon="pi pi-pencil" severity="secondary" text rounded (onClick)="openEdit(row)" />
                  <p-button icon="pi pi-trash" severity="danger" text rounded (onClick)="confirmDelete(row)" />
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="8" class="text-center text-slate-500 py-8">No BOM lines yet.</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="footer">
              <tr *ngIf="lines().length > 0" class="font-semibold bg-slate-50">
                <td colspan="6" class="text-right">Material Cost</td>
                <td class="text-right text-emerald-700">
                  {{ costing()?.currencyCode ?? 'USD' }} {{ costing()?.materialCost | number: '1.2-4' }}
                </td>
                <td></td>
              </tr>
            </ng-template>
          </p-table>
        </p-card>

        <p-card styleClass="col-span-12 xl:col-span-4" header="Costing Sheet">
          <ng-template pTemplate="header">
            <div class="p-4 border-b">
              <h3 class="text-base font-semibold text-slate-900">Costing Sheet</h3>
            </div>
          </ng-template>

          <form [formGroup]="costingForm" (ngSubmit)="saveCosting()" class="space-y-3">
            <div>
              <label class="text-sm font-medium text-slate-700 mb-1 block">Currency</label>
              <input pInputText class="w-full" formControlName="currencyCode" maxlength="3" />
            </div>
            <div>
              <label class="text-sm font-medium text-slate-700 mb-1 block">CM Cost (per pc)</label>
              <p-inputNumber
                formControlName="cmCost"
                mode="decimal"
                [minFractionDigits]="2"
                [maxFractionDigits]="4"
                [min]="0"
                styleClass="w-full"
                [inputStyle]="{ width: '100%' }"
              />
            </div>
            <div>
              <label class="text-sm font-medium text-slate-700 mb-1 block">Overhead (per pc)</label>
              <p-inputNumber
                formControlName="overheadCost"
                mode="decimal"
                [minFractionDigits]="2"
                [maxFractionDigits]="4"
                [min]="0"
                styleClass="w-full"
                [inputStyle]="{ width: '100%' }"
              />
            </div>
            <div>
              <label class="text-sm font-medium text-slate-700 mb-1 block">Commercial (per pc)</label>
              <p-inputNumber
                formControlName="commercialCost"
                mode="decimal"
                [minFractionDigits]="2"
                [maxFractionDigits]="4"
                [min]="0"
                styleClass="w-full"
                [inputStyle]="{ width: '100%' }"
              />
            </div>
            <div>
              <label class="text-sm font-medium text-slate-700 mb-1 block">Profit %</label>
              <p-inputNumber
                formControlName="profitPct"
                mode="decimal"
                [minFractionDigits]="0"
                [maxFractionDigits]="2"
                [min]="0"
                suffix=" %"
                styleClass="w-full"
                [inputStyle]="{ width: '100%' }"
              />
            </div>
            <div>
              <label class="text-sm font-medium text-slate-700 mb-1 block">Notes</label>
              <textarea pTextarea class="w-full" rows="2" formControlName="notes"></textarea>
            </div>

            <p-divider />

            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-slate-600">Material:</span>
                <span class="font-mono">
                  {{ costing()?.currencyCode ?? 'USD' }} {{ liveMaterial() | number: '1.2-4' }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-600">+ CM:</span>
                <span class="font-mono">{{ liveCm() | number: '1.2-4' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-600">+ Overhead:</span>
                <span class="font-mono">{{ liveOverhead() | number: '1.2-4' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-600">+ Commercial:</span>
                <span class="font-mono">{{ liveCommercial() | number: '1.2-4' }}</span>
              </div>
              <div class="flex justify-between border-t pt-2">
                <span class="text-slate-700 font-medium">Subtotal:</span>
                <span class="font-mono font-medium">{{ liveSubtotal() | number: '1.2-4' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-600">+ Profit ({{ liveProfitPct() }}%):</span>
                <span class="font-mono">{{ liveProfitAmount() | number: '1.2-4' }}</span>
              </div>
              <div class="flex justify-between border-t pt-2 text-base">
                <span class="text-slate-900 font-semibold">FOB Price:</span>
                <span class="font-mono font-bold text-emerald-700">
                  {{ costingForm.value.currencyCode || 'USD' }} {{ liveFob() | number: '1.2-4' }}
                </span>
              </div>
            </div>

            <div class="flex justify-end pt-2">
              <p-button type="submit" label="Save Costing" [loading]="savingCosting()" icon="pi pi-save" />
            </div>
          </form>
        </p-card>
      </div>
    </div>

    <p-dialog
      [(visible)]="lineDialogOpen"
      [modal]="true"
      [style]="{ width: '36rem' }"
      [header]="editingLineId() ? 'Edit BOM Line' : 'Add BOM Line'"
    >
      <form [formGroup]="lineForm" (ngSubmit)="submitLine()" class="space-y-3">
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Item *</label>
          <p-select
            [options]="items()"
            formControlName="itemId"
            optionLabel="name"
            optionValue="id"
            [filter]="true"
            filterBy="code,name"
            placeholder="Select an item"
            styleClass="w-full"
            [disabled]="!!editingLineId()"
          >
            <ng-template let-it pTemplate="item">
              <div class="flex flex-col">
                <span class="font-medium">{{ it.name }}</span>
                <span class="text-xs text-slate-500 font-mono">{{ it.code }} • {{ it.category }}</span>
              </div>
            </ng-template>
          </p-select>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Qty / Unit *</label>
            <p-inputNumber
              formControlName="quantityPerUnit"
              mode="decimal"
              [minFractionDigits]="0"
              [maxFractionDigits]="6"
              [min]="0"
              styleClass="w-full"
              [inputStyle]="{ width: '100%' }"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Wastage %</label>
            <p-inputNumber
              formControlName="wastagePct"
              mode="decimal"
              [minFractionDigits]="0"
              [maxFractionDigits]="2"
              [min]="0"
              suffix=" %"
              styleClass="w-full"
              [inputStyle]="{ width: '100%' }"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">UOM</label>
            <input pInputText class="w-full" formControlName="uom" maxlength="16" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Notes</label>
          <textarea pTextarea class="w-full" rows="2" formControlName="notes"></textarea>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t">
          <p-button label="Cancel" severity="secondary" (onClick)="lineDialogOpen = false" />
          <p-button type="submit" label="Save" [loading]="savingLine()" [disabled]="lineForm.invalid" />
        </div>
      </form>
    </p-dialog>

    <p-confirmDialog />
  `,
})
export class BomComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(BomService);
  private readonly mdApi = inject(MerchandisingService);
  private readonly mastersApi = inject(MastersService);
  private readonly confirm = inject(ConfirmationService);

  readonly styles = signal<Style[]>([]);
  readonly items = signal<Item[]>([]);
  readonly lines = signal<BomLine[]>([]);
  readonly costing = signal<CostingSheet | null>(null);
  readonly selectedStyleId = signal<string | null>(null);
  readonly loadingLines = signal(false);
  readonly savingCosting = signal(false);
  readonly savingLine = signal(false);
  readonly editingLineId = signal<string | null>(null);

  lineDialogOpen = false;

  readonly costingForm: FormGroup = this.fb.group({
    currencyCode: ['USD', [Validators.required, Validators.maxLength(3)]],
    cmCost: [0, [Validators.min(0)]],
    overheadCost: [0, [Validators.min(0)]],
    commercialCost: [0, [Validators.min(0)]],
    profitPct: [0, [Validators.min(0)]],
    notes: [''],
  });

  readonly lineForm: FormGroup = this.fb.group({
    itemId: ['', Validators.required],
    quantityPerUnit: [0, [Validators.required, Validators.min(0)]],
    wastagePct: [0, [Validators.min(0)]],
    uom: ['pcs', [Validators.required, Validators.maxLength(16)]],
    notes: [''],
  });

  readonly liveMaterial = computed(() => {
    return this.lines().reduce((s, l) => s + (l.lineCost ?? 0), 0);
  });

  private formSig = signal(0);
  readonly liveCm = computed(() => {
    this.formSig();
    return Number(this.costingForm.get('cmCost')?.value ?? 0);
  });
  readonly liveOverhead = computed(() => {
    this.formSig();
    return Number(this.costingForm.get('overheadCost')?.value ?? 0);
  });
  readonly liveCommercial = computed(() => {
    this.formSig();
    return Number(this.costingForm.get('commercialCost')?.value ?? 0);
  });
  readonly liveProfitPct = computed(() => {
    this.formSig();
    return Number(this.costingForm.get('profitPct')?.value ?? 0);
  });
  readonly liveSubtotal = computed(
    () => this.liveMaterial() + this.liveCm() + this.liveOverhead() + this.liveCommercial(),
  );
  readonly liveProfitAmount = computed(() => this.liveSubtotal() * (this.liveProfitPct() / 100));
  readonly liveFob = computed(() => this.liveSubtotal() + this.liveProfitAmount());

  ngOnInit(): void {
    this.mdApi.listStyles().subscribe((s) => this.styles.set(s));
    this.mastersApi.listItems().subscribe((items) => this.items.set(items));
    this.costingForm.valueChanges.subscribe(() => this.formSig.update((n) => n + 1));
  }

  onStyleChange(styleId: string | null): void {
    this.selectedStyleId.set(styleId);
    if (!styleId) {
      this.lines.set([]);
      this.costing.set(null);
      return;
    }
    this.refresh();
  }

  refresh(): void {
    const styleId = this.selectedStyleId();
    if (!styleId) return;
    this.loadingLines.set(true);
    this.api.listLines(styleId).subscribe({
      next: (rows) => {
        this.lines.set(rows);
        this.loadingLines.set(false);
      },
      error: () => this.loadingLines.set(false),
    });
    this.api.getCosting(styleId).subscribe((sheet) => {
      this.costing.set(sheet);
      this.costingForm.patchValue(
        {
          currencyCode: sheet.currencyCode,
          cmCost: Number(sheet.cmCost),
          overheadCost: Number(sheet.overheadCost),
          commercialCost: Number(sheet.commercialCost),
          profitPct: Number(sheet.profitPct),
          notes: sheet.notes ?? '',
        },
        { emitEvent: true },
      );
    });
  }

  openCreate(): void {
    this.editingLineId.set(null);
    this.lineForm.reset({
      itemId: '',
      quantityPerUnit: 0,
      wastagePct: 0,
      uom: 'pcs',
      notes: '',
    });
    this.lineDialogOpen = true;
  }

  openEdit(row: BomLine): void {
    this.editingLineId.set(row.id);
    this.lineForm.reset({
      itemId: row.itemId,
      quantityPerUnit: Number(row.quantityPerUnit),
      wastagePct: Number(row.wastagePct),
      uom: row.uom,
      notes: row.notes ?? '',
    });
    this.lineDialogOpen = true;
  }

  submitLine(): void {
    if (this.lineForm.invalid) return;
    const styleId = this.selectedStyleId();
    if (!styleId) return;
    this.savingLine.set(true);
    const v = this.lineForm.getRawValue();
    const editing = this.editingLineId();
    if (editing) {
      this.api
        .updateLine(editing, {
          quantityPerUnit: Number(v.quantityPerUnit),
          wastagePct: Number(v.wastagePct ?? 0),
          uom: v.uom,
          notes: v.notes || undefined,
        })
        .subscribe({
          next: () => {
            this.savingLine.set(false);
            this.lineDialogOpen = false;
            this.refresh();
          },
          error: () => this.savingLine.set(false),
        });
    } else {
      const dto: CreateBomLineDto = {
        styleId,
        itemId: v.itemId,
        quantityPerUnit: Number(v.quantityPerUnit),
        wastagePct: Number(v.wastagePct ?? 0),
        uom: v.uom,
        notes: v.notes || undefined,
      };
      this.api.createLine(dto).subscribe({
        next: () => {
          this.savingLine.set(false);
          this.lineDialogOpen = false;
          this.refresh();
        },
        error: () => this.savingLine.set(false),
      });
    }
  }

  confirmDelete(row: BomLine): void {
    this.confirm.confirm({
      message: `Remove "${row.itemName}" from BOM?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteLine(row.id).subscribe({ next: () => this.refresh() }),
    });
  }

  saveCosting(): void {
    const styleId = this.selectedStyleId();
    if (!styleId) return;
    this.savingCosting.set(true);
    const v = this.costingForm.getRawValue();
    const dto: UpsertCostingSheetDto = {
      styleId,
      currencyCode: v.currencyCode,
      cmCost: Number(v.cmCost ?? 0),
      overheadCost: Number(v.overheadCost ?? 0),
      commercialCost: Number(v.commercialCost ?? 0),
      profitPct: Number(v.profitPct ?? 0),
      notes: v.notes || undefined,
    };
    this.api.upsertCosting(dto).subscribe({
      next: (sheet) => {
        this.costing.set(sheet);
        this.savingCosting.set(false);
      },
      error: () => this.savingCosting.set(false),
    });
  }
}

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
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import type {
  AqlInspection,
  AqlResult,
  AqlStage,
  CreateAqlInspectionDefectDto,
  CreateAqlInspectionDto,
  CuttingPlan,
  DefectCode,
  DefectSeverity,
  Style,
} from '@org/shared-types';
import { QualityService } from './quality.service';
import { ProductionService } from '../production/production.service';
import { MerchandisingService } from '../merchandising/merchandising.service';

const STAGES: { label: string; value: AqlStage }[] = [
  { label: 'Inline', value: 'inline' },
  { label: 'Final', value: 'final' },
  { label: 'Pre-Shipment', value: 'pre_shipment' },
];

const SEVERITIES: { label: string; value: DefectSeverity }[] = [
  { label: 'Critical', value: 'critical' },
  { label: 'Major', value: 'major' },
  { label: 'Minor', value: 'minor' },
];

const RESULT_SEVERITY: Record<AqlResult, 'success' | 'danger' | 'secondary'> = {
  pass: 'success',
  fail: 'danger',
  pending: 'secondary',
};

interface AqlDefectFormShape {
  defectCodeId: FormControl<string | null>;
  quantity: FormControl<number>;
  severity: FormControl<DefectSeverity>;
  notes: FormControl<string | null>;
}

@Component({
  selector: 'app-aql-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule, InputNumberModule,
    TextareaModule, SelectModule, TagModule, ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3">
      <div class="flex justify-end">
        <p-button label="New Inspection" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows
        [expandedRowKeys]="expanded" dataKey="id">
        <ng-template pTemplate="header">
          <tr>
            <th class="w-8"></th>
            <th>Inspection #</th><th>Stage</th><th>Style</th><th>Plan</th>
            <th class="text-right">Lot</th>
            <th class="text-right">Sample</th>
            <th class="text-right">Accept</th>
            <th class="text-right">Reject</th>
            <th class="text-right">C/M/Mn</th>
            <th>Result</th>
            <th class="w-16"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td>
              <p-button [icon]="isExpanded(row.id) ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                text rounded size="small" (onClick)="toggleRow(row.id)" />
            </td>
            <td class="font-mono text-sm">{{ row.inspectionNumber }}</td>
            <td><p-tag [value]="row.inspectionStage" severity="info" /></td>
            <td><span class="font-mono text-xs">{{ row.styleCode || '—' }}</span></td>
            <td><span class="font-mono text-xs">{{ row.cuttingPlanNumber || '—' }}</span></td>
            <td class="text-right">{{ row.lotSize | number }}</td>
            <td class="text-right">{{ row.sampleSize | number }}</td>
            <td class="text-right text-emerald-700">{{ row.acceptThreshold }}</td>
            <td class="text-right text-rose-700">{{ row.rejectThreshold }}</td>
            <td class="text-right text-xs font-mono">
              {{ row.criticalDefects }}/{{ row.majorDefects }}/{{ row.minorDefects }}
            </td>
            <td>
              <p-tag [value]="row.result" [severity]="resultSeverity(row.result)" />
            </td>
            <td>
              <p-button icon="pi pi-trash" severity="danger" text rounded size="small"
                (onClick)="confirmDelete(row)" />
            </td>
          </tr>
          <tr *ngIf="isExpanded(row.id) && row.defects?.length">
            <td colspan="12" class="bg-slate-50 p-3">
              <div class="text-xs uppercase text-slate-500 mb-2 font-medium">Defects logged</div>
              <div class="grid grid-cols-2 lg:grid-cols-3 gap-2">
                <div *ngFor="let d of row.defects"
                  class="bg-white border border-slate-200 rounded p-2 text-sm flex items-center justify-between">
                  <div>
                    <div class="font-medium">{{ d.defectCode }} — {{ d.defectName }}</div>
                    <div class="text-xs text-slate-500" *ngIf="d.notes">{{ d.notes }}</div>
                  </div>
                  <div class="flex items-center gap-2">
                    <p-tag [value]="d.severity" [severity]="severityTag(d.severity)" />
                    <span class="text-rose-700 font-semibold">{{ d.quantity }}</span>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="12" class="text-center text-slate-500 py-8">No AQL inspections yet.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '54rem' }" header="New AQL Inspection">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Inspection # *</label>
            <input pInputText class="w-full" formControlName="inspectionNumber" placeholder="AQL-2026-001" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Stage</label>
            <p-select [options]="stages" formControlName="inspectionStage"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">AQL Level</label>
            <p-inputNumber formControlName="aqlLevel" [min]="0.065" [max]="10"
              [maxFractionDigits]="2" styleClass="w-full" [inputStyle]="{ width: '100%' }"
              (onBlur)="recomputeQuote()" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Cutting Plan</label>
            <p-select [options]="plans()" formControlName="cuttingPlanId"
              optionLabel="planNumber" optionValue="id" [filter]="true" filterBy="planNumber"
              [showClear]="true" placeholder="(optional)" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Style</label>
            <p-select [options]="styles()" formControlName="styleId"
              optionLabel="name" optionValue="id" [filter]="true" filterBy="code,name"
              [showClear]="true" placeholder="(optional)" styleClass="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-4 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Lot Size *</label>
            <p-inputNumber formControlName="lotSize" [min]="1"
              styleClass="w-full" [inputStyle]="{ width: '100%' }"
              (onBlur)="recomputeQuote()" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Sample Size</label>
            <p-inputNumber formControlName="sampleSize" [min]="0"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Accept ≤</label>
            <p-inputNumber formControlName="acceptThreshold" [min]="0"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Reject ≥</label>
            <p-inputNumber formControlName="rejectThreshold" [min]="0"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
        </div>
        <div *ngIf="quote()" class="text-xs bg-blue-50 text-blue-800 rounded p-2 flex items-center gap-3">
          <i class="pi pi-info-circle"></i>
          <span>
            ANSI/ASQ Z1.4 Level II suggestion — Sample: <strong>{{ quote()!.sampleSize }}</strong>,
            Accept ≤ <strong>{{ quote()!.accept }}</strong>,
            Reject ≥ <strong>{{ quote()!.reject }}</strong>
          </span>
          <p-button label="Apply" size="small" severity="secondary" (onClick)="applyQuote()" />
        </div>

        <div class="border-t pt-3 space-y-2">
          <div class="flex items-center justify-between">
            <div class="text-sm font-medium text-slate-700">Defects observed</div>
            <p-button label="Add Defect" icon="pi pi-plus" size="small"
              severity="secondary" (onClick)="addDefect()" />
          </div>
          <div formArrayName="defects" class="space-y-2">
            <div *ngFor="let g of defects.controls; let i = index" [formGroupName]="i"
              class="grid grid-cols-12 gap-2 items-end bg-slate-50 rounded p-2">
              <div class="col-span-4">
                <label class="text-xs text-slate-600 block mb-1">Defect Code *</label>
                <p-select [options]="activeDefectCodes()" formControlName="defectCodeId"
                  optionLabel="label" optionValue="value" [filter]="true" filterBy="label"
                  placeholder="Select" styleClass="w-full" appendTo="body"
                  (onChange)="onDefectCodeChange(i, $event.value)" />
              </div>
              <div class="col-span-2">
                <label class="text-xs text-slate-600 block mb-1">Severity *</label>
                <p-select [options]="severities" formControlName="severity"
                  optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
              </div>
              <div class="col-span-2">
                <label class="text-xs text-slate-600 block mb-1">Qty *</label>
                <p-inputNumber formControlName="quantity" [min]="1"
                  styleClass="w-full" [inputStyle]="{ width: '100%' }" />
              </div>
              <div class="col-span-3">
                <label class="text-xs text-slate-600 block mb-1">Notes</label>
                <input pInputText class="w-full" formControlName="notes" />
              </div>
              <div class="col-span-1 text-right">
                <p-button icon="pi pi-trash" severity="danger" text rounded size="small"
                  (onClick)="removeDefect(i)" />
              </div>
            </div>
            <div *ngIf="defects.length === 0" class="text-sm text-slate-500 italic px-2 py-3">
              No defects logged. If sample is clean, save without defects → result: pass.
            </div>
          </div>
        </div>

        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Inspector</label>
          <input pInputText class="w-full" formControlName="inspectedBy" />
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
export class AqlTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(QualityService);
  private readonly prod = inject(ProductionService);
  private readonly merch = inject(MerchandisingService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<AqlInspection[]>([]);
  readonly plans = signal<CuttingPlan[]>([]);
  readonly styles = signal<Style[]>([]);
  readonly defectCodes = signal<DefectCode[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly quote = signal<{ sampleSize: number; accept: number; reject: number } | null>(null);
  readonly stages = STAGES;
  readonly severities = SEVERITIES;

  readonly activeDefectCodes = computed(() =>
    this.defectCodes()
      .filter((d) => d.isActive)
      .map((d) => ({ label: `${d.code} — ${d.name}`, value: d.id, severity: d.severity }))
  );

  dialogOpen = false;
  expanded: { [k: string]: boolean } = {};

  readonly form = this.fb.group({
    inspectionNumber: ['', [Validators.required, Validators.maxLength(40)]],
    inspectionStage: ['final' as AqlStage],
    cuttingPlanId: [null as string | null],
    styleId: [null as string | null],
    aqlLevel: [2.5, [Validators.required, Validators.min(0.065)]],
    lotSize: [0, [Validators.required, Validators.min(1)]],
    sampleSize: [0, Validators.min(0)],
    acceptThreshold: [0, Validators.min(0)],
    rejectThreshold: [0, Validators.min(0)],
    inspectedBy: [''],
    notes: [''],
    defects: this.fb.array<FormGroup<AqlDefectFormShape>>([]),
  });

  get defects(): FormArray<FormGroup<AqlDefectFormShape>> {
    return this.form.controls.defects as FormArray<FormGroup<AqlDefectFormShape>>;
  }

  ngOnInit(): void {
    this.refresh();
    this.prod.listPlans().subscribe((p) => this.plans.set(p));
    this.merch.listStyles().subscribe((s) => this.styles.set(s));
    this.api.listDefectCodes().subscribe((d) => this.defectCodes.set(d));
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listAql().subscribe({
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

  resultSeverity(r: AqlResult): 'success' | 'danger' | 'secondary' {
    return RESULT_SEVERITY[r];
  }

  severityTag(s: DefectSeverity): 'danger' | 'warn' | 'secondary' {
    return s === 'critical' ? 'danger' : s === 'major' ? 'warn' : 'secondary';
  }

  recomputeQuote(): void {
    const lot = Number(this.form.value.lotSize ?? 0);
    const aql = Number(this.form.value.aqlLevel ?? 2.5);
    if (lot <= 0) {
      this.quote.set(null);
      return;
    }
    this.api.quoteAql(lot, aql).subscribe({ next: (q) => this.quote.set(q) });
  }

  applyQuote(): void {
    const q = this.quote();
    if (!q) return;
    this.form.patchValue({
      sampleSize: q.sampleSize,
      acceptThreshold: q.accept,
      rejectThreshold: q.reject,
    });
  }

  openCreate(): void {
    while (this.defects.length) this.defects.removeAt(0);
    const seq = String(this.rows().length + 1).padStart(3, '0');
    this.form.reset({
      inspectionNumber: `AQL-${new Date().getFullYear()}-${seq}`,
      inspectionStage: 'final',
      cuttingPlanId: null,
      styleId: null,
      aqlLevel: 2.5,
      lotSize: 0,
      sampleSize: 0,
      acceptThreshold: 0,
      rejectThreshold: 0,
      inspectedBy: '',
      notes: '',
      defects: [],
    });
    this.quote.set(null);
    this.dialogOpen = true;
  }

  addDefect(): void {
    this.defects.push(
      this.fb.nonNullable.group<AqlDefectFormShape>({
        defectCodeId: this.fb.control<string | null>(null, Validators.required),
        quantity: this.fb.nonNullable.control(1, [Validators.required, Validators.min(1)]),
        severity: this.fb.nonNullable.control<DefectSeverity>('minor', Validators.required),
        notes: this.fb.control<string | null>(''),
      })
    );
  }

  removeDefect(i: number): void {
    this.defects.removeAt(i);
  }

  onDefectCodeChange(i: number, codeId: string | null): void {
    if (!codeId) return;
    const code = this.defectCodes().find((d) => d.id === codeId);
    if (code) {
      this.defects.at(i).patchValue({ severity: code.severity });
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const defectDtos: CreateAqlInspectionDefectDto[] = (v.defects || [])
      .filter((d) => d.defectCodeId)
      .map((d) => ({
        defectCodeId: d.defectCodeId!,
        quantity: Number(d.quantity ?? 0),
        severity: d.severity,
        notes: d.notes || undefined,
      }));
    const dto: CreateAqlInspectionDto = {
      inspectionNumber: v.inspectionNumber!,
      cuttingPlanId: v.cuttingPlanId || undefined,
      styleId: v.styleId || undefined,
      inspectionStage: v.inspectionStage || 'final',
      aqlLevel: Number(v.aqlLevel ?? 2.5),
      lotSize: Number(v.lotSize ?? 0),
      sampleSize: v.sampleSize ? Number(v.sampleSize) : undefined,
      acceptThreshold: v.acceptThreshold !== null && v.acceptThreshold !== undefined ? Number(v.acceptThreshold) : undefined,
      rejectThreshold: v.rejectThreshold !== null && v.rejectThreshold !== undefined ? Number(v.rejectThreshold) : undefined,
      inspectedBy: v.inspectedBy || undefined,
      notes: v.notes || undefined,
      defects: defectDtos,
    };
    this.api.createAql(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(row: AqlInspection): void {
    this.confirm.confirm({
      message: `Delete inspection "${row.inspectionNumber}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteAql(row.id).subscribe({ next: () => this.refresh() }),
    });
  }
}

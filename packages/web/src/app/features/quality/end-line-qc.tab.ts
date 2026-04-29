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
  CreateEndLineQcDefectDto,
  CreateEndLineQcRecordDto,
  DefectCode,
  EndLineQcRecord,
  SewingLine,
  Style,
} from '@org/shared-types';
import { QualityService } from './quality.service';
import { ProductionService } from '../production/production.service';
import { MerchandisingService } from '../merchandising/merchandising.service';

interface DefectFormShape {
  defectCodeId: FormControl<string | null>;
  quantity: FormControl<number>;
  notes: FormControl<string | null>;
}

@Component({
  selector: 'app-end-line-qc-tab',
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
      <div class="flex items-end justify-between gap-3">
        <div class="flex items-end gap-3">
          <div>
            <label class="text-xs font-medium text-slate-700 mb-1 block">Line</label>
            <p-select [options]="lineOptions()" [(ngModel)]="lineFilter"
              optionLabel="label" optionValue="value" [showClear]="true"
              placeholder="All lines" styleClass="w-48" (onChange)="refresh()" />
          </div>
          <div>
            <label class="text-xs font-medium text-slate-700 mb-1 block">Date</label>
            <p-datepicker [(ngModel)]="dateFilter" appendTo="body" dateFormat="yy-mm-dd"
              [inputStyle]="{ width: '12rem' }" [showClear]="true" (onSelect)="refresh()"
              (onClear)="refresh()" />
          </div>
          <p-button icon="pi pi-refresh" severity="secondary" size="small" (onClick)="refresh()" />
        </div>
        <p-button label="New Record" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows
        [expandedRowKeys]="expanded" dataKey="id">
        <ng-template pTemplate="header">
          <tr>
            <th class="w-8"></th>
            <th>Record #</th><th>Line</th><th>Style</th><th>Date</th>
            <th class="text-right">Inspected</th>
            <th class="text-right">Defects</th>
            <th class="text-right">Rework</th>
            <th class="text-right">Reject</th>
            <th class="text-right">DHU %</th>
            <th class="w-16"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row let-expanded="expanded">
          <tr>
            <td>
              <p-button [icon]="expanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                text rounded size="small" (onClick)="toggleRow(row.id)" />
            </td>
            <td class="font-mono text-sm">{{ row.recordNumber }}</td>
            <td>{{ row.lineCode || '—' }}</td>
            <td><span class="font-mono text-xs">{{ row.styleCode || '—' }}</span></td>
            <td class="text-sm">{{ row.logDate }}</td>
            <td class="text-right">{{ row.inspectedQuantity | number }}</td>
            <td class="text-right" [class]="row.defectQuantity > 0 ? 'text-rose-700 font-semibold' : ''">
              {{ row.defectQuantity | number }}
            </td>
            <td class="text-right">{{ row.reworkQuantity | number }}</td>
            <td class="text-right">{{ row.rejectQuantity | number }}</td>
            <td class="text-right" [class]="dhuClass(dhuFor(row))">
              {{ dhuFor(row) | number:'1.1-2' }}
            </td>
            <td>
              <p-button icon="pi pi-trash" severity="danger" text rounded size="small"
                (onClick)="confirmDelete(row)" />
            </td>
          </tr>
          <tr *ngIf="isExpanded(row.id) && row.defects?.length">
            <td colspan="11" class="bg-slate-50 p-3">
              <div class="text-xs uppercase text-slate-500 mb-2 font-medium">Defects</div>
              <div class="grid grid-cols-2 lg:grid-cols-3 gap-2">
                <div *ngFor="let d of row.defects"
                  class="bg-white border border-slate-200 rounded p-2 text-sm flex items-center justify-between">
                  <div>
                    <div class="font-medium">{{ d.defectCode }} — {{ d.defectName }}</div>
                    <div class="text-xs text-slate-500" *ngIf="d.notes">{{ d.notes }}</div>
                  </div>
                  <div class="flex items-center gap-2">
                    <p-tag *ngIf="d.severity" [value]="d.severity"
                      [severity]="severityFor(d.severity)" />
                    <span class="text-rose-700 font-semibold">{{ d.quantity }}</span>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="11" class="text-center text-slate-500 py-8">No end-line QC records.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '52rem' }" header="New End-line QC Record">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Record # *</label>
            <input pInputText class="w-full" formControlName="recordNumber" placeholder="EL-2026-001" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Line *</label>
            <p-select [options]="lines()" formControlName="lineId"
              optionLabel="code" optionValue="id" placeholder="Select Line" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Date</label>
            <p-datepicker formControlName="logDate" appendTo="body" dateFormat="yy-mm-dd"
              [inputStyle]="{ width: '100%' }" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Style</label>
          <p-select [options]="styles()" formControlName="styleId"
            optionLabel="name" optionValue="id" [filter]="true" filterBy="code,name"
            [showClear]="true" placeholder="(optional)" styleClass="w-full" />
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Inspected *</label>
            <p-inputNumber formControlName="inspectedQuantity" [min]="0"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Rework</label>
            <p-inputNumber formControlName="reworkQuantity" [min]="0"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Reject</label>
            <p-inputNumber formControlName="rejectQuantity" [min]="0"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Inspected By</label>
          <input pInputText class="w-full" formControlName="inspectedBy" />
        </div>

        <div class="border-t pt-3 space-y-2">
          <div class="flex items-center justify-between">
            <div class="text-sm font-medium text-slate-700">Defects</div>
            <p-button label="Add Defect" icon="pi pi-plus" size="small"
              severity="secondary" (onClick)="addDefect()" />
          </div>
          <div formArrayName="defects" class="space-y-2">
            <div *ngFor="let g of defects.controls; let i = index" [formGroupName]="i"
              class="grid grid-cols-12 gap-2 items-end bg-slate-50 rounded p-2">
              <div class="col-span-5">
                <label class="text-xs text-slate-600 block mb-1">Defect Code *</label>
                <p-select [options]="activeDefectCodes()" formControlName="defectCodeId"
                  optionLabel="label" optionValue="value" [filter]="true" filterBy="label"
                  placeholder="Select" styleClass="w-full" appendTo="body" />
              </div>
              <div class="col-span-2">
                <label class="text-xs text-slate-600 block mb-1">Quantity *</label>
                <p-inputNumber formControlName="quantity" [min]="1"
                  styleClass="w-full" [inputStyle]="{ width: '100%' }" />
              </div>
              <div class="col-span-4">
                <label class="text-xs text-slate-600 block mb-1">Notes</label>
                <input pInputText class="w-full" formControlName="notes" />
              </div>
              <div class="col-span-1 text-right">
                <p-button icon="pi pi-trash" severity="danger" text rounded size="small"
                  (onClick)="removeDefect(i)" />
              </div>
            </div>
            <div *ngIf="defects.length === 0" class="text-sm text-slate-500 italic px-2 py-3">
              No defects logged. Click "Add Defect" to log defective pieces.
            </div>
          </div>
          <div class="text-xs text-slate-500 italic">
            Total defect quantity is summed automatically from rows above.
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
export class EndLineQcTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(QualityService);
  private readonly prod = inject(ProductionService);
  private readonly merch = inject(MerchandisingService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<EndLineQcRecord[]>([]);
  readonly lines = signal<SewingLine[]>([]);
  readonly styles = signal<Style[]>([]);
  readonly defectCodes = signal<DefectCode[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly lineOptions = computed(() =>
    this.lines().map((l) => ({ label: `${l.code} — ${l.name}`, value: l.id }))
  );
  readonly activeDefectCodes = computed(() =>
    this.defectCodes()
      .filter((d) => d.isActive)
      .map((d) => ({ label: `${d.code} — ${d.name}`, value: d.id }))
  );

  lineFilter: string | null = null;
  dateFilter: Date | null = null;
  dialogOpen = false;
  expanded: { [k: string]: boolean } = {};

  readonly form = this.fb.group({
    recordNumber: ['', [Validators.required, Validators.maxLength(40)]],
    lineId: ['', Validators.required],
    styleId: [null as string | null],
    logDate: [new Date()],
    inspectedQuantity: [0, [Validators.required, Validators.min(0)]],
    reworkQuantity: [0, Validators.min(0)],
    rejectQuantity: [0, Validators.min(0)],
    inspectedBy: [''],
    notes: [''],
    defects: this.fb.array<FormGroup<DefectFormShape>>([]),
  });

  get defects(): FormArray<FormGroup<DefectFormShape>> {
    return this.form.controls.defects as FormArray<FormGroup<DefectFormShape>>;
  }

  ngOnInit(): void {
    this.refresh();
    this.prod.listLines().subscribe((l) => this.lines.set(l));
    this.merch.listStyles().subscribe((s) => this.styles.set(s));
    this.api.listDefectCodes().subscribe((d) => this.defectCodes.set(d));
  }

  refresh(): void {
    this.loading.set(true);
    const date = this.dateFilter ? this.toIso(this.dateFilter) : undefined;
    this.api.listEndLineQc(this.lineFilter || undefined, date).subscribe({
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

  dhuFor(row: EndLineQcRecord): number {
    const inspected = Number(row.inspectedQuantity || 0);
    const defects = Number(row.defectQuantity || 0);
    return inspected > 0 ? (defects / inspected) * 100 : 0;
  }

  dhuClass(pct: number): string {
    if (pct <= 3) return 'text-emerald-700';
    if (pct <= 7) return 'text-amber-600';
    if (pct > 0) return 'text-rose-700';
    return 'text-slate-500';
  }

  severityFor(s: 'critical' | 'major' | 'minor'): 'danger' | 'warn' | 'secondary' {
    return s === 'critical' ? 'danger' : s === 'major' ? 'warn' : 'secondary';
  }

  openCreate(): void {
    while (this.defects.length) this.defects.removeAt(0);
    const seq = String(this.rows().length + 1).padStart(3, '0');
    this.form.reset({
      recordNumber: `EL-${new Date().getFullYear()}-${seq}`,
      lineId: this.lines()[0]?.id || '',
      styleId: null,
      logDate: new Date(),
      inspectedQuantity: 0,
      reworkQuantity: 0,
      rejectQuantity: 0,
      inspectedBy: '',
      notes: '',
      defects: [],
    });
    this.dialogOpen = true;
  }

  addDefect(): void {
    this.defects.push(
      this.fb.nonNullable.group<DefectFormShape>({
        defectCodeId: this.fb.control<string | null>(null, Validators.required),
        quantity: this.fb.nonNullable.control(1, [Validators.required, Validators.min(1)]),
        notes: this.fb.control<string | null>(''),
      })
    );
  }

  removeDefect(i: number): void {
    this.defects.removeAt(i);
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const defectDtos: CreateEndLineQcDefectDto[] = (v.defects || [])
      .filter((d) => d.defectCodeId)
      .map((d) => ({
        defectCodeId: d.defectCodeId!,
        quantity: Number(d.quantity ?? 0),
        notes: d.notes || undefined,
      }));
    const dto: CreateEndLineQcRecordDto = {
      recordNumber: v.recordNumber!,
      lineId: v.lineId!,
      styleId: v.styleId || undefined,
      logDate: v.logDate ? this.toIso(v.logDate) : undefined,
      inspectedQuantity: Number(v.inspectedQuantity ?? 0),
      reworkQuantity: Number(v.reworkQuantity ?? 0),
      rejectQuantity: Number(v.rejectQuantity ?? 0),
      inspectedBy: v.inspectedBy || undefined,
      notes: v.notes || undefined,
      defects: defectDtos,
    };
    this.api.createEndLineQc(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(row: EndLineQcRecord): void {
    this.confirm.confirm({
      message: `Delete record "${row.recordNumber}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteEndLineQc(row.id).subscribe({ next: () => this.refresh() }),
    });
  }

  private toIso(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}

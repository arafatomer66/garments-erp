import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
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
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import type {
  CreateInlineQcRecordDto,
  DefectCode,
  InlineQcRecord,
  SewingLine,
  Style,
} from '@org/shared-types';
import { QualityService } from './quality.service';
import { ProductionService } from '../production/production.service';
import { MerchandisingService } from '../merchandising/merchandising.service';

@Component({
  selector: 'app-inline-qc-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule, InputNumberModule,
    TextareaModule, SelectModule, DatePickerModule, ConfirmDialogModule,
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

      <p-table [value]="rows()" [loading]="loading()" stripedRows>
        <ng-template pTemplate="header">
          <tr>
            <th>Record #</th><th>Line</th><th>Style</th><th>Operation</th>
            <th>Defect</th><th class="text-right">Inspected</th>
            <th class="text-right">Defects</th><th>Inspected At</th>
            <th class="w-16"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-mono text-sm">{{ row.recordNumber }}</td>
            <td>{{ row.lineCode || '—' }}</td>
            <td><span class="font-mono text-xs">{{ row.styleCode || '—' }}</span></td>
            <td class="text-sm">{{ row.operation || '—' }}</td>
            <td class="text-sm">
              <span *ngIf="row.defectCode">{{ row.defectCode }} — {{ row.defectName }}</span>
              <span *ngIf="!row.defectCode" class="text-slate-400">—</span>
            </td>
            <td class="text-right">{{ row.inspectedQuantity | number }}</td>
            <td class="text-right" [class]="row.defectQuantity > 0 ? 'text-rose-700 font-semibold' : ''">
              {{ row.defectQuantity | number }}
            </td>
            <td class="text-sm">{{ row.inspectedAt | date:'short' }}</td>
            <td>
              <p-button icon="pi pi-trash" severity="danger" text rounded size="small"
                (onClick)="confirmDelete(row)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="9" class="text-center text-slate-500 py-8">No inline QC records.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '40rem' }" header="New Inline QC Record">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Record # *</label>
            <input pInputText class="w-full" formControlName="recordNumber" placeholder="IL-2026-001" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Line *</label>
            <p-select [options]="lines()" formControlName="lineId"
              optionLabel="code" optionValue="id" placeholder="Select Line" styleClass="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Style</label>
            <p-select [options]="styles()" formControlName="styleId"
              optionLabel="name" optionValue="id" [filter]="true" filterBy="code,name"
              [showClear]="true" placeholder="(optional)" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Operation</label>
            <input pInputText class="w-full" formControlName="operation" placeholder="Side seam" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Inspected *</label>
            <p-inputNumber formControlName="inspectedQuantity" [min]="0"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Defect Code</label>
            <p-select [options]="activeDefectCodes()" formControlName="defectCodeId"
              optionLabel="label" optionValue="value" [filter]="true" filterBy="label"
              [showClear]="true" placeholder="(optional)" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Defect Qty</label>
            <p-inputNumber formControlName="defectQuantity" [min]="0"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Operator</label>
            <input pInputText class="w-full" formControlName="operatorName" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Inspected By</label>
            <input pInputText class="w-full" formControlName="inspectedBy" />
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
export class InlineQcTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(QualityService);
  private readonly prod = inject(ProductionService);
  private readonly merch = inject(MerchandisingService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<InlineQcRecord[]>([]);
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

  readonly form = this.fb.group({
    recordNumber: ['', [Validators.required, Validators.maxLength(40)]],
    lineId: ['', Validators.required],
    styleId: [null as string | null],
    operation: [''],
    operatorName: [''],
    inspectedQuantity: [0, [Validators.required, Validators.min(0)]],
    defectCodeId: [null as string | null],
    defectQuantity: [0, Validators.min(0)],
    inspectedBy: [''],
    notes: [''],
  });

  ngOnInit(): void {
    this.refresh();
    this.prod.listLines().subscribe((l) => this.lines.set(l));
    this.merch.listStyles().subscribe((s) => this.styles.set(s));
    this.api.listDefectCodes().subscribe((d) => this.defectCodes.set(d));
  }

  refresh(): void {
    this.loading.set(true);
    const date = this.dateFilter ? this.toIso(this.dateFilter) : undefined;
    this.api.listInlineQc(this.lineFilter || undefined, date).subscribe({
      next: (r) => {
        this.rows.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    const seq = String(this.rows().length + 1).padStart(3, '0');
    this.form.reset({
      recordNumber: `IL-${new Date().getFullYear()}-${seq}`,
      lineId: this.lines()[0]?.id || '',
      styleId: null,
      operation: '',
      operatorName: '',
      inspectedQuantity: 0,
      defectCodeId: null,
      defectQuantity: 0,
      inspectedBy: '',
      notes: '',
    });
    this.dialogOpen = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const dto: CreateInlineQcRecordDto = {
      recordNumber: v.recordNumber!,
      lineId: v.lineId!,
      styleId: v.styleId || undefined,
      operation: v.operation || undefined,
      operatorName: v.operatorName || undefined,
      inspectedQuantity: Number(v.inspectedQuantity ?? 0),
      defectCodeId: v.defectCodeId || undefined,
      defectQuantity: Number(v.defectQuantity ?? 0),
      inspectedBy: v.inspectedBy || undefined,
      notes: v.notes || undefined,
    };
    this.api.createInlineQc(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(row: InlineQcRecord): void {
    this.confirm.confirm({
      message: `Delete record "${row.recordNumber}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteInlineQc(row.id).subscribe({ next: () => this.refresh() }),
    });
  }

  private toIso(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
  CreatePayrollRunDto,
  PayrollRun,
  PayrollStatus,
} from '@org/shared-types';
import { HrApiService } from './hr.service';

const STATUSES: { label: string; value: PayrollStatus }[] = [
  { label: 'Draft', value: 'draft' },
  { label: 'Computed', value: 'computed' },
  { label: 'Approved', value: 'approved' },
  { label: 'Paid', value: 'paid' },
];

const STATUS_SEVERITY: Record<PayrollStatus, 'info' | 'success' | 'warn' | 'danger' | 'secondary'> = {
  draft: 'secondary',
  computed: 'info',
  approved: 'warn',
  paid: 'success',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

@Component({
  selector: 'app-hr-payroll-tab',
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
        <p-button label="New Payroll Run" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows
               selectionMode="single" dataKey="id" [(selection)]="selected"
               (onRowSelect)="onRowSelect($event)">
        <ng-template pTemplate="header">
          <tr>
            <th>Run #</th><th>Period</th>
            <th class="text-right">Employees</th>
            <th class="text-right">Gross (BDT)</th>
            <th class="text-right">Deductions</th>
            <th class="text-right">Net (BDT)</th>
            <th>Status</th>
            <th class="w-44">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr [pSelectableRow]="row">
            <td class="font-mono text-sm">{{ row.runNumber }}</td>
            <td>{{ row.periodLabel }}</td>
            <td class="text-right">{{ row.totalEmployees }}</td>
            <td class="text-right font-mono">{{ row.totalGross | number:'1.0-0' }}</td>
            <td class="text-right font-mono">{{ row.totalDeductions | number:'1.0-0' }}</td>
            <td class="text-right font-mono font-semibold">{{ row.totalNet | number:'1.0-0' }}</td>
            <td><p-tag [value]="row.status" [severity]="statusSeverity(row.status)" /></td>
            <td>
              <div class="flex gap-1">
                <p-button label="Compute" icon="pi pi-cog" size="small" severity="info"
                  *ngIf="row.status === 'draft' || row.status === 'computed'"
                  (onClick)="compute($event, row)" />
                <p-button icon="pi pi-eye" size="small" text rounded
                  (onClick)="select(row)" />
                <p-button icon="pi pi-trash" severity="danger" text rounded size="small"
                  (onClick)="confirmDelete($event, row)" />
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8" class="text-center text-slate-500 py-8">No payroll runs yet.</td></tr>
        </ng-template>
      </p-table>

      <div *ngIf="selectedRun()" class="border rounded-lg bg-white">
        <div class="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
          <div>
            <span class="font-semibold">{{ selectedRun()!.runNumber }}</span>
            <span class="text-slate-500 ml-2">{{ selectedRun()!.periodLabel }}</span>
            <span class="ml-3"><p-tag [value]="selectedRun()!.status" [severity]="statusSeverity(selectedRun()!.status)" /></span>
          </div>
          <div class="text-sm text-slate-600">
            <span>Lines: <strong>{{ selectedRun()!.lines?.length || 0 }}</strong></span>
            <span class="mx-3">|</span>
            <span>Net: <strong>{{ selectedRun()!.totalNet | number:'1.0-0' }} BDT</strong></span>
          </div>
        </div>
        <p-table [value]="selectedRun()!.lines || []" stripedRows>
          <ng-template pTemplate="header">
            <tr>
              <th>Code</th><th>Employee</th>
              <th class="text-right">Days</th>
              <th class="text-right">OT Hrs</th>
              <th class="text-right">Basic</th>
              <th class="text-right">Allow.</th>
              <th class="text-right">OT</th>
              <th class="text-right">Gross</th>
              <th class="text-right">Deductions</th>
              <th class="text-right">Net</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-line>
            <tr>
              <td class="font-mono text-xs">{{ line.employeeCode }}</td>
              <td class="text-sm">{{ line.employeeName }}</td>
              <td class="text-right">{{ line.daysWorked }}</td>
              <td class="text-right">{{ line.overtimeHours }}</td>
              <td class="text-right">{{ line.basic | number:'1.0-0' }}</td>
              <td class="text-right">{{ allow(line) | number:'1.0-0' }}</td>
              <td class="text-right">{{ line.overtimeAmount | number:'1.0-0' }}</td>
              <td class="text-right font-mono">{{ line.grossPay | number:'1.0-0' }}</td>
              <td class="text-right font-mono">{{ line.totalDeductions | number:'1.0-0' }}</td>
              <td class="text-right font-mono font-semibold">{{ line.netPay | number:'1.0-0' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="10" class="text-center text-slate-500 py-6">
              No lines yet — click <em>Compute</em> to auto-generate from attendance.
            </td></tr>
          </ng-template>
        </p-table>
      </div>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '32rem' }" header="New Payroll Run">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Run # *</label>
          <input pInputText class="w-full" formControlName="runNumber" placeholder="PAY-2026-04" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Year *</label>
            <p-inputNumber formControlName="periodYear" [min]="2020" [max]="2100"
              [useGrouping]="false" styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Month *</label>
            <p-select [options]="months" formControlName="periodMonth"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Notes</label>
          <textarea pTextarea class="w-full" rows="2" formControlName="notes"></textarea>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t">
          <p-button label="Cancel" severity="secondary" (onClick)="dialogOpen = false" />
          <p-button type="submit" label="Create" [loading]="saving()" [disabled]="form.invalid" />
        </div>
      </form>
    </p-dialog>

    <p-confirmDialog />
  `,
})
export class HrPayrollTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(HrApiService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<PayrollRun[]>([]);
  readonly selectedRun = signal<PayrollRun | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly statuses = STATUSES;
  readonly months = MONTHS.map((m, i) => ({ label: m, value: i + 1 }));

  selected: PayrollRun | null = null;
  dialogOpen = false;

  readonly form = this.fb.group({
    runNumber: ['', [Validators.required, Validators.maxLength(40)]],
    periodYear: [new Date().getFullYear(), [Validators.required]],
    periodMonth: [new Date().getMonth() + 1, [Validators.required]],
    notes: [''],
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listPayrollRuns().subscribe({
      next: (r) => {
        this.rows.set(r);
        this.loading.set(false);
        if (this.selectedRun()) {
          const updated = r.find((x) => x.id === this.selectedRun()!.id);
          if (updated) this.select(updated);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  statusSeverity(s: PayrollStatus): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
    return STATUS_SEVERITY[s];
  }

  allow(line: { houseRent: number; medicalAllowance: number; transportAllowance: number; foodAllowance: number }): number {
    return Number(line.houseRent) + Number(line.medicalAllowance) + Number(line.transportAllowance) + Number(line.foodAllowance);
  }

  select(row: PayrollRun): void {
    this.api.getPayrollRun(row.id).subscribe((full) => this.selectedRun.set(full));
  }

  onRowSelect(event: { data?: PayrollRun | PayrollRun[] }): void {
    const data = event.data;
    if (!data) return;
    const row = Array.isArray(data) ? data[0] : data;
    if (row) this.select(row);
  }

  openCreate(): void {
    const now = new Date();
    const yr = now.getFullYear();
    const mn = now.getMonth() + 1;
    this.form.reset({
      runNumber: `PAY-${yr}-${String(mn).padStart(2, '0')}`,
      periodYear: yr,
      periodMonth: mn,
      notes: '',
    });
    this.dialogOpen = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const dto: CreatePayrollRunDto = {
      runNumber: v.runNumber!,
      periodYear: Number(v.periodYear),
      periodMonth: Number(v.periodMonth),
      notes: v.notes || undefined,
    };
    this.api.createPayrollRun(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  compute(event: Event, row: PayrollRun): void {
    event.stopPropagation();
    this.confirm.confirm({
      target: event.target as EventTarget,
      message: `Compute payroll lines for ${row.periodLabel}? This will replace any existing lines.`,
      header: 'Confirm Compute',
      icon: 'pi pi-cog',
      accept: () => {
        this.api.computePayrollRun(row.id).subscribe(() => this.refresh());
      },
    });
  }

  confirmDelete(event: Event, row: PayrollRun): void {
    event.stopPropagation();
    this.confirm.confirm({
      message: `Delete payroll run "${row.runNumber}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deletePayrollRun(row.id).subscribe({ next: () => this.refresh() }),
    });
  }
}

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
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import type {
  AttendanceRecord,
  AttendanceStatus,
  CreateAttendanceDto,
  Employee,
} from '@org/shared-types';
import { HrApiService } from './hr.service';

const STATUSES: { label: string; value: AttendanceStatus }[] = [
  { label: 'Present', value: 'present' },
  { label: 'Absent', value: 'absent' },
  { label: 'Late', value: 'late' },
  { label: 'Half Day', value: 'half_day' },
  { label: 'Leave', value: 'leave' },
  { label: 'Holiday', value: 'holiday' },
  { label: 'Week Off', value: 'weekoff' },
];

const STATUS_SEVERITY: Record<AttendanceStatus, 'info' | 'success' | 'warn' | 'danger' | 'secondary'> = {
  present: 'success',
  absent: 'danger',
  late: 'warn',
  half_day: 'warn',
  leave: 'info',
  holiday: 'secondary',
  weekoff: 'secondary',
};

@Component({
  selector: 'app-hr-attendance-tab',
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
      <div class="flex items-end justify-between gap-3 flex-wrap">
        <div class="flex items-end gap-2 flex-wrap">
          <div>
            <label class="text-xs text-slate-600 mb-1 block">Employee</label>
            <p-select [options]="employees()" [(ngModel)]="filterEmpId" [showClear]="true"
              optionLabel="fullName" optionValue="id" [filter]="true" filterBy="fullName,employeeCode"
              placeholder="(any)" styleClass="w-64" />
          </div>
          <div>
            <label class="text-xs text-slate-600 mb-1 block">From</label>
            <p-datepicker [(ngModel)]="filterFrom" appendTo="body" dateFormat="yy-mm-dd"
              [inputStyle]="{ width: '160px' }" [showClear]="true" />
          </div>
          <div>
            <label class="text-xs text-slate-600 mb-1 block">To</label>
            <p-datepicker [(ngModel)]="filterTo" appendTo="body" dateFormat="yy-mm-dd"
              [inputStyle]="{ width: '160px' }" [showClear]="true" />
          </div>
          <p-button label="Apply" severity="secondary" size="small" (onClick)="refresh()" />
        </div>
        <div class="flex items-center gap-3">
          <div class="grid grid-cols-3 gap-2 text-xs">
            <div class="px-2 py-1 rounded bg-emerald-50 text-emerald-700">
              Present: <strong>{{ stats().present }}</strong>
            </div>
            <div class="px-2 py-1 rounded bg-amber-50 text-amber-700">
              Late: <strong>{{ stats().late }}</strong>
            </div>
            <div class="px-2 py-1 rounded bg-rose-50 text-rose-700">
              Absent: <strong>{{ stats().absent }}</strong>
            </div>
          </div>
          <p-button label="Mark Attendance" icon="pi pi-plus" (onClick)="openCreate()" />
        </div>
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows [paginator]="true" [rows]="25">
        <ng-template pTemplate="header">
          <tr>
            <th>Date</th><th>Code</th><th>Employee</th>
            <th>In</th><th>Out</th>
            <th class="text-right">Hours</th><th class="text-right">OT</th>
            <th>Status</th><th>Source</th>
            <th class="w-16"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="text-sm">{{ row.workDate }}</td>
            <td class="font-mono text-xs">{{ row.employeeCode }}</td>
            <td class="text-sm">{{ row.employeeName }}</td>
            <td class="text-xs">{{ row.inTime || '—' }}</td>
            <td class="text-xs">{{ row.outTime || '—' }}</td>
            <td class="text-right">{{ row.hoursWorked | number:'1.1-2' }}</td>
            <td class="text-right">{{ row.overtimeHours | number:'1.1-2' }}</td>
            <td><p-tag [value]="row.status" [severity]="statusSeverity(row.status)" /></td>
            <td class="text-xs text-slate-500">{{ row.source }}</td>
            <td>
              <p-button icon="pi pi-trash" severity="danger" text rounded size="small"
                (onClick)="confirmDelete(row)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="10" class="text-center text-slate-500 py-8">No records.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '34rem' }" header="Mark Attendance">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Employee *</label>
            <p-select [options]="employees()" formControlName="employeeId"
              optionLabel="fullName" optionValue="id" [filter]="true" filterBy="fullName,employeeCode"
              styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Work Date *</label>
            <p-datepicker formControlName="workDate" appendTo="body" dateFormat="yy-mm-dd"
              [inputStyle]="{ width: '100%' }" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">In Time</label>
            <input pInputText class="w-full" formControlName="inTime" placeholder="08:00" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Out Time</label>
            <input pInputText class="w-full" formControlName="outTime" placeholder="17:00" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Status</label>
            <p-select [options]="statuses" formControlName="status"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Hours Worked</label>
            <p-inputNumber formControlName="hoursWorked" [min]="0" [maxFractionDigits]="2"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Overtime Hours</label>
            <p-inputNumber formControlName="overtimeHours" [min]="0" [maxFractionDigits]="2"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
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
export class HrAttendanceTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(HrApiService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<AttendanceRecord[]>([]);
  readonly employees = signal<Employee[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly statuses = STATUSES;

  filterEmpId: string | null = null;
  filterFrom: Date | null = null;
  filterTo: Date | null = null;
  dialogOpen = false;

  readonly stats = computed(() => {
    const list = this.rows();
    return {
      present: list.filter((r) => r.status === 'present').length,
      late: list.filter((r) => r.status === 'late' || r.status === 'half_day').length,
      absent: list.filter((r) => r.status === 'absent').length,
    };
  });

  readonly form = this.fb.group({
    employeeId: ['', Validators.required],
    workDate: [new Date(), Validators.required],
    inTime: ['08:00'],
    outTime: ['17:00'],
    hoursWorked: [8, [Validators.min(0)]],
    overtimeHours: [0, [Validators.min(0)]],
    status: ['present' as AttendanceStatus],
    notes: [''],
  });

  ngOnInit(): void {
    this.api.listEmployees().subscribe((e) => this.employees.set(e));
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.api
      .listAttendance({
        employeeId: this.filterEmpId || undefined,
        from: this.filterFrom ? this.toIso(this.filterFrom) : undefined,
        to: this.filterTo ? this.toIso(this.filterTo) : undefined,
      })
      .subscribe({
        next: (r) => {
          this.rows.set(r);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  statusSeverity(s: AttendanceStatus): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
    return STATUS_SEVERITY[s];
  }

  openCreate(): void {
    this.form.reset({
      employeeId: this.filterEmpId || '',
      workDate: new Date(),
      inTime: '08:00',
      outTime: '17:00',
      hoursWorked: 8,
      overtimeHours: 0,
      status: 'present',
      notes: '',
    });
    this.dialogOpen = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const dto: CreateAttendanceDto = {
      employeeId: v.employeeId!,
      workDate: this.toIso(v.workDate!),
      inTime: v.inTime || undefined,
      outTime: v.outTime || undefined,
      hoursWorked: Number(v.hoursWorked ?? 0),
      overtimeHours: Number(v.overtimeHours ?? 0),
      status: v.status || 'present',
      notes: v.notes || undefined,
    };
    this.api.createAttendance(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(row: AttendanceRecord): void {
    this.confirm.confirm({
      message: `Delete attendance for ${row.employeeName} on ${row.workDate}?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteAttendance(row.id).subscribe({ next: () => this.refresh() }),
    });
  }

  private toIso(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}

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
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import type {
  CreateLeaveRequestDto,
  Employee,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
} from '@org/shared-types';
import { HrApiService } from './hr.service';

const TYPES: { label: string; value: LeaveType }[] = [
  { label: 'Casual', value: 'casual' },
  { label: 'Sick', value: 'sick' },
  { label: 'Earned', value: 'earned' },
  { label: 'Maternity', value: 'maternity' },
  { label: 'Paternity', value: 'paternity' },
  { label: 'Unpaid', value: 'unpaid' },
  { label: 'Festival', value: 'festival' },
];

const STATUSES: { label: string; value: LeaveStatus }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Cancelled', value: 'cancelled' },
];

const STATUS_SEVERITY: Record<LeaveStatus, 'info' | 'success' | 'warn' | 'danger' | 'secondary'> = {
  pending: 'warn',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'secondary',
};

@Component({
  selector: 'app-hr-leave-tab',
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
        <p-button label="New Request" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows [paginator]="true" [rows]="20">
        <ng-template pTemplate="header">
          <tr>
            <th>Code</th><th>Employee</th><th>Type</th>
            <th>Start</th><th>End</th><th class="text-right">Days</th>
            <th>Reason</th>
            <th>Status</th><th>Approved By</th>
            <th class="w-32">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-mono text-xs">{{ row.employeeCode }}</td>
            <td class="text-sm">{{ row.employeeName }}</td>
            <td><p-tag [value]="row.leaveType" severity="info" /></td>
            <td class="text-sm">{{ row.startDate }}</td>
            <td class="text-sm">{{ row.endDate }}</td>
            <td class="text-right">{{ row.days | number:'1.1-1' }}</td>
            <td class="text-sm text-slate-600">{{ row.reason || '—' }}</td>
            <td><p-tag [value]="row.status" [severity]="statusSeverity(row.status)" /></td>
            <td class="text-sm">{{ row.approvedBy || '—' }}</td>
            <td>
              <div class="flex gap-1">
                <p-button *ngIf="row.status === 'pending'" icon="pi pi-check" severity="success"
                  text rounded size="small" pTooltip="Approve" (onClick)="approve(row)" />
                <p-button *ngIf="row.status === 'pending'" icon="pi pi-times" severity="warn"
                  text rounded size="small" pTooltip="Reject" (onClick)="reject(row)" />
                <p-button icon="pi pi-trash" severity="danger" text rounded size="small"
                  (onClick)="confirmDelete(row)" />
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="10" class="text-center text-slate-500 py-8">No requests yet.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '34rem' }" header="Leave Request">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Employee *</label>
          <p-select [options]="employees()" formControlName="employeeId"
            optionLabel="fullName" optionValue="id" [filter]="true" filterBy="fullName,employeeCode"
            styleClass="w-full" />
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Leave Type *</label>
          <p-select [options]="types" formControlName="leaveType"
            optionLabel="label" optionValue="value" styleClass="w-full" />
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Start *</label>
            <p-datepicker formControlName="startDate" appendTo="body" dateFormat="yy-mm-dd"
              [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">End *</label>
            <p-datepicker formControlName="endDate" appendTo="body" dateFormat="yy-mm-dd"
              [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Days *</label>
            <p-inputNumber formControlName="days" [min]="0.5" [maxFractionDigits]="1"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Reason</label>
          <textarea pTextarea class="w-full" rows="2" formControlName="reason"></textarea>
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
export class HrLeaveTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(HrApiService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<LeaveRequest[]>([]);
  readonly employees = signal<Employee[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly types = TYPES;
  readonly statuses = STATUSES;

  dialogOpen = false;

  readonly form = this.fb.group({
    employeeId: ['', Validators.required],
    leaveType: ['casual' as LeaveType, Validators.required],
    startDate: [new Date(), Validators.required],
    endDate: [new Date(), Validators.required],
    days: [1, [Validators.required, Validators.min(0.5)]],
    reason: [''],
  });

  ngOnInit(): void {
    this.api.listEmployees().subscribe((e) => this.employees.set(e));
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listLeave().subscribe({
      next: (r) => {
        this.rows.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  statusSeverity(s: LeaveStatus): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
    return STATUS_SEVERITY[s];
  }

  openCreate(): void {
    this.form.reset({
      employeeId: '',
      leaveType: 'casual',
      startDate: new Date(),
      endDate: new Date(),
      days: 1,
      reason: '',
    });
    this.dialogOpen = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const dto: CreateLeaveRequestDto = {
      employeeId: v.employeeId!,
      leaveType: v.leaveType!,
      startDate: this.toIso(v.startDate!),
      endDate: this.toIso(v.endDate!),
      days: Number(v.days || 1),
      reason: v.reason || undefined,
    };
    this.api.createLeave(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  approve(row: LeaveRequest): void {
    this.api
      .updateLeave(row.id, { status: 'approved', approvedBy: 'HR Manager' })
      .subscribe(() => this.refresh());
  }

  reject(row: LeaveRequest): void {
    this.api
      .updateLeave(row.id, { status: 'rejected', approvedBy: 'HR Manager' })
      .subscribe(() => this.refresh());
  }

  confirmDelete(row: LeaveRequest): void {
    this.confirm.confirm({
      message: `Delete leave for ${row.employeeName}?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteLeave(row.id).subscribe({ next: () => this.refresh() }),
    });
  }

  private toIso(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}

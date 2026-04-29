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
  CreateEmployeeDto,
  Employee,
  EmployeeGender,
  EmployeeStatus,
  EmploymentType,
  HrDepartment,
  PayType,
  SkillGrade,
} from '@org/shared-types';
import { HrApiService } from './hr.service';

const GENDERS: { label: string; value: EmployeeGender }[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];
const EMPLOYMENT_TYPES: { label: string; value: EmploymentType }[] = [
  { label: 'Permanent', value: 'permanent' },
  { label: 'Contractual', value: 'contractual' },
  { label: 'Casual', value: 'casual' },
  { label: 'Intern', value: 'intern' },
];
const PAY_TYPES: { label: string; value: PayType }[] = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Piece Rate', value: 'piece_rate' },
  { label: 'Daily', value: 'daily' },
  { label: 'Hourly', value: 'hourly' },
];
const SKILL_GRADES: { label: string; value: SkillGrade }[] = [
  { label: 'Grade 1', value: 'grade_1' },
  { label: 'Grade 2', value: 'grade_2' },
  { label: 'Grade 3', value: 'grade_3' },
  { label: 'Grade 4', value: 'grade_4' },
  { label: 'Grade 5', value: 'grade_5' },
  { label: 'Grade 6', value: 'grade_6' },
  { label: 'Grade 7', value: 'grade_7' },
];
const STATUSES: { label: string; value: EmployeeStatus }[] = [
  { label: 'Active', value: 'active' },
  { label: 'On Leave', value: 'on_leave' },
  { label: 'Terminated', value: 'terminated' },
  { label: 'Resigned', value: 'resigned' },
];
const STATUS_SEVERITY: Record<EmployeeStatus, 'info' | 'success' | 'warn' | 'danger' | 'secondary'> = {
  active: 'success',
  on_leave: 'warn',
  terminated: 'danger',
  resigned: 'secondary',
};

@Component({
  selector: 'app-hr-employees-tab',
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
      <div class="flex items-end justify-between gap-4">
        <div class="grid grid-cols-3 gap-3 flex-1">
          <div class="rounded-lg border bg-white p-3">
            <div class="text-xs uppercase tracking-wide text-slate-500">Total</div>
            <div class="text-2xl font-semibold text-slate-900">{{ stats().total }}</div>
          </div>
          <div class="rounded-lg border bg-white p-3">
            <div class="text-xs uppercase tracking-wide text-slate-500">Active</div>
            <div class="text-2xl font-semibold text-emerald-600">{{ stats().active }}</div>
          </div>
          <div class="rounded-lg border bg-white p-3">
            <div class="text-xs uppercase tracking-wide text-slate-500">Avg. Base Salary (BDT)</div>
            <div class="text-2xl font-semibold text-slate-900">{{ stats().avgSalary | number:'1.0-0' }}</div>
          </div>
        </div>
        <p-button label="New Employee" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows [paginator]="true" [rows]="20">
        <ng-template pTemplate="header">
          <tr>
            <th>Code</th><th>Name</th><th>Department</th><th>Designation</th>
            <th>Type</th><th>Pay</th><th>Grade</th>
            <th class="text-right">Base (BDT)</th>
            <th>Joined</th><th>Status</th>
            <th class="w-16"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-mono text-sm">{{ row.employeeCode }}</td>
            <td class="font-medium">{{ row.fullName }}</td>
            <td class="text-sm">{{ row.departmentName || '—' }}</td>
            <td class="text-sm">{{ row.designation || '—' }}</td>
            <td><p-tag [value]="row.employmentType" severity="info" /></td>
            <td class="text-xs">{{ row.payType }}</td>
            <td class="text-xs">{{ row.skillGrade || '—' }}</td>
            <td class="text-right">{{ row.baseSalary | number:'1.0-0' }}</td>
            <td class="text-sm">{{ row.joinDate }}</td>
            <td><p-tag [value]="row.status" [severity]="statusSeverity(row.status)" /></td>
            <td>
              <p-button icon="pi pi-trash" severity="danger" text rounded size="small"
                (onClick)="confirmDelete(row)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="11" class="text-center text-slate-500 py-8">No employees yet.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '52rem' }" header="New Employee">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Code *</label>
            <input pInputText class="w-full" formControlName="employeeCode" placeholder="EMP-0001" />
          </div>
          <div class="col-span-2">
            <label class="text-sm font-medium text-slate-700 mb-1 block">Full Name *</label>
            <input pInputText class="w-full" formControlName="fullName" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">NID #</label>
            <input pInputText class="w-full" formControlName="nidNumber" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Phone</label>
            <input pInputText class="w-full" formControlName="phone" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Gender</label>
            <p-select [options]="genders" formControlName="gender" [showClear]="true"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Department</label>
            <p-select [options]="departments()" formControlName="departmentId" [showClear]="true"
              optionLabel="name" optionValue="id" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Designation</label>
            <input pInputText class="w-full" formControlName="designation" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Employment Type</label>
            <p-select [options]="employmentTypes" formControlName="employmentType"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Pay Type</label>
            <p-select [options]="payTypes" formControlName="payType"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Skill Grade</label>
            <p-select [options]="skillGrades" formControlName="skillGrade" [showClear]="true"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <div class="border-t pt-3">
          <h4 class="text-sm font-semibold text-slate-700 mb-2">Compensation (BDT)</h4>
          <div class="grid grid-cols-5 gap-3">
            <div>
              <label class="text-xs text-slate-600 mb-1 block">Basic</label>
              <p-inputNumber formControlName="baseSalary" [min]="0" styleClass="w-full"
                [inputStyle]="{ width: '100%' }" />
            </div>
            <div>
              <label class="text-xs text-slate-600 mb-1 block">House Rent</label>
              <p-inputNumber formControlName="houseRent" [min]="0" styleClass="w-full"
                [inputStyle]="{ width: '100%' }" />
            </div>
            <div>
              <label class="text-xs text-slate-600 mb-1 block">Medical</label>
              <p-inputNumber formControlName="medicalAllowance" [min]="0" styleClass="w-full"
                [inputStyle]="{ width: '100%' }" />
            </div>
            <div>
              <label class="text-xs text-slate-600 mb-1 block">Transport</label>
              <p-inputNumber formControlName="transportAllowance" [min]="0" styleClass="w-full"
                [inputStyle]="{ width: '100%' }" />
            </div>
            <div>
              <label class="text-xs text-slate-600 mb-1 block">Food</label>
              <p-inputNumber formControlName="foodAllowance" [min]="0" styleClass="w-full"
                [inputStyle]="{ width: '100%' }" />
            </div>
          </div>
          <div class="text-xs text-slate-500 mt-2">
            Gross = {{ grossSalary() | number:'1.0-0' }} BDT/month
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Join Date</label>
            <p-datepicker formControlName="joinDate" appendTo="body" dateFormat="yy-mm-dd"
              [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">DOB</label>
            <p-datepicker formControlName="dateOfBirth" appendTo="body" dateFormat="yy-mm-dd"
              [inputStyle]="{ width: '100%' }" [showClear]="true" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Status</label>
            <p-select [options]="statuses" formControlName="status"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Bank Name</label>
            <input pInputText class="w-full" formControlName="bankName" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Bank A/C</label>
            <input pInputText class="w-full" formControlName="bankAccount" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">bKash #</label>
            <input pInputText class="w-full" formControlName="bkashNumber" />
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
export class HrEmployeesTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(HrApiService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<Employee[]>([]);
  readonly departments = signal<HrDepartment[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly genders = GENDERS;
  readonly employmentTypes = EMPLOYMENT_TYPES;
  readonly payTypes = PAY_TYPES;
  readonly skillGrades = SKILL_GRADES;
  readonly statuses = STATUSES;

  readonly stats = computed(() => {
    const list = this.rows();
    const total = list.length;
    const active = list.filter((e) => e.status === 'active').length;
    const avgSalary = total === 0 ? 0 : list.reduce((s, e) => s + Number(e.baseSalary), 0) / total;
    return { total, active, avgSalary };
  });

  dialogOpen = false;

  readonly form = this.fb.group({
    employeeCode: ['', [Validators.required, Validators.maxLength(40)]],
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    nidNumber: [''],
    dateOfBirth: [null as Date | null],
    gender: [null as EmployeeGender | null],
    phone: [''],
    email: [''],
    address: [''],
    departmentId: [null as string | null],
    designation: [''],
    employmentType: ['permanent' as EmploymentType],
    payType: ['monthly' as PayType],
    skillGrade: [null as SkillGrade | null],
    baseSalary: [0, [Validators.min(0)]],
    houseRent: [0, [Validators.min(0)]],
    medicalAllowance: [0, [Validators.min(0)]],
    transportAllowance: [0, [Validators.min(0)]],
    foodAllowance: [0, [Validators.min(0)]],
    joinDate: [new Date()],
    status: ['active' as EmployeeStatus],
    bankName: [''],
    bankAccount: [''],
    bkashNumber: [''],
    notes: [''],
  });

  readonly _formValueSig = signal(0);

  ngOnInit(): void {
    this.refresh();
    this.api.listDepartments().subscribe((d) => this.departments.set(d));
    this.form.valueChanges.subscribe(() => this._formValueSig.update((n) => n + 1));
  }

  grossSalary(): number {
    void this._formValueSig();
    const v = this.form.getRawValue();
    return (
      Number(v.baseSalary || 0) +
      Number(v.houseRent || 0) +
      Number(v.medicalAllowance || 0) +
      Number(v.transportAllowance || 0) +
      Number(v.foodAllowance || 0)
    );
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listEmployees().subscribe({
      next: (r) => {
        this.rows.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  statusSeverity(s: EmployeeStatus): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
    return STATUS_SEVERITY[s];
  }

  openCreate(): void {
    const seq = String(this.rows().length + 1).padStart(4, '0');
    this.form.reset({
      employeeCode: `EMP-${seq}`,
      fullName: '',
      nidNumber: '',
      dateOfBirth: null,
      gender: null,
      phone: '',
      email: '',
      address: '',
      departmentId: null,
      designation: '',
      employmentType: 'permanent',
      payType: 'monthly',
      skillGrade: null,
      baseSalary: 0,
      houseRent: 0,
      medicalAllowance: 0,
      transportAllowance: 0,
      foodAllowance: 0,
      joinDate: new Date(),
      status: 'active',
      bankName: '',
      bankAccount: '',
      bkashNumber: '',
      notes: '',
    });
    this.dialogOpen = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const dto: CreateEmployeeDto = {
      employeeCode: v.employeeCode!,
      fullName: v.fullName!,
      nidNumber: v.nidNumber || undefined,
      dateOfBirth: v.dateOfBirth ? this.toIso(v.dateOfBirth) : undefined,
      gender: v.gender || undefined,
      phone: v.phone || undefined,
      email: v.email || undefined,
      address: v.address || undefined,
      departmentId: v.departmentId || null,
      designation: v.designation || undefined,
      employmentType: v.employmentType || 'permanent',
      payType: v.payType || 'monthly',
      skillGrade: v.skillGrade || null,
      baseSalary: Number(v.baseSalary || 0),
      houseRent: Number(v.houseRent || 0),
      medicalAllowance: Number(v.medicalAllowance || 0),
      transportAllowance: Number(v.transportAllowance || 0),
      foodAllowance: Number(v.foodAllowance || 0),
      joinDate: v.joinDate ? this.toIso(v.joinDate) : undefined,
      status: v.status || 'active',
      bankName: v.bankName || undefined,
      bankAccount: v.bankAccount || undefined,
      bkashNumber: v.bkashNumber || undefined,
      notes: v.notes || undefined,
    };
    this.api.createEmployee(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(row: Employee): void {
    this.confirm.confirm({
      message: `Delete employee "${row.fullName}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteEmployee(row.id).subscribe({ next: () => this.refresh() }),
    });
  }

  private toIso(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}

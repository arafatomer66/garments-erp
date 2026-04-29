import type { ISODateString } from './common.types.js';

export type EmployeeGender = 'male' | 'female' | 'other';
export type EmploymentType = 'permanent' | 'contractual' | 'casual' | 'intern';
export type PayType = 'monthly' | 'piece_rate' | 'daily' | 'hourly';
export type SkillGrade =
  | 'grade_1'
  | 'grade_2'
  | 'grade_3'
  | 'grade_4'
  | 'grade_5'
  | 'grade_6'
  | 'grade_7';
export type EmployeeStatus = 'active' | 'on_leave' | 'terminated' | 'resigned';
export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'half_day'
  | 'leave'
  | 'holiday'
  | 'weekoff';
export type AttendanceSource = 'manual' | 'biometric' | 'import';
export type LeaveType =
  | 'casual'
  | 'sick'
  | 'earned'
  | 'maternity'
  | 'paternity'
  | 'unpaid'
  | 'festival';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type PayrollStatus = 'draft' | 'computed' | 'approved' | 'paid';

export interface HrDepartment {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  parentName?: string | null;
  headEmployeeId: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateHrDepartmentDto {
  code: string;
  name: string;
  parentId?: string | null;
  headEmployeeId?: string | null;
  description?: string;
  isActive?: boolean;
}

export type UpdateHrDepartmentDto = Partial<CreateHrDepartmentDto>;

export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  nidNumber: string | null;
  dateOfBirth: ISODateString | null;
  gender: EmployeeGender | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  departmentId: string | null;
  departmentName?: string | null;
  designation: string | null;
  employmentType: EmploymentType;
  payType: PayType;
  skillGrade: SkillGrade | null;
  baseSalary: number;
  houseRent: number;
  medicalAllowance: number;
  transportAllowance: number;
  foodAllowance: number;
  joinDate: ISODateString;
  leaveDate: ISODateString | null;
  status: EmployeeStatus;
  bankName: string | null;
  bankAccount: string | null;
  bkashNumber: string | null;
  notes: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateEmployeeDto {
  employeeCode: string;
  fullName: string;
  nidNumber?: string;
  dateOfBirth?: string;
  gender?: EmployeeGender;
  phone?: string;
  email?: string;
  address?: string;
  departmentId?: string | null;
  designation?: string;
  employmentType?: EmploymentType;
  payType?: PayType;
  skillGrade?: SkillGrade | null;
  baseSalary?: number;
  houseRent?: number;
  medicalAllowance?: number;
  transportAllowance?: number;
  foodAllowance?: number;
  joinDate?: string;
  leaveDate?: string | null;
  status?: EmployeeStatus;
  bankName?: string;
  bankAccount?: string;
  bkashNumber?: string;
  notes?: string;
}

export type UpdateEmployeeDto = Partial<CreateEmployeeDto>;

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  workDate: ISODateString;
  inTime: string | null;
  outTime: string | null;
  hoursWorked: number;
  overtimeHours: number;
  status: AttendanceStatus;
  source: AttendanceSource;
  notes: string | null;
  createdAt: ISODateString;
}

export interface CreateAttendanceDto {
  employeeId: string;
  workDate: string;
  inTime?: string;
  outTime?: string;
  hoursWorked?: number;
  overtimeHours?: number;
  status?: AttendanceStatus;
  source?: AttendanceSource;
  notes?: string;
}

export type UpdateAttendanceDto = Partial<Omit<CreateAttendanceDto, 'employeeId' | 'workDate'>>;

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  leaveType: LeaveType;
  startDate: ISODateString;
  endDate: ISODateString;
  days: number;
  reason: string | null;
  status: LeaveStatus;
  approvedBy: string | null;
  approvedAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status?: LeaveStatus;
  approvedBy?: string;
}

export type UpdateLeaveRequestDto = Partial<CreateLeaveRequestDto>;

export interface PayrollLine {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  daysWorked: number;
  daysAbsent: number;
  overtimeHours: number;
  piecesCompleted: number;
  basic: number;
  houseRent: number;
  medicalAllowance: number;
  transportAllowance: number;
  foodAllowance: number;
  overtimeAmount: number;
  pieceRateAmount: number;
  bonus: number;
  grossPay: number;
  advance: number;
  pfDeduction: number;
  taxDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  notes: string | null;
  createdAt: ISODateString;
}

export interface PayrollRun {
  id: string;
  runNumber: string;
  periodYear: number;
  periodMonth: number;
  periodLabel: string;
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  status: PayrollStatus;
  notes: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  lines?: PayrollLine[];
}

export interface CreatePayrollRunDto {
  runNumber: string;
  periodYear: number;
  periodMonth: number;
  periodLabel?: string;
  status?: PayrollStatus;
  notes?: string;
}

export type UpdatePayrollRunDto = Partial<Omit<CreatePayrollRunDto, 'runNumber'>>;

export interface CreatePayrollLineDto {
  employeeId: string;
  daysWorked?: number;
  daysAbsent?: number;
  overtimeHours?: number;
  piecesCompleted?: number;
  basic?: number;
  houseRent?: number;
  medicalAllowance?: number;
  transportAllowance?: number;
  foodAllowance?: number;
  overtimeAmount?: number;
  pieceRateAmount?: number;
  bonus?: number;
  advance?: number;
  pfDeduction?: number;
  taxDeduction?: number;
  otherDeductions?: number;
  notes?: string;
}

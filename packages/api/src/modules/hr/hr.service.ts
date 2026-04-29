import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AttendanceRecord,
  Employee,
  HrDepartment,
  LeaveRequest,
  PayrollLine,
  PayrollRun,
} from '@org/shared-types';
import { TenantRepository } from '../../core/database/tenant-repository';
import { camelize } from '../masters/sql.util';
import { CreateHrDepartmentDto, UpdateHrDepartmentDto } from './dto/department.dto';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { CreateAttendanceDto, UpdateAttendanceDto } from './dto/attendance.dto';
import { CreateLeaveRequestDto, UpdateLeaveRequestDto } from './dto/leave.dto';
import {
  CreatePayrollLineDto,
  CreatePayrollRunDto,
  UpdatePayrollRunDto,
} from './dto/payroll.dto';

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

@Injectable()
export class HrService extends TenantRepository {
  // ============= Departments =============

  async listDepartments(): Promise<HrDepartment[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT d.*, p.name AS parent_name
         FROM hr_departments d
         LEFT JOIN hr_departments p ON p.id = d.parent_id
        ORDER BY d.code`,
    );
    return rows.map((r) => camelize(r) as unknown as HrDepartment);
  }

  async createDepartment(dto: CreateHrDepartmentDto): Promise<HrDepartment> {
    const rows = await this.query<{ id: string }>(
      `INSERT INTO hr_departments (code, name, parent_id, head_employee_id, description, is_active)
       VALUES ($1, $2, $3::uuid, $4::uuid, $5, COALESCE($6, TRUE))
       RETURNING id`,
      [
        dto.code,
        dto.name,
        dto.parentId ?? null,
        dto.headEmployeeId ?? null,
        dto.description ?? null,
        dto.isActive ?? null,
      ],
    );
    return this.findDepartment(rows[0].id);
  }

  async findDepartment(id: string): Promise<HrDepartment> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT d.*, p.name AS parent_name
         FROM hr_departments d
         LEFT JOIN hr_departments p ON p.id = d.parent_id
        WHERE d.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Department ${id} not found`);
    return camelize(rows[0]) as unknown as HrDepartment;
  }

  async updateDepartment(id: string, dto: UpdateHrDepartmentDto): Promise<HrDepartment> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown, cast?: string) => {
      vals.push(val);
      sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
    };
    if (dto.code !== undefined) push('code', dto.code);
    if (dto.name !== undefined) push('name', dto.name);
    if (dto.parentId !== undefined) push('parent_id', dto.parentId, 'uuid');
    if (dto.headEmployeeId !== undefined) push('head_employee_id', dto.headEmployeeId, 'uuid');
    if (dto.description !== undefined) push('description', dto.description);
    if (dto.isActive !== undefined) push('is_active', dto.isActive);
    if (sets.length === 0) return this.findDepartment(id);
    vals.push(id);
    const affected = await this.exec(
      `UPDATE hr_departments SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    if (affected === 0) throw new NotFoundException(`Department ${id} not found`);
    return this.findDepartment(id);
  }

  async removeDepartment(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM hr_departments WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Department ${id} not found`);
  }

  // ============= Employees =============

  async listEmployees(): Promise<Employee[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT e.*, d.name AS department_name
         FROM employees e
         LEFT JOIN hr_departments d ON d.id = e.department_id
        ORDER BY e.employee_code`,
    );
    return rows.map((r) => this.toEmployee(r));
  }

  async createEmployee(dto: CreateEmployeeDto): Promise<Employee> {
    const rows = await this.query<{ id: string }>(
      `INSERT INTO employees (
          employee_code, full_name, nid_number, date_of_birth, gender,
          phone, email, address, department_id, designation,
          employment_type, pay_type, skill_grade,
          base_salary, house_rent, medical_allowance, transport_allowance, food_allowance,
          join_date, leave_date, status, bank_name, bank_account, bkash_number, notes)
       VALUES ($1, $2, $3, $4::date, $5,
          $6, $7, $8, $9::uuid, $10,
          COALESCE($11, 'permanent'), COALESCE($12, 'monthly'), $13,
          COALESCE($14, 0), COALESCE($15, 0), COALESCE($16, 0), COALESCE($17, 0), COALESCE($18, 0),
          COALESCE($19::date, CURRENT_DATE), $20::date, COALESCE($21, 'active'), $22, $23, $24, $25)
       RETURNING id`,
      [
        dto.employeeCode,
        dto.fullName,
        dto.nidNumber ?? null,
        dto.dateOfBirth ?? null,
        dto.gender ?? null,
        dto.phone ?? null,
        dto.email ?? null,
        dto.address ?? null,
        dto.departmentId ?? null,
        dto.designation ?? null,
        dto.employmentType ?? null,
        dto.payType ?? null,
        dto.skillGrade ?? null,
        dto.baseSalary ?? null,
        dto.houseRent ?? null,
        dto.medicalAllowance ?? null,
        dto.transportAllowance ?? null,
        dto.foodAllowance ?? null,
        dto.joinDate ?? null,
        dto.leaveDate ?? null,
        dto.status ?? null,
        dto.bankName ?? null,
        dto.bankAccount ?? null,
        dto.bkashNumber ?? null,
        dto.notes ?? null,
      ],
    );
    return this.findEmployee(rows[0].id);
  }

  async findEmployee(id: string): Promise<Employee> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT e.*, d.name AS department_name
         FROM employees e
         LEFT JOIN hr_departments d ON d.id = e.department_id
        WHERE e.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Employee ${id} not found`);
    return this.toEmployee(rows[0]);
  }

  async updateEmployee(id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown, cast?: string) => {
      vals.push(val);
      sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
    };
    if (dto.employeeCode !== undefined) push('employee_code', dto.employeeCode);
    if (dto.fullName !== undefined) push('full_name', dto.fullName);
    if (dto.nidNumber !== undefined) push('nid_number', dto.nidNumber);
    if (dto.dateOfBirth !== undefined) push('date_of_birth', dto.dateOfBirth, 'date');
    if (dto.gender !== undefined) push('gender', dto.gender);
    if (dto.phone !== undefined) push('phone', dto.phone);
    if (dto.email !== undefined) push('email', dto.email);
    if (dto.address !== undefined) push('address', dto.address);
    if (dto.departmentId !== undefined) push('department_id', dto.departmentId, 'uuid');
    if (dto.designation !== undefined) push('designation', dto.designation);
    if (dto.employmentType !== undefined) push('employment_type', dto.employmentType);
    if (dto.payType !== undefined) push('pay_type', dto.payType);
    if (dto.skillGrade !== undefined) push('skill_grade', dto.skillGrade);
    if (dto.baseSalary !== undefined) push('base_salary', dto.baseSalary);
    if (dto.houseRent !== undefined) push('house_rent', dto.houseRent);
    if (dto.medicalAllowance !== undefined) push('medical_allowance', dto.medicalAllowance);
    if (dto.transportAllowance !== undefined) push('transport_allowance', dto.transportAllowance);
    if (dto.foodAllowance !== undefined) push('food_allowance', dto.foodAllowance);
    if (dto.joinDate !== undefined) push('join_date', dto.joinDate, 'date');
    if (dto.leaveDate !== undefined) push('leave_date', dto.leaveDate, 'date');
    if (dto.status !== undefined) push('status', dto.status);
    if (dto.bankName !== undefined) push('bank_name', dto.bankName);
    if (dto.bankAccount !== undefined) push('bank_account', dto.bankAccount);
    if (dto.bkashNumber !== undefined) push('bkash_number', dto.bkashNumber);
    if (dto.notes !== undefined) push('notes', dto.notes);
    if (sets.length === 0) return this.findEmployee(id);
    vals.push(id);
    const affected = await this.exec(
      `UPDATE employees SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    if (affected === 0) throw new NotFoundException(`Employee ${id} not found`);
    return this.findEmployee(id);
  }

  async removeEmployee(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM employees WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Employee ${id} not found`);
  }

  private toEmployee(row: Record<string, unknown>): Employee {
    const c = camelize(row) as Record<string, unknown>;
    return {
      ...(c as unknown as Employee),
      baseSalary: Number(c['baseSalary']),
      houseRent: Number(c['houseRent']),
      medicalAllowance: Number(c['medicalAllowance']),
      transportAllowance: Number(c['transportAllowance']),
      foodAllowance: Number(c['foodAllowance']),
    };
  }

  // ============= Attendance =============

  async listAttendance(employeeId?: string, from?: string, to?: string): Promise<AttendanceRecord[]> {
    const filters: string[] = [];
    const vals: unknown[] = [];
    if (employeeId) {
      vals.push(employeeId);
      filters.push(`a.employee_id = $${vals.length}::uuid`);
    }
    if (from) {
      vals.push(from);
      filters.push(`a.work_date >= $${vals.length}::date`);
    }
    if (to) {
      vals.push(to);
      filters.push(`a.work_date <= $${vals.length}::date`);
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rows = await this.query<Record<string, unknown>>(
      `SELECT a.*, e.employee_code, e.full_name AS employee_name
         FROM attendance_records a
         JOIN employees e ON e.id = a.employee_id
        ${where}
        ORDER BY a.work_date DESC, e.employee_code`,
      vals,
    );
    return rows.map((r) => this.toAttendance(r));
  }

  async createAttendance(dto: CreateAttendanceDto): Promise<AttendanceRecord> {
    const rows = await this.query<{ id: string }>(
      `INSERT INTO attendance_records (
          employee_id, work_date, in_time, out_time,
          hours_worked, overtime_hours, status, source, notes)
       VALUES ($1::uuid, $2::date, $3::time, $4::time,
          COALESCE($5, 0), COALESCE($6, 0),
          COALESCE($7, 'present'), COALESCE($8, 'manual'), $9)
       ON CONFLICT (employee_id, work_date) DO UPDATE SET
          in_time = EXCLUDED.in_time,
          out_time = EXCLUDED.out_time,
          hours_worked = EXCLUDED.hours_worked,
          overtime_hours = EXCLUDED.overtime_hours,
          status = EXCLUDED.status,
          source = EXCLUDED.source,
          notes = EXCLUDED.notes
       RETURNING id`,
      [
        dto.employeeId,
        dto.workDate,
        dto.inTime ?? null,
        dto.outTime ?? null,
        dto.hoursWorked ?? null,
        dto.overtimeHours ?? null,
        dto.status ?? null,
        dto.source ?? null,
        dto.notes ?? null,
      ],
    );
    return this.findAttendance(rows[0].id);
  }

  async findAttendance(id: string): Promise<AttendanceRecord> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT a.*, e.employee_code, e.full_name AS employee_name
         FROM attendance_records a
         JOIN employees e ON e.id = a.employee_id
        WHERE a.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Attendance ${id} not found`);
    return this.toAttendance(rows[0]);
  }

  async updateAttendance(id: string, dto: UpdateAttendanceDto): Promise<AttendanceRecord> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown, cast?: string) => {
      vals.push(val);
      sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
    };
    if (dto.inTime !== undefined) push('in_time', dto.inTime, 'time');
    if (dto.outTime !== undefined) push('out_time', dto.outTime, 'time');
    if (dto.hoursWorked !== undefined) push('hours_worked', dto.hoursWorked);
    if (dto.overtimeHours !== undefined) push('overtime_hours', dto.overtimeHours);
    if (dto.status !== undefined) push('status', dto.status);
    if (dto.source !== undefined) push('source', dto.source);
    if (dto.notes !== undefined) push('notes', dto.notes);
    if (sets.length === 0) return this.findAttendance(id);
    vals.push(id);
    const affected = await this.exec(
      `UPDATE attendance_records SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    if (affected === 0) throw new NotFoundException(`Attendance ${id} not found`);
    return this.findAttendance(id);
  }

  async removeAttendance(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM attendance_records WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Attendance ${id} not found`);
  }

  private toAttendance(row: Record<string, unknown>): AttendanceRecord {
    const c = camelize(row) as Record<string, unknown>;
    return {
      ...(c as unknown as AttendanceRecord),
      hoursWorked: Number(c['hoursWorked']),
      overtimeHours: Number(c['overtimeHours']),
    };
  }

  // ============= Leave Requests =============

  async listLeaveRequests(): Promise<LeaveRequest[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT l.*, e.employee_code, e.full_name AS employee_name
         FROM leave_requests l
         JOIN employees e ON e.id = l.employee_id
        ORDER BY l.start_date DESC, l.created_at DESC`,
    );
    return rows.map((r) => this.toLeave(r));
  }

  async createLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const rows = await this.query<{ id: string }>(
      `INSERT INTO leave_requests (
          employee_id, leave_type, start_date, end_date, days,
          reason, status, approved_by, approved_at)
       VALUES ($1::uuid, $2, $3::date, $4::date, $5,
          $6, COALESCE($7, 'pending'), $8,
          CASE WHEN $7 IN ('approved','rejected') THEN NOW() ELSE NULL END)
       RETURNING id`,
      [
        dto.employeeId,
        dto.leaveType,
        dto.startDate,
        dto.endDate,
        dto.days,
        dto.reason ?? null,
        dto.status ?? null,
        dto.approvedBy ?? null,
      ],
    );
    return this.findLeaveRequest(rows[0].id);
  }

  async findLeaveRequest(id: string): Promise<LeaveRequest> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT l.*, e.employee_code, e.full_name AS employee_name
         FROM leave_requests l
         JOIN employees e ON e.id = l.employee_id
        WHERE l.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Leave ${id} not found`);
    return this.toLeave(rows[0]);
  }

  async updateLeaveRequest(id: string, dto: UpdateLeaveRequestDto): Promise<LeaveRequest> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown, cast?: string) => {
      vals.push(val);
      sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
    };
    if (dto.employeeId !== undefined) push('employee_id', dto.employeeId, 'uuid');
    if (dto.leaveType !== undefined) push('leave_type', dto.leaveType);
    if (dto.startDate !== undefined) push('start_date', dto.startDate, 'date');
    if (dto.endDate !== undefined) push('end_date', dto.endDate, 'date');
    if (dto.days !== undefined) push('days', dto.days);
    if (dto.reason !== undefined) push('reason', dto.reason);
    if (dto.status !== undefined) {
      push('status', dto.status);
      if (dto.status === 'approved' || dto.status === 'rejected') {
        sets.push(`approved_at = NOW()`);
      }
    }
    if (dto.approvedBy !== undefined) push('approved_by', dto.approvedBy);
    if (sets.length === 0) return this.findLeaveRequest(id);
    vals.push(id);
    const affected = await this.exec(
      `UPDATE leave_requests SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    if (affected === 0) throw new NotFoundException(`Leave ${id} not found`);
    return this.findLeaveRequest(id);
  }

  async removeLeaveRequest(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM leave_requests WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Leave ${id} not found`);
  }

  private toLeave(row: Record<string, unknown>): LeaveRequest {
    const c = camelize(row) as Record<string, unknown>;
    return {
      ...(c as unknown as LeaveRequest),
      days: Number(c['days']),
    };
  }

  // ============= Payroll Runs =============

  async listPayrollRuns(): Promise<PayrollRun[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM payroll_runs
        ORDER BY period_year DESC, period_month DESC, run_number DESC`,
    );
    return rows.map((r) => this.toRun(r));
  }

  async createPayrollRun(dto: CreatePayrollRunDto): Promise<PayrollRun> {
    const label = dto.periodLabel || `${MONTH_LABELS[dto.periodMonth - 1]} ${dto.periodYear}`;
    const rows = await this.query<{ id: string }>(
      `INSERT INTO payroll_runs (run_number, period_year, period_month, period_label, status, notes)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'draft'), $6)
       RETURNING id`,
      [
        dto.runNumber,
        dto.periodYear,
        dto.periodMonth,
        label,
        dto.status ?? null,
        dto.notes ?? null,
      ],
    );
    return this.findPayrollRun(rows[0].id);
  }

  async findPayrollRun(id: string): Promise<PayrollRun> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM payroll_runs WHERE id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Payroll run ${id} not found`);
    const lineRows = await this.query<Record<string, unknown>>(
      `SELECT pl.*, e.employee_code, e.full_name AS employee_name
         FROM payroll_lines pl
         JOIN employees e ON e.id = pl.employee_id
        WHERE pl.payroll_run_id = $1::uuid
        ORDER BY e.employee_code`,
      [id],
    );
    const run = this.toRun(rows[0]);
    run.lines = lineRows.map((r) => this.toLine(r));
    return run;
  }

  async updatePayrollRun(id: string, dto: UpdatePayrollRunDto): Promise<PayrollRun> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown) => {
      vals.push(val);
      sets.push(`${col} = $${vals.length}`);
    };
    if (dto.periodYear !== undefined) push('period_year', dto.periodYear);
    if (dto.periodMonth !== undefined) push('period_month', dto.periodMonth);
    if (dto.periodLabel !== undefined) push('period_label', dto.periodLabel);
    if (dto.status !== undefined) push('status', dto.status);
    if (dto.notes !== undefined) push('notes', dto.notes);
    if (sets.length === 0) return this.findPayrollRun(id);
    vals.push(id);
    const affected = await this.exec(
      `UPDATE payroll_runs SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    if (affected === 0) throw new NotFoundException(`Payroll run ${id} not found`);
    return this.findPayrollRun(id);
  }

  async removePayrollRun(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM payroll_runs WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Payroll run ${id} not found`);
  }

  // Compute lines for all active employees from attendance in the run's period
  async computePayrollRun(id: string): Promise<PayrollRun> {
    return this.withTx(async (tx) => {
      const runRows = await tx.query<Record<string, unknown>>(
        `SELECT * FROM payroll_runs WHERE id = $1::uuid`,
        [id],
      );
      if (runRows.length === 0) throw new NotFoundException(`Payroll run ${id} not found`);
      const r = camelize(runRows[0]) as Record<string, unknown>;
      const year = Number(r['periodYear']);
      const month = Number(r['periodMonth']);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDateD = new Date(year, month, 0);
      const endDate = `${endDateD.getFullYear()}-${String(endDateD.getMonth() + 1).padStart(2, '0')}-${String(endDateD.getDate()).padStart(2, '0')}`;
      const workingDays = endDateD.getDate();

      const employees = await tx.query<Record<string, unknown>>(
        `SELECT * FROM employees WHERE status IN ('active','on_leave')`,
      );

      await tx.exec(`DELETE FROM payroll_lines WHERE payroll_run_id = $1::uuid`, [id]);

      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;

      for (const empRow of employees) {
        const e = camelize(empRow) as Record<string, unknown>;
        const employeeId = e['id'] as string;
        const att = await tx.query<{
          present_days: string;
          absent_days: string;
          ot_hours: string;
        }>(
          `SELECT
              COUNT(*) FILTER (WHERE status IN ('present','late','half_day')) AS present_days,
              COUNT(*) FILTER (WHERE status = 'absent') AS absent_days,
              COALESCE(SUM(overtime_hours), 0) AS ot_hours
            FROM attendance_records
           WHERE employee_id = $1::uuid AND work_date BETWEEN $2::date AND $3::date`,
          [employeeId, startDate, endDate],
        );
        const presentDays = Number(att[0]?.present_days || 0);
        const absentDays = Number(att[0]?.absent_days || 0);
        const otHours = Number(att[0]?.ot_hours || 0);

        const basic = Number(e['baseSalary'] || 0);
        const houseRent = Number(e['houseRent'] || 0);
        const medical = Number(e['medicalAllowance'] || 0);
        const transport = Number(e['transportAllowance'] || 0);
        const food = Number(e['foodAllowance'] || 0);
        const monthlyTotal = basic + houseRent + medical + transport + food;

        const dailyRate = monthlyTotal / workingDays;
        const hourlyRate = dailyRate / 8;
        const otRate = hourlyRate * 2;

        const proratedDays = presentDays > 0 ? presentDays : (absentDays > 0 ? 0 : workingDays);
        const proratedFactor = proratedDays / workingDays;
        const proBasic = round2(basic * proratedFactor);
        const proHouse = round2(houseRent * proratedFactor);
        const proMed = round2(medical * proratedFactor);
        const proTrans = round2(transport * proratedFactor);
        const proFood = round2(food * proratedFactor);
        const otAmount = round2(otHours * otRate);
        const grossPay = round2(proBasic + proHouse + proMed + proTrans + proFood + otAmount);
        const totalDed = 0;
        const netPay = round2(grossPay - totalDed);

        await tx.exec(
          `INSERT INTO payroll_lines (
              payroll_run_id, employee_id,
              days_worked, days_absent, overtime_hours, pieces_completed,
              basic, house_rent, medical_allowance, transport_allowance, food_allowance,
              overtime_amount, piece_rate_amount, bonus,
              gross_pay, advance, pf_deduction, tax_deduction, other_deductions,
              total_deductions, net_pay)
           VALUES ($1::uuid, $2::uuid,
              $3, $4, $5, 0,
              $6, $7, $8, $9, $10,
              $11, 0, 0,
              $12, 0, 0, 0, 0,
              $13, $14)`,
          [
            id, employeeId,
            proratedDays, absentDays, otHours,
            proBasic, proHouse, proMed, proTrans, proFood,
            otAmount,
            grossPay,
            totalDed, netPay,
          ],
        );

        totalGross += grossPay;
        totalNet += netPay;
        totalDeductions += totalDed;
      }

      await tx.exec(
        `UPDATE payroll_runs
            SET total_employees = $1, total_gross = $2, total_deductions = $3, total_net = $4,
                status = 'computed'
          WHERE id = $5::uuid`,
        [employees.length, round2(totalGross), round2(totalDeductions), round2(totalNet), id],
      );

      return this.findPayrollRun(id);
    });
  }

  async addPayrollLine(runId: string, dto: CreatePayrollLineDto): Promise<PayrollLine> {
    return this.withTx(async (tx) => {
      const basic = dto.basic ?? 0;
      const houseRent = dto.houseRent ?? 0;
      const medical = dto.medicalAllowance ?? 0;
      const transport = dto.transportAllowance ?? 0;
      const food = dto.foodAllowance ?? 0;
      const ot = dto.overtimeAmount ?? 0;
      const piece = dto.pieceRateAmount ?? 0;
      const bonus = dto.bonus ?? 0;
      const grossPay = round2(basic + houseRent + medical + transport + food + ot + piece + bonus);
      const advance = dto.advance ?? 0;
      const pf = dto.pfDeduction ?? 0;
      const tax = dto.taxDeduction ?? 0;
      const other = dto.otherDeductions ?? 0;
      const totalDed = round2(advance + pf + tax + other);
      const netPay = round2(grossPay - totalDed);

      const rows = await tx.query<{ id: string }>(
        `INSERT INTO payroll_lines (
            payroll_run_id, employee_id,
            days_worked, days_absent, overtime_hours, pieces_completed,
            basic, house_rent, medical_allowance, transport_allowance, food_allowance,
            overtime_amount, piece_rate_amount, bonus,
            gross_pay, advance, pf_deduction, tax_deduction, other_deductions,
            total_deductions, net_pay, notes)
         VALUES ($1::uuid, $2::uuid,
            COALESCE($3, 0), COALESCE($4, 0), COALESCE($5, 0), COALESCE($6, 0),
            $7, $8, $9, $10, $11,
            $12, $13, $14,
            $15, $16, $17, $18, $19,
            $20, $21, $22)
         ON CONFLICT (payroll_run_id, employee_id) DO UPDATE SET
            days_worked = EXCLUDED.days_worked,
            days_absent = EXCLUDED.days_absent,
            overtime_hours = EXCLUDED.overtime_hours,
            pieces_completed = EXCLUDED.pieces_completed,
            basic = EXCLUDED.basic,
            house_rent = EXCLUDED.house_rent,
            medical_allowance = EXCLUDED.medical_allowance,
            transport_allowance = EXCLUDED.transport_allowance,
            food_allowance = EXCLUDED.food_allowance,
            overtime_amount = EXCLUDED.overtime_amount,
            piece_rate_amount = EXCLUDED.piece_rate_amount,
            bonus = EXCLUDED.bonus,
            gross_pay = EXCLUDED.gross_pay,
            advance = EXCLUDED.advance,
            pf_deduction = EXCLUDED.pf_deduction,
            tax_deduction = EXCLUDED.tax_deduction,
            other_deductions = EXCLUDED.other_deductions,
            total_deductions = EXCLUDED.total_deductions,
            net_pay = EXCLUDED.net_pay,
            notes = EXCLUDED.notes
         RETURNING id`,
        [
          runId, dto.employeeId,
          dto.daysWorked ?? null, dto.daysAbsent ?? null, dto.overtimeHours ?? null, dto.piecesCompleted ?? null,
          basic, houseRent, medical, transport, food,
          ot, piece, bonus,
          grossPay, advance, pf, tax, other,
          totalDed, netPay, dto.notes ?? null,
        ],
      );
      const lineRows = await tx.query<Record<string, unknown>>(
        `SELECT pl.*, e.employee_code, e.full_name AS employee_name
           FROM payroll_lines pl
           JOIN employees e ON e.id = pl.employee_id
          WHERE pl.id = $1::uuid`,
        [rows[0].id],
      );
      return this.toLine(lineRows[0]);
    });
  }

  async removePayrollLine(lineId: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM payroll_lines WHERE id = $1::uuid`, [lineId]);
    if (affected === 0) throw new NotFoundException(`Payroll line ${lineId} not found`);
  }

  private toRun(row: Record<string, unknown>): PayrollRun {
    const c = camelize(row) as Record<string, unknown>;
    return {
      ...(c as unknown as PayrollRun),
      periodYear: Number(c['periodYear']),
      periodMonth: Number(c['periodMonth']),
      totalEmployees: Number(c['totalEmployees']),
      totalGross: Number(c['totalGross']),
      totalDeductions: Number(c['totalDeductions']),
      totalNet: Number(c['totalNet']),
    };
  }

  private toLine(row: Record<string, unknown>): PayrollLine {
    const c = camelize(row) as Record<string, unknown>;
    return {
      ...(c as unknown as PayrollLine),
      daysWorked: Number(c['daysWorked']),
      daysAbsent: Number(c['daysAbsent']),
      overtimeHours: Number(c['overtimeHours']),
      piecesCompleted: Number(c['piecesCompleted']),
      basic: Number(c['basic']),
      houseRent: Number(c['houseRent']),
      medicalAllowance: Number(c['medicalAllowance']),
      transportAllowance: Number(c['transportAllowance']),
      foodAllowance: Number(c['foodAllowance']),
      overtimeAmount: Number(c['overtimeAmount']),
      pieceRateAmount: Number(c['pieceRateAmount']),
      bonus: Number(c['bonus']),
      grossPay: Number(c['grossPay']),
      advance: Number(c['advance']),
      pfDeduction: Number(c['pfDeduction']),
      taxDeduction: Number(c['taxDeduction']),
      otherDeductions: Number(c['otherDeductions']),
      totalDeductions: Number(c['totalDeductions']),
      netPay: Number(c['netPay']),
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

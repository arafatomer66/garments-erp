import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  AttendanceRecord,
  CreateAttendanceDto,
  CreateEmployeeDto,
  CreateHrDepartmentDto,
  CreateLeaveRequestDto,
  CreatePayrollLineDto,
  CreatePayrollRunDto,
  Employee,
  HrDepartment,
  LeaveRequest,
  PayrollLine,
  PayrollRun,
  UpdateAttendanceDto,
  UpdateEmployeeDto,
  UpdateHrDepartmentDto,
  UpdateLeaveRequestDto,
  UpdatePayrollRunDto,
} from '@org/shared-types';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HrApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/hr`;

  // Departments
  listDepartments(): Observable<HrDepartment[]> {
    return this.http.get<HrDepartment[]>(`${this.base}/departments`);
  }
  createDepartment(dto: CreateHrDepartmentDto): Observable<HrDepartment> {
    return this.http.post<HrDepartment>(`${this.base}/departments`, dto);
  }
  updateDepartment(id: string, dto: UpdateHrDepartmentDto): Observable<HrDepartment> {
    return this.http.patch<HrDepartment>(`${this.base}/departments/${id}`, dto);
  }
  deleteDepartment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/departments/${id}`);
  }

  // Employees
  listEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.base}/employees`);
  }
  createEmployee(dto: CreateEmployeeDto): Observable<Employee> {
    return this.http.post<Employee>(`${this.base}/employees`, dto);
  }
  updateEmployee(id: string, dto: UpdateEmployeeDto): Observable<Employee> {
    return this.http.patch<Employee>(`${this.base}/employees/${id}`, dto);
  }
  deleteEmployee(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/employees/${id}`);
  }

  // Attendance
  listAttendance(filter?: { employeeId?: string; from?: string; to?: string }): Observable<AttendanceRecord[]> {
    let params = new HttpParams();
    if (filter?.employeeId) params = params.set('employeeId', filter.employeeId);
    if (filter?.from) params = params.set('from', filter.from);
    if (filter?.to) params = params.set('to', filter.to);
    return this.http.get<AttendanceRecord[]>(`${this.base}/attendance`, { params });
  }
  createAttendance(dto: CreateAttendanceDto): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(`${this.base}/attendance`, dto);
  }
  updateAttendance(id: string, dto: UpdateAttendanceDto): Observable<AttendanceRecord> {
    return this.http.patch<AttendanceRecord>(`${this.base}/attendance/${id}`, dto);
  }
  deleteAttendance(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/attendance/${id}`);
  }

  // Leave
  listLeave(): Observable<LeaveRequest[]> {
    return this.http.get<LeaveRequest[]>(`${this.base}/leave`);
  }
  createLeave(dto: CreateLeaveRequestDto): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(`${this.base}/leave`, dto);
  }
  updateLeave(id: string, dto: UpdateLeaveRequestDto): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(`${this.base}/leave/${id}`, dto);
  }
  deleteLeave(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/leave/${id}`);
  }

  // Payroll
  listPayrollRuns(): Observable<PayrollRun[]> {
    return this.http.get<PayrollRun[]>(`${this.base}/payroll-runs`);
  }
  getPayrollRun(id: string): Observable<PayrollRun> {
    return this.http.get<PayrollRun>(`${this.base}/payroll-runs/${id}`);
  }
  createPayrollRun(dto: CreatePayrollRunDto): Observable<PayrollRun> {
    return this.http.post<PayrollRun>(`${this.base}/payroll-runs`, dto);
  }
  updatePayrollRun(id: string, dto: UpdatePayrollRunDto): Observable<PayrollRun> {
    return this.http.patch<PayrollRun>(`${this.base}/payroll-runs/${id}`, dto);
  }
  computePayrollRun(id: string): Observable<PayrollRun> {
    return this.http.post<PayrollRun>(`${this.base}/payroll-runs/${id}/compute`, {});
  }
  addPayrollLine(runId: string, dto: CreatePayrollLineDto): Observable<PayrollLine> {
    return this.http.post<PayrollLine>(`${this.base}/payroll-runs/${runId}/lines`, dto);
  }
  removePayrollLine(lineId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/payroll-runs/lines/${lineId}`);
  }
  deletePayrollRun(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/payroll-runs/${id}`);
  }
}

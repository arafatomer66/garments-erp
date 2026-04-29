import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HrService } from './hr.service';
import { CreateHrDepartmentDto, UpdateHrDepartmentDto } from './dto/department.dto';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { CreateAttendanceDto, UpdateAttendanceDto } from './dto/attendance.dto';
import { CreateLeaveRequestDto, UpdateLeaveRequestDto } from './dto/leave.dto';
import {
  CreatePayrollLineDto,
  CreatePayrollRunDto,
  UpdatePayrollRunDto,
} from './dto/payroll.dto';

@ApiTags('hr')
@ApiBearerAuth()
@Controller('hr')
export class HrController {
  constructor(private readonly svc: HrService) {}

  // Departments
  @Get('departments')
  listDepartments() {
    return this.svc.listDepartments();
  }
  @Post('departments')
  createDepartment(@Body() dto: CreateHrDepartmentDto) {
    return this.svc.createDepartment(dto);
  }
  @Patch('departments/:id')
  updateDepartment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateHrDepartmentDto) {
    return this.svc.updateDepartment(id, dto);
  }
  @Delete('departments/:id')
  @HttpCode(204)
  async removeDepartment(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removeDepartment(id);
  }

  // Employees
  @Get('employees')
  listEmployees() {
    return this.svc.listEmployees();
  }
  @Get('employees/:id')
  getEmployee(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findEmployee(id);
  }
  @Post('employees')
  createEmployee(@Body() dto: CreateEmployeeDto) {
    return this.svc.createEmployee(dto);
  }
  @Patch('employees/:id')
  updateEmployee(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEmployeeDto) {
    return this.svc.updateEmployee(id, dto);
  }
  @Delete('employees/:id')
  @HttpCode(204)
  async removeEmployee(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removeEmployee(id);
  }

  // Attendance
  @Get('attendance')
  listAttendance(
    @Query('employeeId') employeeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.listAttendance(employeeId, from, to);
  }
  @Post('attendance')
  createAttendance(@Body() dto: CreateAttendanceDto) {
    return this.svc.createAttendance(dto);
  }
  @Patch('attendance/:id')
  updateAttendance(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAttendanceDto) {
    return this.svc.updateAttendance(id, dto);
  }
  @Delete('attendance/:id')
  @HttpCode(204)
  async removeAttendance(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removeAttendance(id);
  }

  // Leave
  @Get('leave')
  listLeave() {
    return this.svc.listLeaveRequests();
  }
  @Post('leave')
  createLeave(@Body() dto: CreateLeaveRequestDto) {
    return this.svc.createLeaveRequest(dto);
  }
  @Patch('leave/:id')
  updateLeave(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLeaveRequestDto) {
    return this.svc.updateLeaveRequest(id, dto);
  }
  @Delete('leave/:id')
  @HttpCode(204)
  async removeLeave(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removeLeaveRequest(id);
  }

  // Payroll runs
  @Get('payroll-runs')
  listPayrollRuns() {
    return this.svc.listPayrollRuns();
  }
  @Get('payroll-runs/:id')
  getPayrollRun(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findPayrollRun(id);
  }
  @Post('payroll-runs')
  createPayrollRun(@Body() dto: CreatePayrollRunDto) {
    return this.svc.createPayrollRun(dto);
  }
  @Patch('payroll-runs/:id')
  updatePayrollRun(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePayrollRunDto) {
    return this.svc.updatePayrollRun(id, dto);
  }
  @Post('payroll-runs/:id/compute')
  computePayrollRun(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.computePayrollRun(id);
  }
  @Post('payroll-runs/:id/lines')
  addPayrollLine(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreatePayrollLineDto) {
    return this.svc.addPayrollLine(id, dto);
  }
  @Delete('payroll-runs/lines/:lineId')
  @HttpCode(204)
  async removePayrollLine(@Param('lineId', ParseUUIDPipe) lineId: string) {
    await this.svc.removePayrollLine(lineId);
  }
  @Delete('payroll-runs/:id')
  @HttpCode(204)
  async removePayrollRun(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removePayrollRun(id);
  }
}

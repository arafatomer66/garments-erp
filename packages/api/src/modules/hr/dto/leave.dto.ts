import { IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import type {
  CreateLeaveRequestDto as ICreateLeaveRequestDto,
  LeaveStatus,
  LeaveType,
  UpdateLeaveRequestDto as IUpdateLeaveRequestDto,
} from '@org/shared-types';

const LEAVE_TYPES: LeaveType[] = [
  'casual',
  'sick',
  'earned',
  'maternity',
  'paternity',
  'unpaid',
  'festival',
];
const STATUSES: LeaveStatus[] = ['pending', 'approved', 'rejected', 'cancelled'];

export class CreateLeaveRequestDto implements ICreateLeaveRequestDto {
  @IsUUID() employeeId!: string;
  @IsIn(LEAVE_TYPES) leaveType!: LeaveType;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @IsNumber() @Min(0.5) days!: number;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsIn(STATUSES) status?: LeaveStatus;
  @IsOptional() @IsString() approvedBy?: string;
}

export class UpdateLeaveRequestDto implements IUpdateLeaveRequestDto {
  @IsOptional() @IsUUID() employeeId?: string;
  @IsOptional() @IsIn(LEAVE_TYPES) leaveType?: LeaveType;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsNumber() @Min(0.5) days?: number;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsIn(STATUSES) status?: LeaveStatus;
  @IsOptional() @IsString() approvedBy?: string;
}

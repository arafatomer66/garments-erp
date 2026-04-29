import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';
import type {
  AttendanceSource,
  AttendanceStatus,
  CreateAttendanceDto as ICreateAttendanceDto,
  UpdateAttendanceDto as IUpdateAttendanceDto,
} from '@org/shared-types';

const STATUSES: AttendanceStatus[] = [
  'present',
  'absent',
  'late',
  'half_day',
  'leave',
  'holiday',
  'weekoff',
];
const SOURCES: AttendanceSource[] = ['manual', 'biometric', 'import'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export class CreateAttendanceDto implements ICreateAttendanceDto {
  @IsUUID() employeeId!: string;
  @IsDateString() workDate!: string;
  @IsOptional() @Matches(TIME_RE) inTime?: string;
  @IsOptional() @Matches(TIME_RE) outTime?: string;
  @IsOptional() @IsNumber() @Min(0) hoursWorked?: number;
  @IsOptional() @IsNumber() @Min(0) overtimeHours?: number;
  @IsOptional() @IsIn(STATUSES) status?: AttendanceStatus;
  @IsOptional() @IsIn(SOURCES) source?: AttendanceSource;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateAttendanceDto implements IUpdateAttendanceDto {
  @IsOptional() @Matches(TIME_RE) inTime?: string;
  @IsOptional() @Matches(TIME_RE) outTime?: string;
  @IsOptional() @IsNumber() @Min(0) hoursWorked?: number;
  @IsOptional() @IsNumber() @Min(0) overtimeHours?: number;
  @IsOptional() @IsIn(STATUSES) status?: AttendanceStatus;
  @IsOptional() @IsIn(SOURCES) source?: AttendanceSource;
  @IsOptional() @IsString() notes?: string;
}

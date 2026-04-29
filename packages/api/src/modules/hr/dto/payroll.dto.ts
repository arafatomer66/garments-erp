import { IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import type {
  CreatePayrollLineDto as ICreatePayrollLineDto,
  CreatePayrollRunDto as ICreatePayrollRunDto,
  PayrollStatus,
  UpdatePayrollRunDto as IUpdatePayrollRunDto,
} from '@org/shared-types';

const STATUSES: PayrollStatus[] = ['draft', 'computed', 'approved', 'paid'];

export class CreatePayrollRunDto implements ICreatePayrollRunDto {
  @IsString() @Length(1, 40) runNumber!: string;
  @IsInt() @Min(2000) @Max(2100) periodYear!: number;
  @IsInt() @Min(1) @Max(12) periodMonth!: number;
  @IsOptional() @IsString() periodLabel?: string;
  @IsOptional() @IsIn(STATUSES) status?: PayrollStatus;
  @IsOptional() @IsString() notes?: string;
}

export class UpdatePayrollRunDto implements IUpdatePayrollRunDto {
  @IsOptional() @IsInt() @Min(2000) @Max(2100) periodYear?: number;
  @IsOptional() @IsInt() @Min(1) @Max(12) periodMonth?: number;
  @IsOptional() @IsString() periodLabel?: string;
  @IsOptional() @IsIn(STATUSES) status?: PayrollStatus;
  @IsOptional() @IsString() notes?: string;
}

export class CreatePayrollLineDto implements ICreatePayrollLineDto {
  @IsUUID() employeeId!: string;
  @IsOptional() @IsNumber() @Min(0) daysWorked?: number;
  @IsOptional() @IsNumber() @Min(0) daysAbsent?: number;
  @IsOptional() @IsNumber() @Min(0) overtimeHours?: number;
  @IsOptional() @IsInt() @Min(0) piecesCompleted?: number;
  @IsOptional() @IsNumber() @Min(0) basic?: number;
  @IsOptional() @IsNumber() @Min(0) houseRent?: number;
  @IsOptional() @IsNumber() @Min(0) medicalAllowance?: number;
  @IsOptional() @IsNumber() @Min(0) transportAllowance?: number;
  @IsOptional() @IsNumber() @Min(0) foodAllowance?: number;
  @IsOptional() @IsNumber() @Min(0) overtimeAmount?: number;
  @IsOptional() @IsNumber() @Min(0) pieceRateAmount?: number;
  @IsOptional() @IsNumber() @Min(0) bonus?: number;
  @IsOptional() @IsNumber() @Min(0) advance?: number;
  @IsOptional() @IsNumber() @Min(0) pfDeduction?: number;
  @IsOptional() @IsNumber() @Min(0) taxDeduction?: number;
  @IsOptional() @IsNumber() @Min(0) otherDeductions?: number;
  @IsOptional() @IsString() notes?: string;
}

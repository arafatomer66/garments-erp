import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import type {
  CreateLineAssignmentDto as ICreateAssignDto,
  CreateSewingLineDto as ICreateLineDto,
  LineAssignmentStatus,
  UpdateLineAssignmentDto as IUpdateAssignDto,
  UpdateSewingLineDto as IUpdateLineDto,
} from '@org/shared-types';

const ASSIGN_STATUSES: LineAssignmentStatus[] = ['active', 'paused', 'completed', 'cancelled'];

export class CreateSewingLineDto implements ICreateLineDto {
  @IsString() @Length(1, 40) code!: string;
  @IsString() @Length(1, 160) name!: string;
  @IsOptional() @IsNumber() @Min(0) capacityPcsPerHour?: number;
  @IsOptional() @IsInt() @Min(0) operatorCount?: number;
  @IsOptional() @IsInt() @Min(0) helperCount?: number;
  @IsOptional() @IsString() @MaxLength(120) supervisor?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateSewingLineDto implements IUpdateLineDto {
  @IsOptional() @IsString() @Length(1, 160) name?: string;
  @IsOptional() @IsNumber() @Min(0) capacityPcsPerHour?: number;
  @IsOptional() @IsInt() @Min(0) operatorCount?: number;
  @IsOptional() @IsInt() @Min(0) helperCount?: number;
  @IsOptional() @IsString() @MaxLength(120) supervisor?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateLineAssignmentDto implements ICreateAssignDto {
  @IsUUID() lineId!: string;
  @IsUUID() styleId!: string;
  @IsOptional() @IsUUID() buyerOrderId?: string;
  @IsOptional() @IsNumber() @Min(0) targetPcsPerHour?: number;
  @IsOptional() @IsNumber() @Min(0) sam?: number;
  @IsOptional() @IsDateString() startedAt?: string;
  @IsOptional() @IsIn(ASSIGN_STATUSES) status?: LineAssignmentStatus;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateLineAssignmentDto implements IUpdateAssignDto {
  @IsOptional() @IsUUID() buyerOrderId?: string;
  @IsOptional() @IsNumber() @Min(0) targetPcsPerHour?: number;
  @IsOptional() @IsNumber() @Min(0) sam?: number;
  @IsOptional() @IsDateString() startedAt?: string;
  @IsOptional() endedAt?: string | null;
  @IsOptional() @IsIn(ASSIGN_STATUSES) status?: LineAssignmentStatus;
  @IsOptional() @IsString() notes?: string;
}

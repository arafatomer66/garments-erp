import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';
import type {
  CreateTaTaskDto as ICreateTaTaskDto,
  TaTaskStatus,
  UpdateTaTaskDto as IUpdateTaTaskDto,
} from '@org/shared-types';

const STATUSES: TaTaskStatus[] = ['pending', 'in_progress', 'done', 'delayed', 'skipped'];

export class CreateTaTaskDto implements ICreateTaTaskDto {
  @IsUUID() styleId!: string;
  @IsOptional() @IsInt() sequence?: number;
  @IsString() @Length(1, 40) code!: string;
  @IsString() @Length(1, 160) name!: string;

  @IsOptional() @IsDateString() plannedStart?: string | null;
  @IsDateString() plannedEnd!: string;
  @IsOptional() @IsDateString() actualStart?: string | null;
  @IsOptional() @IsDateString() actualEnd?: string | null;

  @IsOptional() @IsIn(STATUSES) status?: TaTaskStatus;
  @IsOptional() @IsString() @MaxLength(120) owner?: string;
  @IsOptional() @IsString() remarks?: string;
}

export class UpdateTaTaskDto implements IUpdateTaTaskDto {
  @IsOptional() @IsUUID() styleId?: string;
  @IsOptional() @IsInt() sequence?: number;
  @IsOptional() @IsString() @Length(1, 40) code?: string;
  @IsOptional() @IsString() @Length(1, 160) name?: string;
  @IsOptional() @IsDateString() plannedStart?: string | null;
  @IsOptional() @IsDateString() plannedEnd?: string;
  @IsOptional() @IsDateString() actualStart?: string | null;
  @IsOptional() @IsDateString() actualEnd?: string | null;
  @IsOptional() @IsIn(STATUSES) status?: TaTaskStatus;
  @IsOptional() @IsString() @MaxLength(120) owner?: string;
  @IsOptional() @IsString() remarks?: string;
}

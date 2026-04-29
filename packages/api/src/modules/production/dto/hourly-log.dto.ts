import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import type { UpsertHourlyLogDto as IUpsertHourlyLogDto } from '@org/shared-types';

export class UpsertHourlyLogDto implements IUpsertHourlyLogDto {
  @IsUUID() lineId!: string;
  @IsOptional() @IsUUID() styleId?: string;
  @IsOptional() @IsDateString() logDate?: string;
  @IsInt() @Min(0) @Max(23) hourSlot!: number;
  @IsOptional() @IsNumber() @Min(0) targetPcs?: number;
  @IsNumber() @Min(0) producedPcs!: number;
  @IsOptional() @IsNumber() @Min(0) rejectedPcs?: number;
  @IsOptional() @IsString() notes?: string;
}

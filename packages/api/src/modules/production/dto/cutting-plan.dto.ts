import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type {
  CreateCuttingPlanDto as ICreatePlanDto,
  CreateCuttingPlanItemDto as ICreatePlanItemDto,
  CuttingPlanStatus,
  UpdateCuttingPlanDto as IUpdatePlanDto,
} from '@org/shared-types';

const STATUSES: CuttingPlanStatus[] = ['planned', 'in_progress', 'completed', 'cancelled'];

export class CreateCuttingPlanItemDto implements ICreatePlanItemDto {
  @IsString() @Length(1, 20) sizeLabel!: string;
  @IsOptional() @IsString() @MaxLength(60) color?: string;
  @IsNumber() @Min(0) targetQuantity!: number;
  @IsOptional() @IsNumber() @Min(0) cutQuantity?: number;
  @IsOptional() @IsInt() @Min(0) @Max(10000) sortOrder?: number;
}

export class CreateCuttingPlanDto implements ICreatePlanDto {
  @IsString() @Length(1, 60) planNumber!: string;
  @IsUUID() styleId!: string;
  @IsOptional() @IsUUID() buyerOrderId?: string;
  @IsOptional() @IsDateString() planDate?: string;
  @IsOptional() @IsNumber() @Min(0) targetQuantity?: number;
  @IsOptional() @IsUUID() fabricLotId?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(100) markerEfficiencyPct?: number;
  @IsOptional() @IsIn(STATUSES) status?: CuttingPlanStatus;
  @IsOptional() @IsString() notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCuttingPlanItemDto)
  items!: CreateCuttingPlanItemDto[];
}

export class UpdateCuttingPlanDto implements IUpdatePlanDto {
  @IsOptional() @IsUUID() buyerOrderId?: string;
  @IsOptional() @IsDateString() planDate?: string;
  @IsOptional() @IsNumber() @Min(0) targetQuantity?: number;
  @IsOptional() @IsUUID() fabricLotId?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(100) markerEfficiencyPct?: number;
  @IsOptional() @IsIn(STATUSES) status?: CuttingPlanStatus;
  @IsOptional() @IsString() notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCuttingPlanItemDto)
  items?: CreateCuttingPlanItemDto[];
}

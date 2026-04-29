import { Type } from 'class-transformer';
import {
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
  AqlStage,
  CreateAqlInspectionDefectDto as ICreateAqlInspectionDefectDto,
  CreateAqlInspectionDto as ICreateAqlInspectionDto,
  DefectSeverity,
  UpdateAqlInspectionDto as IUpdateAqlInspectionDto,
} from '@org/shared-types';

const STAGES: AqlStage[] = ['inline', 'final', 'pre_shipment'];
const SEVERITIES: DefectSeverity[] = ['critical', 'major', 'minor'];

export class CreateAqlInspectionDefectDto implements ICreateAqlInspectionDefectDto {
  @IsUUID() defectCodeId!: string;
  @IsInt() @Min(1) quantity!: number;
  @IsOptional() @IsIn(SEVERITIES) severity?: DefectSeverity;
  @IsOptional() @IsString() notes?: string;
}

export class CreateAqlInspectionDto implements ICreateAqlInspectionDto {
  @IsString() @Length(1, 60) inspectionNumber!: string;
  @IsOptional() @IsUUID() cuttingPlanId?: string;
  @IsOptional() @IsUUID() styleId?: string;
  @IsOptional() @IsUUID() buyerOrderId?: string;
  @IsOptional() @IsIn(STAGES) inspectionStage?: AqlStage;
  @IsOptional() @IsNumber() @Min(0) @Max(15) aqlLevel?: number;
  @IsInt() @Min(1) lotSize!: number;
  @IsOptional() @IsInt() @Min(1) sampleSize?: number;
  @IsOptional() @IsInt() @Min(0) acceptThreshold?: number;
  @IsOptional() @IsInt() @Min(1) rejectThreshold?: number;
  @IsOptional() @IsDateString() inspectedAt?: string;
  @IsOptional() @IsString() @MaxLength(120) inspectedBy?: string;
  @IsOptional() @IsString() notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAqlInspectionDefectDto)
  defects!: CreateAqlInspectionDefectDto[];
}

export class UpdateAqlInspectionDto implements IUpdateAqlInspectionDto {
  @IsOptional() @IsUUID() cuttingPlanId?: string;
  @IsOptional() @IsUUID() styleId?: string;
  @IsOptional() @IsUUID() buyerOrderId?: string;
  @IsOptional() @IsIn(STAGES) inspectionStage?: AqlStage;
  @IsOptional() @IsNumber() @Min(0) @Max(15) aqlLevel?: number;
  @IsOptional() @IsInt() @Min(1) lotSize?: number;
  @IsOptional() @IsInt() @Min(1) sampleSize?: number;
  @IsOptional() @IsInt() @Min(0) acceptThreshold?: number;
  @IsOptional() @IsInt() @Min(1) rejectThreshold?: number;
  @IsOptional() @IsDateString() inspectedAt?: string;
  @IsOptional() @IsString() @MaxLength(120) inspectedBy?: string;
  @IsOptional() @IsString() notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAqlInspectionDefectDto)
  defects?: CreateAqlInspectionDefectDto[];
}

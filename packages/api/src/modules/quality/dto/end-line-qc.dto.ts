import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type {
  CreateEndLineQcDefectDto as ICreateEndLineQcDefectDto,
  CreateEndLineQcRecordDto as ICreateEndLineQcRecordDto,
  UpdateEndLineQcRecordDto as IUpdateEndLineQcRecordDto,
} from '@org/shared-types';

export class CreateEndLineQcDefectDto implements ICreateEndLineQcDefectDto {
  @IsUUID() defectCodeId!: string;
  @IsInt() @Min(1) quantity!: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateEndLineQcRecordDto implements ICreateEndLineQcRecordDto {
  @IsString() @Length(1, 60) recordNumber!: string;
  @IsUUID() lineId!: string;
  @IsOptional() @IsUUID() styleId?: string;
  @IsOptional() @IsUUID() bundleId?: string;
  @IsOptional() @IsDateString() logDate?: string;
  @IsInt() @Min(0) inspectedQuantity!: number;
  @IsOptional() @IsInt() @Min(0) reworkQuantity?: number;
  @IsOptional() @IsInt() @Min(0) rejectQuantity?: number;
  @IsOptional() @IsDateString() inspectedAt?: string;
  @IsOptional() @IsString() @MaxLength(120) inspectedBy?: string;
  @IsOptional() @IsString() notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEndLineQcDefectDto)
  defects!: CreateEndLineQcDefectDto[];
}

export class UpdateEndLineQcRecordDto implements IUpdateEndLineQcRecordDto {
  @IsOptional() @IsUUID() styleId?: string;
  @IsOptional() @IsUUID() bundleId?: string;
  @IsOptional() @IsDateString() logDate?: string;
  @IsOptional() @IsInt() @Min(0) inspectedQuantity?: number;
  @IsOptional() @IsInt() @Min(0) reworkQuantity?: number;
  @IsOptional() @IsInt() @Min(0) rejectQuantity?: number;
  @IsOptional() @IsDateString() inspectedAt?: string;
  @IsOptional() @IsString() @MaxLength(120) inspectedBy?: string;
  @IsOptional() @IsString() notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateEndLineQcDefectDto)
  defects?: CreateEndLineQcDefectDto[];
}

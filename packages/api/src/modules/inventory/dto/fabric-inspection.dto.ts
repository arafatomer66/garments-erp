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
  CreateFabricInspectionDefectDto as IDefectDto,
  CreateFabricInspectionDto as ICreateInspectionDto,
  FabricDefectSize,
  UpdateFabricInspectionDto as IUpdateInspectionDto,
} from '@org/shared-types';

const DEFECT_SIZES: FabricDefectSize[] = ['upto_3in', '3_to_6in', '6_to_9in', 'over_9in', 'hole'];

export class CreateFabricInspectionDefectDto implements IDefectDto {
  @IsIn(DEFECT_SIZES) defectSize!: FabricDefectSize;
  @IsInt() @Min(1) @Max(10000) count!: number;
  @IsOptional() @IsString() @MaxLength(400) description?: string;
}

export class CreateFabricInspectionDto implements ICreateInspectionDto {
  @IsString() @Length(1, 60) inspectionNumber!: string;
  @IsOptional() @IsUUID() grnId?: string;
  @IsOptional() @IsUUID() poId?: string;
  @IsUUID() itemId!: string;
  @IsOptional() @IsString() @MaxLength(60) rollNumber?: string;
  @IsOptional() @IsString() @MaxLength(60) lotNumber?: string;
  @IsNumber() @Min(0.0001) inspectedQuantity!: number;
  @IsOptional() @IsString() @MaxLength(20) inspectedUom?: string;
  @IsOptional() @IsNumber() @Min(0) widthInches?: number;
  @IsOptional() @IsNumber() @Min(0) threshold?: number;
  @IsOptional() @IsString() @MaxLength(120) inspectedBy?: string;
  @IsOptional() @IsString() notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFabricInspectionDefectDto)
  defects?: CreateFabricInspectionDefectDto[];
}

export class UpdateFabricInspectionDto implements IUpdateInspectionDto {
  @IsOptional() @IsUUID() grnId?: string;
  @IsOptional() @IsUUID() poId?: string;
  @IsOptional() @IsString() @MaxLength(60) rollNumber?: string;
  @IsOptional() @IsString() @MaxLength(60) lotNumber?: string;
  @IsOptional() @IsNumber() @Min(0.0001) inspectedQuantity?: number;
  @IsOptional() @IsString() @MaxLength(20) inspectedUom?: string;
  @IsOptional() @IsNumber() @Min(0) widthInches?: number;
  @IsOptional() @IsNumber() @Min(0) threshold?: number;
  @IsOptional() @IsString() @MaxLength(120) inspectedBy?: string;
  @IsOptional() @IsDateString() inspectedAt?: string;
  @IsOptional() @IsString() notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFabricInspectionDefectDto)
  defects?: CreateFabricInspectionDefectDto[];
}

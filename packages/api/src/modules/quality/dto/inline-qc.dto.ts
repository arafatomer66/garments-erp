import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import type {
  CreateInlineQcRecordDto as ICreateInlineQcRecordDto,
  UpdateInlineQcRecordDto as IUpdateInlineQcRecordDto,
} from '@org/shared-types';

export class CreateInlineQcRecordDto implements ICreateInlineQcRecordDto {
  @IsString() @Length(1, 60) recordNumber!: string;
  @IsUUID() lineId!: string;
  @IsOptional() @IsUUID() styleId?: string;
  @IsOptional() @IsUUID() bundleId?: string;
  @IsOptional() @IsString() @MaxLength(120) operation?: string;
  @IsOptional() @IsString() @MaxLength(120) operatorName?: string;
  @IsInt() @Min(0) inspectedQuantity!: number;
  @IsOptional() @IsUUID() defectCodeId?: string;
  @IsOptional() @IsInt() @Min(0) defectQuantity?: number;
  @IsOptional() @IsDateString() inspectedAt?: string;
  @IsOptional() @IsString() @MaxLength(120) inspectedBy?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateInlineQcRecordDto implements IUpdateInlineQcRecordDto {
  @IsOptional() @IsUUID() styleId?: string;
  @IsOptional() @IsUUID() bundleId?: string;
  @IsOptional() @IsString() @MaxLength(120) operation?: string;
  @IsOptional() @IsString() @MaxLength(120) operatorName?: string;
  @IsOptional() @IsInt() @Min(0) inspectedQuantity?: number;
  @IsOptional() @IsUUID() defectCodeId?: string;
  @IsOptional() @IsInt() @Min(0) defectQuantity?: number;
  @IsOptional() @IsDateString() inspectedAt?: string;
  @IsOptional() @IsString() @MaxLength(120) inspectedBy?: string;
  @IsOptional() @IsString() notes?: string;
}

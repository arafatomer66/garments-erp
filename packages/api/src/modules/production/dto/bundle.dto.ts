import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import type {
  BundleStatus,
  CreateBundleDto as ICreateBundleDto,
  ScanBundleDto as IScanBundleDto,
  UpdateBundleDto as IUpdateBundleDto,
} from '@org/shared-types';

const STATUSES: BundleStatus[] = ['cut', 'in_sewing', 'sewn', 'rejected', 'packed'];

export class CreateBundleDto implements ICreateBundleDto {
  @IsString() @Length(1, 60) bundleNumber!: string;
  @IsOptional() @IsString() @MaxLength(120) qrCode?: string;
  @IsUUID() cuttingPlanId!: string;
  @IsOptional() @IsUUID() lineId?: string;
  @IsString() @Length(1, 20) sizeLabel!: string;
  @IsOptional() @IsString() @MaxLength(60) color?: string;
  @IsNumber() @Min(0) quantity!: number;
  @IsOptional() @IsIn(STATUSES) status?: BundleStatus;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateBundleDto implements IUpdateBundleDto {
  @IsOptional() @IsString() @MaxLength(120) qrCode?: string;
  @IsOptional() @IsUUID() lineId?: string;
  @IsOptional() @IsString() @Length(1, 20) sizeLabel?: string;
  @IsOptional() @IsString() @MaxLength(60) color?: string;
  @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @IsOptional() @IsIn(STATUSES) status?: BundleStatus;
  @IsOptional() @IsString() notes?: string;
}

export class ScanBundleDto implements IScanBundleDto {
  @IsString() @Length(1, 120) qrCode!: string;
  @IsOptional() @IsUUID() lineId?: string;
  @IsIn(STATUSES) status!: BundleStatus;
}

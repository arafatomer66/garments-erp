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
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type {
  CreatePackingListCartonDto as ICreatePackingListCartonDto,
  CreatePackingListDto as ICreatePackingListDto,
  PackingListStatus,
  UpdatePackingListDto as IUpdatePackingListDto,
} from '@org/shared-types';

const STATUSES: PackingListStatus[] = ['draft', 'finalized', 'shipped'];

export class CreatePackingListCartonDto implements ICreatePackingListCartonDto {
  @IsString() @Length(1, 40) cartonNumber!: string;
  @IsOptional() @IsString() @MaxLength(40) sizeLabel?: string;
  @IsOptional() @IsString() @MaxLength(60) color?: string;
  @IsInt() @Min(1) quantity!: number;
  @IsOptional() @IsNumber() @Min(0) grossWeightKg?: number;
  @IsOptional() @IsNumber() @Min(0) netWeightKg?: number;
  @IsOptional() @IsNumber() @Min(0) lengthCm?: number;
  @IsOptional() @IsNumber() @Min(0) widthCm?: number;
  @IsOptional() @IsNumber() @Min(0) heightCm?: number;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreatePackingListDto implements ICreatePackingListDto {
  @IsString() @Length(1, 40) plNumber!: string;
  @IsOptional() @IsUUID() buyerOrderId?: string;
  @IsOptional() @IsUUID() styleId?: string;
  @IsOptional() @IsString() @MaxLength(60) invoiceNumber?: string;
  @IsOptional() @IsDateString() packDate?: string;
  @IsOptional() @IsIn(STATUSES) status?: PackingListStatus;
  @IsOptional() @IsString() notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePackingListCartonDto)
  cartons!: CreatePackingListCartonDto[];
}

export class UpdatePackingListDto implements IUpdatePackingListDto {
  @IsOptional() @IsUUID() buyerOrderId?: string;
  @IsOptional() @IsUUID() styleId?: string;
  @IsOptional() @IsString() @MaxLength(60) invoiceNumber?: string;
  @IsOptional() @IsDateString() packDate?: string;
  @IsOptional() @IsIn(STATUSES) status?: PackingListStatus;
  @IsOptional() @IsString() notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePackingListCartonDto)
  cartons?: CreatePackingListCartonDto[];
}

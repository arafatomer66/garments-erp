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
  Min,
  ValidateNested,
} from 'class-validator';
import type {
  BillStatus,
  CreateFinBillDto as ICreateFinBillDto,
  CreateFinBillLineDto as ICreateFinBillLineDto,
  UpdateFinBillDto as IUpdateFinBillDto,
} from '@org/shared-types';

const STATUSES: BillStatus[] = ['draft', 'received', 'partial', 'paid', 'overdue', 'cancelled'];

export class CreateFinBillLineDto implements ICreateFinBillLineDto {
  @IsString() @Length(1, 300) description!: string;
  @IsNumber() @Min(0) quantity!: number;
  @IsNumber() @Min(0) unitPrice!: number;
  @IsOptional() @IsUUID() taxCodeId?: string | null;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class CreateFinBillDto implements ICreateFinBillDto {
  @IsString() @Length(1, 60) billNumber!: string;
  @IsOptional() @IsUUID() supplierId?: string | null;
  @IsOptional() @IsUUID() purchaseOrderId?: string | null;
  @IsOptional() @IsDateString() billDate?: string;
  @IsOptional() @IsDateString() dueDate?: string | null;
  @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
  @IsOptional() @IsNumber() @Min(0) fxRate?: number;
  @IsOptional() @IsString() notes?: string | null;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true })
  @Type(() => CreateFinBillLineDto)
  lines!: CreateFinBillLineDto[];
}

export class UpdateFinBillDto implements IUpdateFinBillDto {
  @IsOptional() @IsString() @Length(1, 60) billNumber?: string;
  @IsOptional() @IsUUID() supplierId?: string | null;
  @IsOptional() @IsUUID() purchaseOrderId?: string | null;
  @IsOptional() @IsDateString() billDate?: string;
  @IsOptional() @IsDateString() dueDate?: string | null;
  @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
  @IsOptional() @IsNumber() @Min(0) fxRate?: number;
  @IsOptional() @IsString() notes?: string | null;
  @IsOptional() @IsIn(STATUSES) status?: BillStatus;
}

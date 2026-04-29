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
  CreateFinInvoiceDto as ICreateFinInvoiceDto,
  CreateFinInvoiceLineDto as ICreateFinInvoiceLineDto,
  InvoiceStatus,
  UpdateFinInvoiceDto as IUpdateFinInvoiceDto,
} from '@org/shared-types';

const STATUSES: InvoiceStatus[] = ['draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled'];

export class CreateFinInvoiceLineDto implements ICreateFinInvoiceLineDto {
  @IsString() @Length(1, 300) description!: string;
  @IsNumber() @Min(0) quantity!: number;
  @IsNumber() @Min(0) unitPrice!: number;
  @IsOptional() @IsUUID() taxCodeId?: string | null;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class CreateFinInvoiceDto implements ICreateFinInvoiceDto {
  @IsString() @Length(1, 60) invoiceNumber!: string;
  @IsOptional() @IsUUID() buyerId?: string | null;
  @IsOptional() @IsUUID() buyerOrderId?: string | null;
  @IsOptional() @IsUUID() shipmentId?: string | null;
  @IsOptional() @IsDateString() invoiceDate?: string;
  @IsOptional() @IsDateString() dueDate?: string | null;
  @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
  @IsOptional() @IsNumber() @Min(0) fxRate?: number;
  @IsOptional() @IsString() notes?: string | null;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true })
  @Type(() => CreateFinInvoiceLineDto)
  lines!: CreateFinInvoiceLineDto[];
}

export class UpdateFinInvoiceDto implements IUpdateFinInvoiceDto {
  @IsOptional() @IsString() @Length(1, 60) invoiceNumber?: string;
  @IsOptional() @IsUUID() buyerId?: string | null;
  @IsOptional() @IsUUID() buyerOrderId?: string | null;
  @IsOptional() @IsUUID() shipmentId?: string | null;
  @IsOptional() @IsDateString() invoiceDate?: string;
  @IsOptional() @IsDateString() dueDate?: string | null;
  @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
  @IsOptional() @IsNumber() @Min(0) fxRate?: number;
  @IsOptional() @IsString() notes?: string | null;
  @IsOptional() @IsIn(STATUSES) status?: InvoiceStatus;
}

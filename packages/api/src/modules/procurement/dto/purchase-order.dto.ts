import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
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
  ConvertPrToPoDto as IConvertPrToPoDto,
  CreatePurchaseOrderDto as ICreatePoDto,
  CreatePurchaseOrderItemDto as ICreatePoItemDto,
  PurchaseOrderStatus,
  UpdatePurchaseOrderDto as IUpdatePoDto,
} from '@org/shared-types';

const PO_STATUSES: PurchaseOrderStatus[] = [
  'draft',
  'sent',
  'partially_received',
  'received',
  'closed',
  'cancelled',
];

export class CreatePurchaseOrderItemDto implements ICreatePoItemDto {
  @IsUUID() itemId!: string;
  @IsNumber() @Min(0) quantity!: number;
  @IsNumber() @Min(0) unitPrice!: number;
  @IsOptional() @IsString() @MaxLength(16) uom?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreatePurchaseOrderDto implements ICreatePoDto {
  @IsString() @Length(1, 60) poNumber!: string;
  @IsUUID() supplierId!: string;
  @IsOptional() @IsUUID() prId?: string;
  @IsOptional() @IsUUID() styleId?: string;
  @IsOptional() @IsUUID() buyerOrderId?: string;
  @IsOptional() @IsDateString() orderDate?: string;
  @IsOptional() @IsDateString() expectedDelivery?: string;
  @IsOptional() @IsString() @MaxLength(12) incoterm?: string;
  @IsOptional() @IsString() @MaxLength(80) paymentTerms?: string;
  @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
  @IsOptional() @IsIn(PO_STATUSES) status?: PurchaseOrderStatus;
  @IsOptional() @IsString() notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items!: CreatePurchaseOrderItemDto[];
}

export class UpdatePurchaseOrderDto implements IUpdatePoDto {
  @IsOptional() @IsUUID() supplierId?: string;
  @IsOptional() @IsUUID() prId?: string;
  @IsOptional() @IsUUID() styleId?: string;
  @IsOptional() @IsUUID() buyerOrderId?: string;
  @IsOptional() @IsDateString() orderDate?: string;
  @IsOptional() @IsDateString() expectedDelivery?: string;
  @IsOptional() @IsString() @MaxLength(12) incoterm?: string;
  @IsOptional() @IsString() @MaxLength(80) paymentTerms?: string;
  @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
  @IsOptional() @IsIn(PO_STATUSES) status?: PurchaseOrderStatus;
  @IsOptional() @IsString() notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items?: CreatePurchaseOrderItemDto[];
}

export class ConvertPrToPoDto implements IConvertPrToPoDto {
  @IsUUID() prId!: string;
  @IsString() @Length(1, 60) poNumber!: string;
  @IsUUID() supplierId!: string;
  @IsOptional() @IsDateString() orderDate?: string;
  @IsOptional() @IsDateString() expectedDelivery?: string;
  @IsOptional() @IsString() @MaxLength(12) incoterm?: string;
  @IsOptional() @IsString() @MaxLength(80) paymentTerms?: string;
  @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
}

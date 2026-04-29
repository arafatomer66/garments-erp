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
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type {
  BuyerOrderStatus,
  CreateBuyerOrderDto as ICreateBuyerOrderDto,
  CreateOrderLineDto as ICreateOrderLineDto,
  CreateOrderSizeDto as ICreateOrderSizeDto,
  UpdateBuyerOrderDto as IUpdateBuyerOrderDto,
} from '@org/shared-types';

const STATUSES: BuyerOrderStatus[] = [
  'draft',
  'confirmed',
  'in_production',
  'shipped',
  'closed',
  'cancelled',
];

export class CreateOrderSizeDto implements ICreateOrderSizeDto {
  @IsString() @MaxLength(24) sizeLabel!: string;
  @IsNumber() @Min(0) quantity!: number;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class CreateOrderLineDto implements ICreateOrderLineDto {
  @IsUUID() styleId!: string;
  @IsOptional() @IsString() @MaxLength(60) color?: string;
  @IsNumber() @Min(0) quantity!: number;
  @IsNumber() @Min(0) unitPrice!: number;
  @IsOptional() @IsString() notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderSizeDto)
  sizes?: CreateOrderSizeDto[];
}

export class CreateBuyerOrderDto implements ICreateBuyerOrderDto {
  @IsString() @Length(1, 60) poNumber!: string;
  @IsUUID() buyerId!: string;
  @IsOptional() @IsDateString() orderDate?: string;
  @IsOptional() @IsDateString() deliveryDate?: string;
  @IsOptional() @IsString() @MaxLength(12) incoterm?: string;
  @IsOptional() @IsString() @MaxLength(80) paymentTerms?: string;
  @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
  @IsOptional() @IsIn(STATUSES) status?: BuyerOrderStatus;
  @IsOptional() @IsString() notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderLineDto)
  lines!: CreateOrderLineDto[];
}

export class UpdateBuyerOrderDto implements IUpdateBuyerOrderDto {
  @IsOptional() @IsString() @Length(1, 60) poNumber?: string;
  @IsOptional() @IsUUID() buyerId?: string;
  @IsOptional() @IsDateString() orderDate?: string;
  @IsOptional() @IsDateString() deliveryDate?: string;
  @IsOptional() @IsString() @MaxLength(12) incoterm?: string;
  @IsOptional() @IsString() @MaxLength(80) paymentTerms?: string;
  @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
  @IsOptional() @IsIn(STATUSES) status?: BuyerOrderStatus;
  @IsOptional() @IsString() notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderLineDto)
  lines?: CreateOrderLineDto[];
}

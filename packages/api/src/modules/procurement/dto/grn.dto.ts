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
  CreateGoodsReceiptItemDto as IGrnItemDto,
  CreateGoodsReceiptNoteDto as ICreateGrnDto,
  GoodsReceiptStatus,
  UpdateGoodsReceiptNoteDto as IUpdateGrnDto,
} from '@org/shared-types';

const GRN_STATUSES: GoodsReceiptStatus[] = ['received', 'inspected', 'accepted', 'rejected', 'partial'];

export class CreateGrnItemDto implements IGrnItemDto {
  @IsUUID() poItemId!: string;
  @IsUUID() itemId!: string;
  @IsNumber() @Min(0) receivedQuantity!: number;
  @IsOptional() @IsNumber() @Min(0) acceptedQuantity?: number;
  @IsOptional() @IsNumber() @Min(0) rejectedQuantity?: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateGrnDto implements ICreateGrnDto {
  @IsString() @Length(1, 60) grnNumber!: string;
  @IsUUID() poId!: string;
  @IsOptional() @IsDateString() receivedDate?: string;
  @IsOptional() @IsString() @MaxLength(120) receivedBy?: string;
  @IsOptional() @IsString() @MaxLength(60) invoiceNumber?: string;
  @IsOptional() @IsString() @MaxLength(60) challanNumber?: string;
  @IsOptional() @IsIn(GRN_STATUSES) status?: GoodsReceiptStatus;
  @IsOptional() @IsString() notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateGrnItemDto)
  items!: CreateGrnItemDto[];
}

export class UpdateGrnDto implements IUpdateGrnDto {
  @IsOptional() @IsDateString() receivedDate?: string;
  @IsOptional() @IsString() @MaxLength(120) receivedBy?: string;
  @IsOptional() @IsString() @MaxLength(60) invoiceNumber?: string;
  @IsOptional() @IsString() @MaxLength(60) challanNumber?: string;
  @IsOptional() @IsIn(GRN_STATUSES) status?: GoodsReceiptStatus;
  @IsOptional() @IsString() notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGrnItemDto)
  items?: CreateGrnItemDto[];
}

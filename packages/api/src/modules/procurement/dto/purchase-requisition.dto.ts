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
  CreatePurchaseRequisitionDto as ICreatePrDto,
  CreatePurchaseRequisitionItemDto as ICreatePrItemDto,
  PurchaseRequisitionStatus,
  UpdatePurchaseRequisitionDto as IUpdatePrDto,
} from '@org/shared-types';

const PR_STATUSES: PurchaseRequisitionStatus[] = [
  'draft',
  'submitted',
  'approved',
  'converted',
  'rejected',
  'cancelled',
];

export class CreatePurchaseRequisitionItemDto implements ICreatePrItemDto {
  @IsUUID() itemId!: string;
  @IsNumber() @Min(0) quantity!: number;
  @IsOptional() @IsString() @MaxLength(16) uom?: string;
  @IsOptional() @IsNumber() @Min(0) estimatedCost?: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreatePurchaseRequisitionDto implements ICreatePrDto {
  @IsString() @Length(1, 60) prNumber!: string;
  @IsOptional() @IsString() @MaxLength(120) requestedBy?: string;
  @IsOptional() @IsString() @MaxLength(80) department?: string;
  @IsOptional() @IsUUID() styleId?: string;
  @IsOptional() @IsUUID() buyerOrderId?: string;
  @IsOptional() @IsDateString() requestDate?: string;
  @IsOptional() @IsDateString() requiredBy?: string;
  @IsOptional() @IsIn(PR_STATUSES) status?: PurchaseRequisitionStatus;
  @IsOptional() @IsString() notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseRequisitionItemDto)
  items!: CreatePurchaseRequisitionItemDto[];
}

export class UpdatePurchaseRequisitionDto implements IUpdatePrDto {
  @IsOptional() @IsString() @MaxLength(120) requestedBy?: string;
  @IsOptional() @IsString() @MaxLength(80) department?: string;
  @IsOptional() @IsUUID() styleId?: string;
  @IsOptional() @IsUUID() buyerOrderId?: string;
  @IsOptional() @IsDateString() requestDate?: string;
  @IsOptional() @IsDateString() requiredBy?: string;
  @IsOptional() @IsIn(PR_STATUSES) status?: PurchaseRequisitionStatus;
  @IsOptional() @IsString() notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseRequisitionItemDto)
  items?: CreatePurchaseRequisitionItemDto[];
}

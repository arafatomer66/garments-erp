import {
  IsDateString,
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
  CreateStockLotDto as ICreateLotDto,
  CreateStockMovementDto as ICreateMovementDto,
  IssueFifoDto as IIssueFifoDto,
  StockMovementType,
  UpdateStockLotDto as IUpdateLotDto,
} from '@org/shared-types';

const MOVEMENT_TYPES: StockMovementType[] = [
  'receipt',
  'issue',
  'adjustment',
  'transfer_in',
  'transfer_out',
  'consumption',
  'return',
];

export class CreateStockLotDto implements ICreateLotDto {
  @IsString() @Length(1, 60) lotNumber!: string;
  @IsUUID() itemId!: string;
  @IsUUID() warehouseId!: string;
  @IsOptional() @IsUUID() binLocationId?: string;
  @IsOptional() @IsUUID() grnId?: string;
  @IsOptional() @IsUUID() poId?: string;
  @IsOptional() @IsDateString() receivedAt?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
  @IsNumber() @Min(0) quantityOnHand!: number;
  @IsOptional() @IsNumber() @Min(0) receivedQuantity?: number;
  @IsOptional() @IsString() @MaxLength(20) uom?: string;
  @IsOptional() @IsNumber() @Min(0) unitCost?: number;
  @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateStockLotDto implements IUpdateLotDto {
  @IsOptional() @IsUUID() warehouseId?: string;
  @IsOptional() @IsUUID() binLocationId?: string;
  @IsOptional() @IsUUID() grnId?: string;
  @IsOptional() @IsUUID() poId?: string;
  @IsOptional() @IsDateString() receivedAt?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
  @IsOptional() @IsNumber() @Min(0) quantityOnHand?: number;
  @IsOptional() @IsNumber() @Min(0) receivedQuantity?: number;
  @IsOptional() @IsString() @MaxLength(20) uom?: string;
  @IsOptional() @IsNumber() @Min(0) unitCost?: number;
  @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreateStockMovementDto implements ICreateMovementDto {
  @IsString() @Length(1, 60) movementNumber!: string;
  @IsIn(MOVEMENT_TYPES) movementType!: StockMovementType;
  @IsUUID() lotId!: string;
  @IsNumber() quantity!: number;
  @IsOptional() @IsString() @MaxLength(60) referenceType?: string;
  @IsOptional() @IsString() @MaxLength(60) referenceId?: string;
  @IsOptional() @IsDateString() movedAt?: string;
  @IsOptional() @IsString() @MaxLength(120) movedBy?: string;
  @IsOptional() @IsString() notes?: string;
}

export class IssueFifoDto implements IIssueFifoDto {
  @IsUUID() itemId!: string;
  @IsUUID() warehouseId!: string;
  @IsNumber() @Min(0.0001) quantity!: number;
  @IsOptional() @IsString() @MaxLength(40) movementNumberPrefix?: string;
  @IsOptional() @IsString() @MaxLength(60) referenceType?: string;
  @IsOptional() @IsString() @MaxLength(60) referenceId?: string;
  @IsOptional() @IsString() @MaxLength(120) movedBy?: string;
  @IsOptional() @IsString() notes?: string;
}

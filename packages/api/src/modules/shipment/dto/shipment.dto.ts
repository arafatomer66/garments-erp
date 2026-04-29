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
  CreateShipmentDto as ICreateShipmentDto,
  ShipmentMode,
  ShipmentStatus,
  UpdateShipmentDto as IUpdateShipmentDto,
} from '@org/shared-types';

const MODES: ShipmentMode[] = ['sea', 'air', 'road'];
const STATUSES: ShipmentStatus[] = ['planned', 'in_transit', 'delivered', 'cancelled'];

export class CreateShipmentDto implements ICreateShipmentDto {
  @IsString() @Length(1, 40) shipmentNumber!: string;
  @IsOptional() @IsUUID() buyerOrderId?: string;
  @IsOptional() @IsUUID() packingListId?: string;
  @IsOptional() @IsIn(MODES) mode?: ShipmentMode;
  @IsOptional() @IsString() @MaxLength(120) forwarder?: string;
  @IsOptional() @IsString() @MaxLength(60) blAwbNumber?: string;
  @IsOptional() @IsString() @MaxLength(60) containerNumber?: string;
  @IsOptional() @IsString() @MaxLength(120) portOfLoading?: string;
  @IsOptional() @IsString() @MaxLength(120) portOfDischarge?: string;
  @IsOptional() @IsDateString() eta?: string;
  @IsOptional() @IsDateString() etd?: string;
  @IsOptional() @IsDateString() actualShipDate?: string;
  @IsOptional() @IsString() @MaxLength(60) invoiceNumber?: string;
  @IsOptional() @IsNumber() @Min(0) invoiceValueUsd?: number;
  @IsOptional() @IsIn(STATUSES) status?: ShipmentStatus;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateShipmentDto implements IUpdateShipmentDto {
  @IsOptional() @IsUUID() buyerOrderId?: string;
  @IsOptional() @IsUUID() packingListId?: string;
  @IsOptional() @IsIn(MODES) mode?: ShipmentMode;
  @IsOptional() @IsString() @MaxLength(120) forwarder?: string;
  @IsOptional() @IsString() @MaxLength(60) blAwbNumber?: string;
  @IsOptional() @IsString() @MaxLength(60) containerNumber?: string;
  @IsOptional() @IsString() @MaxLength(120) portOfLoading?: string;
  @IsOptional() @IsString() @MaxLength(120) portOfDischarge?: string;
  @IsOptional() @IsDateString() eta?: string;
  @IsOptional() @IsDateString() etd?: string;
  @IsOptional() @IsDateString() actualShipDate?: string;
  @IsOptional() @IsString() @MaxLength(60) invoiceNumber?: string;
  @IsOptional() @IsNumber() @Min(0) invoiceValueUsd?: number;
  @IsOptional() @IsIn(STATUSES) status?: ShipmentStatus;
  @IsOptional() @IsString() notes?: string;
}

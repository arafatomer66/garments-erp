import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import type {
  CreateFinPaymentDto as ICreateFinPaymentDto,
  PaymentDirection,
  PaymentMethod,
  UpdateFinPaymentDto as IUpdateFinPaymentDto,
} from '@org/shared-types';

const DIRECTIONS: PaymentDirection[] = ['inbound', 'outbound'];
const METHODS: PaymentMethod[] = ['bank_transfer', 'cheque', 'cash', 'lc', 'tt', 'mfs', 'other'];

export class CreateFinPaymentDto implements ICreateFinPaymentDto {
  @IsString() @Length(1, 60) paymentNumber!: string;
  @IsOptional() @IsDateString() paymentDate?: string;
  @IsIn(DIRECTIONS) direction!: PaymentDirection;
  @IsOptional() @IsIn(METHODS) method?: PaymentMethod;
  @IsOptional() @IsUUID() bankAccountId?: string | null;
  @IsOptional() @IsUUID() invoiceId?: string | null;
  @IsOptional() @IsUUID() billId?: string | null;
  @IsOptional() @IsString() partyName?: string | null;
  @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
  @IsOptional() @IsNumber() @Min(0) fxRate?: number;
  @IsNumber() @Min(0) amount!: number;
  @IsOptional() @IsString() referenceNumber?: string | null;
  @IsOptional() @IsString() notes?: string | null;
}

export class UpdateFinPaymentDto implements IUpdateFinPaymentDto {
  @IsOptional() @IsString() @Length(1, 60) paymentNumber?: string;
  @IsOptional() @IsDateString() paymentDate?: string;
  @IsOptional() @IsIn(DIRECTIONS) direction?: PaymentDirection;
  @IsOptional() @IsIn(METHODS) method?: PaymentMethod;
  @IsOptional() @IsUUID() bankAccountId?: string | null;
  @IsOptional() @IsUUID() invoiceId?: string | null;
  @IsOptional() @IsUUID() billId?: string | null;
  @IsOptional() @IsString() partyName?: string | null;
  @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
  @IsOptional() @IsNumber() @Min(0) fxRate?: number;
  @IsOptional() @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsString() referenceNumber?: string | null;
  @IsOptional() @IsString() notes?: string | null;
}

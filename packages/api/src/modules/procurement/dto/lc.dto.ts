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
  CreateLetterOfCreditDto as ICreateLcDto,
  LetterOfCreditStatus,
  LetterOfCreditType,
  UpdateLetterOfCreditDto as IUpdateLcDto,
} from '@org/shared-types';

const LC_TYPES: LetterOfCreditType[] = ['master', 'back_to_back', 'transferable', 'sight', 'usance'];
const LC_STATUSES: LetterOfCreditStatus[] = [
  'draft',
  'opened',
  'amended',
  'shipped',
  'negotiated',
  'paid',
  'expired',
  'cancelled',
];

export class CreateLetterOfCreditDto implements ICreateLcDto {
  @IsString() @Length(1, 80) lcNumber!: string;
  @IsOptional() @IsIn(LC_TYPES) lcType?: LetterOfCreditType;
  @IsOptional() @IsString() @MaxLength(160) issuingBank?: string;
  @IsOptional() @IsString() @MaxLength(160) advisingBank?: string;
  @IsOptional() @IsString() @MaxLength(160) beneficiary?: string;
  @IsOptional() @IsString() @MaxLength(160) applicant?: string;
  @IsOptional() @IsUUID() parentLcId?: string;
  @IsOptional() @IsUUID() buyerOrderId?: string;
  @IsOptional() @IsUUID() poId?: string;
  @IsOptional() @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
  @IsOptional() @IsDateString() issueDate?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
  @IsOptional() @IsDateString() latestShipmentDate?: string;
  @IsOptional() @IsIn(LC_STATUSES) status?: LetterOfCreditStatus;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateLetterOfCreditDto implements IUpdateLcDto {
  @IsOptional() @IsIn(LC_TYPES) lcType?: LetterOfCreditType;
  @IsOptional() @IsString() @MaxLength(160) issuingBank?: string;
  @IsOptional() @IsString() @MaxLength(160) advisingBank?: string;
  @IsOptional() @IsString() @MaxLength(160) beneficiary?: string;
  @IsOptional() @IsString() @MaxLength(160) applicant?: string;
  @IsOptional() @IsUUID() parentLcId?: string;
  @IsOptional() @IsUUID() buyerOrderId?: string;
  @IsOptional() @IsUUID() poId?: string;
  @IsOptional() @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
  @IsOptional() @IsDateString() issueDate?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
  @IsOptional() @IsDateString() latestShipmentDate?: string;
  @IsOptional() @IsIn(LC_STATUSES) status?: LetterOfCreditStatus;
  @IsOptional() @IsString() notes?: string;
}

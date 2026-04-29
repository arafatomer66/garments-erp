import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';
import type {
  BankPurpose,
  CreateFinBankAccountDto as ICreateFinBankAccountDto,
  UpdateFinBankAccountDto as IUpdateFinBankAccountDto,
} from '@org/shared-types';

const PURPOSES: BankPurpose[] = [
  'operational',
  'export_proceeds',
  'erq',
  'back_to_back_lc',
  'payroll',
  'other',
];

export class CreateFinBankAccountDto implements ICreateFinBankAccountDto {
  @IsString() @Length(1, 32) code!: string;
  @IsString() @Length(1, 120) bankName!: string;
  @IsOptional() @IsString() branch?: string | null;
  @IsString() @Length(1, 60) accountNumber!: string;
  @IsOptional() @IsString() accountHolder?: string | null;
  @IsOptional() @IsString() swiftCode?: string | null;
  @IsOptional() @IsString() routingNumber?: string | null;
  @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
  @IsOptional() @IsIn(PURPOSES) purpose?: BankPurpose;
  @IsOptional() @IsNumber() @Min(0) openingBalance?: number;
  @IsOptional() @IsString() notes?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateFinBankAccountDto implements IUpdateFinBankAccountDto {
  @IsOptional() @IsString() @Length(1, 32) code?: string;
  @IsOptional() @IsString() @Length(1, 120) bankName?: string;
  @IsOptional() @IsString() branch?: string | null;
  @IsOptional() @IsString() @Length(1, 60) accountNumber?: string;
  @IsOptional() @IsString() accountHolder?: string | null;
  @IsOptional() @IsString() swiftCode?: string | null;
  @IsOptional() @IsString() routingNumber?: string | null;
  @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
  @IsOptional() @IsIn(PURPOSES) purpose?: BankPurpose;
  @IsOptional() @IsNumber() @Min(0) openingBalance?: number;
  @IsOptional() @IsString() notes?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import type {
  CreateFinTaxCodeDto as ICreateFinTaxCodeDto,
  TaxAppliesTo,
  TaxType,
  UpdateFinTaxCodeDto as IUpdateFinTaxCodeDto,
} from '@org/shared-types';

const TYPES: TaxType[] = ['vat', 'ait', 'source_tax', 'withholding', 'other'];
const APPLIES: TaxAppliesTo[] = ['sales', 'purchase', 'both'];

export class CreateFinTaxCodeDto implements ICreateFinTaxCodeDto {
  @IsString() @Length(1, 32) code!: string;
  @IsString() @Length(1, 80) name!: string;
  @IsIn(TYPES) taxType!: TaxType;
  @IsNumber() @Min(0) @Max(100) ratePercent!: number;
  @IsOptional() @IsIn(APPLIES) appliesTo?: TaxAppliesTo;
  @IsOptional() @IsString() @MaxLength(500) description?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateFinTaxCodeDto implements IUpdateFinTaxCodeDto {
  @IsOptional() @IsString() @Length(1, 32) code?: string;
  @IsOptional() @IsString() @Length(1, 80) name?: string;
  @IsOptional() @IsIn(TYPES) taxType?: TaxType;
  @IsOptional() @IsNumber() @Min(0) @Max(100) ratePercent?: number;
  @IsOptional() @IsIn(APPLIES) appliesTo?: TaxAppliesTo;
  @IsOptional() @IsString() @MaxLength(500) description?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

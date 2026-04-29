import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import type {
  CreateSupplierDto as ICreateSupplierDto,
  UpdateSupplierDto as IUpdateSupplierDto,
  SupplierType,
} from '@org/shared-types';

const SUPPLIER_TYPES: SupplierType[] = ['fabric', 'trim', 'accessory', 'service', 'other'];

export class CreateSupplierDto implements ICreateSupplierDto {
  @IsString()
  @Length(1, 32)
  code!: string;

  @IsString()
  @Length(1, 160)
  name!: string;

  @IsIn(SUPPLIER_TYPES)
  type!: SupplierType;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactPerson?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSupplierDto implements IUpdateSupplierDto {
  @IsOptional()
  @IsString()
  @Length(1, 32)
  code?: string;

  @IsOptional()
  @IsString()
  @Length(1, 160)
  name?: string;

  @IsOptional()
  @IsIn(SUPPLIER_TYPES)
  type?: SupplierType;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactPerson?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

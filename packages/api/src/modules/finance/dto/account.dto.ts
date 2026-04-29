import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';
import type {
  AccountType,
  CreateFinAccountDto as ICreateFinAccountDto,
  UpdateFinAccountDto as IUpdateFinAccountDto,
} from '@org/shared-types';

const TYPES: AccountType[] = ['asset', 'liability', 'equity', 'income', 'expense'];

export class CreateFinAccountDto implements ICreateFinAccountDto {
  @IsString() @Length(1, 32) code!: string;
  @IsString() @Length(1, 120) name!: string;
  @IsIn(TYPES) accountType!: AccountType;
  @IsOptional() @IsUUID() parentId?: string | null;
  @IsOptional() @IsString() @MaxLength(500) description?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateFinAccountDto implements IUpdateFinAccountDto {
  @IsOptional() @IsString() @Length(1, 32) code?: string;
  @IsOptional() @IsString() @Length(1, 120) name?: string;
  @IsOptional() @IsIn(TYPES) accountType?: AccountType;
  @IsOptional() @IsUUID() parentId?: string | null;
  @IsOptional() @IsString() @MaxLength(500) description?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

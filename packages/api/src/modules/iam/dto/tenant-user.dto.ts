import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { UserRole } from '@org/shared-types';

const ROLES: UserRole[] = [
  'platform_admin',
  'tenant_owner',
  'tenant_admin',
  'merchandiser',
  'production_manager',
  'qc_manager',
  'store_keeper',
  'finance',
  'hr',
  'floor_supervisor',
  'viewer',
];

export class CreateTenantUserDto {
  @IsEmail() email!: string;
  @IsString() @MaxLength(160) fullName!: string;
  @IsString() @MinLength(8) @MaxLength(128) password!: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsArray() @ArrayNotEmpty() @IsIn(ROLES, { each: true }) roles!: UserRole[];
}

export class UpdateTenantUserDto {
  @IsOptional() @IsString() @MaxLength(160) fullName?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() @ArrayNotEmpty() @IsIn(ROLES, { each: true }) roles?: UserRole[];
}

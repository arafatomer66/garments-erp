import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';
import type {
  CreateBuyerPortalUserDto as ICreate,
  UpdateBuyerPortalUserDto as IUpdate,
} from '@org/shared-types';

export class CreateBuyerPortalUserDto implements ICreate {
  @IsUUID() buyerId!: string;
  @IsString() @Length(1, 120) fullName!: string;
  @IsEmail() @MaxLength(160) email!: string;
  @IsOptional() @IsString() @MaxLength(120) designation?: string | null;
  @IsOptional() @IsString() @MaxLength(40) phone?: string | null;
  @IsOptional() @IsBoolean() canViewOrders?: boolean;
  @IsOptional() @IsBoolean() canViewSamples?: boolean;
  @IsOptional() @IsBoolean() canViewProduction?: boolean;
  @IsOptional() @IsBoolean() canViewQuality?: boolean;
  @IsOptional() @IsBoolean() canViewShipments?: boolean;
  @IsOptional() @IsBoolean() canViewInvoices?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateBuyerPortalUserDto implements IUpdate {
  @IsOptional() @IsString() @Length(1, 120) fullName?: string;
  @IsOptional() @IsString() @MaxLength(120) designation?: string | null;
  @IsOptional() @IsString() @MaxLength(40) phone?: string | null;
  @IsOptional() @IsBoolean() canViewOrders?: boolean;
  @IsOptional() @IsBoolean() canViewSamples?: boolean;
  @IsOptional() @IsBoolean() canViewProduction?: boolean;
  @IsOptional() @IsBoolean() canViewQuality?: boolean;
  @IsOptional() @IsBoolean() canViewShipments?: boolean;
  @IsOptional() @IsBoolean() canViewInvoices?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

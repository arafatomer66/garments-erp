import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTenantSettingsDto {
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsString() @MaxLength(2) country?: string;
  @IsOptional() @IsString() @MaxLength(3) currencyCode?: string;
  @IsOptional() @IsString() @MaxLength(64) timezone?: string;
}

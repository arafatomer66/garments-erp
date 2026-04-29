import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';
import type { SignupDto as ISignupDto } from '@org/shared-types';

export class SignupDto implements ISignupDto {
  @IsString()
  @Length(3, 32)
  @Matches(/^[a-z0-9-]+$/, { message: 'tenantSlug must be lowercase alphanumeric or dashes' })
  tenantSlug!: string;

  @IsString()
  @Length(2, 120)
  tenantName!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @Length(2, 120)
  ownerFullName!: string;

  @IsString()
  @MinLength(10)
  ownerPassword!: string;
}

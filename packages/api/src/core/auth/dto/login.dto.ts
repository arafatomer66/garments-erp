import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import type { LoginDto as ILoginDto } from '@org/shared-types';

export class LoginDto implements ILoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  @IsOptional()
  @IsString()
  tenantSlug?: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}

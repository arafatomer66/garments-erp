import type { User, UserRole } from './user.types.js';
import type { Tenant } from './tenant.types.js';

export interface SignupDto {
  tenantSlug: string;
  tenantName: string;
  ownerEmail: string;
  ownerFullName: string;
  ownerPassword: string;
}

export interface LoginDto {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthSession {
  user: User;
  tenant: Tenant;
  roles: UserRole[];
  tokens: AuthTokens;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  tenantSlug: string;
  schemaName: string;
  roles: UserRole[];
  iat?: number;
  exp?: number;
}

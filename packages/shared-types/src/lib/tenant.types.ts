import type { ISODateString } from './common.types.js';

export type TenantStatus = 'active' | 'suspended' | 'trial' | 'cancelled';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  schemaName: string;
  status: TenantStatus;
  country: string;
  currencyCode: string;
  timezone: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateTenantDto {
  slug: string;
  name: string;
  country?: string;
  currencyCode?: string;
  timezone?: string;
}

export interface UpdateTenantDto {
  name?: string;
  status?: TenantStatus;
  country?: string;
  currencyCode?: string;
  timezone?: string;
}

export interface UpdateTenantSettingsDto {
  name?: string;
  country?: string;
  currencyCode?: string;
  timezone?: string;
}

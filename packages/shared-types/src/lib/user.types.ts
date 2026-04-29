import type { ISODateString } from './common.types.js';

export type UserRole =
  | 'platform_admin'
  | 'tenant_owner'
  | 'tenant_admin'
  | 'merchandiser'
  | 'production_manager'
  | 'qc_manager'
  | 'store_keeper'
  | 'finance'
  | 'hr'
  | 'floor_supervisor'
  | 'viewer';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface UserMembership {
  userId: string;
  tenantId: string;
  roles: UserRole[];
  createdAt: ISODateString;
}

export interface CreateUserDto {
  email: string;
  fullName: string;
  password: string;
  phone?: string;
}

export interface UpdateUserDto {
  fullName?: string;
  phone?: string;
  isActive?: boolean;
}

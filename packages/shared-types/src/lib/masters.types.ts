import type { ISODateString } from './common.types.js';

export interface Buyer {
  id: string;
  code: string;
  name: string;
  country?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  paymentTerms?: string;
  notes?: string;
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateBuyerDto {
  code: string;
  name: string;
  country?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  paymentTerms?: string;
  notes?: string;
}

export type UpdateBuyerDto = Partial<CreateBuyerDto> & { isActive?: boolean };

export type SupplierType = 'fabric' | 'trim' | 'accessory' | 'service' | 'other';

export interface Supplier {
  id: string;
  code: string;
  name: string;
  type: SupplierType;
  country?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  paymentTerms?: string;
  notes?: string;
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateSupplierDto {
  code: string;
  name: string;
  type: SupplierType;
  country?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  paymentTerms?: string;
  notes?: string;
}

export type UpdateSupplierDto = Partial<CreateSupplierDto> & { isActive?: boolean };

export type ItemCategory = 'fabric' | 'trim' | 'accessory' | 'packing' | 'finished_good' | 'other';

export interface Item {
  id: string;
  code: string;
  name: string;
  category: ItemCategory;
  uom: string;
  description?: string;
  defaultSupplierId?: string;
  standardCost?: number;
  currencyCode: string;
  reorderLevel: number;
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateItemDto {
  code: string;
  name: string;
  category: ItemCategory;
  uom: string;
  description?: string;
  defaultSupplierId?: string;
  standardCost?: number;
  currencyCode?: string;
  reorderLevel?: number;
}

export type UpdateItemDto = Partial<CreateItemDto> & { isActive?: boolean };

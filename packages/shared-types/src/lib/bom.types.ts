import type { ISODateString } from './common.types.js';

export interface BomLine {
  id: string;
  styleId: string;
  itemId: string;
  itemCode?: string;
  itemName?: string;
  itemCategory?: string;
  itemStandardCost?: number | null;
  itemCurrencyCode?: string;
  quantityPerUnit: number;
  wastagePct: number;
  uom: string;
  notes: string | null;
  effectiveQuantity?: number;
  lineCost?: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateBomLineDto {
  styleId: string;
  itemId: string;
  quantityPerUnit: number;
  wastagePct?: number;
  uom?: string;
  notes?: string;
}

export type UpdateBomLineDto = Partial<Omit<CreateBomLineDto, 'styleId' | 'itemId'>>;

export interface CostingSheet {
  id: string;
  styleId: string;
  currencyCode: string;
  cmCost: number;
  overheadCost: number;
  commercialCost: number;
  profitPct: number;
  notes: string | null;
  materialCost: number;
  subtotal: number;
  fobPrice: number;
  bomLines: BomLine[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface UpsertCostingSheetDto {
  styleId: string;
  currencyCode?: string;
  cmCost?: number;
  overheadCost?: number;
  commercialCost?: number;
  profitPct?: number;
  notes?: string;
}

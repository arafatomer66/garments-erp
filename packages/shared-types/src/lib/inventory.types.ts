import type { ISODateString } from './common.types.js';

export type WarehouseType = 'fabric' | 'trim' | 'accessory' | 'finished_goods' | 'general';

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  type: WarehouseType;
  address: string | null;
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateWarehouseDto {
  code: string;
  name: string;
  type?: WarehouseType;
  address?: string;
  isActive?: boolean;
}

export type UpdateWarehouseDto = Partial<Omit<CreateWarehouseDto, 'code'>>;

export interface BinLocation {
  id: string;
  warehouseId: string;
  code: string;
  name: string | null;
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateBinLocationDto {
  warehouseId: string;
  code: string;
  name?: string;
  isActive?: boolean;
}

export type UpdateBinLocationDto = Partial<Omit<CreateBinLocationDto, 'warehouseId' | 'code'>>;

export type FabricDefectSize = 'upto_3in' | '3_to_6in' | '6_to_9in' | 'over_9in' | 'hole';
export type FabricInspectionResult = 'pending' | 'pass' | 'fail' | 'conditional';

export interface FabricInspectionDefect {
  id: string;
  inspectionId: string;
  defectSize: FabricDefectSize;
  points: number;
  count: number;
  description: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface FabricInspection {
  id: string;
  inspectionNumber: string;
  grnId: string | null;
  poId: string | null;
  itemId: string;
  itemCode?: string;
  itemName?: string;
  rollNumber: string | null;
  lotNumber: string | null;
  inspectedQuantity: number;
  inspectedUom: string;
  widthInches: number | null;
  pointsTotal: number;
  pointsPer100Sqyd: number;
  threshold: number;
  result: FabricInspectionResult;
  inspectedBy: string | null;
  inspectedAt: ISODateString;
  notes: string | null;
  defects: FabricInspectionDefect[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateFabricInspectionDefectDto {
  defectSize: FabricDefectSize;
  count: number;
  description?: string;
}

export interface CreateFabricInspectionDto {
  inspectionNumber: string;
  grnId?: string;
  poId?: string;
  itemId: string;
  rollNumber?: string;
  lotNumber?: string;
  inspectedQuantity: number;
  inspectedUom?: string;
  widthInches?: number;
  threshold?: number;
  inspectedBy?: string;
  notes?: string;
  defects?: CreateFabricInspectionDefectDto[];
}

export type UpdateFabricInspectionDto = Partial<
  Omit<CreateFabricInspectionDto, 'inspectionNumber' | 'itemId'>
>;

export interface StockLot {
  id: string;
  lotNumber: string;
  itemId: string;
  itemCode?: string;
  itemName?: string;
  warehouseId: string;
  warehouseCode?: string;
  binLocationId: string | null;
  binCode?: string;
  grnId: string | null;
  poId: string | null;
  receivedAt: ISODateString;
  expiryDate: ISODateString | null;
  quantityOnHand: number;
  receivedQuantity: number;
  uom: string;
  unitCost: number;
  currencyCode: string;
  notes: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateStockLotDto {
  lotNumber: string;
  itemId: string;
  warehouseId: string;
  binLocationId?: string;
  grnId?: string;
  poId?: string;
  receivedAt?: string;
  expiryDate?: string;
  quantityOnHand: number;
  receivedQuantity?: number;
  uom?: string;
  unitCost?: number;
  currencyCode?: string;
  notes?: string;
}

export type UpdateStockLotDto = Partial<Omit<CreateStockLotDto, 'lotNumber' | 'itemId'>>;

export type StockMovementType =
  | 'receipt'
  | 'issue'
  | 'adjustment'
  | 'transfer_in'
  | 'transfer_out'
  | 'consumption'
  | 'return';

export interface StockMovement {
  id: string;
  movementNumber: string;
  movementType: StockMovementType;
  lotId: string;
  lotNumber?: string;
  itemId: string;
  itemCode?: string;
  itemName?: string;
  warehouseId: string;
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  movedAt: ISODateString;
  movedBy: string | null;
  notes: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateStockMovementDto {
  movementNumber: string;
  movementType: StockMovementType;
  lotId: string;
  quantity: number;
  referenceType?: string;
  referenceId?: string;
  movedAt?: string;
  movedBy?: string;
  notes?: string;
}

export interface IssueFifoDto {
  itemId: string;
  warehouseId: string;
  quantity: number;
  movementNumberPrefix?: string;
  referenceType?: string;
  referenceId?: string;
  movedBy?: string;
  notes?: string;
}

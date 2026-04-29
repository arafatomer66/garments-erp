import type { ISODateString } from './common.types.js';

export type PackingListStatus = 'draft' | 'finalized' | 'shipped';
export type ShipmentMode = 'sea' | 'air' | 'road';
export type ShipmentStatus = 'planned' | 'in_transit' | 'delivered' | 'cancelled';
export type ExportDocType =
  | 'co'
  | 'gsp'
  | 'exp'
  | 'commercial_invoice'
  | 'packing_list_doc'
  | 'bl_awb'
  | 'other';
export type ExportDocStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface PackingListCarton {
  id: string;
  packingListId: string;
  cartonNumber: string;
  sizeLabel: string | null;
  color: string | null;
  quantity: number;
  grossWeightKg: number;
  netWeightKg: number;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  sortOrder: number;
  notes: string | null;
  createdAt: ISODateString;
}

export interface PackingList {
  id: string;
  plNumber: string;
  buyerOrderId: string | null;
  buyerOrderNumber?: string;
  styleId: string | null;
  styleCode?: string;
  invoiceNumber: string | null;
  packDate: ISODateString;
  totalCartons: number;
  totalQuantity: number;
  grossWeightKg: number;
  netWeightKg: number;
  cbm: number;
  status: PackingListStatus;
  notes: string | null;
  cartons: PackingListCarton[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreatePackingListCartonDto {
  cartonNumber: string;
  sizeLabel?: string;
  color?: string;
  quantity: number;
  grossWeightKg?: number;
  netWeightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  sortOrder?: number;
  notes?: string;
}

export interface CreatePackingListDto {
  plNumber: string;
  buyerOrderId?: string;
  styleId?: string;
  invoiceNumber?: string;
  packDate?: string;
  status?: PackingListStatus;
  notes?: string;
  cartons: CreatePackingListCartonDto[];
}

export type UpdatePackingListDto = Partial<Omit<CreatePackingListDto, 'plNumber'>>;

export interface Shipment {
  id: string;
  shipmentNumber: string;
  buyerOrderId: string | null;
  buyerOrderNumber?: string;
  packingListId: string | null;
  packingListNumber?: string;
  mode: ShipmentMode;
  forwarder: string | null;
  blAwbNumber: string | null;
  containerNumber: string | null;
  portOfLoading: string | null;
  portOfDischarge: string | null;
  eta: ISODateString | null;
  etd: ISODateString | null;
  actualShipDate: ISODateString | null;
  invoiceNumber: string | null;
  invoiceValueUsd: number | null;
  status: ShipmentStatus;
  notes: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateShipmentDto {
  shipmentNumber: string;
  buyerOrderId?: string;
  packingListId?: string;
  mode?: ShipmentMode;
  forwarder?: string;
  blAwbNumber?: string;
  containerNumber?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  eta?: string;
  etd?: string;
  actualShipDate?: string;
  invoiceNumber?: string;
  invoiceValueUsd?: number;
  status?: ShipmentStatus;
  notes?: string;
}

export type UpdateShipmentDto = Partial<Omit<CreateShipmentDto, 'shipmentNumber'>>;

export interface ExportDocument {
  id: string;
  docNumber: string;
  shipmentId: string | null;
  shipmentNumber?: string;
  buyerOrderId: string | null;
  buyerOrderNumber?: string;
  docType: ExportDocType;
  issuedDate: ISODateString;
  issuedBy: string | null;
  referenceNumber: string | null;
  expiryDate: ISODateString | null;
  fileUrl: string | null;
  status: ExportDocStatus;
  notes: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateExportDocumentDto {
  docNumber: string;
  shipmentId?: string;
  buyerOrderId?: string;
  docType: ExportDocType;
  issuedDate?: string;
  issuedBy?: string;
  referenceNumber?: string;
  expiryDate?: string;
  fileUrl?: string;
  status?: ExportDocStatus;
  notes?: string;
}

export type UpdateExportDocumentDto = Partial<Omit<CreateExportDocumentDto, 'docNumber'>>;

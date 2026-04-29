import type { ISODateString } from './common.types.js';

export type PurchaseRequisitionStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'converted'
  | 'rejected'
  | 'cancelled';

export type PurchaseOrderStatus =
  | 'draft'
  | 'sent'
  | 'partially_received'
  | 'received'
  | 'closed'
  | 'cancelled';

export type GoodsReceiptStatus = 'received' | 'inspected' | 'accepted' | 'rejected' | 'partial';

export type LetterOfCreditType = 'master' | 'back_to_back' | 'transferable' | 'sight' | 'usance';
export type LetterOfCreditStatus =
  | 'draft'
  | 'opened'
  | 'amended'
  | 'shipped'
  | 'negotiated'
  | 'paid'
  | 'expired'
  | 'cancelled';

export interface PurchaseRequisitionItem {
  id: string;
  prId: string;
  itemId: string;
  itemCode?: string;
  itemName?: string;
  quantity: number;
  uom: string;
  estimatedCost: number | null;
  notes: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface PurchaseRequisition {
  id: string;
  prNumber: string;
  requestedBy: string | null;
  department: string | null;
  styleId: string | null;
  buyerOrderId: string | null;
  requestDate: ISODateString;
  requiredBy: ISODateString | null;
  status: PurchaseRequisitionStatus;
  notes: string | null;
  items: PurchaseRequisitionItem[];
  totalEstimatedCost: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreatePurchaseRequisitionItemDto {
  itemId: string;
  quantity: number;
  uom?: string;
  estimatedCost?: number;
  notes?: string;
}

export interface CreatePurchaseRequisitionDto {
  prNumber: string;
  requestedBy?: string;
  department?: string;
  styleId?: string;
  buyerOrderId?: string;
  requestDate?: string;
  requiredBy?: string;
  status?: PurchaseRequisitionStatus;
  notes?: string;
  items: CreatePurchaseRequisitionItemDto[];
}

export type UpdatePurchaseRequisitionDto = Partial<Omit<CreatePurchaseRequisitionDto, 'prNumber'>>;

export interface PurchaseOrderItem {
  id: string;
  poId: string;
  itemId: string;
  itemCode?: string;
  itemName?: string;
  quantity: number;
  receivedQuantity: number;
  unitPrice: number;
  uom: string;
  notes: string | null;
  lineTotal?: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName?: string;
  prId: string | null;
  styleId: string | null;
  buyerOrderId: string | null;
  orderDate: ISODateString;
  expectedDelivery: ISODateString | null;
  incoterm: string | null;
  paymentTerms: string | null;
  currencyCode: string;
  status: PurchaseOrderStatus;
  notes: string | null;
  items: PurchaseOrderItem[];
  totalValue: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreatePurchaseOrderItemDto {
  itemId: string;
  quantity: number;
  unitPrice: number;
  uom?: string;
  notes?: string;
}

export interface CreatePurchaseOrderDto {
  poNumber: string;
  supplierId: string;
  prId?: string;
  styleId?: string;
  buyerOrderId?: string;
  orderDate?: string;
  expectedDelivery?: string;
  incoterm?: string;
  paymentTerms?: string;
  currencyCode?: string;
  status?: PurchaseOrderStatus;
  notes?: string;
  items: CreatePurchaseOrderItemDto[];
}

export type UpdatePurchaseOrderDto = Partial<Omit<CreatePurchaseOrderDto, 'poNumber'>>;

export interface ConvertPrToPoDto {
  prId: string;
  poNumber: string;
  supplierId: string;
  orderDate?: string;
  expectedDelivery?: string;
  incoterm?: string;
  paymentTerms?: string;
  currencyCode?: string;
}

export interface GoodsReceiptItem {
  id: string;
  grnId: string;
  poItemId: string;
  itemId: string;
  itemCode?: string;
  itemName?: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  notes: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface GoodsReceiptNote {
  id: string;
  grnNumber: string;
  poId: string;
  poNumber?: string;
  receivedDate: ISODateString;
  receivedBy: string | null;
  invoiceNumber: string | null;
  challanNumber: string | null;
  status: GoodsReceiptStatus;
  notes: string | null;
  items: GoodsReceiptItem[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateGoodsReceiptItemDto {
  poItemId: string;
  itemId: string;
  receivedQuantity: number;
  acceptedQuantity?: number;
  rejectedQuantity?: number;
  notes?: string;
}

export interface CreateGoodsReceiptNoteDto {
  grnNumber: string;
  poId: string;
  receivedDate?: string;
  receivedBy?: string;
  invoiceNumber?: string;
  challanNumber?: string;
  status?: GoodsReceiptStatus;
  notes?: string;
  items: CreateGoodsReceiptItemDto[];
}

export type UpdateGoodsReceiptNoteDto = Partial<Omit<CreateGoodsReceiptNoteDto, 'grnNumber' | 'poId'>>;

export interface LetterOfCredit {
  id: string;
  lcNumber: string;
  lcType: LetterOfCreditType;
  issuingBank: string | null;
  advisingBank: string | null;
  beneficiary: string | null;
  applicant: string | null;
  parentLcId: string | null;
  buyerOrderId: string | null;
  poId: string | null;
  amount: number;
  currencyCode: string;
  issueDate: ISODateString | null;
  expiryDate: ISODateString | null;
  latestShipmentDate: ISODateString | null;
  status: LetterOfCreditStatus;
  notes: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateLetterOfCreditDto {
  lcNumber: string;
  lcType?: LetterOfCreditType;
  issuingBank?: string;
  advisingBank?: string;
  beneficiary?: string;
  applicant?: string;
  parentLcId?: string;
  buyerOrderId?: string;
  poId?: string;
  amount?: number;
  currencyCode?: string;
  issueDate?: string;
  expiryDate?: string;
  latestShipmentDate?: string;
  status?: LetterOfCreditStatus;
  notes?: string;
}

export type UpdateLetterOfCreditDto = Partial<Omit<CreateLetterOfCreditDto, 'lcNumber'>>;

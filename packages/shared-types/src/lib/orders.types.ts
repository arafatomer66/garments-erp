import type { ISODateString } from './common.types.js';

export type BuyerOrderStatus =
  | 'draft'
  | 'confirmed'
  | 'in_production'
  | 'shipped'
  | 'closed'
  | 'cancelled';

export interface OrderSizeRow {
  id: string;
  orderLineId: string;
  sizeLabel: string;
  quantity: number;
  sortOrder: number;
}

export interface OrderLine {
  id: string;
  orderId: string;
  styleId: string;
  color: string | null;
  quantity: number;
  unitPrice: number;
  notes: string | null;
  sizes: OrderSizeRow[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface BuyerOrder {
  id: string;
  poNumber: string;
  buyerId: string;
  orderDate: ISODateString;
  deliveryDate: ISODateString | null;
  incoterm: string | null;
  paymentTerms: string | null;
  currencyCode: string;
  status: BuyerOrderStatus;
  notes: string | null;
  lines: OrderLine[];
  totalQuantity: number;
  totalValue: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateOrderSizeDto {
  sizeLabel: string;
  quantity: number;
  sortOrder?: number;
}

export interface CreateOrderLineDto {
  styleId: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  sizes?: CreateOrderSizeDto[];
}

export interface CreateBuyerOrderDto {
  poNumber: string;
  buyerId: string;
  orderDate?: ISODateString;
  deliveryDate?: ISODateString;
  incoterm?: string;
  paymentTerms?: string;
  currencyCode?: string;
  status?: BuyerOrderStatus;
  notes?: string;
  lines: CreateOrderLineDto[];
}

export type UpdateBuyerOrderDto = Partial<Omit<CreateBuyerOrderDto, 'lines'>> & {
  lines?: CreateOrderLineDto[];
};

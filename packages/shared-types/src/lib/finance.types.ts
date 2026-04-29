export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
export type TaxType = 'vat' | 'ait' | 'source_tax' | 'withholding' | 'other';
export type TaxAppliesTo = 'sales' | 'purchase' | 'both';
export type BankPurpose =
  | 'operational'
  | 'export_proceeds'
  | 'erq'
  | 'back_to_back_lc'
  | 'payroll'
  | 'other';
export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled';
export type BillStatus = 'draft' | 'received' | 'partial' | 'paid' | 'overdue' | 'cancelled';
export type PaymentDirection = 'inbound' | 'outbound';
export type PaymentMethod =
  | 'bank_transfer'
  | 'cheque'
  | 'cash'
  | 'lc'
  | 'tt'
  | 'mfs'
  | 'other';

export interface FinAccount {
  id: string;
  code: string;
  name: string;
  accountType: AccountType;
  parentId?: string | null;
  parentName?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface CreateFinAccountDto {
  code: string;
  name: string;
  accountType: AccountType;
  parentId?: string | null;
  description?: string | null;
  isActive?: boolean;
}
export type UpdateFinAccountDto = Partial<CreateFinAccountDto>;

export interface FinTaxCode {
  id: string;
  code: string;
  name: string;
  taxType: TaxType;
  ratePercent: number;
  appliesTo: TaxAppliesTo;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface CreateFinTaxCodeDto {
  code: string;
  name: string;
  taxType: TaxType;
  ratePercent: number;
  appliesTo?: TaxAppliesTo;
  description?: string | null;
  isActive?: boolean;
}
export type UpdateFinTaxCodeDto = Partial<CreateFinTaxCodeDto>;

export interface FinFxRate {
  id: string;
  rateDate: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  source?: string | null;
  createdAt: string;
}
export interface CreateFinFxRateDto {
  rateDate: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  source?: string | null;
}

export interface FinBankAccount {
  id: string;
  code: string;
  bankName: string;
  branch?: string | null;
  accountNumber: string;
  accountHolder?: string | null;
  swiftCode?: string | null;
  routingNumber?: string | null;
  currencyCode: string;
  purpose: BankPurpose;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreateFinBankAccountDto {
  code: string;
  bankName: string;
  branch?: string | null;
  accountNumber: string;
  accountHolder?: string | null;
  swiftCode?: string | null;
  routingNumber?: string | null;
  currencyCode?: string;
  purpose?: BankPurpose;
  openingBalance?: number;
  notes?: string | null;
  isActive?: boolean;
}
export type UpdateFinBankAccountDto = Partial<CreateFinBankAccountDto>;

export interface FinInvoiceLine {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  taxCodeId?: string | null;
  taxAmount: number;
  sortOrder: number;
  createdAt: string;
}
export interface CreateFinInvoiceLineDto {
  description: string;
  quantity: number;
  unitPrice: number;
  taxCodeId?: string | null;
  sortOrder?: number;
}

export interface FinInvoice {
  id: string;
  invoiceNumber: string;
  buyerId?: string | null;
  buyerName?: string | null;
  buyerOrderId?: string | null;
  buyerOrderNumber?: string | null;
  shipmentId?: string | null;
  invoiceDate: string;
  dueDate?: string | null;
  currencyCode: string;
  fxRate: number;
  subtotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  status: InvoiceStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: FinInvoiceLine[];
}
export interface CreateFinInvoiceDto {
  invoiceNumber: string;
  buyerId?: string | null;
  buyerOrderId?: string | null;
  shipmentId?: string | null;
  invoiceDate?: string;
  dueDate?: string | null;
  currencyCode?: string;
  fxRate?: number;
  notes?: string | null;
  lines: CreateFinInvoiceLineDto[];
}
export type UpdateFinInvoiceDto = Partial<Omit<CreateFinInvoiceDto, 'lines'>> & {
  status?: InvoiceStatus;
};

export interface FinBillLine {
  id: string;
  billId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  taxCodeId?: string | null;
  taxAmount: number;
  sortOrder: number;
  createdAt: string;
}
export interface CreateFinBillLineDto {
  description: string;
  quantity: number;
  unitPrice: number;
  taxCodeId?: string | null;
  sortOrder?: number;
}

export interface FinBill {
  id: string;
  billNumber: string;
  supplierId?: string | null;
  supplierName?: string | null;
  purchaseOrderId?: string | null;
  purchaseOrderNumber?: string | null;
  billDate: string;
  dueDate?: string | null;
  currencyCode: string;
  fxRate: number;
  subtotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  status: BillStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: FinBillLine[];
}
export interface CreateFinBillDto {
  billNumber: string;
  supplierId?: string | null;
  purchaseOrderId?: string | null;
  billDate?: string;
  dueDate?: string | null;
  currencyCode?: string;
  fxRate?: number;
  notes?: string | null;
  lines: CreateFinBillLineDto[];
}
export type UpdateFinBillDto = Partial<Omit<CreateFinBillDto, 'lines'>> & {
  status?: BillStatus;
};

export interface FinPayment {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  direction: PaymentDirection;
  method: PaymentMethod;
  bankAccountId?: string | null;
  bankAccountName?: string | null;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  billId?: string | null;
  billNumber?: string | null;
  partyName?: string | null;
  currencyCode: string;
  fxRate: number;
  amount: number;
  referenceNumber?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreateFinPaymentDto {
  paymentNumber: string;
  paymentDate?: string;
  direction: PaymentDirection;
  method?: PaymentMethod;
  bankAccountId?: string | null;
  invoiceId?: string | null;
  billId?: string | null;
  partyName?: string | null;
  currencyCode?: string;
  fxRate?: number;
  amount: number;
  referenceNumber?: string | null;
  notes?: string | null;
}
export type UpdateFinPaymentDto = Partial<CreateFinPaymentDto>;

export interface FinanceSummary {
  totalReceivable: number;
  totalPayable: number;
  bankBalanceBdt: number;
  bankBalanceUsd: number;
  invoicesOutstanding: number;
  billsOutstanding: number;
  overdueInvoices: number;
  overdueBills: number;
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  CreateFinAccountDto,
  CreateFinBankAccountDto,
  CreateFinBillDto,
  CreateFinFxRateDto,
  CreateFinInvoiceDto,
  CreateFinPaymentDto,
  CreateFinTaxCodeDto,
  FinAccount,
  FinBankAccount,
  FinBill,
  FinFxRate,
  FinInvoice,
  FinPayment,
  FinTaxCode,
  FinanceSummary,
  UpdateFinAccountDto,
  UpdateFinBankAccountDto,
  UpdateFinBillDto,
  UpdateFinInvoiceDto,
  UpdateFinPaymentDto,
  UpdateFinTaxCodeDto,
} from '@org/shared-types';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FinanceApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/finance`;

  getSummary(): Observable<FinanceSummary> {
    return this.http.get<FinanceSummary>(`${this.base}/summary`);
  }

  // Accounts
  listAccounts(): Observable<FinAccount[]> { return this.http.get<FinAccount[]>(`${this.base}/accounts`); }
  createAccount(dto: CreateFinAccountDto) { return this.http.post<FinAccount>(`${this.base}/accounts`, dto); }
  updateAccount(id: string, dto: UpdateFinAccountDto) { return this.http.patch<FinAccount>(`${this.base}/accounts/${id}`, dto); }
  deleteAccount(id: string) { return this.http.delete<void>(`${this.base}/accounts/${id}`); }

  // Tax codes
  listTaxCodes(): Observable<FinTaxCode[]> { return this.http.get<FinTaxCode[]>(`${this.base}/tax-codes`); }
  createTaxCode(dto: CreateFinTaxCodeDto) { return this.http.post<FinTaxCode>(`${this.base}/tax-codes`, dto); }
  updateTaxCode(id: string, dto: UpdateFinTaxCodeDto) { return this.http.patch<FinTaxCode>(`${this.base}/tax-codes/${id}`, dto); }
  deleteTaxCode(id: string) { return this.http.delete<void>(`${this.base}/tax-codes/${id}`); }

  // FX rates
  listFxRates(): Observable<FinFxRate[]> { return this.http.get<FinFxRate[]>(`${this.base}/fx-rates`); }
  createFxRate(dto: CreateFinFxRateDto) { return this.http.post<FinFxRate>(`${this.base}/fx-rates`, dto); }
  deleteFxRate(id: string) { return this.http.delete<void>(`${this.base}/fx-rates/${id}`); }

  // Banks
  listBankAccounts(): Observable<FinBankAccount[]> { return this.http.get<FinBankAccount[]>(`${this.base}/bank-accounts`); }
  createBankAccount(dto: CreateFinBankAccountDto) { return this.http.post<FinBankAccount>(`${this.base}/bank-accounts`, dto); }
  updateBankAccount(id: string, dto: UpdateFinBankAccountDto) { return this.http.patch<FinBankAccount>(`${this.base}/bank-accounts/${id}`, dto); }
  deleteBankAccount(id: string) { return this.http.delete<void>(`${this.base}/bank-accounts/${id}`); }

  // Invoices
  listInvoices(): Observable<FinInvoice[]> { return this.http.get<FinInvoice[]>(`${this.base}/invoices`); }
  getInvoice(id: string) { return this.http.get<FinInvoice>(`${this.base}/invoices/${id}`); }
  createInvoice(dto: CreateFinInvoiceDto) { return this.http.post<FinInvoice>(`${this.base}/invoices`, dto); }
  updateInvoice(id: string, dto: UpdateFinInvoiceDto) { return this.http.patch<FinInvoice>(`${this.base}/invoices/${id}`, dto); }
  deleteInvoice(id: string) { return this.http.delete<void>(`${this.base}/invoices/${id}`); }

  // Bills
  listBills(): Observable<FinBill[]> { return this.http.get<FinBill[]>(`${this.base}/bills`); }
  getBill(id: string) { return this.http.get<FinBill>(`${this.base}/bills/${id}`); }
  createBill(dto: CreateFinBillDto) { return this.http.post<FinBill>(`${this.base}/bills`, dto); }
  updateBill(id: string, dto: UpdateFinBillDto) { return this.http.patch<FinBill>(`${this.base}/bills/${id}`, dto); }
  deleteBill(id: string) { return this.http.delete<void>(`${this.base}/bills/${id}`); }

  // Payments
  listPayments(): Observable<FinPayment[]> { return this.http.get<FinPayment[]>(`${this.base}/payments`); }
  createPayment(dto: CreateFinPaymentDto) { return this.http.post<FinPayment>(`${this.base}/payments`, dto); }
  updatePayment(id: string, dto: UpdateFinPaymentDto) { return this.http.patch<FinPayment>(`${this.base}/payments/${id}`, dto); }
  deletePayment(id: string) { return this.http.delete<void>(`${this.base}/payments/${id}`); }
}

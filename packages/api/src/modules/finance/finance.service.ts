import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  FinAccount,
  FinBankAccount,
  FinBill,
  FinBillLine,
  FinFxRate,
  FinInvoice,
  FinInvoiceLine,
  FinPayment,
  FinTaxCode,
  FinanceSummary,
} from '@org/shared-types';
import { TenantRepository, TenantTx } from '../../core/database/tenant-repository';
import { camelize } from '../masters/sql.util';
import { CreateFinAccountDto, UpdateFinAccountDto } from './dto/account.dto';
import { CreateFinTaxCodeDto, UpdateFinTaxCodeDto } from './dto/tax-code.dto';
import { CreateFinFxRateDto } from './dto/fx-rate.dto';
import { CreateFinBankAccountDto, UpdateFinBankAccountDto } from './dto/bank-account.dto';
import {
  CreateFinInvoiceDto,
  CreateFinInvoiceLineDto,
  UpdateFinInvoiceDto,
} from './dto/invoice.dto';
import {
  CreateFinBillDto,
  CreateFinBillLineDto,
  UpdateFinBillDto,
} from './dto/bill.dto';
import { CreateFinPaymentDto, UpdateFinPaymentDto } from './dto/payment.dto';

interface TaxCodeRow {
  id: string;
  rate_percent: string | number;
}

@Injectable()
export class FinanceService extends TenantRepository {
  // ============= Chart of Accounts =============

  async listAccounts(): Promise<FinAccount[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT a.*, p.name AS parent_name
         FROM fin_accounts a
         LEFT JOIN fin_accounts p ON p.id = a.parent_id
        ORDER BY a.code`,
    );
    return rows.map((r) => camelize(r) as unknown as FinAccount);
  }

  async createAccount(dto: CreateFinAccountDto): Promise<FinAccount> {
    const rows = await this.query<{ id: string }>(
      `INSERT INTO fin_accounts (code, name, account_type, parent_id, description, is_active)
       VALUES ($1, $2, $3, $4::uuid, $5, COALESCE($6, TRUE))
       RETURNING id`,
      [dto.code, dto.name, dto.accountType, dto.parentId ?? null, dto.description ?? null, dto.isActive ?? null],
    );
    return this.findAccount(rows[0].id);
  }

  async findAccount(id: string): Promise<FinAccount> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT a.*, p.name AS parent_name
         FROM fin_accounts a
         LEFT JOIN fin_accounts p ON p.id = a.parent_id
        WHERE a.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Account ${id} not found`);
    return camelize(rows[0]) as unknown as FinAccount;
  }

  async updateAccount(id: string, dto: UpdateFinAccountDto): Promise<FinAccount> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown, cast?: string) => {
      vals.push(val);
      sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
    };
    if (dto.code !== undefined) push('code', dto.code);
    if (dto.name !== undefined) push('name', dto.name);
    if (dto.accountType !== undefined) push('account_type', dto.accountType);
    if (dto.parentId !== undefined) push('parent_id', dto.parentId, 'uuid');
    if (dto.description !== undefined) push('description', dto.description);
    if (dto.isActive !== undefined) push('is_active', dto.isActive);
    if (sets.length === 0) return this.findAccount(id);
    vals.push(id);
    const affected = await this.exec(
      `UPDATE fin_accounts SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    if (affected === 0) throw new NotFoundException(`Account ${id} not found`);
    return this.findAccount(id);
  }

  async removeAccount(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM fin_accounts WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Account ${id} not found`);
  }

  // ============= Tax Codes =============

  async listTaxCodes(): Promise<FinTaxCode[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM fin_tax_codes ORDER BY code`,
    );
    return rows.map((r) => camelize(r) as unknown as FinTaxCode);
  }

  async createTaxCode(dto: CreateFinTaxCodeDto): Promise<FinTaxCode> {
    const rows = await this.query<{ id: string }>(
      `INSERT INTO fin_tax_codes (code, name, tax_type, rate_percent, applies_to, description, is_active)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'both'), $6, COALESCE($7, TRUE))
       RETURNING id`,
      [
        dto.code,
        dto.name,
        dto.taxType,
        dto.ratePercent,
        dto.appliesTo ?? null,
        dto.description ?? null,
        dto.isActive ?? null,
      ],
    );
    return this.findTaxCode(rows[0].id);
  }

  async findTaxCode(id: string): Promise<FinTaxCode> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM fin_tax_codes WHERE id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Tax code ${id} not found`);
    return camelize(rows[0]) as unknown as FinTaxCode;
  }

  async updateTaxCode(id: string, dto: UpdateFinTaxCodeDto): Promise<FinTaxCode> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown) => {
      vals.push(val);
      sets.push(`${col} = $${vals.length}`);
    };
    if (dto.code !== undefined) push('code', dto.code);
    if (dto.name !== undefined) push('name', dto.name);
    if (dto.taxType !== undefined) push('tax_type', dto.taxType);
    if (dto.ratePercent !== undefined) push('rate_percent', dto.ratePercent);
    if (dto.appliesTo !== undefined) push('applies_to', dto.appliesTo);
    if (dto.description !== undefined) push('description', dto.description);
    if (dto.isActive !== undefined) push('is_active', dto.isActive);
    if (sets.length === 0) return this.findTaxCode(id);
    vals.push(id);
    const affected = await this.exec(
      `UPDATE fin_tax_codes SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    if (affected === 0) throw new NotFoundException(`Tax code ${id} not found`);
    return this.findTaxCode(id);
  }

  async removeTaxCode(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM fin_tax_codes WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Tax code ${id} not found`);
  }

  // ============= FX Rates =============

  async listFxRates(): Promise<FinFxRate[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM fin_fx_rates ORDER BY rate_date DESC, base_currency, quote_currency LIMIT 200`,
    );
    return rows.map((r) => camelize(r) as unknown as FinFxRate);
  }

  async createFxRate(dto: CreateFinFxRateDto): Promise<FinFxRate> {
    const rows = await this.query<{ id: string }>(
      `INSERT INTO fin_fx_rates (rate_date, base_currency, quote_currency, rate, source)
       VALUES ($1::date, $2, $3, $4, $5)
       ON CONFLICT (rate_date, base_currency, quote_currency)
       DO UPDATE SET rate = EXCLUDED.rate, source = EXCLUDED.source
       RETURNING id`,
      [dto.rateDate, dto.baseCurrency, dto.quoteCurrency, dto.rate, dto.source ?? null],
    );
    const out = await this.query<Record<string, unknown>>(
      `SELECT * FROM fin_fx_rates WHERE id = $1::uuid`,
      [rows[0].id],
    );
    return camelize(out[0]) as unknown as FinFxRate;
  }

  async removeFxRate(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM fin_fx_rates WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`FX rate ${id} not found`);
  }

  // ============= Bank Accounts =============

  async listBankAccounts(): Promise<FinBankAccount[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM fin_bank_accounts ORDER BY code`,
    );
    return rows.map((r) => camelize(r) as unknown as FinBankAccount);
  }

  async createBankAccount(dto: CreateFinBankAccountDto): Promise<FinBankAccount> {
    const opening = dto.openingBalance ?? 0;
    const rows = await this.query<{ id: string }>(
      `INSERT INTO fin_bank_accounts (
          code, bank_name, branch, account_number, account_holder,
          swift_code, routing_number, currency_code, purpose,
          opening_balance, current_balance, notes, is_active)
       VALUES ($1, $2, $3, $4, $5,
               $6, $7, COALESCE($8, 'BDT'), COALESCE($9, 'operational'),
               $10, $10, $11, COALESCE($12, TRUE))
       RETURNING id`,
      [
        dto.code,
        dto.bankName,
        dto.branch ?? null,
        dto.accountNumber,
        dto.accountHolder ?? null,
        dto.swiftCode ?? null,
        dto.routingNumber ?? null,
        dto.currencyCode ?? null,
        dto.purpose ?? null,
        opening,
        dto.notes ?? null,
        dto.isActive ?? null,
      ],
    );
    return this.findBankAccount(rows[0].id);
  }

  async findBankAccount(id: string): Promise<FinBankAccount> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM fin_bank_accounts WHERE id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Bank account ${id} not found`);
    return camelize(rows[0]) as unknown as FinBankAccount;
  }

  async updateBankAccount(id: string, dto: UpdateFinBankAccountDto): Promise<FinBankAccount> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown) => {
      vals.push(val);
      sets.push(`${col} = $${vals.length}`);
    };
    if (dto.code !== undefined) push('code', dto.code);
    if (dto.bankName !== undefined) push('bank_name', dto.bankName);
    if (dto.branch !== undefined) push('branch', dto.branch);
    if (dto.accountNumber !== undefined) push('account_number', dto.accountNumber);
    if (dto.accountHolder !== undefined) push('account_holder', dto.accountHolder);
    if (dto.swiftCode !== undefined) push('swift_code', dto.swiftCode);
    if (dto.routingNumber !== undefined) push('routing_number', dto.routingNumber);
    if (dto.currencyCode !== undefined) push('currency_code', dto.currencyCode);
    if (dto.purpose !== undefined) push('purpose', dto.purpose);
    if (dto.openingBalance !== undefined) push('opening_balance', dto.openingBalance);
    if (dto.notes !== undefined) push('notes', dto.notes);
    if (dto.isActive !== undefined) push('is_active', dto.isActive);
    if (sets.length === 0) return this.findBankAccount(id);
    vals.push(id);
    const affected = await this.exec(
      `UPDATE fin_bank_accounts SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    if (affected === 0) throw new NotFoundException(`Bank account ${id} not found`);
    return this.findBankAccount(id);
  }

  async removeBankAccount(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM fin_bank_accounts WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Bank account ${id} not found`);
  }

  // ============= Invoices (AR) =============

  async listInvoices(): Promise<FinInvoice[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT i.*, b.name AS buyer_name, bo.po_number AS buyer_order_number
         FROM fin_invoices i
         LEFT JOIN buyers b ON b.id = i.buyer_id
         LEFT JOIN buyer_orders bo ON bo.id = i.buyer_order_id
        ORDER BY i.invoice_date DESC, i.invoice_number DESC`,
    );
    return rows.map((r) => camelize(r) as unknown as FinInvoice);
  }

  async findInvoice(id: string): Promise<FinInvoice> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT i.*, b.name AS buyer_name, bo.po_number AS buyer_order_number
         FROM fin_invoices i
         LEFT JOIN buyers b ON b.id = i.buyer_id
         LEFT JOIN buyer_orders bo ON bo.id = i.buyer_order_id
        WHERE i.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Invoice ${id} not found`);
    const lines = await this.query<Record<string, unknown>>(
      `SELECT * FROM fin_invoice_lines WHERE invoice_id = $1::uuid ORDER BY sort_order, created_at`,
      [id],
    );
    const invoice = camelize(rows[0]) as unknown as FinInvoice;
    invoice.lines = lines.map((l) => camelize(l) as unknown as FinInvoiceLine);
    return invoice;
  }

  async createInvoice(dto: CreateFinInvoiceDto): Promise<FinInvoice> {
    const taxRates = await this.loadTaxRates(dto.lines.map((l) => l.taxCodeId).filter(Boolean) as string[]);
    const totals = computeInvoiceTotals(dto.lines, taxRates);
    return this.withTx(async (tx) => {
      const rows = await tx.query<{ id: string }>(
        `INSERT INTO fin_invoices (
            invoice_number, buyer_id, buyer_order_id, shipment_id,
            invoice_date, due_date, currency_code, fx_rate,
            subtotal, tax_total, total, amount_due, status, notes)
         VALUES ($1, $2::uuid, $3::uuid, $4::uuid,
                 COALESCE($5::date, CURRENT_DATE), $6::date, COALESCE($7, 'USD'), COALESCE($8, 1),
                 $9, $10, $11, $11, 'draft', $12)
         RETURNING id`,
        [
          dto.invoiceNumber,
          dto.buyerId ?? null,
          dto.buyerOrderId ?? null,
          dto.shipmentId ?? null,
          dto.invoiceDate ?? null,
          dto.dueDate ?? null,
          dto.currencyCode ?? null,
          dto.fxRate ?? null,
          totals.subtotal,
          totals.taxTotal,
          totals.total,
          dto.notes ?? null,
        ],
      );
      const id = rows[0].id;
      await this.insertInvoiceLines(tx, id, dto.lines, taxRates);
      return this.findInvoiceTx(tx, id);
    });
  }

  async updateInvoice(id: string, dto: UpdateFinInvoiceDto): Promise<FinInvoice> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown, cast?: string) => {
      vals.push(val);
      sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
    };
    if (dto.invoiceNumber !== undefined) push('invoice_number', dto.invoiceNumber);
    if (dto.buyerId !== undefined) push('buyer_id', dto.buyerId, 'uuid');
    if (dto.buyerOrderId !== undefined) push('buyer_order_id', dto.buyerOrderId, 'uuid');
    if (dto.shipmentId !== undefined) push('shipment_id', dto.shipmentId, 'uuid');
    if (dto.invoiceDate !== undefined) push('invoice_date', dto.invoiceDate, 'date');
    if (dto.dueDate !== undefined) push('due_date', dto.dueDate, 'date');
    if (dto.currencyCode !== undefined) push('currency_code', dto.currencyCode);
    if (dto.fxRate !== undefined) push('fx_rate', dto.fxRate);
    if (dto.notes !== undefined) push('notes', dto.notes);
    if (dto.status !== undefined) push('status', dto.status);
    if (sets.length === 0) return this.findInvoice(id);
    vals.push(id);
    const affected = await this.exec(
      `UPDATE fin_invoices SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    if (affected === 0) throw new NotFoundException(`Invoice ${id} not found`);
    return this.findInvoice(id);
  }

  async removeInvoice(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM fin_invoices WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Invoice ${id} not found`);
  }

  private async findInvoiceTx(tx: TenantTx, id: string): Promise<FinInvoice> {
    const rows = await tx.query<Record<string, unknown>>(
      `SELECT i.*, b.name AS buyer_name, bo.po_number AS buyer_order_number
         FROM fin_invoices i
         LEFT JOIN buyers b ON b.id = i.buyer_id
         LEFT JOIN buyer_orders bo ON bo.id = i.buyer_order_id
        WHERE i.id = $1::uuid`,
      [id],
    );
    const lines = await tx.query<Record<string, unknown>>(
      `SELECT * FROM fin_invoice_lines WHERE invoice_id = $1::uuid ORDER BY sort_order, created_at`,
      [id],
    );
    const invoice = camelize(rows[0]) as unknown as FinInvoice;
    invoice.lines = lines.map((l) => camelize(l) as unknown as FinInvoiceLine);
    return invoice;
  }

  private async insertInvoiceLines(
    tx: TenantTx,
    invoiceId: string,
    lines: CreateFinInvoiceLineDto[],
    taxRates: Map<string, number>,
  ): Promise<void> {
    let order = 0;
    for (const line of lines) {
      const lineTotal = Number(line.quantity) * Number(line.unitPrice);
      const rate = line.taxCodeId ? taxRates.get(line.taxCodeId) ?? 0 : 0;
      const taxAmount = (lineTotal * rate) / 100;
      await tx.exec(
        `INSERT INTO fin_invoice_lines (invoice_id, description, quantity, unit_price, line_total, tax_code_id, tax_amount, sort_order)
         VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid, $7, $8)`,
        [
          invoiceId,
          line.description,
          line.quantity,
          line.unitPrice,
          round2(lineTotal),
          line.taxCodeId ?? null,
          round2(taxAmount),
          line.sortOrder ?? order,
        ],
      );
      order += 1;
    }
  }

  // ============= Bills (AP) =============

  async listBills(): Promise<FinBill[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT b.*, s.name AS supplier_name, po.po_number AS purchase_order_number
         FROM fin_bills b
         LEFT JOIN suppliers s ON s.id = b.supplier_id
         LEFT JOIN purchase_orders po ON po.id = b.purchase_order_id
        ORDER BY b.bill_date DESC, b.bill_number DESC`,
    );
    return rows.map((r) => camelize(r) as unknown as FinBill);
  }

  async findBill(id: string): Promise<FinBill> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT b.*, s.name AS supplier_name, po.po_number AS purchase_order_number
         FROM fin_bills b
         LEFT JOIN suppliers s ON s.id = b.supplier_id
         LEFT JOIN purchase_orders po ON po.id = b.purchase_order_id
        WHERE b.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Bill ${id} not found`);
    const lines = await this.query<Record<string, unknown>>(
      `SELECT * FROM fin_bill_lines WHERE bill_id = $1::uuid ORDER BY sort_order, created_at`,
      [id],
    );
    const bill = camelize(rows[0]) as unknown as FinBill;
    bill.lines = lines.map((l) => camelize(l) as unknown as FinBillLine);
    return bill;
  }

  async createBill(dto: CreateFinBillDto): Promise<FinBill> {
    const taxRates = await this.loadTaxRates(dto.lines.map((l) => l.taxCodeId).filter(Boolean) as string[]);
    const totals = computeInvoiceTotals(dto.lines, taxRates);
    return this.withTx(async (tx) => {
      const rows = await tx.query<{ id: string }>(
        `INSERT INTO fin_bills (
            bill_number, supplier_id, purchase_order_id,
            bill_date, due_date, currency_code, fx_rate,
            subtotal, tax_total, total, amount_due, status, notes)
         VALUES ($1, $2::uuid, $3::uuid,
                 COALESCE($4::date, CURRENT_DATE), $5::date, COALESCE($6, 'BDT'), COALESCE($7, 1),
                 $8, $9, $10, $10, 'draft', $11)
         RETURNING id`,
        [
          dto.billNumber,
          dto.supplierId ?? null,
          dto.purchaseOrderId ?? null,
          dto.billDate ?? null,
          dto.dueDate ?? null,
          dto.currencyCode ?? null,
          dto.fxRate ?? null,
          totals.subtotal,
          totals.taxTotal,
          totals.total,
          dto.notes ?? null,
        ],
      );
      const id = rows[0].id;
      await this.insertBillLines(tx, id, dto.lines, taxRates);
      return this.findBillTx(tx, id);
    });
  }

  async updateBill(id: string, dto: UpdateFinBillDto): Promise<FinBill> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown, cast?: string) => {
      vals.push(val);
      sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
    };
    if (dto.billNumber !== undefined) push('bill_number', dto.billNumber);
    if (dto.supplierId !== undefined) push('supplier_id', dto.supplierId, 'uuid');
    if (dto.purchaseOrderId !== undefined) push('purchase_order_id', dto.purchaseOrderId, 'uuid');
    if (dto.billDate !== undefined) push('bill_date', dto.billDate, 'date');
    if (dto.dueDate !== undefined) push('due_date', dto.dueDate, 'date');
    if (dto.currencyCode !== undefined) push('currency_code', dto.currencyCode);
    if (dto.fxRate !== undefined) push('fx_rate', dto.fxRate);
    if (dto.notes !== undefined) push('notes', dto.notes);
    if (dto.status !== undefined) push('status', dto.status);
    if (sets.length === 0) return this.findBill(id);
    vals.push(id);
    const affected = await this.exec(
      `UPDATE fin_bills SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    if (affected === 0) throw new NotFoundException(`Bill ${id} not found`);
    return this.findBill(id);
  }

  async removeBill(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM fin_bills WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Bill ${id} not found`);
  }

  private async findBillTx(tx: TenantTx, id: string): Promise<FinBill> {
    const rows = await tx.query<Record<string, unknown>>(
      `SELECT b.*, s.name AS supplier_name, po.po_number AS purchase_order_number
         FROM fin_bills b
         LEFT JOIN suppliers s ON s.id = b.supplier_id
         LEFT JOIN purchase_orders po ON po.id = b.purchase_order_id
        WHERE b.id = $1::uuid`,
      [id],
    );
    const lines = await tx.query<Record<string, unknown>>(
      `SELECT * FROM fin_bill_lines WHERE bill_id = $1::uuid ORDER BY sort_order, created_at`,
      [id],
    );
    const bill = camelize(rows[0]) as unknown as FinBill;
    bill.lines = lines.map((l) => camelize(l) as unknown as FinBillLine);
    return bill;
  }

  private async insertBillLines(
    tx: TenantTx,
    billId: string,
    lines: CreateFinBillLineDto[],
    taxRates: Map<string, number>,
  ): Promise<void> {
    let order = 0;
    for (const line of lines) {
      const lineTotal = Number(line.quantity) * Number(line.unitPrice);
      const rate = line.taxCodeId ? taxRates.get(line.taxCodeId) ?? 0 : 0;
      const taxAmount = (lineTotal * rate) / 100;
      await tx.exec(
        `INSERT INTO fin_bill_lines (bill_id, description, quantity, unit_price, line_total, tax_code_id, tax_amount, sort_order)
         VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid, $7, $8)`,
        [
          billId,
          line.description,
          line.quantity,
          line.unitPrice,
          round2(lineTotal),
          line.taxCodeId ?? null,
          round2(taxAmount),
          line.sortOrder ?? order,
        ],
      );
      order += 1;
    }
  }

  private async loadTaxRates(ids: string[]): Promise<Map<string, number>> {
    const rates = new Map<string, number>();
    if (ids.length === 0) return rates;
    const unique = Array.from(new Set(ids));
    const rows = await this.query<TaxCodeRow>(
      `SELECT id, rate_percent FROM fin_tax_codes WHERE id = ANY($1::uuid[])`,
      [unique],
    );
    for (const r of rows) rates.set(r.id, Number(r.rate_percent));
    return rates;
  }

  // ============= Payments =============

  async listPayments(): Promise<FinPayment[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT p.*, ba.bank_name AS bank_account_name,
              i.invoice_number AS invoice_number, b.bill_number AS bill_number
         FROM fin_payments p
         LEFT JOIN fin_bank_accounts ba ON ba.id = p.bank_account_id
         LEFT JOIN fin_invoices i ON i.id = p.invoice_id
         LEFT JOIN fin_bills b ON b.id = p.bill_id
        ORDER BY p.payment_date DESC, p.payment_number DESC`,
    );
    return rows.map((r) => camelize(r) as unknown as FinPayment);
  }

  async findPayment(id: string): Promise<FinPayment> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT p.*, ba.bank_name AS bank_account_name,
              i.invoice_number AS invoice_number, b.bill_number AS bill_number
         FROM fin_payments p
         LEFT JOIN fin_bank_accounts ba ON ba.id = p.bank_account_id
         LEFT JOIN fin_invoices i ON i.id = p.invoice_id
         LEFT JOIN fin_bills b ON b.id = p.bill_id
        WHERE p.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Payment ${id} not found`);
    return camelize(rows[0]) as unknown as FinPayment;
  }

  async createPayment(dto: CreateFinPaymentDto): Promise<FinPayment> {
    return this.withTx(async (tx) => {
      const rows = await tx.query<{ id: string }>(
        `INSERT INTO fin_payments (
            payment_number, payment_date, direction, method,
            bank_account_id, invoice_id, bill_id, party_name,
            currency_code, fx_rate, amount, reference_number, notes)
         VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, COALESCE($4, 'bank_transfer'),
                 $5::uuid, $6::uuid, $7::uuid, $8,
                 COALESCE($9, 'BDT'), COALESCE($10, 1), $11, $12, $13)
         RETURNING id`,
        [
          dto.paymentNumber,
          dto.paymentDate ?? null,
          dto.direction,
          dto.method ?? null,
          dto.bankAccountId ?? null,
          dto.invoiceId ?? null,
          dto.billId ?? null,
          dto.partyName ?? null,
          dto.currencyCode ?? null,
          dto.fxRate ?? null,
          dto.amount,
          dto.referenceNumber ?? null,
          dto.notes ?? null,
        ],
      );
      const id = rows[0].id;

      // Update related invoice/bill amount_paid + amount_due + status
      if (dto.invoiceId) {
        await tx.exec(
          `UPDATE fin_invoices
              SET amount_paid = amount_paid + $1,
                  amount_due = total - (amount_paid + $1),
                  status = CASE
                    WHEN total <= (amount_paid + $1) THEN 'paid'
                    WHEN (amount_paid + $1) > 0 THEN 'partial'
                    ELSE status
                  END
            WHERE id = $2::uuid`,
          [dto.amount, dto.invoiceId],
        );
      }
      if (dto.billId) {
        await tx.exec(
          `UPDATE fin_bills
              SET amount_paid = amount_paid + $1,
                  amount_due = total - (amount_paid + $1),
                  status = CASE
                    WHEN total <= (amount_paid + $1) THEN 'paid'
                    WHEN (amount_paid + $1) > 0 THEN 'partial'
                    ELSE status
                  END
            WHERE id = $2::uuid`,
          [dto.amount, dto.billId],
        );
      }
      // Update bank balance
      if (dto.bankAccountId) {
        const sign = dto.direction === 'inbound' ? 1 : -1;
        await tx.exec(
          `UPDATE fin_bank_accounts SET current_balance = current_balance + ($1 * $2) WHERE id = $3::uuid`,
          [sign, dto.amount, dto.bankAccountId],
        );
      }

      const out = await tx.query<Record<string, unknown>>(
        `SELECT p.*, ba.bank_name AS bank_account_name,
                i.invoice_number AS invoice_number, b.bill_number AS bill_number
           FROM fin_payments p
           LEFT JOIN fin_bank_accounts ba ON ba.id = p.bank_account_id
           LEFT JOIN fin_invoices i ON i.id = p.invoice_id
           LEFT JOIN fin_bills b ON b.id = p.bill_id
          WHERE p.id = $1::uuid`,
        [id],
      );
      return camelize(out[0]) as unknown as FinPayment;
    });
  }

  async updatePayment(id: string, dto: UpdateFinPaymentDto): Promise<FinPayment> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown, cast?: string) => {
      vals.push(val);
      sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
    };
    if (dto.paymentNumber !== undefined) push('payment_number', dto.paymentNumber);
    if (dto.paymentDate !== undefined) push('payment_date', dto.paymentDate, 'date');
    if (dto.direction !== undefined) push('direction', dto.direction);
    if (dto.method !== undefined) push('method', dto.method);
    if (dto.bankAccountId !== undefined) push('bank_account_id', dto.bankAccountId, 'uuid');
    if (dto.invoiceId !== undefined) push('invoice_id', dto.invoiceId, 'uuid');
    if (dto.billId !== undefined) push('bill_id', dto.billId, 'uuid');
    if (dto.partyName !== undefined) push('party_name', dto.partyName);
    if (dto.currencyCode !== undefined) push('currency_code', dto.currencyCode);
    if (dto.fxRate !== undefined) push('fx_rate', dto.fxRate);
    if (dto.amount !== undefined) push('amount', dto.amount);
    if (dto.referenceNumber !== undefined) push('reference_number', dto.referenceNumber);
    if (dto.notes !== undefined) push('notes', dto.notes);
    if (sets.length === 0) return this.findPayment(id);
    vals.push(id);
    const affected = await this.exec(
      `UPDATE fin_payments SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    if (affected === 0) throw new NotFoundException(`Payment ${id} not found`);
    return this.findPayment(id);
  }

  async removePayment(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM fin_payments WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Payment ${id} not found`);
  }

  // ============= Summary / KPIs =============

  async getSummary(): Promise<FinanceSummary> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT
         COALESCE((SELECT SUM(amount_due) FROM fin_invoices WHERE status NOT IN ('paid', 'cancelled')), 0) AS receivable,
         COALESCE((SELECT SUM(amount_due) FROM fin_bills WHERE status NOT IN ('paid', 'cancelled')), 0) AS payable,
         COALESCE((SELECT SUM(current_balance) FROM fin_bank_accounts WHERE currency_code = 'BDT' AND is_active), 0) AS bank_bdt,
         COALESCE((SELECT SUM(current_balance) FROM fin_bank_accounts WHERE currency_code = 'USD' AND is_active), 0) AS bank_usd,
         (SELECT COUNT(*) FROM fin_invoices WHERE status NOT IN ('paid', 'cancelled')) AS inv_outstanding,
         (SELECT COUNT(*) FROM fin_bills WHERE status NOT IN ('paid', 'cancelled')) AS bills_outstanding,
         (SELECT COUNT(*) FROM fin_invoices WHERE status NOT IN ('paid', 'cancelled') AND due_date IS NOT NULL AND due_date < CURRENT_DATE) AS inv_overdue,
         (SELECT COUNT(*) FROM fin_bills WHERE status NOT IN ('paid', 'cancelled') AND due_date IS NOT NULL AND due_date < CURRENT_DATE) AS bills_overdue`,
    );
    const r = rows[0];
    return {
      totalReceivable: Number(r['receivable']),
      totalPayable: Number(r['payable']),
      bankBalanceBdt: Number(r['bank_bdt']),
      bankBalanceUsd: Number(r['bank_usd']),
      invoicesOutstanding: Number(r['inv_outstanding']),
      billsOutstanding: Number(r['bills_outstanding']),
      overdueInvoices: Number(r['inv_overdue']),
      overdueBills: Number(r['bills_overdue']),
    };
  }
}

function computeInvoiceTotals(
  lines: { quantity: number; unitPrice: number; taxCodeId?: string | null }[],
  taxRates: Map<string, number>,
): { subtotal: number; taxTotal: number; total: number } {
  let subtotal = 0;
  let taxTotal = 0;
  for (const l of lines) {
    const lineTotal = Number(l.quantity) * Number(l.unitPrice);
    subtotal += lineTotal;
    const rate = l.taxCodeId ? taxRates.get(l.taxCodeId) ?? 0 : 0;
    taxTotal += (lineTotal * rate) / 100;
  }
  return {
    subtotal: round2(subtotal),
    taxTotal: round2(taxTotal),
    total: round2(subtotal + taxTotal),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

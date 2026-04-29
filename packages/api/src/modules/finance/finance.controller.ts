import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateFinAccountDto, UpdateFinAccountDto } from './dto/account.dto';
import { CreateFinTaxCodeDto, UpdateFinTaxCodeDto } from './dto/tax-code.dto';
import { CreateFinFxRateDto } from './dto/fx-rate.dto';
import { CreateFinBankAccountDto, UpdateFinBankAccountDto } from './dto/bank-account.dto';
import { CreateFinInvoiceDto, UpdateFinInvoiceDto } from './dto/invoice.dto';
import { CreateFinBillDto, UpdateFinBillDto } from './dto/bill.dto';
import { CreateFinPaymentDto, UpdateFinPaymentDto } from './dto/payment.dto';

@Controller('finance')
export class FinanceController {
  constructor(private readonly svc: FinanceService) {}

  @Get('summary')
  summary() {
    return this.svc.getSummary();
  }

  // Accounts
  @Get('accounts') listAccounts() { return this.svc.listAccounts(); }
  @Post('accounts') createAccount(@Body() dto: CreateFinAccountDto) { return this.svc.createAccount(dto); }
  @Get('accounts/:id') findAccount(@Param('id', ParseUUIDPipe) id: string) { return this.svc.findAccount(id); }
  @Patch('accounts/:id') updateAccount(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFinAccountDto) { return this.svc.updateAccount(id, dto); }
  @Delete('accounts/:id') @HttpCode(HttpStatus.NO_CONTENT) removeAccount(@Param('id', ParseUUIDPipe) id: string) { return this.svc.removeAccount(id); }

  // Tax codes
  @Get('tax-codes') listTaxCodes() { return this.svc.listTaxCodes(); }
  @Post('tax-codes') createTaxCode(@Body() dto: CreateFinTaxCodeDto) { return this.svc.createTaxCode(dto); }
  @Get('tax-codes/:id') findTaxCode(@Param('id', ParseUUIDPipe) id: string) { return this.svc.findTaxCode(id); }
  @Patch('tax-codes/:id') updateTaxCode(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFinTaxCodeDto) { return this.svc.updateTaxCode(id, dto); }
  @Delete('tax-codes/:id') @HttpCode(HttpStatus.NO_CONTENT) removeTaxCode(@Param('id', ParseUUIDPipe) id: string) { return this.svc.removeTaxCode(id); }

  // FX rates
  @Get('fx-rates') listFxRates() { return this.svc.listFxRates(); }
  @Post('fx-rates') createFxRate(@Body() dto: CreateFinFxRateDto) { return this.svc.createFxRate(dto); }
  @Delete('fx-rates/:id') @HttpCode(HttpStatus.NO_CONTENT) removeFxRate(@Param('id', ParseUUIDPipe) id: string) { return this.svc.removeFxRate(id); }

  // Bank accounts
  @Get('bank-accounts') listBankAccounts() { return this.svc.listBankAccounts(); }
  @Post('bank-accounts') createBankAccount(@Body() dto: CreateFinBankAccountDto) { return this.svc.createBankAccount(dto); }
  @Get('bank-accounts/:id') findBankAccount(@Param('id', ParseUUIDPipe) id: string) { return this.svc.findBankAccount(id); }
  @Patch('bank-accounts/:id') updateBankAccount(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFinBankAccountDto) { return this.svc.updateBankAccount(id, dto); }
  @Delete('bank-accounts/:id') @HttpCode(HttpStatus.NO_CONTENT) removeBankAccount(@Param('id', ParseUUIDPipe) id: string) { return this.svc.removeBankAccount(id); }

  // Invoices (AR)
  @Get('invoices') listInvoices() { return this.svc.listInvoices(); }
  @Post('invoices') createInvoice(@Body() dto: CreateFinInvoiceDto) { return this.svc.createInvoice(dto); }
  @Get('invoices/:id') findInvoice(@Param('id', ParseUUIDPipe) id: string) { return this.svc.findInvoice(id); }
  @Patch('invoices/:id') updateInvoice(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFinInvoiceDto) { return this.svc.updateInvoice(id, dto); }
  @Delete('invoices/:id') @HttpCode(HttpStatus.NO_CONTENT) removeInvoice(@Param('id', ParseUUIDPipe) id: string) { return this.svc.removeInvoice(id); }

  // Bills (AP)
  @Get('bills') listBills() { return this.svc.listBills(); }
  @Post('bills') createBill(@Body() dto: CreateFinBillDto) { return this.svc.createBill(dto); }
  @Get('bills/:id') findBill(@Param('id', ParseUUIDPipe) id: string) { return this.svc.findBill(id); }
  @Patch('bills/:id') updateBill(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFinBillDto) { return this.svc.updateBill(id, dto); }
  @Delete('bills/:id') @HttpCode(HttpStatus.NO_CONTENT) removeBill(@Param('id', ParseUUIDPipe) id: string) { return this.svc.removeBill(id); }

  // Payments
  @Get('payments') listPayments() { return this.svc.listPayments(); }
  @Post('payments') createPayment(@Body() dto: CreateFinPaymentDto) { return this.svc.createPayment(dto); }
  @Get('payments/:id') findPayment(@Param('id', ParseUUIDPipe) id: string) { return this.svc.findPayment(id); }
  @Patch('payments/:id') updatePayment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFinPaymentDto) { return this.svc.updatePayment(id, dto); }
  @Delete('payments/:id') @HttpCode(HttpStatus.NO_CONTENT) removePayment(@Param('id', ParseUUIDPipe) id: string) { return this.svc.removePayment(id); }
}

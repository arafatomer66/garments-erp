import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { FinanceDashboardTabComponent } from './dashboard.tab';
import { FinanceInvoicesTabComponent } from './invoices.tab';
import { FinanceBillsTabComponent } from './bills.tab';
import { FinancePaymentsTabComponent } from './payments.tab';
import { FinanceBanksTabComponent } from './banks.tab';
import { FinanceTaxCodesTabComponent } from './tax-codes.tab';
import { PageIntroComponent } from '../../shared/page-intro.component';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [
    TabsModule,
    CardModule,
    FinanceDashboardTabComponent,
    FinanceInvoicesTabComponent,
    FinanceBillsTabComponent,
    FinancePaymentsTabComponent,
    FinanceBanksTabComponent,
    FinanceTaxCodesTabComponent,
    PageIntroComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-intro
        title="Finance &amp; VAT"
        icon="pi-dollar"
        description="Multi-currency AR/AP, bank reconciliation, NBR VAT/AIT, and live costing-vs-actual margin. Built around BD bank flows and tax rules."
        [bullets]="[
          'Export AR in USD, local AP in BDT (FX rate per document)',
          'VAT 15% local, zero-rated export',
          'AIT 0.50% on export proceeds, source tax 5–10% on supplier payments',
          'Banks: SCB / HSBC / BRAC / City — ERQ + back-to-back LC accounts'
        ]"
        example="Invoice INV-2026-0001 USD 101,700 at FX 110 = BDT 1.12 cr. Bank realises later at FX 112 → FX gain BDT 2.03 lakh booked."
      ></app-page-intro>
      <p-card>
        <p-tabs value="dashboard">
          <p-tablist>
            <p-tab value="dashboard">Dashboard</p-tab>
            <p-tab value="invoices">Invoices (AR)</p-tab>
            <p-tab value="bills">Bills (AP)</p-tab>
            <p-tab value="payments">Payments</p-tab>
            <p-tab value="banks">Bank Accounts</p-tab>
            <p-tab value="tax">Tax Codes</p-tab>
          </p-tablist>
          <p-tabpanels>
            <p-tabpanel value="dashboard"><app-finance-dashboard-tab /></p-tabpanel>
            <p-tabpanel value="invoices"><app-finance-invoices-tab /></p-tabpanel>
            <p-tabpanel value="bills"><app-finance-bills-tab /></p-tabpanel>
            <p-tabpanel value="payments"><app-finance-payments-tab /></p-tabpanel>
            <p-tabpanel value="banks"><app-finance-banks-tab /></p-tabpanel>
            <p-tabpanel value="tax"><app-finance-tax-codes-tab /></p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </p-card>
    </div>
  `,
})
export class FinanceComponent {}

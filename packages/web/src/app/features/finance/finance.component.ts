import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { FinanceDashboardTabComponent } from './dashboard.tab';
import { FinanceInvoicesTabComponent } from './invoices.tab';
import { FinanceBillsTabComponent } from './bills.tab';
import { FinancePaymentsTabComponent } from './payments.tab';
import { FinanceBanksTabComponent } from './banks.tab';
import { FinanceTaxCodesTabComponent } from './tax-codes.tab';

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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">Finance &amp; VAT</h1>
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

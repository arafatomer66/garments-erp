import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { BuyersTabComponent } from './buyers.tab';
import { SuppliersTabComponent } from './suppliers.tab';
import { ItemsTabComponent } from './items.tab';
import { PageIntroComponent } from '../../shared/page-intro.component';

@Component({
  selector: 'app-masters',
  standalone: true,
  imports: [TabsModule, CardModule, BuyersTabComponent, SuppliersTabComponent, ItemsTabComponent, PageIntroComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-intro
        title="Masters"
        icon="pi-database"
        description="Single source of truth for buyers, suppliers, and items. Set them up here once — every order, BOM, PO, and invoice points back to these records."
        [bullets]="[
          'Buyers — H&amp;M, Zara, Walmart with payment terms and currencies',
          'Suppliers — BTMA-listed mills, YKK Bangladesh, polybag vendors',
          'Items — fabrics, trims, accessories with HS codes for export',
          'Currencies — USD / BDT / CNY with FX rates'
        ]"
        example="When H&amp;M's billing address changes, update it once here and all 200 historical invoices automatically reflect it."
      ></app-page-intro>
      <p-card>
        <p-tabs value="buyers">
          <p-tablist>
            <p-tab value="buyers">Buyers</p-tab>
            <p-tab value="suppliers">Suppliers</p-tab>
            <p-tab value="items">Items</p-tab>
          </p-tablist>
          <p-tabpanels>
            <p-tabpanel value="buyers">
              <app-buyers-tab />
            </p-tabpanel>
            <p-tabpanel value="suppliers">
              <app-suppliers-tab />
            </p-tabpanel>
            <p-tabpanel value="items">
              <app-items-tab />
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </p-card>
    </div>
  `,
})
export class MastersComponent {}

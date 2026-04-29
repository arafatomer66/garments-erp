import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { BuyersTabComponent } from './buyers.tab';
import { SuppliersTabComponent } from './suppliers.tab';
import { ItemsTabComponent } from './items.tab';

@Component({
  selector: 'app-masters',
  standalone: true,
  imports: [TabsModule, CardModule, BuyersTabComponent, SuppliersTabComponent, ItemsTabComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">Masters</h1>
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

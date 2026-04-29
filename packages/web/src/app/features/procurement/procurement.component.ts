import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { PrTabComponent } from './pr.tab';
import { PoTabComponent } from './po.tab';
import { GrnTabComponent } from './grn.tab';
import { LcTabComponent } from './lc.tab';

@Component({
  selector: 'app-procurement',
  standalone: true,
  imports: [
    TabsModule,
    CardModule,
    PrTabComponent,
    PoTabComponent,
    GrnTabComponent,
    LcTabComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">Procurement</h1>
      <p-card>
        <p-tabs value="pr">
          <p-tablist>
            <p-tab value="pr">Purchase Requisitions</p-tab>
            <p-tab value="po">Purchase Orders</p-tab>
            <p-tab value="grn">Goods Receipt</p-tab>
            <p-tab value="lc">Letters of Credit</p-tab>
          </p-tablist>
          <p-tabpanels>
            <p-tabpanel value="pr"><app-pr-tab /></p-tabpanel>
            <p-tabpanel value="po"><app-po-tab /></p-tabpanel>
            <p-tabpanel value="grn"><app-grn-tab /></p-tabpanel>
            <p-tabpanel value="lc"><app-lc-tab /></p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </p-card>
    </div>
  `,
})
export class ProcurementComponent {}

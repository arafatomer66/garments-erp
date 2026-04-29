import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { PrTabComponent } from './pr.tab';
import { PoTabComponent } from './po.tab';
import { GrnTabComponent } from './grn.tab';
import { LcTabComponent } from './lc.tab';
import { PageIntroComponent } from '../../shared/page-intro.component';

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
    PageIntroComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-intro
        title="Procurement"
        icon="pi-truck"
        description="Purchase Requisition → Purchase Order → Goods Receipt Note. Plus master LC and back-to-back LC tracking for imports."
        [bullets]="[
          'Auto-suggested qty from BOM (with wastage)',
          'Multi-supplier comparison and approval flow',
          'GRN posting against PO + 3-way match',
          'Master LC and back-to-back LC tracking'
        ]"
        example="BOM needs 4,158 kg fabric → PR-2026-001 → PO-FAB-2026-002 to a BTMA mill, 30% advance / 70% against B/L. Trims via back-to-back LC against H&amp;M's master LC."
      ></app-page-intro>
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

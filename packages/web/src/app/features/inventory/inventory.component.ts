import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { StockTabComponent } from './stock.tab';
import { WarehousesTabComponent } from './warehouses.tab';
import { FabricQcTabComponent } from './fabric-qc.tab';
import { PageIntroComponent } from '../../shared/page-intro.component';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    TabsModule,
    CardModule,
    StockTabComponent,
    WarehousesTabComponent,
    FabricQcTabComponent,
    PageIntroComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-intro
        title="Inventory"
        icon="pi-box"
        description="4-point fabric inspection, trim store, and FIFO bin-card. The 4-point system is mandatory for export buyers (H&amp;M, Zara, Walmart)."
        [bullets]="[
          'Roll-by-roll fabric inspection — GSM, width, defects',
          'Accept / reject vs buyer AQL (typically ≤ 40 points / 100 sq yd)',
          'FIFO bin-card for trims — oldest stock issued first',
          'Replacement claims raised to suppliers within 3 days'
        ]"
        example="92 rolls received → 89 pass 4-point inspection, 3 fail (45+ points, dye streaks). Replacement claim raised to mill within 3 days."
      ></app-page-intro>
      <p-card>
        <p-tabs value="stock">
          <p-tablist>
            <p-tab value="stock">Stock</p-tab>
            <p-tab value="warehouses">Warehouses</p-tab>
            <p-tab value="fabric-qc">Fabric QC</p-tab>
          </p-tablist>
          <p-tabpanels>
            <p-tabpanel value="stock"><app-stock-tab /></p-tabpanel>
            <p-tabpanel value="warehouses"><app-warehouses-tab /></p-tabpanel>
            <p-tabpanel value="fabric-qc"><app-fabric-qc-tab /></p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </p-card>
    </div>
  `,
})
export class InventoryComponent {}

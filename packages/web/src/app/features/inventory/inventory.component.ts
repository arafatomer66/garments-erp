import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { StockTabComponent } from './stock.tab';
import { WarehousesTabComponent } from './warehouses.tab';
import { FabricQcTabComponent } from './fabric-qc.tab';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    TabsModule,
    CardModule,
    StockTabComponent,
    WarehousesTabComponent,
    FabricQcTabComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">Inventory</h1>
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

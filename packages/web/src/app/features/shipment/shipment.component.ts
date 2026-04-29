import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { PackingListsTabComponent } from './packing-lists.tab';
import { ShipmentsTabComponent } from './shipments.tab';
import { ExportDocumentsTabComponent } from './export-documents.tab';

@Component({
  selector: 'app-shipment',
  standalone: true,
  imports: [
    TabsModule,
    CardModule,
    PackingListsTabComponent,
    ShipmentsTabComponent,
    ExportDocumentsTabComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">Shipment</h1>
      <p-card>
        <p-tabs value="packing">
          <p-tablist>
            <p-tab value="packing">Packing Lists</p-tab>
            <p-tab value="shipments">Shipments</p-tab>
            <p-tab value="docs">Export Documents</p-tab>
          </p-tablist>
          <p-tabpanels>
            <p-tabpanel value="packing"><app-packing-lists-tab /></p-tabpanel>
            <p-tabpanel value="shipments"><app-shipments-tab /></p-tabpanel>
            <p-tabpanel value="docs"><app-export-documents-tab /></p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </p-card>
    </div>
  `,
})
export class ShipmentComponent {}

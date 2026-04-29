import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { PackingListsTabComponent } from './packing-lists.tab';
import { ShipmentsTabComponent } from './shipments.tab';
import { ExportDocumentsTabComponent } from './export-documents.tab';
import { PageIntroComponent } from '../../shared/page-intro.component';

@Component({
  selector: 'app-shipment',
  standalone: true,
  imports: [
    TabsModule,
    CardModule,
    PackingListsTabComponent,
    ShipmentsTabComponent,
    ExportDocumentsTabComponent,
    PageIntroComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-intro
        title="Shipment"
        icon="pi-send"
        description="Packing list, export documents, and forwarder booking through to B/L. Built around BD bank and EPB workflows."
        [bullets]="[
          'Carton-by-carton packing list (assortment, GW/NW, dimensions)',
          'Commercial invoice in buyer currency',
          'EXP form for Bangladesh Bank',
          'CO / GSP Form A from EPB for EU duty-free access',
          'Forwarder booking, B/L draft → final'
        ]"
        example="600 cartons × 30 pcs = 18,000 pcs. EXP filed before goods leave Chittagong; GSP Form A saves H&amp;M 12% EU duty."
      ></app-page-intro>
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

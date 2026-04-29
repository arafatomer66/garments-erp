import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { HourlyBoardTabComponent } from './hourly-board.tab';
import { CuttingPlansTabComponent } from './cutting-plans.tab';
import { SewingLinesTabComponent } from './sewing-lines.tab';
import { BundlesTabComponent } from './bundles.tab';
import { PageIntroComponent } from '../../shared/page-intro.component';

@Component({
  selector: 'app-production',
  standalone: true,
  imports: [
    TabsModule,
    CardModule,
    HourlyBoardTabComponent,
    CuttingPlansTabComponent,
    SewingLinesTabComponent,
    BundlesTabComponent,
    PageIntroComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-intro
        title="Production"
        icon="pi-cog"
        description="Cutting plan, sewing line setup, hourly board, and bundle/QR tracking. The hourly board is the live nerve-centre of the floor."
        [bullets]="[
          'Cutting plan — markers, plies, expected pieces per lay',
          'Bundle QR codes — style / colour / size / operation',
          'Sewing line setup with operator-grade assignment',
          'Hourly target vs actual + line efficiency %'
        ]"
        example="18,000 pcs cut over 6 days, bundled in 30s. Line A: 285/300 (95%), Line B: 243/275 (88%) → supervisor rebalances mid-shift."
      ></app-page-intro>
      <p-card>
        <p-tabs value="board">
          <p-tablist>
            <p-tab value="board">Hourly Board</p-tab>
            <p-tab value="plans">Cutting Plans</p-tab>
            <p-tab value="lines">Sewing Lines</p-tab>
            <p-tab value="bundles">Bundles</p-tab>
          </p-tablist>
          <p-tabpanels>
            <p-tabpanel value="board"><app-hourly-board-tab /></p-tabpanel>
            <p-tabpanel value="plans"><app-cutting-plans-tab /></p-tabpanel>
            <p-tabpanel value="lines"><app-sewing-lines-tab /></p-tabpanel>
            <p-tabpanel value="bundles"><app-bundles-tab /></p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </p-card>
    </div>
  `,
})
export class ProductionComponent {}

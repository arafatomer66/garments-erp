import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { HourlyBoardTabComponent } from './hourly-board.tab';
import { CuttingPlansTabComponent } from './cutting-plans.tab';
import { SewingLinesTabComponent } from './sewing-lines.tab';
import { BundlesTabComponent } from './bundles.tab';

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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">Production</h1>
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

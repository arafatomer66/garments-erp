import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { DhuBoardTabComponent } from './dhu-board.tab';
import { EndLineQcTabComponent } from './end-line-qc.tab';
import { InlineQcTabComponent } from './inline-qc.tab';
import { AqlTabComponent } from './aql.tab';
import { DefectCodesTabComponent } from './defect-codes.tab';

@Component({
  selector: 'app-quality',
  standalone: true,
  imports: [
    TabsModule,
    CardModule,
    DhuBoardTabComponent,
    EndLineQcTabComponent,
    InlineQcTabComponent,
    AqlTabComponent,
    DefectCodesTabComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">Quality</h1>
      <p-card>
        <p-tabs value="dhu">
          <p-tablist>
            <p-tab value="dhu">DHU Dashboard</p-tab>
            <p-tab value="endline">End-line QC</p-tab>
            <p-tab value="inline">Inline QC</p-tab>
            <p-tab value="aql">AQL</p-tab>
            <p-tab value="codes">Defect Codes</p-tab>
          </p-tablist>
          <p-tabpanels>
            <p-tabpanel value="dhu"><app-dhu-board-tab /></p-tabpanel>
            <p-tabpanel value="endline"><app-end-line-qc-tab /></p-tabpanel>
            <p-tabpanel value="inline"><app-inline-qc-tab /></p-tabpanel>
            <p-tabpanel value="aql"><app-aql-tab /></p-tabpanel>
            <p-tabpanel value="codes"><app-defect-codes-tab /></p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </p-card>
    </div>
  `,
})
export class QualityComponent {}

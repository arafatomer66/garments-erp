import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { DhuBoardTabComponent } from './dhu-board.tab';
import { EndLineQcTabComponent } from './end-line-qc.tab';
import { InlineQcTabComponent } from './inline-qc.tab';
import { AqlTabComponent } from './aql.tab';
import { DefectCodesTabComponent } from './defect-codes.tab';
import { PageIntroComponent } from '../../shared/page-intro.component';

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
    PageIntroComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-intro
        title="Quality"
        icon="pi-check-circle"
        description="Inline QC, end-line QC, AQL final inspection, and a live DHU (Defects per Hundred Units) dashboard."
        [bullets]="[
          'Defect-code master list — broken stitch, skip, mis-label, oil mark',
          'Inline QC by SMV operation, sampling per hour',
          'End-line 100% inspection (Grade A / B / C)',
          'AQL 2.5 sampling for buyer / 3rd-party final inspection',
          'Live DHU board with > 8 alert per line'
        ]"
        example="AQL final on 200 pcs sample from 18,000 → major defects ≤ 5 → pass. Last hour: Line A DHU 4.2, Line B 9.1 → alert raised on Line B."
      ></app-page-intro>
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

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { ComplianceDashboardTabComponent } from './dashboard.tab';
import { ComplianceStandardsTabComponent } from './standards.tab';
import { ComplianceAuditsTabComponent } from './audits.tab';
import { ComplianceDocumentsTabComponent } from './documents.tab';
import { ComplianceFindingsTabComponent } from './findings.tab';
import { PageIntroComponent } from '../../shared/page-intro.component';

@Component({
  selector: 'app-compliance',
  standalone: true,
  imports: [
    TabsModule,
    CardModule,
    ComplianceDashboardTabComponent,
    ComplianceStandardsTabComponent,
    ComplianceAuditsTabComponent,
    ComplianceDocumentsTabComponent,
    ComplianceFindingsTabComponent,
    PageIntroComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-intro
        title="Compliance"
        icon="pi-shield"
        description="Document vault and audit calendar for Accord/RSC, Sedex SMETA, BSCI, WRAP, ISO 9001, OEKO-TEX. Auto-alerts before expiry."
        [bullets]="[
          'Per-buyer COC (Code of Conduct) signed copies',
          'Audit reports + CAPA (Corrective Action Plan) tracking',
          'Auto-alerts at 30 / 15 / 7 days before expiry',
          'Higg FEM / ZDHC chemical inventory (Phase 3)'
        ]"
        example="Sedex SMETA expires 15 Aug 2026 → reminder fires 16 Jul. CAPA item 'fire-door installation by 30 Sep' → owner notified 14 days prior."
      ></app-page-intro>
      <p-card>
        <p-tabs value="dashboard">
          <p-tablist>
            <p-tab value="dashboard">Dashboard</p-tab>
            <p-tab value="audits">Audits</p-tab>
            <p-tab value="documents">Document Vault</p-tab>
            <p-tab value="findings">Findings (CAPA)</p-tab>
            <p-tab value="standards">Standards</p-tab>
          </p-tablist>
          <p-tabpanels>
            <p-tabpanel value="dashboard"><app-compliance-dashboard-tab /></p-tabpanel>
            <p-tabpanel value="audits"><app-compliance-audits-tab /></p-tabpanel>
            <p-tabpanel value="documents"><app-compliance-documents-tab /></p-tabpanel>
            <p-tabpanel value="findings"><app-compliance-findings-tab /></p-tabpanel>
            <p-tabpanel value="standards"><app-compliance-standards-tab /></p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </p-card>
    </div>
  `,
})
export class ComplianceComponent {}

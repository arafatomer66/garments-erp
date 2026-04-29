import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { ComplianceDashboardTabComponent } from './dashboard.tab';
import { ComplianceStandardsTabComponent } from './standards.tab';
import { ComplianceAuditsTabComponent } from './audits.tab';
import { ComplianceDocumentsTabComponent } from './documents.tab';
import { ComplianceFindingsTabComponent } from './findings.tab';

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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">Compliance</h1>
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

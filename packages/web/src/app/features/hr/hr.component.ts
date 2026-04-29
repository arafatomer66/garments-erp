import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { HrEmployeesTabComponent } from './employees.tab';
import { HrAttendanceTabComponent } from './attendance.tab';
import { HrLeaveTabComponent } from './leave.tab';
import { HrPayrollTabComponent } from './payroll.tab';
import { HrDepartmentsTabComponent } from './departments.tab';
import { PageIntroComponent } from '../../shared/page-intro.component';

@Component({
  selector: 'app-hr',
  standalone: true,
  imports: [
    TabsModule,
    CardModule,
    HrEmployeesTabComponent,
    HrAttendanceTabComponent,
    HrLeaveTabComponent,
    HrPayrollTabComponent,
    HrDepartmentsTabComponent,
    PageIntroComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-intro
        title="HR &amp; Payroll"
        icon="pi-users"
        description="Employees, biometric attendance, leaves, and hybrid skill-grade + piece-rate payroll with BD Labour Act compliance baked in."
        [bullets]="[
          'Skill grades 1–7 (BD Wages Board) base + piece-rate bonus',
          'Overtime 2× per Bangladesh Labour Act, capped 2 hr/day',
          'Friday weekoff, Eid leave, festival bonus = 1 month basic',
          'bKash / Nagad / bank payout',
          'Biometric (ZKTeco) CSV import → attendance compute'
        ]"
        example="April PAY-2026-04: 850 employees, gross BDT 84 lakh + OT BDT 6 lakh + Eid bonus BDT 70 lakh. 60% to bKash, 40% to bank."
      ></app-page-intro>
      <p-card>
        <p-tabs value="employees">
          <p-tablist>
            <p-tab value="employees">Employees</p-tab>
            <p-tab value="attendance">Attendance</p-tab>
            <p-tab value="leave">Leave</p-tab>
            <p-tab value="payroll">Payroll</p-tab>
            <p-tab value="departments">Departments</p-tab>
          </p-tablist>
          <p-tabpanels>
            <p-tabpanel value="employees"><app-hr-employees-tab /></p-tabpanel>
            <p-tabpanel value="attendance"><app-hr-attendance-tab /></p-tabpanel>
            <p-tabpanel value="leave"><app-hr-leave-tab /></p-tabpanel>
            <p-tabpanel value="payroll"><app-hr-payroll-tab /></p-tabpanel>
            <p-tabpanel value="departments"><app-hr-departments-tab /></p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </p-card>
    </div>
  `,
})
export class HrComponent {}

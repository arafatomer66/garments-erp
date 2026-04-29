import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { HrEmployeesTabComponent } from './employees.tab';
import { HrAttendanceTabComponent } from './attendance.tab';
import { HrLeaveTabComponent } from './leave.tab';
import { HrPayrollTabComponent } from './payroll.tab';
import { HrDepartmentsTabComponent } from './departments.tab';

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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">HR &amp; Payroll</h1>
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

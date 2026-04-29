import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardModule } from 'primeng/card';
import { PageIntroComponent } from '../../shared/page-intro.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CardModule, PageIntroComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-intro
        title="Dashboard"
        icon="pi-home"
        description="One-glance factory pulse: open orders, work-in-progress, on-time shipment %, and the latest defect rate."
        [bullets]="[
          'Active orders — total open POs with FOB value',
          'WIP — units inside cutting / sewing / finishing',
          'On-time shipment % — rolling 90 days',
          'Defect rate (DHU) — latest reading per line'
        ]"
        example="First thing in the morning over chai, the MD opens this page — if any line is below 85% efficiency or any order is at risk, it shows here before he even sits down."
      ></app-page-intro>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <p-card header="Active Orders" subheader="Phase 1">
          <div class="text-3xl font-semibold text-slate-900">—</div>
        </p-card>
        <p-card header="WIP" subheader="Phase 1">
          <div class="text-3xl font-semibold text-slate-900">—</div>
        </p-card>
        <p-card header="On-Time %" subheader="Phase 1">
          <div class="text-3xl font-semibold text-slate-900">—</div>
        </p-card>
        <p-card header="Defect Rate" subheader="Phase 1">
          <div class="text-3xl font-semibold text-slate-900">—</div>
        </p-card>
      </div>
    </div>
  `,
})
export class DashboardComponent {}

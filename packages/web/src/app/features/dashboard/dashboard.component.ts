import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p class="text-slate-600">Welcome to your Garments ERP. Phase 0 scaffold is live.</p>
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

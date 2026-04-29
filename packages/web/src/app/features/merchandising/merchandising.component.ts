import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { StylesTabComponent } from './styles.tab';
import { TaCalendarTabComponent } from './ta-calendar.tab';

@Component({
  selector: 'app-merchandising',
  standalone: true,
  imports: [TabsModule, CardModule, StylesTabComponent, TaCalendarTabComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">Merchandising</h1>
      <p-card>
        <p-tabs value="styles">
          <p-tablist>
            <p-tab value="styles">Styles</p-tab>
            <p-tab value="ta">T&amp;A Calendar</p-tab>
          </p-tablist>
          <p-tabpanels>
            <p-tabpanel value="styles">
              <app-styles-tab />
            </p-tabpanel>
            <p-tabpanel value="ta">
              <app-ta-calendar-tab />
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </p-card>
    </div>
  `,
})
export class MerchandisingComponent {}

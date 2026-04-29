import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { StylesTabComponent } from './styles.tab';
import { TaCalendarTabComponent } from './ta-calendar.tab';
import { PageIntroComponent } from '../../shared/page-intro.component';

@Component({
  selector: 'app-merchandising',
  standalone: true,
  imports: [TabsModule, CardModule, StylesTabComponent, TaCalendarTabComponent, PageIntroComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-intro
        title="Merchandising"
        icon="pi-palette"
        description="Manage styles, tech-packs, samples, and the all-important T&amp;A (Time &amp; Action) calendar — the heart of any BD factory's planning."
        [bullets]="[
          'Styles + tech-pack PDF / lab-dip uploads',
          'Sample lifecycle: PP → size-set → photo → approved',
          'T&amp;A milestones with auto-alerts (3 days before deadline)',
          'Buyer comments thread per sample stage'
        ]"
        example="Style TS-CREW-180GSM: PP sample sent D+10, fabric in-house D+25, ex-factory D+60. Miss any milestone and the calendar warns 3 days in advance — saves USD 16k of air-freight."
      ></app-page-intro>
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

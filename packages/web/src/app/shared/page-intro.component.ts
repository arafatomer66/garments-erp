import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-intro',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="mb-4 rounded-lg border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5 shadow-sm"
    >
      <div class="flex items-start gap-3">
        <i
          class="pi {{ icon }} mt-1 flex h-9 w-9 items-center justify-center rounded-md bg-brand-600 text-white"
        ></i>
        <div class="flex-1">
          <h1 class="text-xl font-semibold text-slate-900">{{ title }}</h1>
          <p class="mt-1 text-sm leading-relaxed text-slate-700">{{ description }}</p>
          <ul *ngIf="bullets.length" class="mt-3 grid gap-1.5 text-sm text-slate-700 md:grid-cols-2">
            <li *ngFor="let b of bullets" class="flex items-start gap-2">
              <i class="pi pi-check-circle mt-0.5 text-brand-600"></i>
              <span>{{ b }}</span>
            </li>
          </ul>
          <p *ngIf="example" class="mt-3 rounded border border-brand-200 bg-white/70 p-3 text-sm text-slate-700">
            <span class="font-medium text-brand-700">Example:</span> {{ example }}
          </p>
        </div>
      </div>
    </section>
  `,
})
export class PageIntroComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) description!: string;
  @Input() icon = 'pi-info-circle';
  @Input() bullets: string[] = [];
  @Input() example?: string;
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [CardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card>
      <h2 class="mb-2 text-xl font-semibold">{{ title() }}</h2>
      <p class="text-slate-600">
        This module is part of Phase 1. The route is wired up; the feature lands when implementation begins.
      </p>
    </p-card>
  `,
})
export class PlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  readonly title = toSignal(this.route.data.pipe(map((d) => (d['title'] as string) ?? 'Module')), {
    initialValue: 'Module',
  });
}

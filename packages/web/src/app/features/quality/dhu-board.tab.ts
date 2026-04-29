import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DatePickerModule } from 'primeng/datepicker';
import type { DhuLineSummary } from '@org/shared-types';
import { QualityService } from './quality.service';

@Component({
  selector: 'app-dhu-board-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    CardModule, ButtonModule, TagModule, DatePickerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <div class="flex items-end justify-between gap-3">
        <div class="flex items-end gap-3">
          <div>
            <label class="text-xs font-medium text-slate-700 mb-1 block">Date</label>
            <p-datepicker [(ngModel)]="boardDate" appendTo="body" dateFormat="yy-mm-dd"
              [inputStyle]="{ width: '12rem' }" (onSelect)="refresh()" />
          </div>
          <p-button icon="pi pi-refresh" label="Refresh" severity="secondary"
            size="small" (onClick)="refresh()" />
          <div class="text-xs text-slate-500" *ngIf="lastRefresh()">
            Last refreshed: {{ lastRefresh() | date:'mediumTime' }}
            <span *ngIf="autoRefresh()" class="ml-2 text-emerald-600">● auto-refresh on</span>
          </div>
        </div>
        <p-button [label]="autoRefresh() ? 'Stop Auto' : 'Auto-refresh 30s'"
          [icon]="autoRefresh() ? 'pi pi-pause' : 'pi pi-play'"
          [severity]="autoRefresh() ? 'warn' : 'secondary'" size="small"
          (onClick)="toggleAutoRefresh()" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="bg-white border border-slate-200 rounded p-4">
          <div class="text-xs uppercase text-slate-500 tracking-wide">Total Inspected</div>
          <div class="text-3xl font-bold text-slate-900">{{ totals().inspected | number }}</div>
        </div>
        <div class="bg-white border border-slate-200 rounded p-4">
          <div class="text-xs uppercase text-slate-500 tracking-wide">Total Defects</div>
          <div class="text-3xl font-bold text-rose-700">{{ totals().defects | number }}</div>
        </div>
        <div class="bg-white border border-slate-200 rounded p-4">
          <div class="text-xs uppercase text-slate-500 tracking-wide">Overall DHU</div>
          <div class="text-3xl font-bold" [class]="dhuClass(totals().dhu)">
            {{ totals().dhu | number:'1.1-2' }}
          </div>
        </div>
      </div>

      <div *ngIf="loading()" class="text-center text-slate-500 py-8">Loading…</div>
      <div *ngIf="!loading() && board().length === 0" class="text-center text-slate-500 py-8">
        No end-line QC records for the selected date.
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <p-card *ngFor="let line of board()">
          <ng-template pTemplate="header">
            <div class="px-4 pt-3 flex items-center justify-between">
              <div>
                <div class="text-xs uppercase text-slate-500 tracking-wide">{{ line.lineCode }}</div>
                <div class="text-base font-semibold text-slate-900">{{ line.lineName }}</div>
              </div>
              <div class="text-right">
                <div class="text-xs text-slate-500">DHU</div>
                <div class="text-2xl font-bold" [class]="dhuClass(line.dhu)">
                  {{ line.dhu | number:'1.1-2' }}
                </div>
              </div>
            </div>
          </ng-template>
          <div class="grid grid-cols-2 gap-2 mb-2 text-center">
            <div class="bg-slate-50 rounded p-2">
              <div class="text-xs text-slate-500">Inspected</div>
              <div class="text-lg font-semibold">{{ line.inspectedQuantity | number }}</div>
            </div>
            <div class="bg-rose-50 rounded p-2">
              <div class="text-xs text-rose-700">Defects</div>
              <div class="text-lg font-semibold text-rose-700">{{ line.defectQuantity | number }}</div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2 text-center">
            <div class="bg-amber-50 rounded p-2">
              <div class="text-xs text-amber-700">Rework</div>
              <div class="text-lg font-semibold text-amber-700">{{ line.reworkQuantity | number }}</div>
            </div>
            <div class="bg-rose-100 rounded p-2">
              <div class="text-xs text-rose-800">Reject</div>
              <div class="text-lg font-semibold text-rose-800">{{ line.rejectQuantity | number }}</div>
            </div>
          </div>
          <div class="mt-3 text-xs text-slate-500">
            Defect rate: {{ line.defectRatePct | number:'1.1-2' }}%
          </div>
        </p-card>
      </div>
    </div>
  `,
})
export class DhuBoardTabComponent implements OnInit, OnDestroy {
  private readonly api = inject(QualityService);

  readonly board = signal<DhuLineSummary[]>([]);
  readonly loading = signal(false);
  readonly autoRefresh = signal(false);
  readonly lastRefresh = signal<Date | null>(null);

  boardDate: Date = new Date();
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly totals = computed(() => {
    const rows = this.board();
    const inspected = rows.reduce((s, r) => s + Number(r.inspectedQuantity || 0), 0);
    const defects = rows.reduce((s, r) => s + Number(r.defectQuantity || 0), 0);
    const dhu = inspected > 0 ? (defects / inspected) * 100 : 0;
    return { inspected, defects, dhu };
  });

  ngOnInit(): void {
    this.refresh();
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  refresh(): void {
    this.loading.set(true);
    const date = this.boardDate ? this.toIso(this.boardDate) : undefined;
    this.api.dhuBoard(date).subscribe({
      next: (b) => {
        this.board.set(b);
        this.loading.set(false);
        this.lastRefresh.set(new Date());
      },
      error: () => this.loading.set(false),
    });
  }

  toggleAutoRefresh(): void {
    if (this.autoRefresh()) {
      this.autoRefresh.set(false);
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      return;
    }
    this.autoRefresh.set(true);
    this.timer = setInterval(() => this.refresh(), 30000);
  }

  dhuClass(pct: number): string {
    if (pct <= 3) return 'text-emerald-700';
    if (pct <= 7) return 'text-amber-600';
    if (pct > 0) return 'text-rose-700';
    return 'text-slate-500';
  }

  private toIso(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}

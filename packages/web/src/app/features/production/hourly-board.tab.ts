import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import type {
  HourlyBoardLineSummary,
  SewingLine,
  Style,
  UpsertHourlyLogDto,
} from '@org/shared-types';
import { ProductionService } from './production.service';
import { MerchandisingService } from '../merchandising/merchandising.service';

const HOUR_SLOTS = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM .. 7 PM

@Component({
  selector: 'app-hourly-board-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    CardModule, ButtonModule, TagModule, DialogModule, InputNumberModule,
    InputTextModule, TextareaModule, SelectModule, DatePickerModule, TableModule,
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
        <div class="flex items-center gap-2">
          <p-button [label]="autoRefresh() ? 'Stop Auto' : 'Auto-refresh 30s'"
            [icon]="autoRefresh() ? 'pi pi-pause' : 'pi pi-play'"
            [severity]="autoRefresh() ? 'warn' : 'secondary'" size="small"
            (onClick)="toggleAutoRefresh()" />
          <p-button label="Log Hour" icon="pi pi-pencil" (onClick)="openLog()"
            [disabled]="board().length === 0" />
        </div>
      </div>

      <div *ngIf="loading()" class="text-center text-slate-500 py-8">Loading…</div>
      <div *ngIf="!loading() && board().length === 0" class="text-center text-slate-500 py-8">
        No active sewing lines yet. Create a line in the Sewing Lines tab first.
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <p-card *ngFor="let line of board()">
          <ng-template pTemplate="header">
            <div class="px-4 pt-3 flex items-center justify-between">
              <div>
                <div class="text-xs uppercase text-slate-500 tracking-wide">{{ line.lineCode }}</div>
                <div class="text-base font-semibold text-slate-900">{{ line.lineName }}</div>
                <div class="text-xs text-slate-500" *ngIf="line.styleCode">
                  Style: <span class="font-mono">{{ line.styleCode }}</span>
                </div>
              </div>
              <div class="text-right">
                <div class="text-xs text-slate-500">Efficiency</div>
                <div class="text-2xl font-bold" [class]="effClass(line.efficiencyPct)">
                  {{ line.efficiencyPct | number:'1.0-1' }}%
                </div>
              </div>
            </div>
          </ng-template>
          <div class="grid grid-cols-3 gap-2 mb-3 text-center">
            <div class="bg-slate-50 rounded p-2">
              <div class="text-xs text-slate-500">Target</div>
              <div class="text-lg font-semibold">{{ line.totalTarget | number }}</div>
            </div>
            <div class="bg-emerald-50 rounded p-2">
              <div class="text-xs text-emerald-700">Produced</div>
              <div class="text-lg font-semibold text-emerald-700">{{ line.totalProduced | number }}</div>
            </div>
            <div class="bg-rose-50 rounded p-2">
              <div class="text-xs text-rose-700">Rejected</div>
              <div class="text-lg font-semibold text-rose-700">{{ line.totalRejected | number }}</div>
            </div>
          </div>

          <p-table [value]="line.hours" styleClass="text-sm" stripedRows>
            <ng-template pTemplate="header">
              <tr>
                <th class="w-20">Hour</th>
                <th class="text-right">Target</th>
                <th class="text-right">Produced</th>
                <th class="text-right">Rejected</th>
                <th class="text-right">Eff %</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-hr>
              <tr>
                <td class="font-mono">{{ formatHour(hr.hourSlot) }}</td>
                <td class="text-right">{{ hr.targetPcs | number }}</td>
                <td class="text-right" [class]="hr.targetPcs > 0 && hr.producedPcs >= hr.targetPcs ? 'text-emerald-700 font-semibold' : ''">
                  {{ hr.producedPcs | number }}
                </td>
                <td class="text-right">{{ hr.rejectedPcs | number }}</td>
                <td class="text-right" [class]="effClass(hourEff(hr))">
                  {{ hourEff(hr) | number:'1.0-1' }}%
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="5" class="text-center text-slate-500 py-3">No logs for this date.</td></tr>
            </ng-template>
          </p-table>
        </p-card>
      </div>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '32rem' }" header="Log Hourly Production">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Line *</label>
            <p-select [options]="board()" formControlName="lineId" optionLabel="lineCode" optionValue="lineId"
              placeholder="Select Line" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Hour *</label>
            <p-select [options]="hourSlotOptions" formControlName="hourSlot"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Style</label>
          <p-select [options]="styles()" formControlName="styleId" optionLabel="name" optionValue="id"
            [filter]="true" filterBy="code,name" placeholder="(optional)" [showClear]="true" styleClass="w-full" />
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Target Pcs</label>
            <p-inputNumber formControlName="targetPcs" [min]="0"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Produced *</label>
            <p-inputNumber formControlName="producedPcs" [min]="0"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Rejected</label>
            <p-inputNumber formControlName="rejectedPcs" [min]="0"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Notes</label>
          <textarea pTextarea class="w-full" rows="2" formControlName="notes"></textarea>
        </div>
        <div class="text-xs text-slate-500 italic">
          Existing logs for the same line/date/hour will be overwritten.
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t">
          <p-button label="Cancel" severity="secondary" (onClick)="dialogOpen = false" />
          <p-button type="submit" label="Save" [loading]="saving()" [disabled]="form.invalid" />
        </div>
      </form>
    </p-dialog>
  `,
})
export class HourlyBoardTabComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProductionService);
  private readonly merch = inject(MerchandisingService);

  readonly board = signal<HourlyBoardLineSummary[]>([]);
  readonly styles = signal<Style[]>([]);
  readonly lines = signal<SewingLine[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly autoRefresh = signal(false);
  readonly lastRefresh = signal<Date | null>(null);

  boardDate: Date = new Date();
  dialogOpen = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly hourSlotOptions = HOUR_SLOTS.map((h) => ({ label: this.formatHour(h), value: h }));

  readonly form = this.fb.group({
    lineId: ['', Validators.required],
    styleId: [null as string | null],
    hourSlot: [HOUR_SLOTS[0], Validators.required],
    targetPcs: [0, Validators.min(0)],
    producedPcs: [0, [Validators.required, Validators.min(0)]],
    rejectedPcs: [0, Validators.min(0)],
    notes: [''],
  });

  ngOnInit(): void {
    this.refresh();
    this.merch.listStyles().subscribe((s) => this.styles.set(s));
    this.api.listLines().subscribe((l) => this.lines.set(l));
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  refresh(): void {
    this.loading.set(true);
    const date = this.boardDate ? this.toIso(this.boardDate) : undefined;
    this.api.hourlyBoard(date).subscribe({
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

  formatHour(h: number): string {
    const am = h < 12;
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${display}:00 ${am ? 'AM' : 'PM'}`;
  }

  hourEff(hr: { targetPcs: number; producedPcs: number }): number {
    if (!hr.targetPcs || hr.targetPcs <= 0) return 0;
    return (Number(hr.producedPcs) / Number(hr.targetPcs)) * 100;
  }

  effClass(pct: number): string {
    if (pct >= 90) return 'text-emerald-700';
    if (pct >= 70) return 'text-amber-600';
    if (pct > 0) return 'text-rose-700';
    return 'text-slate-500';
  }

  openLog(): void {
    if (this.board().length === 0) return;
    const firstLineId = this.board()[0].lineId;
    const currentHour = new Date().getHours();
    const slot = HOUR_SLOTS.includes(currentHour) ? currentHour : HOUR_SLOTS[0];
    this.form.reset({
      lineId: firstLineId,
      styleId: null,
      hourSlot: slot,
      targetPcs: 0,
      producedPcs: 0,
      rejectedPcs: 0,
      notes: '',
    });
    this.dialogOpen = true;
  }

  private toIso(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const dto: UpsertHourlyLogDto = {
      lineId: v.lineId!,
      styleId: v.styleId || undefined,
      logDate: this.boardDate ? this.toIso(this.boardDate) : undefined,
      hourSlot: Number(v.hourSlot),
      targetPcs: Number(v.targetPcs ?? 0),
      producedPcs: Number(v.producedPcs ?? 0),
      rejectedPcs: Number(v.rejectedPcs ?? 0),
      notes: v.notes || undefined,
    };
    this.api.upsertLog(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }
}

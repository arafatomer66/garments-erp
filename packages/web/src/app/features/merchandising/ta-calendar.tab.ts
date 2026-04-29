import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import type { CreateTaTaskDto, Style, TaTask, TaTaskStatus } from '@org/shared-types';
import { MerchandisingService } from './merchandising.service';

const STATUS_OPTIONS: { label: string; value: TaTaskStatus }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Done', value: 'done' },
  { label: 'Delayed', value: 'delayed' },
  { label: 'Skipped', value: 'skipped' },
];

const STATUS_SEVERITY: Record<TaTaskStatus, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
  pending: 'info',
  in_progress: 'warn',
  done: 'success',
  delayed: 'danger',
  skipped: 'secondary',
};

@Component({
  selector: 'app-ta-calendar-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    TagModule,
    SelectModule,
    DatePickerModule,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-semibold text-slate-900">T&amp;A Calendar</h2>
        <p-select
          [options]="styles()" [(ngModel)]="selectedStyleId" optionLabel="name" optionValue="id"
          placeholder="Select a style" styleClass="min-w-[20rem]" (onChange)="onStyleChange()" />
      </div>
      <p-button label="New Task" icon="pi pi-plus" (onClick)="openCreate()" [disabled]="!selectedStyleId" />
    </div>

    <p-table [value]="rows()" [loading]="loading()" stripedRows>
      <ng-template pTemplate="header">
        <tr>
          <th>Seq</th><th>Code</th><th>Name</th>
          <th>Planned Start</th><th>Planned End</th>
          <th>Actual Start</th><th>Actual End</th>
          <th>Owner</th><th>Status</th>
          <th class="w-32">Actions</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-row>
        <tr>
          <td>{{ row.sequence }}</td>
          <td class="font-mono text-sm">{{ row.code }}</td>
          <td>{{ row.name }}</td>
          <td>{{ row.plannedStart | date:'mediumDate' }}</td>
          <td>{{ row.plannedEnd | date:'mediumDate' }}</td>
          <td>{{ row.actualStart ? (row.actualStart | date:'mediumDate') : '—' }}</td>
          <td>{{ row.actualEnd ? (row.actualEnd | date:'mediumDate') : '—' }}</td>
          <td>{{ row.owner || '—' }}</td>
          <td><p-tag [value]="row.status" [severity]="severityFor(row.status)" /></td>
          <td>
            <p-button icon="pi pi-pencil" severity="secondary" text rounded (onClick)="openEdit(row)" />
            <p-button icon="pi pi-trash" severity="danger" text rounded (onClick)="confirmDelete(row)" />
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr><td colspan="10" class="text-center text-slate-500 py-8">
          {{ selectedStyleId ? 'No tasks yet for this style.' : 'Select a style to view tasks.' }}
        </td></tr>
      </ng-template>
    </p-table>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '40rem' }"
      [header]="editingId() ? 'Edit Task' : 'New T&A Task'">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Sequence</label>
            <p-inputNumber formControlName="sequence" [min]="0" styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Code *</label>
            <input pInputText class="w-full" formControlName="code" placeholder="TP, FAB, BULK..."/>
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Status</label>
            <p-select [options]="statuses" formControlName="status" optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Name *</label>
          <input pInputText class="w-full" formControlName="name" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Planned Start</label>
            <p-datepicker formControlName="plannedStart" appendTo="body" dateFormat="yy-mm-dd" styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Planned End *</label>
            <p-datepicker formControlName="plannedEnd" appendTo="body" dateFormat="yy-mm-dd" styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Actual Start</label>
            <p-datepicker formControlName="actualStart" appendTo="body" dateFormat="yy-mm-dd" styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Actual End</label>
            <p-datepicker formControlName="actualEnd" appendTo="body" dateFormat="yy-mm-dd" styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Owner</label>
          <input pInputText class="w-full" formControlName="owner" />
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Remarks</label>
          <textarea pTextarea class="w-full" rows="2" formControlName="remarks"></textarea>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <p-button label="Cancel" severity="secondary" (onClick)="dialogOpen = false" />
          <p-button type="submit" label="Save" [loading]="saving()" [disabled]="form.invalid" />
        </div>
      </form>
    </p-dialog>

    <p-confirmDialog />
  `,
})
export class TaCalendarTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(MerchandisingService);
  private readonly confirm = inject(ConfirmationService);

  readonly styles = signal<Style[]>([]);
  readonly rows = signal<TaTask[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly statuses = STATUS_OPTIONS;

  selectedStyleId: string | null = null;
  dialogOpen = false;

  readonly form = this.fb.nonNullable.group({
    sequence: [0],
    code: ['', [Validators.required, Validators.maxLength(40)]],
    name: ['', [Validators.required, Validators.maxLength(160)]],
    plannedStart: [null as Date | null],
    plannedEnd: [null as Date | null, [Validators.required]],
    actualStart: [null as Date | null],
    actualEnd: [null as Date | null],
    status: ['pending' as TaTaskStatus, [Validators.required]],
    owner: [''],
    remarks: [''],
  });

  ngOnInit(): void {
    this.api.listStyles().subscribe((s) => this.styles.set(s));
  }

  onStyleChange(): void {
    if (this.selectedStyleId) this.refresh();
    else this.rows.set([]);
  }

  refresh(): void {
    if (!this.selectedStyleId) return;
    this.loading.set(true);
    this.api.listTaTasks(this.selectedStyleId).subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  severityFor(s: TaTaskStatus) {
    return STATUS_SEVERITY[s] ?? 'info';
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      sequence: 0, code: '', name: '',
      plannedStart: null, plannedEnd: null, actualStart: null, actualEnd: null,
      status: 'pending', owner: '', remarks: '',
    });
    this.dialogOpen = true;
  }

  openEdit(row: TaTask): void {
    this.editingId.set(row.id);
    this.form.patchValue({
      sequence: row.sequence,
      code: row.code,
      name: row.name,
      plannedStart: row.plannedStart ? new Date(row.plannedStart) : null,
      plannedEnd: new Date(row.plannedEnd),
      actualStart: row.actualStart ? new Date(row.actualStart) : null,
      actualEnd: row.actualEnd ? new Date(row.actualEnd) : null,
      status: row.status,
      owner: row.owner ?? '',
      remarks: row.remarks ?? '',
    });
    this.dialogOpen = true;
  }

  private toIso(d: Date | null): string | undefined {
    if (!d) return undefined;
    return d.toISOString().slice(0, 10);
  }

  submit(): void {
    if (this.form.invalid || !this.selectedStyleId) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const dto: CreateTaTaskDto = {
      styleId: this.selectedStyleId,
      sequence: v.sequence ?? 0,
      code: v.code,
      name: v.name,
      plannedStart: this.toIso(v.plannedStart) ?? null,
      plannedEnd: this.toIso(v.plannedEnd)!,
      actualStart: this.toIso(v.actualStart) ?? null,
      actualEnd: this.toIso(v.actualEnd) ?? null,
      status: v.status,
      owner: v.owner || undefined,
      remarks: v.remarks || undefined,
    };
    const op$ = this.editingId()
      ? this.api.updateTaTask(this.editingId()!, dto)
      : this.api.createTaTask(dto);
    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(row: TaTask): void {
    this.confirm.confirm({
      message: `Delete task "${row.name}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteTaTask(row.id).subscribe({ next: () => this.refresh() }),
    });
  }
}

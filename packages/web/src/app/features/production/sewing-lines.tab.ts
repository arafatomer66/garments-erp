import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import type {
  CreateLineAssignmentDto,
  CreateSewingLineDto,
  LineAssignment,
  LineAssignmentStatus,
  SewingLine,
  Style,
} from '@org/shared-types';
import { ProductionService } from './production.service';
import { MerchandisingService } from '../merchandising/merchandising.service';

const ASSIGN_STATUSES: { label: string; value: LineAssignmentStatus }[] = [
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const ASSIGN_SEVERITY: Record<LineAssignmentStatus, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
  active: 'success',
  paused: 'warn',
  completed: 'info',
  cancelled: 'danger',
};

@Component({
  selector: 'app-sewing-lines-tab',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, CardModule, DialogModule, InputTextModule, InputNumberModule,
    TextareaModule, SelectModule, TagModule, CheckboxModule, ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <div class="flex justify-end gap-2">
        <p-button label="New Assignment" icon="pi pi-link" severity="secondary"
          (onClick)="openAssign()" [disabled]="lines().length === 0" />
        <p-button label="New Line" icon="pi pi-plus" (onClick)="openCreateLine()" />
      </div>

      <p-table [value]="lines()" [loading]="loadingLines()" stripedRows>
        <ng-template pTemplate="header">
          <tr>
            <th>Code</th><th>Name</th>
            <th class="text-right">Cap/hr</th>
            <th class="text-right">Operators</th><th class="text-right">Helpers</th>
            <th>Supervisor</th><th>Status</th><th class="w-16"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-mono text-sm font-semibold">{{ row.code }}</td>
            <td>{{ row.name }}</td>
            <td class="text-right">{{ row.capacityPcsPerHour | number }}</td>
            <td class="text-right">{{ row.operatorCount | number }}</td>
            <td class="text-right">{{ row.helperCount | number }}</td>
            <td>{{ row.supervisor || '—' }}</td>
            <td>
              <p-tag [value]="row.isActive ? 'Active' : 'Inactive'"
                     [severity]="row.isActive ? 'success' : 'secondary'" />
            </td>
            <td>
              <p-button icon="pi pi-trash" severity="danger" text rounded size="small"
                (onClick)="confirmDeleteLine(row)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8" class="text-center text-slate-500 py-8">No sewing lines yet.</td></tr>
        </ng-template>
      </p-table>

      <p-card>
        <ng-template pTemplate="header">
          <div class="px-4 pt-3 flex justify-between items-center">
            <h3 class="text-base font-semibold text-slate-900">Active Line Assignments</h3>
          </div>
        </ng-template>
        <p-table [value]="assignments()" stripedRows>
          <ng-template pTemplate="header">
            <tr>
              <th>Line</th><th>Style</th>
              <th class="text-right">Target/hr</th>
              <th class="text-right">SAM</th>
              <th>Started</th><th>Ended</th><th>Status</th><th class="w-16"></th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr>
              <td class="font-mono text-sm">{{ row.lineCode }}</td>
              <td>
                <div class="font-medium">{{ row.styleCode }}</div>
                <div class="text-xs text-slate-500">{{ row.styleName }}</div>
              </td>
              <td class="text-right">{{ row.targetPcsPerHour ?? '—' }}</td>
              <td class="text-right">{{ row.sam ?? '—' }}</td>
              <td>{{ row.startedAt | date:'medium' }}</td>
              <td>{{ row.endedAt ? (row.endedAt | date:'medium') : '—' }}</td>
              <td><p-tag [value]="row.status" [severity]="severityFor(row.status)" /></td>
              <td>
                <p-button icon="pi pi-trash" severity="danger" text rounded size="small"
                  (onClick)="confirmDeleteAssignment(row)" />
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="8" class="text-center text-slate-500 py-4">No assignments yet.</td></tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>

    <!-- New Line Dialog -->
    <p-dialog [(visible)]="dialogLineOpen" [modal]="true" [style]="{ width: '36rem' }" header="New Sewing Line">
      <form [formGroup]="lineForm" (ngSubmit)="submitLine()" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Code *</label>
            <input pInputText class="w-full" formControlName="code" placeholder="LINE-A" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Name *</label>
            <input pInputText class="w-full" formControlName="name" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Capacity / hr</label>
            <p-inputNumber formControlName="capacityPcsPerHour" [min]="0"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Operators</label>
            <p-inputNumber formControlName="operatorCount" [min]="0"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Helpers</label>
            <p-inputNumber formControlName="helperCount" [min]="0"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Supervisor</label>
          <input pInputText class="w-full" formControlName="supervisor" />
        </div>
        <div class="flex items-center gap-2">
          <p-checkbox formControlName="isActive" [binary]="true" inputId="isActive" />
          <label for="isActive" class="text-sm text-slate-700">Active</label>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t">
          <p-button label="Cancel" severity="secondary" (onClick)="dialogLineOpen = false" />
          <p-button type="submit" label="Save" [loading]="savingLine()" [disabled]="lineForm.invalid" />
        </div>
      </form>
    </p-dialog>

    <!-- New Assignment Dialog -->
    <p-dialog [(visible)]="dialogAssignOpen" [modal]="true" [style]="{ width: '36rem' }" header="New Line Assignment">
      <form [formGroup]="assignForm" (ngSubmit)="submitAssign()" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Line *</label>
            <p-select [options]="activeLines()" formControlName="lineId" optionLabel="code" optionValue="id"
              placeholder="Select Line" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Style *</label>
            <p-select [options]="styles()" formControlName="styleId" optionLabel="name" optionValue="id"
              [filter]="true" filterBy="code,name" placeholder="Select Style" styleClass="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Target / hr</label>
            <p-inputNumber formControlName="targetPcsPerHour" [min]="0"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">SAM (min)</label>
            <p-inputNumber formControlName="sam" [min]="0" mode="decimal" [maxFractionDigits]="2"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Status</label>
          <p-select [options]="assignStatuses" formControlName="status"
            optionLabel="label" optionValue="value" styleClass="w-full" />
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Notes</label>
          <textarea pTextarea class="w-full" rows="2" formControlName="notes"></textarea>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t">
          <p-button label="Cancel" severity="secondary" (onClick)="dialogAssignOpen = false" />
          <p-button type="submit" label="Save" [loading]="savingAssign()" [disabled]="assignForm.invalid" />
        </div>
      </form>
    </p-dialog>

    <p-confirmDialog />
  `,
})
export class SewingLinesTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProductionService);
  private readonly merch = inject(MerchandisingService);
  private readonly confirm = inject(ConfirmationService);

  readonly lines = signal<SewingLine[]>([]);
  readonly assignments = signal<LineAssignment[]>([]);
  readonly styles = signal<Style[]>([]);
  readonly loadingLines = signal(false);
  readonly savingLine = signal(false);
  readonly savingAssign = signal(false);
  readonly assignStatuses = ASSIGN_STATUSES;

  readonly activeLines = computed(() => this.lines().filter((l) => l.isActive));

  dialogLineOpen = false;
  dialogAssignOpen = false;

  readonly lineForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(40)]],
    name: ['', [Validators.required, Validators.maxLength(160)]],
    capacityPcsPerHour: [0, Validators.min(0)],
    operatorCount: [0, Validators.min(0)],
    helperCount: [0, Validators.min(0)],
    supervisor: [''],
    isActive: [true],
  });

  readonly assignForm = this.fb.group({
    lineId: ['', Validators.required],
    styleId: ['', Validators.required],
    targetPcsPerHour: [null as number | null],
    sam: [null as number | null],
    status: ['active' as LineAssignmentStatus, Validators.required],
    notes: [''],
  });

  ngOnInit(): void {
    this.refresh();
    this.merch.listStyles().subscribe((s) => this.styles.set(s));
  }

  refresh(): void {
    this.loadingLines.set(true);
    this.api.listLines().subscribe({
      next: (r) => {
        this.lines.set(r);
        this.loadingLines.set(false);
      },
      error: () => this.loadingLines.set(false),
    });
    this.api.listAssignments().subscribe((a) => this.assignments.set(a));
  }

  severityFor(s: LineAssignmentStatus) {
    return ASSIGN_SEVERITY[s] ?? 'info';
  }

  openCreateLine(): void {
    this.lineForm.reset({
      code: '', name: '', capacityPcsPerHour: 0,
      operatorCount: 0, helperCount: 0, supervisor: '', isActive: true,
    });
    this.dialogLineOpen = true;
  }

  submitLine(): void {
    if (this.lineForm.invalid) return;
    this.savingLine.set(true);
    const v = this.lineForm.getRawValue();
    const dto: CreateSewingLineDto = {
      code: v.code!,
      name: v.name!,
      capacityPcsPerHour: Number(v.capacityPcsPerHour ?? 0),
      operatorCount: Number(v.operatorCount ?? 0),
      helperCount: Number(v.helperCount ?? 0),
      supervisor: v.supervisor || undefined,
      isActive: v.isActive ?? true,
    };
    this.api.createLine(dto).subscribe({
      next: () => {
        this.savingLine.set(false);
        this.dialogLineOpen = false;
        this.refresh();
      },
      error: () => this.savingLine.set(false),
    });
  }

  confirmDeleteLine(row: SewingLine): void {
    this.confirm.confirm({
      message: `Delete line "${row.code}"? Assignments and logs will also be removed.`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteLine(row.id).subscribe({ next: () => this.refresh() }),
    });
  }

  openAssign(): void {
    this.assignForm.reset({
      lineId: '', styleId: '', targetPcsPerHour: null, sam: null,
      status: 'active', notes: '',
    });
    this.dialogAssignOpen = true;
  }

  submitAssign(): void {
    if (this.assignForm.invalid) return;
    this.savingAssign.set(true);
    const v = this.assignForm.getRawValue();
    const dto: CreateLineAssignmentDto = {
      lineId: v.lineId!,
      styleId: v.styleId!,
      targetPcsPerHour: v.targetPcsPerHour ?? undefined,
      sam: v.sam ?? undefined,
      status: v.status ?? 'active',
      notes: v.notes || undefined,
    };
    this.api.createAssignment(dto).subscribe({
      next: () => {
        this.savingAssign.set(false);
        this.dialogAssignOpen = false;
        this.refresh();
      },
      error: () => this.savingAssign.set(false),
    });
  }

  confirmDeleteAssignment(row: LineAssignment): void {
    this.confirm.confirm({
      message: `Delete assignment of "${row.styleCode}" → "${row.lineCode}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteAssignment(row.id).subscribe({ next: () => this.refresh() }),
    });
  }
}

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import type {
  CreateDefectCodeDto,
  DefectCode,
  DefectSeverity,
} from '@org/shared-types';
import { QualityService } from './quality.service';

const SEVERITIES: { label: string; value: DefectSeverity }[] = [
  { label: 'Critical', value: 'critical' },
  { label: 'Major', value: 'major' },
  { label: 'Minor', value: 'minor' },
];

const SEVERITY_SEVERITY: Record<DefectSeverity, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
  critical: 'danger',
  major: 'warn',
  minor: 'secondary',
};

@Component({
  selector: 'app-defect-codes-tab',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule, TextareaModule,
    SelectModule, TagModule, CheckboxModule, ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3">
      <div class="flex justify-end">
        <p-button label="New Code" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows>
        <ng-template pTemplate="header">
          <tr>
            <th>Code</th><th>Name</th><th>Category</th><th>Severity</th>
            <th>Description</th><th>Status</th><th class="w-16"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-mono text-sm font-semibold">{{ row.code }}</td>
            <td>{{ row.name }}</td>
            <td>{{ row.category }}</td>
            <td><p-tag [value]="row.severity" [severity]="severityFor(row.severity)" /></td>
            <td class="text-sm text-slate-600">{{ row.description || '—' }}</td>
            <td>
              <p-tag [value]="row.isActive ? 'Active' : 'Inactive'"
                     [severity]="row.isActive ? 'success' : 'secondary'" />
            </td>
            <td>
              <p-button icon="pi pi-trash" severity="danger" text rounded size="small"
                (onClick)="confirmDelete(row)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7" class="text-center text-slate-500 py-8">No defect codes yet.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '36rem' }" header="New Defect Code">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Code *</label>
            <input pInputText class="w-full" formControlName="code" placeholder="DC-SKIP-STITCH" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Severity</label>
            <p-select [options]="severities" formControlName="severity"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Name *</label>
          <input pInputText class="w-full" formControlName="name" placeholder="Skipped Stitch" />
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Category</label>
          <input pInputText class="w-full" formControlName="category" placeholder="stitching" />
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Description</label>
          <textarea pTextarea class="w-full" rows="2" formControlName="description"></textarea>
        </div>
        <div class="flex items-center gap-2">
          <p-checkbox formControlName="isActive" [binary]="true" inputId="dcActive" />
          <label for="dcActive" class="text-sm text-slate-700">Active</label>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t">
          <p-button label="Cancel" severity="secondary" (onClick)="dialogOpen = false" />
          <p-button type="submit" label="Save" [loading]="saving()" [disabled]="form.invalid" />
        </div>
      </form>
    </p-dialog>

    <p-confirmDialog />
  `,
})
export class DefectCodesTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(QualityService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<DefectCode[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly severities = SEVERITIES;

  dialogOpen = false;

  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(40)]],
    name: ['', [Validators.required, Validators.maxLength(160)]],
    category: ['general'],
    severity: ['minor' as DefectSeverity, Validators.required],
    description: [''],
    isActive: [true],
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listDefectCodes().subscribe({
      next: (r) => {
        this.rows.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  severityFor(s: DefectSeverity) {
    return SEVERITY_SEVERITY[s] ?? 'info';
  }

  openCreate(): void {
    this.form.reset({
      code: '', name: '', category: 'general',
      severity: 'minor', description: '', isActive: true,
    });
    this.dialogOpen = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const dto: CreateDefectCodeDto = {
      code: v.code!,
      name: v.name!,
      category: v.category || undefined,
      severity: v.severity ?? 'minor',
      description: v.description || undefined,
      isActive: v.isActive ?? true,
    };
    this.api.createDefectCode(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(row: DefectCode): void {
    this.confirm.confirm({
      message: `Delete defect code "${row.code}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteDefectCode(row.id).subscribe({ next: () => this.refresh() }),
    });
  }
}

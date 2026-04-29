import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import type {
  ComplianceCategory,
  ComplianceStandard,
  CreateComplianceStandardDto,
} from '@org/shared-types';
import { ComplianceApiService } from './compliance.service';

@Component({
  selector: 'app-compliance-standards-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule,
    TextareaModule, SelectModule, TagModule, ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3">
      <div class="flex justify-end">
        <p-button label="New Standard" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows>
        <ng-template pTemplate="header">
          <tr>
            <th>Code</th><th>Name</th><th>Category</th>
            <th>Issuing Body</th><th>Active</th>
            <th class="w-20"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr>
            <td class="font-mono text-sm">{{ r.code }}</td>
            <td class="font-medium">{{ r.name }}</td>
            <td><p-tag [value]="r.category" severity="info" /></td>
            <td class="text-sm text-slate-600">{{ r.issuingBody }}</td>
            <td>
              <p-tag *ngIf="r.isActive" value="Active" severity="success" />
              <p-tag *ngIf="!r.isActive" value="Inactive" severity="secondary" />
            </td>
            <td>
              <p-button icon="pi pi-trash" severity="danger" text rounded size="small" (onClick)="confirmDelete(r)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="text-center text-slate-500 py-8">No standards yet.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '34rem' }" header="New Standard">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Code *</label>
            <input pInputText class="w-full" formControlName="code" placeholder="ACCORD" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Name *</label>
            <input pInputText class="w-full" formControlName="name" placeholder="Bangladesh Accord on Fire and Building Safety" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Category</label>
            <p-select [options]="categories" formControlName="category"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Issuing Body</label>
            <input pInputText class="w-full" formControlName="issuingBody" placeholder="RSC / Sedex / etc." />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Description</label>
          <textarea pTextarea class="w-full" rows="2" formControlName="description"></textarea>
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
export class ComplianceStandardsTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ComplianceApiService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<ComplianceStandard[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly categories: { label: string; value: ComplianceCategory }[] = [
    { label: 'Social', value: 'social' },
    { label: 'Safety', value: 'safety' },
    { label: 'Environmental', value: 'environmental' },
    { label: 'Quality', value: 'quality' },
    { label: 'Security', value: 'security' },
    { label: 'Other', value: 'other' },
  ];

  dialogOpen = false;

  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(32)]],
    name: ['', [Validators.required, Validators.maxLength(120)]],
    category: ['social' as ComplianceCategory, Validators.required],
    issuingBody: [''],
    description: [''],
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listStandards().subscribe({
      next: (r) => { this.rows.set(r); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.form.reset({
      code: '', name: '', category: 'social', issuingBody: '', description: '',
    });
    this.dialogOpen = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const dto: CreateComplianceStandardDto = {
      code: v.code!,
      name: v.name!,
      category: v.category || 'social',
      issuingBody: v.issuingBody || null,
      description: v.description || null,
    };
    this.api.createStandard(dto).subscribe({
      next: () => { this.saving.set(false); this.dialogOpen = false; this.refresh(); },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(r: ComplianceStandard): void {
    this.confirm.confirm({
      message: `Delete standard "${r.code}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteStandard(r.id).subscribe({ next: () => this.refresh() }),
    });
  }
}

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import type { CreateHrDepartmentDto, HrDepartment } from '@org/shared-types';
import { HrApiService } from './hr.service';

@Component({
  selector: 'app-hr-departments-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule,
    TextareaModule, SelectModule, CheckboxModule, TagModule, ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3">
      <div class="flex justify-end">
        <p-button label="New Department" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows>
        <ng-template pTemplate="header">
          <tr>
            <th>Code</th><th>Name</th><th>Parent</th><th>Description</th>
            <th>Status</th>
            <th class="w-16"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-mono text-sm">{{ row.code }}</td>
            <td class="font-medium">{{ row.name }}</td>
            <td class="text-sm">{{ row.parentName || '—' }}</td>
            <td class="text-sm text-slate-600">{{ row.description || '—' }}</td>
            <td>
              <p-tag *ngIf="row.isActive" value="active" severity="success" />
              <p-tag *ngIf="!row.isActive" value="inactive" severity="secondary" />
            </td>
            <td>
              <p-button icon="pi pi-trash" severity="danger" text rounded size="small"
                (onClick)="confirmDelete(row)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="text-center text-slate-500 py-8">No departments yet.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '32rem' }" header="New Department">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Code *</label>
            <input pInputText class="w-full" formControlName="code" placeholder="DEPT-CUT" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Name *</label>
            <input pInputText class="w-full" formControlName="name" placeholder="Cutting" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Parent</label>
          <p-select [options]="parents()" formControlName="parentId"
            optionLabel="name" optionValue="id" [showClear]="true" placeholder="(none)"
            styleClass="w-full" />
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Description</label>
          <textarea pTextarea class="w-full" rows="2" formControlName="description"></textarea>
        </div>
        <div class="flex items-center gap-2">
          <p-checkbox formControlName="isActive" [binary]="true" inputId="dep-active" />
          <label for="dep-active" class="text-sm">Active</label>
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
export class HrDepartmentsTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(HrApiService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<HrDepartment[]>([]);
  readonly parents = signal<HrDepartment[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);

  dialogOpen = false;

  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(30)]],
    name: ['', [Validators.required, Validators.maxLength(80)]],
    parentId: [null as string | null],
    description: [''],
    isActive: [true],
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listDepartments().subscribe({
      next: (r) => {
        this.rows.set(r);
        this.parents.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.form.reset({
      code: '',
      name: '',
      parentId: null,
      description: '',
      isActive: true,
    });
    this.dialogOpen = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const dto: CreateHrDepartmentDto = {
      code: v.code!,
      name: v.name!,
      parentId: v.parentId || null,
      description: v.description || undefined,
      isActive: v.isActive ?? true,
    };
    this.api.createDepartment(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(row: HrDepartment): void {
    this.confirm.confirm({
      message: `Delete department "${row.name}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteDepartment(row.id).subscribe({ next: () => this.refresh() }),
    });
  }
}

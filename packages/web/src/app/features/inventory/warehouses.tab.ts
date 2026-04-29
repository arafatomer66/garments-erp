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
  BinLocation,
  CreateBinLocationDto,
  CreateWarehouseDto,
  Warehouse,
  WarehouseType,
} from '@org/shared-types';
import { InventoryService } from './inventory.service';

const TYPES: { label: string; value: WarehouseType }[] = [
  { label: 'Fabric', value: 'fabric' },
  { label: 'Trim', value: 'trim' },
  { label: 'Accessory', value: 'accessory' },
  { label: 'Finished Goods', value: 'finished_goods' },
  { label: 'General', value: 'general' },
];

@Component({
  selector: 'app-warehouses-tab',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule, TextareaModule,
    SelectModule, TagModule, CheckboxModule, ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-2 gap-4">
      <!-- Warehouses -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-lg font-semibold text-slate-900">Warehouses</h2>
          <p-button label="New" icon="pi pi-plus" size="small" (onClick)="openCreateWh()" />
        </div>
        <p-table [value]="warehouses()" [loading]="loadingWh()" stripedRows
          selectionMode="single" [(selection)]="selectedWh" (selectionChange)="onWhSelect()">
          <ng-template pTemplate="header">
            <tr><th>Code</th><th>Name</th><th>Type</th><th>Status</th><th class="w-16"></th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr [pSelectableRow]="row">
              <td class="font-mono text-sm">{{ row.code }}</td>
              <td>{{ row.name }}</td>
              <td><p-tag [value]="row.type" severity="info" /></td>
              <td>
                <p-tag [value]="row.isActive ? 'Active' : 'Inactive'"
                       [severity]="row.isActive ? 'success' : 'secondary'" />
              </td>
              <td>
                <p-button icon="pi pi-trash" severity="danger" text rounded size="small"
                  (onClick)="confirmDeleteWh(row, $event)" />
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="5" class="text-center text-slate-500 py-6">No warehouses yet.</td></tr>
          </ng-template>
        </p-table>
      </div>

      <!-- Bins -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-lg font-semibold text-slate-900">
            Bins <span *ngIf="selectedWh" class="text-sm text-slate-500 font-normal">— {{ selectedWh.code }}</span>
          </h2>
          <p-button label="New Bin" icon="pi pi-plus" size="small"
            (onClick)="openCreateBin()" [disabled]="!selectedWh" />
        </div>
        <p-table [value]="bins()" stripedRows>
          <ng-template pTemplate="header">
            <tr><th>Code</th><th>Name</th><th>Status</th><th class="w-16"></th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr>
              <td class="font-mono text-sm">{{ row.code }}</td>
              <td>{{ row.name || '—' }}</td>
              <td>
                <p-tag [value]="row.isActive ? 'Active' : 'Inactive'"
                       [severity]="row.isActive ? 'success' : 'secondary'" />
              </td>
              <td>
                <p-button icon="pi pi-trash" severity="danger" text rounded size="small"
                  (onClick)="confirmDeleteBin(row)" />
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="4" class="text-center text-slate-500 py-6">
              {{ selectedWh ? 'No bins for this warehouse yet.' : 'Select a warehouse first.' }}
            </td></tr>
          </ng-template>
        </p-table>
      </div>
    </div>

    <!-- Warehouse Dialog -->
    <p-dialog [(visible)]="dialogWhOpen" [modal]="true" [style]="{ width: '32rem' }" header="New Warehouse">
      <form [formGroup]="whForm" (ngSubmit)="submitWh()" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Code *</label>
            <input pInputText class="w-full" formControlName="code" placeholder="WH-FAB-01" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Type *</label>
            <p-select [options]="types" formControlName="type" optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Name *</label>
          <input pInputText class="w-full" formControlName="name" />
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Address</label>
          <textarea pTextarea class="w-full" rows="2" formControlName="address"></textarea>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t">
          <p-button label="Cancel" severity="secondary" (onClick)="dialogWhOpen = false" />
          <p-button type="submit" label="Save" [loading]="savingWh()" [disabled]="whForm.invalid" />
        </div>
      </form>
    </p-dialog>

    <!-- Bin Dialog -->
    <p-dialog [(visible)]="dialogBinOpen" [modal]="true" [style]="{ width: '28rem' }" header="New Bin">
      <form [formGroup]="binForm" (ngSubmit)="submitBin()" class="space-y-3">
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Code *</label>
          <input pInputText class="w-full" formControlName="code" placeholder="A-01-01" />
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Name</label>
          <input pInputText class="w-full" formControlName="name" />
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t">
          <p-button label="Cancel" severity="secondary" (onClick)="dialogBinOpen = false" />
          <p-button type="submit" label="Save" [loading]="savingBin()" [disabled]="binForm.invalid" />
        </div>
      </form>
    </p-dialog>

    <p-confirmDialog />
  `,
})
export class WarehousesTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(InventoryService);
  private readonly confirm = inject(ConfirmationService);

  readonly warehouses = signal<Warehouse[]>([]);
  readonly bins = signal<BinLocation[]>([]);
  readonly loadingWh = signal(false);
  readonly savingWh = signal(false);
  readonly savingBin = signal(false);
  readonly types = TYPES;

  selectedWh: Warehouse | null = null;
  dialogWhOpen = false;
  dialogBinOpen = false;

  readonly whForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(40)]],
    name: ['', [Validators.required, Validators.maxLength(160)]],
    type: ['general' as WarehouseType, Validators.required],
    address: [''],
  });

  readonly binForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(40)]],
    name: [''],
  });

  ngOnInit(): void {
    this.refreshWh();
  }

  refreshWh(): void {
    this.loadingWh.set(true);
    this.api.listWarehouses().subscribe({
      next: (r) => {
        this.warehouses.set(r);
        this.loadingWh.set(false);
      },
      error: () => this.loadingWh.set(false),
    });
  }

  refreshBins(): void {
    if (!this.selectedWh) {
      this.bins.set([]);
      return;
    }
    this.api.listBins(this.selectedWh.id).subscribe((b) => this.bins.set(b));
  }

  onWhSelect(): void {
    this.refreshBins();
  }

  openCreateWh(): void {
    this.whForm.reset({ code: '', name: '', type: 'general', address: '' });
    this.dialogWhOpen = true;
  }

  submitWh(): void {
    if (this.whForm.invalid) return;
    this.savingWh.set(true);
    const v = this.whForm.getRawValue();
    const dto: CreateWarehouseDto = {
      code: v.code!,
      name: v.name!,
      type: v.type ?? 'general',
      address: v.address || undefined,
    };
    this.api.createWarehouse(dto).subscribe({
      next: () => {
        this.savingWh.set(false);
        this.dialogWhOpen = false;
        this.refreshWh();
      },
      error: () => this.savingWh.set(false),
    });
  }

  confirmDeleteWh(row: Warehouse, event: Event): void {
    event.stopPropagation();
    this.confirm.confirm({
      message: `Delete warehouse "${row.code}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () =>
        this.api.deleteWarehouse(row.id).subscribe({
          next: () => {
            if (this.selectedWh?.id === row.id) {
              this.selectedWh = null;
              this.bins.set([]);
            }
            this.refreshWh();
          },
        }),
    });
  }

  openCreateBin(): void {
    if (!this.selectedWh) return;
    this.binForm.reset({ code: '', name: '' });
    this.dialogBinOpen = true;
  }

  submitBin(): void {
    if (this.binForm.invalid || !this.selectedWh) return;
    this.savingBin.set(true);
    const v = this.binForm.getRawValue();
    const dto: CreateBinLocationDto = {
      warehouseId: this.selectedWh.id,
      code: v.code!,
      name: v.name || undefined,
    };
    this.api.createBin(dto).subscribe({
      next: () => {
        this.savingBin.set(false);
        this.dialogBinOpen = false;
        this.refreshBins();
      },
      error: () => this.savingBin.set(false),
    });
  }

  confirmDeleteBin(row: BinLocation): void {
    this.confirm.confirm({
      message: `Delete bin "${row.code}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteBin(row.id).subscribe({ next: () => this.refreshBins() }),
    });
  }
}

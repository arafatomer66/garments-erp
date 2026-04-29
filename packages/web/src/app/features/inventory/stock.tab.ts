import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
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
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import type {
  CreateStockLotDto,
  IssueFifoDto,
  Item,
  StockLot,
  StockMovement,
  Warehouse,
} from '@org/shared-types';
import { InventoryService } from './inventory.service';
import { MastersService } from '../masters/masters.service';

@Component({
  selector: 'app-stock-tab',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, CardModule, DialogModule, InputTextModule, InputNumberModule,
    TextareaModule, SelectModule, TagModule, DatePickerModule, ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <div class="flex justify-end gap-2">
        <p-button label="Issue FIFO" icon="pi pi-arrow-circle-down" severity="warn" (onClick)="openIssue()" />
        <p-button label="New Lot" icon="pi pi-plus" (onClick)="openCreateLot()" />
      </div>

      <p-table [value]="lots()" [loading]="loadingLots()" stripedRows
        selectionMode="single" [(selection)]="selectedLot" (selectionChange)="onLotSelect()">
        <ng-template pTemplate="header">
          <tr>
            <th>Lot #</th><th>Item</th><th>Warehouse</th><th>Bin</th>
            <th class="text-right">On Hand</th><th class="text-right">Unit Cost</th>
            <th>Received</th><th class="w-16"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr [pSelectableRow]="row">
            <td class="font-mono text-sm">{{ row.lotNumber }}</td>
            <td>
              <div class="font-medium">{{ row.itemName }}</div>
              <div class="text-xs text-slate-500 font-mono">{{ row.itemCode }}</div>
            </td>
            <td class="font-mono text-sm">{{ row.warehouseCode }}</td>
            <td class="font-mono text-sm">{{ row.binCode || '—' }}</td>
            <td class="text-right">{{ row.quantityOnHand | number:'1.0-4' }} {{ row.uom }}</td>
            <td class="text-right">
              <span *ngIf="row.unitCost > 0">{{ row.currencyCode }} {{ row.unitCost | number:'1.2-4' }}</span>
              <span *ngIf="row.unitCost === 0" class="text-slate-400">—</span>
            </td>
            <td>{{ row.receivedAt | date:'mediumDate' }}</td>
            <td>
              <p-button icon="pi pi-trash" severity="danger" text rounded size="small"
                (onClick)="confirmDeleteLot(row, $event)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8" class="text-center text-slate-500 py-8">No stock lots yet.</td></tr>
        </ng-template>
      </p-table>

      <p-card *ngIf="selectedLot">
        <ng-template pTemplate="header">
          <div class="px-4 pt-3">
            <h3 class="text-base font-semibold text-slate-900">Movements — {{ selectedLot.lotNumber }}</h3>
          </div>
        </ng-template>
        <p-table [value]="movements()" stripedRows>
          <ng-template pTemplate="header">
            <tr><th>Movement #</th><th>Type</th><th class="text-right">Qty</th><th>When</th><th>Ref</th><th>Notes</th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr>
              <td class="font-mono text-sm">{{ row.movementNumber }}</td>
              <td><p-tag [value]="row.movementType" [severity]="severityFor(row.movementType)" /></td>
              <td class="text-right">{{ row.quantity | number:'1.0-4' }}</td>
              <td>{{ row.movedAt | date:'medium' }}</td>
              <td>{{ row.referenceType || '—' }}</td>
              <td class="text-slate-600 text-sm">{{ row.notes || '' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="6" class="text-center text-slate-500 py-4">No movements.</td></tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>

    <!-- New Lot Dialog -->
    <p-dialog [(visible)]="dialogLotOpen" [modal]="true" [style]="{ width: '44rem' }" header="New Stock Lot">
      <form [formGroup]="lotForm" (ngSubmit)="submitLot()" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Lot Number *</label>
            <input pInputText class="w-full" formControlName="lotNumber" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Item *</label>
            <p-select [options]="items()" formControlName="itemId" optionLabel="name" optionValue="id"
              [filter]="true" filterBy="name,code" placeholder="Select Item" styleClass="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Warehouse *</label>
            <p-select [options]="warehouses()" formControlName="warehouseId" optionLabel="code" optionValue="id"
              placeholder="Select Warehouse" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Received At</label>
            <p-datepicker formControlName="receivedAt" appendTo="body" dateFormat="yy-mm-dd"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Quantity On Hand *</label>
            <p-inputNumber formControlName="quantityOnHand" [min]="0" mode="decimal" [maxFractionDigits]="4"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">UoM</label>
            <input pInputText class="w-full" formControlName="uom" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Unit Cost</label>
            <p-inputNumber formControlName="unitCost" [min]="0" mode="decimal" [maxFractionDigits]="4"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Notes</label>
          <textarea pTextarea class="w-full" rows="2" formControlName="notes"></textarea>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t">
          <p-button label="Cancel" severity="secondary" (onClick)="dialogLotOpen = false" />
          <p-button type="submit" label="Save" [loading]="savingLot()" [disabled]="lotForm.invalid" />
        </div>
      </form>
    </p-dialog>

    <!-- Issue FIFO Dialog -->
    <p-dialog [(visible)]="dialogIssueOpen" [modal]="true" [style]="{ width: '36rem' }" header="Issue Stock (FIFO)">
      <form [formGroup]="issueForm" (ngSubmit)="submitIssue()" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Item *</label>
            <p-select [options]="items()" formControlName="itemId" optionLabel="name" optionValue="id"
              [filter]="true" filterBy="name,code" placeholder="Select Item" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Warehouse *</label>
            <p-select [options]="warehouses()" formControlName="warehouseId" optionLabel="code" optionValue="id"
              placeholder="Select Warehouse" styleClass="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Quantity *</label>
            <p-inputNumber formControlName="quantity" [min]="0.0001" mode="decimal" [maxFractionDigits]="4"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Reference Type</label>
            <input pInputText class="w-full" formControlName="referenceType" placeholder="cutting_plan" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Notes</label>
          <textarea pTextarea class="w-full" rows="2" formControlName="notes"></textarea>
        </div>
        <div class="text-xs text-slate-500 italic">
          Stock will be consumed across lots ordered by oldest received-at first.
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t">
          <p-button label="Cancel" severity="secondary" (onClick)="dialogIssueOpen = false" />
          <p-button type="submit" label="Issue" [loading]="savingIssue()" [disabled]="issueForm.invalid" />
        </div>
      </form>
    </p-dialog>

    <p-confirmDialog />
  `,
})
export class StockTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(InventoryService);
  private readonly masters = inject(MastersService);
  private readonly confirm = inject(ConfirmationService);

  readonly lots = signal<StockLot[]>([]);
  readonly movements = signal<StockMovement[]>([]);
  readonly items = signal<Item[]>([]);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly loadingLots = signal(false);
  readonly savingLot = signal(false);
  readonly savingIssue = signal(false);

  selectedLot: StockLot | null = null;
  dialogLotOpen = false;
  dialogIssueOpen = false;

  readonly lotForm = this.fb.group({
    lotNumber: ['', [Validators.required, Validators.maxLength(60)]],
    itemId: ['', Validators.required],
    warehouseId: ['', Validators.required],
    receivedAt: [new Date()],
    quantityOnHand: [0, [Validators.required, Validators.min(0)]],
    uom: ['pcs'],
    unitCost: [0],
    notes: [''],
  });

  readonly issueForm = this.fb.group({
    itemId: ['', Validators.required],
    warehouseId: ['', Validators.required],
    quantity: [0, [Validators.required, Validators.min(0.0001)]],
    referenceType: [''],
    notes: [''],
  });

  ngOnInit(): void {
    this.refreshLots();
    this.masters.listItems().subscribe((i) => this.items.set(i));
    this.api.listWarehouses().subscribe((w) => this.warehouses.set(w));
  }

  refreshLots(): void {
    this.loadingLots.set(true);
    this.api.listLots().subscribe({
      next: (r) => {
        this.lots.set(r);
        this.loadingLots.set(false);
        if (this.selectedLot) {
          const updated = r.find((l) => l.id === this.selectedLot!.id) ?? null;
          this.selectedLot = updated;
          if (updated) this.refreshMovements();
        }
      },
      error: () => this.loadingLots.set(false),
    });
  }

  refreshMovements(): void {
    if (!this.selectedLot) {
      this.movements.set([]);
      return;
    }
    this.api.listMovements(this.selectedLot.id).subscribe((m) => this.movements.set(m));
  }

  onLotSelect(): void {
    this.refreshMovements();
  }

  severityFor(t: string): 'info' | 'warn' | 'success' | 'danger' | 'secondary' {
    switch (t) {
      case 'receipt':
      case 'transfer_in':
      case 'return':
        return 'success';
      case 'issue':
      case 'consumption':
      case 'transfer_out':
        return 'warn';
      case 'adjustment':
        return 'info';
      default:
        return 'secondary';
    }
  }

  openCreateLot(): void {
    this.lotForm.reset({
      lotNumber: '', itemId: '', warehouseId: '', receivedAt: new Date(),
      quantityOnHand: 0, uom: 'pcs', unitCost: 0, notes: '',
    });
    this.dialogLotOpen = true;
  }

  submitLot(): void {
    if (this.lotForm.invalid) return;
    this.savingLot.set(true);
    const v = this.lotForm.getRawValue();
    const dto: CreateStockLotDto = {
      lotNumber: v.lotNumber!,
      itemId: v.itemId!,
      warehouseId: v.warehouseId!,
      receivedAt: v.receivedAt ? v.receivedAt.toISOString() : undefined,
      quantityOnHand: Number(v.quantityOnHand),
      uom: v.uom || undefined,
      unitCost: Number(v.unitCost ?? 0),
      notes: v.notes || undefined,
    };
    this.api.createLot(dto).subscribe({
      next: () => {
        this.savingLot.set(false);
        this.dialogLotOpen = false;
        this.refreshLots();
      },
      error: () => this.savingLot.set(false),
    });
  }

  confirmDeleteLot(row: StockLot, event: Event): void {
    event.stopPropagation();
    this.confirm.confirm({
      message: `Delete lot "${row.lotNumber}"? Movements will be removed.`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () =>
        this.api.deleteLot(row.id).subscribe({
          next: () => {
            if (this.selectedLot?.id === row.id) {
              this.selectedLot = null;
              this.movements.set([]);
            }
            this.refreshLots();
          },
        }),
    });
  }

  openIssue(): void {
    this.issueForm.reset({ itemId: '', warehouseId: '', quantity: 0, referenceType: '', notes: '' });
    this.dialogIssueOpen = true;
  }

  submitIssue(): void {
    if (this.issueForm.invalid) return;
    this.savingIssue.set(true);
    const v = this.issueForm.getRawValue();
    const dto: IssueFifoDto = {
      itemId: v.itemId!,
      warehouseId: v.warehouseId!,
      quantity: Number(v.quantity),
      referenceType: v.referenceType || undefined,
      notes: v.notes || undefined,
    };
    this.api.issueFifo(dto).subscribe({
      next: () => {
        this.savingIssue.set(false);
        this.dialogIssueOpen = false;
        this.refreshLots();
      },
      error: () => this.savingIssue.set(false),
    });
  }
}

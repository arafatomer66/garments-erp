import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import type {
  Bundle,
  BundleStatus,
  CreateBundleDto,
  CuttingPlan,
  ScanBundleDto,
  SewingLine,
} from '@org/shared-types';
import { ProductionService } from './production.service';

const BUNDLE_STATUSES: { label: string; value: BundleStatus }[] = [
  { label: 'Cut', value: 'cut' },
  { label: 'In Sewing', value: 'in_sewing' },
  { label: 'Sewn', value: 'sewn' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Packed', value: 'packed' },
];

const STATUS_SEVERITY: Record<BundleStatus, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
  cut: 'secondary',
  in_sewing: 'info',
  sewn: 'success',
  rejected: 'danger',
  packed: 'success',
};

@Component({
  selector: 'app-bundles-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    TableModule, ButtonModule, CardModule, DialogModule, InputTextModule, InputNumberModule,
    TextareaModule, SelectModule, TagModule, ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3">
      <div class="flex items-end justify-between gap-2">
        <div>
          <label class="text-xs font-medium text-slate-700 mb-1 block">Filter by Plan</label>
          <p-select [options]="planOptions()" [(ngModel)]="filterPlanId"
            optionLabel="label" optionValue="value"
            placeholder="All plans" [showClear]="true" [filter]="true" filterBy="label"
            (onChange)="refresh()" styleClass="w-72" />
        </div>
        <div class="flex gap-2">
          <p-button label="Scan QR" icon="pi pi-qrcode" severity="warn" (onClick)="openScan()" />
          <p-button label="New Bundle" icon="pi pi-plus" (onClick)="openCreate()"
            [disabled]="plans().length === 0" />
        </div>
      </div>

      <p-table [value]="rows()" [loading]="loading()" stripedRows>
        <ng-template pTemplate="header">
          <tr>
            <th>Bundle #</th><th>QR</th><th>Plan</th><th>Line</th>
            <th>Size</th><th>Color</th>
            <th class="text-right">Qty</th><th>Status</th>
            <th>Cut</th><th>Sewn</th><th class="w-16"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-mono text-sm font-semibold">{{ row.bundleNumber }}</td>
            <td class="font-mono text-xs text-slate-600">{{ row.qrCode }}</td>
            <td class="font-mono text-xs">{{ row.cuttingPlanNumber }}</td>
            <td class="font-mono text-xs">{{ row.lineCode || '—' }}</td>
            <td class="font-mono text-sm">{{ row.sizeLabel }}</td>
            <td>{{ row.color || '—' }}</td>
            <td class="text-right">{{ row.quantity | number }}</td>
            <td><p-tag [value]="row.status" [severity]="severityFor(row.status)" /></td>
            <td>{{ row.cutAt | date:'mediumDate' }}</td>
            <td>{{ row.sewingCompletedAt ? (row.sewingCompletedAt | date:'shortDate') : '—' }}</td>
            <td>
              <p-button icon="pi pi-trash" severity="danger" text rounded size="small"
                (onClick)="confirmDelete(row)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="11" class="text-center text-slate-500 py-8">No bundles yet.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <!-- New Bundle Dialog -->
    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '40rem' }" header="New Bundle">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Bundle Number *</label>
            <input pInputText class="w-full" formControlName="bundleNumber" placeholder="BDL-001" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">QR Code (optional)</label>
            <input pInputText class="w-full" formControlName="qrCode" placeholder="(auto)" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Cutting Plan *</label>
          <p-select [options]="plans()" formControlName="cuttingPlanId"
            optionLabel="planNumber" optionValue="id"
            [filter]="true" filterBy="planNumber,styleCode"
            placeholder="Select Plan" styleClass="w-full" />
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Size *</label>
            <input pInputText class="w-full" formControlName="sizeLabel" placeholder="M" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Color</label>
            <input pInputText class="w-full" formControlName="color" placeholder="Navy" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Quantity *</label>
            <p-inputNumber formControlName="quantity" [min]="1"
              styleClass="w-full" [inputStyle]="{ width: '100%' }" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Initial Line</label>
            <p-select [options]="lines()" formControlName="lineId"
              optionLabel="code" optionValue="id"
              placeholder="(unassigned)" [showClear]="true" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Status</label>
            <p-select [options]="statuses" formControlName="status"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Notes</label>
          <textarea pTextarea class="w-full" rows="2" formControlName="notes"></textarea>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t">
          <p-button label="Cancel" severity="secondary" (onClick)="dialogOpen = false" />
          <p-button type="submit" label="Save" [loading]="saving()" [disabled]="form.invalid" />
        </div>
      </form>
    </p-dialog>

    <!-- Scan QR Dialog -->
    <p-dialog [(visible)]="dialogScanOpen" [modal]="true" [style]="{ width: '32rem' }" header="Scan Bundle QR">
      <form [formGroup]="scanForm" (ngSubmit)="submitScan()" class="space-y-3">
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">QR Code *</label>
          <input pInputText class="w-full" formControlName="qrCode" placeholder="Scan or paste QR" autofocus />
          <div class="text-xs text-slate-500 mt-1">
            Tip: keyboard-emulating scanners auto-fill this field.
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Status *</label>
            <p-select [options]="statuses" formControlName="status"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Line</label>
            <p-select [options]="lines()" formControlName="lineId"
              optionLabel="code" optionValue="id"
              placeholder="(unchanged)" [showClear]="true" styleClass="w-full" />
          </div>
        </div>
        <div *ngIf="scanResult() as r"
          class="p-3 rounded border" [class]="'border-emerald-300 bg-emerald-50'">
          <div class="text-xs text-emerald-800 font-semibold uppercase mb-1">Last Scan</div>
          <div class="text-sm">
            <span class="font-mono">{{ r.bundleNumber }}</span> →
            <span class="font-semibold">{{ r.status }}</span>
            <span *ngIf="r.lineCode"> on line <span class="font-mono">{{ r.lineCode }}</span></span>
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t">
          <p-button label="Close" severity="secondary" (onClick)="dialogScanOpen = false" />
          <p-button type="submit" label="Scan" [loading]="scanning()" [disabled]="scanForm.invalid" />
        </div>
      </form>
    </p-dialog>

    <p-confirmDialog />
  `,
})
export class BundlesTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProductionService);
  private readonly confirm = inject(ConfirmationService);

  readonly rows = signal<Bundle[]>([]);
  readonly plans = signal<CuttingPlan[]>([]);
  readonly lines = signal<SewingLine[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly scanning = signal(false);
  readonly scanResult = signal<Bundle | null>(null);
  readonly statuses = BUNDLE_STATUSES;

  filterPlanId: string | null = null;
  dialogOpen = false;
  dialogScanOpen = false;

  readonly planOptions = computed(() =>
    this.plans().map((p) => ({
      label: `${p.planNumber} — ${p.styleCode}`,
      value: p.id,
    })),
  );

  readonly form = this.fb.group({
    bundleNumber: ['', [Validators.required, Validators.maxLength(60)]],
    qrCode: [''],
    cuttingPlanId: ['', Validators.required],
    lineId: [null as string | null],
    sizeLabel: ['', [Validators.required, Validators.maxLength(20)]],
    color: [''],
    quantity: [0, [Validators.required, Validators.min(1)]],
    status: ['cut' as BundleStatus, Validators.required],
    notes: [''],
  });

  readonly scanForm = this.fb.group({
    qrCode: ['', Validators.required],
    status: ['in_sewing' as BundleStatus, Validators.required],
    lineId: [null as string | null],
  });

  ngOnInit(): void {
    this.refresh();
    this.api.listPlans().subscribe((p) => this.plans.set(p));
    this.api.listLines().subscribe((l) => this.lines.set(l));
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listBundles(this.filterPlanId ?? undefined).subscribe({
      next: (r) => {
        this.rows.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  severityFor(s: BundleStatus) {
    return STATUS_SEVERITY[s] ?? 'info';
  }

  openCreate(): void {
    this.form.reset({
      bundleNumber: '', qrCode: '', cuttingPlanId: '',
      lineId: null, sizeLabel: '', color: '', quantity: 0,
      status: 'cut', notes: '',
    });
    this.dialogOpen = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const dto: CreateBundleDto = {
      bundleNumber: v.bundleNumber!,
      qrCode: v.qrCode || undefined,
      cuttingPlanId: v.cuttingPlanId!,
      lineId: v.lineId || undefined,
      sizeLabel: v.sizeLabel!,
      color: v.color || undefined,
      quantity: Number(v.quantity),
      status: v.status ?? 'cut',
      notes: v.notes || undefined,
    };
    this.api.createBundle(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(row: Bundle): void {
    this.confirm.confirm({
      message: `Delete bundle "${row.bundleNumber}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteBundle(row.id).subscribe({ next: () => this.refresh() }),
    });
  }

  openScan(): void {
    this.scanResult.set(null);
    this.scanForm.reset({ qrCode: '', status: 'in_sewing', lineId: null });
    this.dialogScanOpen = true;
  }

  submitScan(): void {
    if (this.scanForm.invalid) return;
    this.scanning.set(true);
    const v = this.scanForm.getRawValue();
    const dto: ScanBundleDto = {
      qrCode: v.qrCode!,
      status: v.status ?? 'in_sewing',
      lineId: v.lineId || undefined,
    };
    this.api.scanBundle(dto).subscribe({
      next: (b) => {
        this.scanning.set(false);
        this.scanResult.set(b);
        this.scanForm.patchValue({ qrCode: '' });
        this.refresh();
      },
      error: () => this.scanning.set(false),
    });
  }
}

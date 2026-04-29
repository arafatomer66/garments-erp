import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import type {
  BuyerPortalSummary,
  BuyerPortalUser,
  CreateBuyerPortalUserDto,
} from '@org/shared-types';
import { BuyerPortalApiService } from './buyer-portal.service';
import { MastersService } from '../masters/masters.service';

@Component({
  selector: 'app-buyer-portal',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    CardModule, TableModule, ButtonModule, DialogModule, InputTextModule,
    SelectModule, CheckboxModule, TagModule, ConfirmDialogModule, ToastModule,
  ],
  providers: [ConfirmationService, MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">Buyer Portal</h1>

      <div *ngIf="summary() as s" class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="rounded-lg bg-slate-50 border border-slate-200 p-4">
          <div class="text-xs font-medium text-slate-600 uppercase">Total Users</div>
          <div class="text-2xl font-bold text-slate-900 mt-1">{{ s.totalUsers }}</div>
        </div>
        <div class="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
          <div class="text-xs font-medium text-emerald-700 uppercase">Active</div>
          <div class="text-2xl font-bold text-emerald-900 mt-1">{{ s.activeUsers }}</div>
        </div>
        <div class="rounded-lg bg-amber-50 border border-amber-200 p-4">
          <div class="text-xs font-medium text-amber-700 uppercase">Pending Invites</div>
          <div class="text-2xl font-bold text-amber-900 mt-1">{{ s.pendingInvites }}</div>
        </div>
        <div class="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <div class="text-xs font-medium text-blue-700 uppercase">Buyers w/ Access</div>
          <div class="text-2xl font-bold text-blue-900 mt-1">{{ s.buyersWithAccess }}</div>
        </div>
      </div>

      <p-card>
        <div class="flex justify-between items-center mb-3">
          <div class="text-sm text-slate-600">Read-only access for buyer staff to view orders, samples, and shipments.</div>
          <p-button label="Invite User" icon="pi pi-plus" (onClick)="openCreate()" />
        </div>

        <p-table [value]="rows()" [loading]="loading()" stripedRows>
          <ng-template pTemplate="header">
            <tr>
              <th>Buyer</th><th>Name</th><th>Email</th>
              <th>Designation</th>
              <th>Scope</th>
              <th>Status</th>
              <th class="w-32"></th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-r>
            <tr>
              <td>
                <div class="font-mono text-xs text-slate-500">{{ r.buyerCode }}</div>
                <div class="text-sm">{{ r.buyerName }}</div>
              </td>
              <td class="font-medium">{{ r.fullName }}</td>
              <td class="text-sm">{{ r.email }}</td>
              <td class="text-sm text-slate-600">{{ r.designation }}</td>
              <td>
                <div class="flex flex-wrap gap-1">
                  <p-tag *ngIf="r.canViewOrders" value="Orders" severity="info" />
                  <p-tag *ngIf="r.canViewSamples" value="Samples" severity="info" />
                  <p-tag *ngIf="r.canViewProduction" value="WIP" severity="info" />
                  <p-tag *ngIf="r.canViewQuality" value="QC" severity="info" />
                  <p-tag *ngIf="r.canViewShipments" value="Ships" severity="info" />
                  <p-tag *ngIf="r.canViewInvoices" value="$" severity="warn" />
                </div>
              </td>
              <td>
                <p-tag *ngIf="r.isActive && !r.pendingInviteToken" value="Active" severity="success" />
                <p-tag *ngIf="r.isActive && r.pendingInviteToken" value="Invited" severity="warn" />
                <p-tag *ngIf="!r.isActive" value="Inactive" severity="secondary" />
              </td>
              <td>
                <p-button icon="pi pi-link" text rounded size="small" pTooltip="Copy invite link" (onClick)="copyInvite(r)" />
                <p-button icon="pi pi-refresh" text rounded size="small" pTooltip="Resend invite" (onClick)="resend(r)" />
                <p-button icon="pi pi-trash" severity="danger" text rounded size="small" (onClick)="confirmDelete(r)" />
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="7" class="text-center text-slate-500 py-8">No portal users invited yet.</td></tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '38rem' }" header="Invite Buyer User">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <div>
          <label class="text-sm font-medium text-slate-700 mb-1 block">Buyer *</label>
          <p-select [options]="buyerOptions()" formControlName="buyerId"
            optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body"
            placeholder="Select buyer" filter="true" filterBy="label" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Full Name *</label>
            <input pInputText class="w-full" formControlName="fullName" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Email *</label>
            <input pInputText class="w-full" formControlName="email" type="email" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Designation</label>
            <input pInputText class="w-full" formControlName="designation" placeholder="Production Manager" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700 mb-1 block">Phone</label>
            <input pInputText class="w-full" formControlName="phone" />
          </div>
        </div>
        <div class="border-t pt-3">
          <div class="text-sm font-medium text-slate-700 mb-2">Read-only access scope</div>
          <div class="grid grid-cols-3 gap-2">
            <label class="flex items-center gap-2"><p-checkbox formControlName="canViewOrders" [binary]="true" /> Orders</label>
            <label class="flex items-center gap-2"><p-checkbox formControlName="canViewSamples" [binary]="true" /> Samples</label>
            <label class="flex items-center gap-2"><p-checkbox formControlName="canViewProduction" [binary]="true" /> Production</label>
            <label class="flex items-center gap-2"><p-checkbox formControlName="canViewQuality" [binary]="true" /> Quality</label>
            <label class="flex items-center gap-2"><p-checkbox formControlName="canViewShipments" [binary]="true" /> Shipments</label>
            <label class="flex items-center gap-2"><p-checkbox formControlName="canViewInvoices" [binary]="true" /> Invoices</label>
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t">
          <p-button label="Cancel" severity="secondary" (onClick)="dialogOpen = false" />
          <p-button type="submit" label="Send Invite" [loading]="saving()" [disabled]="form.invalid" />
        </div>
      </form>
    </p-dialog>

    <p-confirmDialog />
    <p-toast position="bottom-right" />
  `,
})
export class BuyerPortalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(BuyerPortalApiService);
  private readonly masters = inject(MastersService);
  private readonly confirm = inject(ConfirmationService);
  private readonly toast = inject(MessageService);

  readonly rows = signal<BuyerPortalUser[]>([]);
  readonly summary = signal<BuyerPortalSummary | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly buyerOptions = signal<{ label: string; value: string }[]>([]);

  dialogOpen = false;

  readonly form = this.fb.group({
    buyerId: ['', Validators.required],
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    designation: [''],
    phone: [''],
    canViewOrders: [true],
    canViewSamples: [true],
    canViewProduction: [true],
    canViewQuality: [false],
    canViewShipments: [true],
    canViewInvoices: [false],
  });

  ngOnInit(): void {
    this.refresh();
    this.loadBuyers();
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listUsers().subscribe({
      next: (r) => { this.rows.set(r); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.api.getSummary().subscribe({ next: (s) => this.summary.set(s) });
  }

  loadBuyers(): void {
    this.masters.listBuyers().subscribe({
      next: (r) => this.buyerOptions.set(
        r.filter((b) => b.isActive ?? true).map((b) => ({ label: `${b.code} — ${b.name}`, value: b.id })),
      ),
    });
  }

  openCreate(): void {
    this.form.reset({
      buyerId: '',
      fullName: '',
      email: '',
      designation: '',
      phone: '',
      canViewOrders: true,
      canViewSamples: true,
      canViewProduction: true,
      canViewQuality: false,
      canViewShipments: true,
      canViewInvoices: false,
    });
    this.dialogOpen = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const dto: CreateBuyerPortalUserDto = {
      buyerId: v.buyerId!,
      fullName: v.fullName!,
      email: v.email!,
      designation: v.designation || null,
      phone: v.phone || null,
      canViewOrders: v.canViewOrders ?? true,
      canViewSamples: v.canViewSamples ?? true,
      canViewProduction: v.canViewProduction ?? true,
      canViewQuality: v.canViewQuality ?? false,
      canViewShipments: v.canViewShipments ?? true,
      canViewInvoices: v.canViewInvoices ?? false,
    };
    this.api.createUser(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen = false;
        this.refresh();
        this.toast.add({ severity: 'success', summary: 'Invite sent', detail: 'Buyer user created and invite link generated.' });
      },
      error: () => this.saving.set(false),
    });
  }

  copyInvite(r: BuyerPortalUser): void {
    if (!r.pendingInviteToken) {
      this.toast.add({ severity: 'info', summary: 'No pending invite', detail: 'User has already accepted.' });
      return;
    }
    const url = `${window.location.origin}/buyer-invite/${r.pendingInviteToken}`;
    navigator.clipboard.writeText(url).then(() => {
      this.toast.add({ severity: 'success', summary: 'Copied', detail: url });
    });
  }

  resend(r: BuyerPortalUser): void {
    this.api.resendInvite(r.id).subscribe({
      next: () => {
        this.refresh();
        this.toast.add({ severity: 'success', summary: 'Invite refreshed', detail: '14-day token issued.' });
      },
    });
  }

  confirmDelete(r: BuyerPortalUser): void {
    this.confirm.confirm({
      message: `Remove portal access for "${r.fullName}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.api.deleteUser(r.id).subscribe({ next: () => this.refresh() }),
    });
  }
}

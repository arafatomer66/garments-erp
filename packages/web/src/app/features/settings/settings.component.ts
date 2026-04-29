import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmationService, MessageService } from 'primeng/api';
import type {
  CreateTenantUserDto,
  Tenant,
  TenantUser,
  UpdateTenantSettingsDto,
  UpdateTenantUserDto,
  UserRole,
} from '@org/shared-types';
import { SettingsApiService } from './settings.service';

const COUNTRY_OPTIONS = [
  { label: 'Bangladesh', value: 'BD' },
  { label: 'India', value: 'IN' },
  { label: 'Pakistan', value: 'PK' },
  { label: 'Vietnam', value: 'VN' },
  { label: 'United States', value: 'US' },
  { label: 'United Kingdom', value: 'GB' },
];

const CURRENCY_OPTIONS = [
  { label: 'BDT — Bangladeshi Taka', value: 'BDT' },
  { label: 'USD — US Dollar', value: 'USD' },
  { label: 'EUR — Euro', value: 'EUR' },
  { label: 'GBP — British Pound', value: 'GBP' },
  { label: 'INR — Indian Rupee', value: 'INR' },
];

const TIMEZONE_OPTIONS = [
  { label: 'Asia/Dhaka', value: 'Asia/Dhaka' },
  { label: 'Asia/Kolkata', value: 'Asia/Kolkata' },
  { label: 'Asia/Karachi', value: 'Asia/Karachi' },
  { label: 'Asia/Ho_Chi_Minh', value: 'Asia/Ho_Chi_Minh' },
  { label: 'UTC', value: 'UTC' },
  { label: 'Europe/London', value: 'Europe/London' },
  { label: 'America/New_York', value: 'America/New_York' },
];

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    CardModule, TabsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, SelectModule, MultiSelectModule, TagModule,
    ConfirmDialogModule, ToastModule, ProgressSpinnerModule,
  ],
  providers: [ConfirmationService, MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-toast />
    <p-confirmDialog />
    <div class="space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">Settings</h1>

      <p-card>
        <p-tabs value="tenant">
          <p-tablist>
            <p-tab value="tenant">Tenant</p-tab>
            <p-tab value="users">Users & Roles</p-tab>
            <p-tab value="roles">Role Catalog</p-tab>
          </p-tablist>
          <p-tabpanels>
            <!-- Tenant tab -->
            <p-tabpanel value="tenant">
              <div *ngIf="!tenant()" class="flex justify-center py-8">
                <p-progressSpinner styleClass="w-8 h-8" />
              </div>
              <form *ngIf="tenant() as t" [formGroup]="tenantForm" class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Tenant Slug</label>
                  <input pInputText [value]="t.slug" disabled class="w-full" />
                  <p class="text-xs text-slate-500 mt-1">Cannot be changed.</p>
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Schema</label>
                  <input pInputText [value]="t.schemaName" disabled class="w-full font-mono text-xs" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Display Name</label>
                  <input pInputText formControlName="name" class="w-full" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Country</label>
                  <p-select formControlName="country" [options]="countries" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Currency</label>
                  <p-select formControlName="currencyCode" [options]="currencies" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Timezone</label>
                  <p-select formControlName="timezone" [options]="timezones" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full" />
                </div>
                <div class="md:col-span-2 flex items-center gap-2">
                  <p-button label="Save Changes" icon="pi pi-check" (onClick)="saveTenant()" [loading]="savingTenant()" />
                  <p-tag [severity]="t.status === 'active' ? 'success' : 'warn'" [value]="t.status" />
                </div>
              </form>
            </p-tabpanel>

            <!-- Users tab -->
            <p-tabpanel value="users">
              <div class="flex justify-between items-center mb-3">
                <div class="text-sm text-slate-600">Manage users with access to this tenant. Each user can hold multiple roles.</div>
                <p-button label="Add User" icon="pi pi-plus" (onClick)="openCreate()" />
              </div>
              <p-table [value]="users()" [loading]="loadingUsers()" stripedRows>
                <ng-template pTemplate="header">
                  <tr>
                    <th>Name</th><th>Email</th><th>Phone</th><th>Roles</th><th>Status</th><th class="w-32"></th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-u>
                  <tr>
                    <td class="font-medium">{{ u.fullName }}</td>
                    <td class="text-sm">{{ u.email }}</td>
                    <td class="text-sm text-slate-600">{{ u.phone || '—' }}</td>
                    <td>
                      <div class="flex flex-wrap gap-1">
                        <p-tag *ngFor="let r of u.roles" [value]="formatRole(r)" severity="info" />
                      </div>
                    </td>
                    <td>
                      <p-tag [severity]="u.isActive ? 'success' : 'secondary'" [value]="u.isActive ? 'Active' : 'Disabled'" />
                    </td>
                    <td class="flex gap-1">
                      <p-button icon="pi pi-pencil" severity="secondary" text rounded (onClick)="openEdit(u)" pTooltip="Edit" />
                      <p-button icon="pi pi-trash" severity="danger" text rounded (onClick)="confirmDelete(u)" pTooltip="Remove" />
                    </td>
                  </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                  <tr><td colspan="6" class="text-center text-slate-500 py-4">No users yet.</td></tr>
                </ng-template>
              </p-table>
            </p-tabpanel>

            <!-- Roles tab -->
            <p-tabpanel value="roles">
              <p class="text-sm text-slate-600 mb-3">
                System role catalog. Each role grants a fixed set of permissions across the ERP modules.
                Custom roles are not yet supported.
              </p>
              <p-table [value]="roleCatalog" stripedRows>
                <ng-template pTemplate="header">
                  <tr>
                    <th>Role Code</th><th>Display</th><th>Module Coverage</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-r>
                  <tr>
                    <td class="font-mono text-xs">{{ r.code }}</td>
                    <td class="font-medium">{{ r.label }}</td>
                    <td class="text-sm text-slate-600">{{ r.coverage }}</td>
                  </tr>
                </ng-template>
              </p-table>
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </p-card>
    </div>

    <!-- Create / Edit user dialog -->
    <p-dialog
      [(visible)]="dialogVisible"
      [modal]="true"
      [style]="{ width: '520px' }"
      [header]="editingUserId() ? 'Edit User' : 'Add User'"
      (onHide)="closeDialog()"
    >
      <form [formGroup]="userForm" class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Email</label>
          <input pInputText formControlName="email" class="w-full" [readonly]="!!editingUserId()" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
          <input pInputText formControlName="fullName" class="w-full" />
        </div>
        <div *ngIf="!editingUserId()">
          <label class="block text-xs font-medium text-slate-600 mb-1">Initial Password</label>
          <input pInputText type="password" formControlName="password" class="w-full" />
          <p class="text-xs text-slate-500 mt-1">Min 8 characters. Share with the user securely.</p>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Phone (optional)</label>
          <input pInputText formControlName="phone" class="w-full" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Roles</label>
          <p-multiSelect
            formControlName="roles"
            [options]="roleOptions()"
            optionLabel="label"
            optionValue="value"
            placeholder="Select roles"
            display="chip"
            appendTo="body"
            styleClass="w-full"
          />
        </div>
      </form>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" (onClick)="closeDialog()" />
        <p-button [label]="editingUserId() ? 'Save' : 'Create'" icon="pi pi-check" (onClick)="saveUser()" [loading]="savingUser()" />
      </ng-template>
    </p-dialog>
  `,
})
export class SettingsComponent implements OnInit {
  private readonly api = inject(SettingsApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly countries = COUNTRY_OPTIONS;
  readonly currencies = CURRENCY_OPTIONS;
  readonly timezones = TIMEZONE_OPTIONS;

  readonly tenant = signal<Tenant | null>(null);
  readonly users = signal<TenantUser[]>([]);
  readonly roles = signal<UserRole[]>([]);

  readonly loadingUsers = signal(false);
  readonly savingTenant = signal(false);
  readonly savingUser = signal(false);
  readonly dialogVisible = signal(false);
  readonly editingUserId = signal<string | null>(null);

  readonly tenantForm = this.fb.group({
    name: ['', Validators.required],
    country: ['BD'],
    currencyCode: ['BDT'],
    timezone: ['Asia/Dhaka'],
  });

  readonly userForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    fullName: ['', Validators.required],
    password: [''],
    phone: [''],
    roles: [[] as UserRole[], Validators.required],
  });

  readonly roleCatalog = [
    { code: 'tenant_owner', label: 'Tenant Owner', coverage: 'Full access. Cannot be removed by other admins.' },
    { code: 'tenant_admin', label: 'Tenant Admin', coverage: 'All modules + user management.' },
    { code: 'merchandiser', label: 'Merchandiser', coverage: 'Buyers, styles, tech-packs, T&A, costing.' },
    { code: 'production_manager', label: 'Production Manager', coverage: 'Cutting, lines, hourly board, bundles.' },
    { code: 'qc_manager', label: 'QC Manager', coverage: 'Inline + end-line QC, AQL, DHU.' },
    { code: 'store_keeper', label: 'Store Keeper', coverage: 'Inventory: fabric inspection, stock lots, movements.' },
    { code: 'finance', label: 'Finance', coverage: 'AR/AP, payments, banks, tax codes, FX.' },
    { code: 'hr', label: 'HR', coverage: 'Employees, attendance, leave, payroll.' },
    { code: 'floor_supervisor', label: 'Floor Supervisor', coverage: 'Read-only production view + bundle scan.' },
    { code: 'viewer', label: 'Viewer', coverage: 'Read-only across all modules.' },
    { code: 'platform_admin', label: 'Platform Admin', coverage: 'Cross-tenant admin (SaaS operator only).' },
  ];

  roleOptions(): { label: string; value: UserRole }[] {
    return this.roleCatalog
      .filter((r) => this.roles().includes(r.code as UserRole))
      .map((r) => ({ label: r.label, value: r.code as UserRole }));
  }

  ngOnInit(): void {
    this.api.getTenant().subscribe((t) => {
      this.tenant.set(t);
      this.tenantForm.patchValue({
        name: t.name,
        country: t.country,
        currencyCode: t.currencyCode,
        timezone: t.timezone,
      });
    });
    this.api.listRoles().subscribe((r) => this.roles.set(r));
    this.refreshUsers();
  }

  private refreshUsers(): void {
    this.loadingUsers.set(true);
    this.api.listUsers().subscribe({
      next: (u) => {
        this.users.set(u);
        this.loadingUsers.set(false);
      },
      error: () => this.loadingUsers.set(false),
    });
  }

  saveTenant(): void {
    if (this.tenantForm.invalid) return;
    this.savingTenant.set(true);
    const dto: UpdateTenantSettingsDto = this.tenantForm.value as UpdateTenantSettingsDto;
    this.api.updateTenant(dto).subscribe({
      next: (t) => {
        this.tenant.set(t);
        this.savingTenant.set(false);
        this.toast.add({ severity: 'success', summary: 'Saved', detail: 'Tenant settings updated.' });
      },
      error: (e) => {
        this.savingTenant.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: e.error?.message ?? 'Update failed' });
      },
    });
  }

  openCreate(): void {
    this.editingUserId.set(null);
    this.userForm.reset({
      email: '',
      fullName: '',
      password: '',
      phone: '',
      roles: [],
    });
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.dialogVisible.set(true);
  }

  openEdit(u: TenantUser): void {
    this.editingUserId.set(u.userId);
    this.userForm.reset({
      email: u.email,
      fullName: u.fullName,
      password: '',
      phone: u.phone ?? '',
      roles: u.roles,
    });
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
  }

  saveUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }
    this.savingUser.set(true);
    const v = this.userForm.value;
    const id = this.editingUserId();
    const obs = id
      ? this.api.updateUser(id, {
          fullName: v.fullName ?? undefined,
          phone: v.phone || undefined,
          roles: (v.roles ?? []) as UserRole[],
        } as UpdateTenantUserDto)
      : this.api.createUser({
          email: v.email!,
          fullName: v.fullName!,
          password: v.password!,
          phone: v.phone || undefined,
          roles: (v.roles ?? []) as UserRole[],
        } as CreateTenantUserDto);

    obs.subscribe({
      next: () => {
        this.savingUser.set(false);
        this.dialogVisible.set(false);
        this.toast.add({
          severity: 'success',
          summary: 'Saved',
          detail: id ? 'User updated.' : 'User added.',
        });
        this.refreshUsers();
      },
      error: (e) => {
        this.savingUser.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: e.error?.message ?? 'Save failed' });
      },
    });
  }

  confirmDelete(u: TenantUser): void {
    this.confirm.confirm({
      message: `Remove ${u.fullName} from this tenant?`,
      header: 'Confirm Remove',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.api.deleteUser(u.userId).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Removed', detail: `${u.fullName} removed.` });
            this.refreshUsers();
          },
          error: (e) => {
            this.toast.add({ severity: 'error', summary: 'Error', detail: e.error?.message ?? 'Remove failed' });
          },
        });
      },
    });
  }

  formatRole(r: UserRole): string {
    return r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

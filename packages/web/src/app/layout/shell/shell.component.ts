import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  path: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ButtonModule, MenuModule, AvatarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-screen overflow-hidden bg-slate-50">
      <aside
        class="flex flex-col border-r border-slate-200 bg-white transition-all duration-200"
        [class.w-64]="!collapsed()"
        [class.w-16]="collapsed()"
      >
        <div class="flex h-14 items-center justify-between border-b border-slate-200 px-4">
          <span class="font-semibold text-slate-900" *ngIf="!collapsed()">Garments ERP</span>
          <button
            type="button"
            class="rounded p-1 text-slate-500 hover:bg-slate-100"
            (click)="collapsed.set(!collapsed())"
            [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
          >
            <i class="pi" [class.pi-angle-left]="!collapsed()" [class.pi-angle-right]="collapsed()"></i>
          </button>
        </div>
        <nav class="flex-1 overflow-y-auto py-2">
          <a
            *ngFor="let item of nav"
            [routerLink]="item.path"
            routerLinkActive="bg-brand-50 text-brand-700"
            class="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            <i class="pi" [class]="item.icon"></i>
            <span *ngIf="!collapsed()">{{ item.label }}</span>
          </a>
        </nav>
      </aside>

      <div class="flex flex-1 flex-col overflow-hidden">
        <header class="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div class="text-sm text-slate-600">
            <span class="font-medium text-slate-900">{{ tenantName() }}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm text-slate-600">{{ userName() }}</span>
            <p-button icon="pi pi-sign-out" severity="secondary" text rounded (onClick)="logout()"></p-button>
          </div>
        </header>
        <main class="flex-1 overflow-y-auto p-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent {
  private readonly auth = inject(AuthService);

  readonly collapsed = signal(false);

  readonly tenantName = computed(() => this.auth.currentTenant()?.name ?? '');
  readonly userName = computed(() => this.auth.currentUser()?.fullName ?? '');

  readonly nav: NavItem[] = [
    { label: 'Dashboard', icon: 'pi-home', path: '/dashboard' },
    { label: 'Masters', icon: 'pi-database', path: '/masters' },
    { label: 'Merchandising', icon: 'pi-palette', path: '/merchandising' },
    { label: 'Orders', icon: 'pi-shopping-cart', path: '/orders' },
    { label: 'BOM & Costing', icon: 'pi-list', path: '/bom' },
    { label: 'Procurement', icon: 'pi-truck', path: '/procurement' },
    { label: 'Inventory', icon: 'pi-box', path: '/inventory' },
    { label: 'Production', icon: 'pi-cog', path: '/production' },
    { label: 'Quality', icon: 'pi-check-circle', path: '/quality' },
    { label: 'Shipment', icon: 'pi-send', path: '/shipment' },
    { label: 'HR & Payroll', icon: 'pi-users', path: '/hr' },
    { label: 'Finance & VAT', icon: 'pi-dollar', path: '/finance' },
    { label: 'Compliance', icon: 'pi-shield', path: '/compliance' },
    { label: 'Analytics', icon: 'pi-chart-bar', path: '/analytics' },
    { label: 'Settings', icon: 'pi-cog', path: '/settings' },
  ];

  logout(): void {
    this.auth.logout();
  }
}

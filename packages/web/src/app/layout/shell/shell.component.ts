import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { filter, map, startWith } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  path: string;
}
interface NavGroup {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ButtonModule,
    MenuModule,
    AvatarModule,
    BadgeModule,
    InputTextModule,
    TooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-screen overflow-hidden bg-ink-50">
      <!-- ===================== SIDEBAR ===================== -->
      <aside
        class="flex flex-col bg-sidebar-gradient text-ink-300 shadow-premium transition-[width] duration-200"
        [class.w-64]="!collapsed()"
        [class.w-16]="collapsed()"
      >
        <!-- Brand block -->
        <div
          class="flex h-16 items-center justify-between border-b border-white/5 px-4"
        >
          <div class="flex items-center gap-2.5 overflow-hidden">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md"
            >
              <i class="pi pi-bolt text-base"></i>
            </div>
            <div *ngIf="!collapsed()" class="leading-tight">
              <div class="text-sm font-semibold text-white">Garments ERP</div>
              <div class="text-[11px] uppercase tracking-wider text-ink-400">
                {{ tenantName() || 'Demo' }}
              </div>
            </div>
          </div>
          <button
            type="button"
            class="rounded-md p-1.5 text-ink-400 hover:bg-white/5 hover:text-white"
            (click)="collapsed.set(!collapsed())"
            [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
          >
            <i
              class="pi text-xs"
              [class.pi-angle-left]="!collapsed()"
              [class.pi-angle-right]="collapsed()"
            ></i>
          </button>
        </div>

        <!-- Nav -->
        <nav class="flex-1 overflow-y-auto py-3">
          <div *ngFor="let group of navGroups; let first = first" class="mb-2">
            <div
              *ngIf="!collapsed()"
              class="px-5 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500"
              [class.mt-0]="first"
            >
              {{ group.title }}
            </div>
            <a
              *ngFor="let item of group.items"
              [routerLink]="item.path"
              routerLinkActive="active"
              class="nav-link"
              [pTooltip]="collapsed() ? item.label : ''"
              tooltipPosition="right"
              [tooltipDisabled]="!collapsed()"
            >
              <i class="pi" [class]="item.icon"></i>
              <span *ngIf="!collapsed()" class="truncate">{{ item.label }}</span>
            </a>
          </div>
        </nav>

        <!-- Footer (version pill) -->
        <div
          *ngIf="!collapsed()"
          class="border-t border-white/5 px-4 py-3 text-[11px] text-ink-500"
        >
          <div class="flex items-center justify-between">
            <span>v0.3.0 · Phase 3</span>
            <span class="flex items-center gap-1.5">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20"></span>
              Live
            </span>
          </div>
        </div>
      </aside>

      <!-- ===================== MAIN ===================== -->
      <div class="flex flex-1 flex-col overflow-hidden">
        <!-- ===== TOPBAR ===== -->
        <header
          class="flex h-16 items-center justify-between border-b border-ink-200 bg-white px-6 shadow-soft"
        >
          <!-- Breadcrumbs -->
          <div class="flex items-center gap-3 text-sm">
            <nav class="flex items-center gap-1.5 text-ink-500">
              <i class="pi pi-home text-xs"></i>
              <span class="text-ink-400">/</span>
              <span class="font-medium text-ink-900">{{ pageTitle() }}</span>
            </nav>
          </div>

          <!-- Search -->
          <div class="hidden flex-1 px-12 lg:block">
            <div class="relative mx-auto max-w-md">
              <i
                class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-400"
              ></i>
              <input
                type="text"
                placeholder="Search orders, styles, buyers…"
                class="w-full rounded-lg border border-ink-200 bg-ink-50 py-2 pl-9 pr-12 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/15"
              />
              <span
                class="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-ink-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink-500"
                >⌘K</span
              >
            </div>
          </div>

          <!-- Right cluster -->
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              class="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900"
              pTooltip="Notifications"
              tooltipPosition="bottom"
            >
              <i class="pi pi-bell text-sm"></i>
              <span
                class="absolute right-1.5 top-1.5 flex h-2 w-2 items-center justify-center rounded-full bg-rose-500 ring-2 ring-white"
              ></span>
            </button>
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900"
              pTooltip="Help"
              tooltipPosition="bottom"
              [routerLink]="['/user-guide']"
            >
              <i class="pi pi-question-circle text-sm"></i>
            </button>

            <div class="mx-2 hidden h-8 w-px bg-ink-200 md:block"></div>

            <!-- Avatar + name -->
            <div class="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-ink-50">
              <div
                class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-semibold text-white shadow-sm"
              >
                {{ initials() }}
              </div>
              <div class="hidden leading-tight md:block">
                <div class="text-sm font-medium text-ink-900">{{ userName() }}</div>
                <div class="text-[11px] text-ink-500">{{ userRole() }}</div>
              </div>
              <button
                type="button"
                class="ml-1 rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-rose-600"
                pTooltip="Sign out"
                tooltipPosition="bottom"
                (click)="logout()"
              >
                <i class="pi pi-sign-out text-sm"></i>
              </button>
            </div>
          </div>
        </header>

        <!-- ===== PAGE CONTENT ===== -->
        <main
          class="flex-1 overflow-y-auto bg-ink-50 bg-page-grid p-6 [background-size:24px_24px]"
        >
          <div class="mx-auto max-w-[1600px]">
            <router-outlet />
          </div>
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly collapsed = signal(false);

  readonly tenantName = computed(() => this.auth.currentTenant()?.name ?? '');
  readonly userName = computed(() => this.auth.currentUser()?.fullName ?? '');
  readonly userRole = computed(() => {
    const roles = this.auth.session()?.roles ?? [];
    return roles[0]?.replace('tenant_', '').replace('_', ' ') ?? 'member';
  });
  readonly initials = computed(() => {
    const name = this.userName();
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  });

  readonly navGroups: NavGroup[] = [
    {
      title: 'Overview',
      items: [{ label: 'Dashboard', icon: 'pi-th-large', path: '/dashboard' }],
    },
    {
      title: 'Plan',
      items: [
        { label: 'Masters', icon: 'pi-database', path: '/masters' },
        { label: 'Merchandising', icon: 'pi-palette', path: '/merchandising' },
        { label: 'Orders', icon: 'pi-shopping-cart', path: '/orders' },
        { label: 'BOM & Costing', icon: 'pi-list', path: '/bom' },
      ],
    },
    {
      title: 'Source & Make',
      items: [
        { label: 'Procurement', icon: 'pi-truck', path: '/procurement' },
        { label: 'Inventory', icon: 'pi-box', path: '/inventory' },
        { label: 'Production', icon: 'pi-cog', path: '/production' },
        { label: 'Quality', icon: 'pi-check-circle', path: '/quality' },
      ],
    },
    {
      title: 'Ship & Invoice',
      items: [
        { label: 'Shipment', icon: 'pi-send', path: '/shipment' },
        { label: 'Finance & VAT', icon: 'pi-dollar', path: '/finance' },
        { label: 'HR & Payroll', icon: 'pi-users', path: '/hr' },
        { label: 'Compliance', icon: 'pi-shield', path: '/compliance' },
      ],
    },
    {
      title: 'Insight',
      items: [
        { label: 'Buyer Portal', icon: 'pi-id-card', path: '/buyer-portal' },
        { label: 'Analytics', icon: 'pi-chart-bar', path: '/analytics' },
        { label: 'Forecasting', icon: 'pi-chart-line', path: '/forecasting' },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Settings', icon: 'pi-sliders-h', path: '/settings' },
        { label: 'User Guide', icon: 'pi-book', path: '/user-guide' },
      ],
    },
  ];

  private get allItems(): NavItem[] {
    return this.navGroups.flatMap((g) => g.items);
  }

  readonly pageTitle = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        const url = this.router.url.split('?')[0].split('/').filter(Boolean)[0] ?? 'dashboard';
        const label = this.allItems.find((i) => i.path === '/' + url)?.label;
        return label ?? this.titleize(url);
      }),
    ),
    { initialValue: 'Dashboard' },
  );

  private titleize(slug: string): string {
    return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  logout(): void {
    this.auth.logout();
  }
}

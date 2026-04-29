import { Route } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const appRoutes: Route[] = [
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'masters',
        loadComponent: () =>
          import('./features/masters/masters.component').then((m) => m.MastersComponent),
      },
      {
        path: 'merchandising',
        loadComponent: () =>
          import('./features/merchandising/merchandising.component').then(
            (m) => m.MerchandisingComponent,
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/orders/orders.component').then((m) => m.OrdersComponent),
      },
      {
        path: 'bom',
        loadComponent: () =>
          import('./features/bom/bom.component').then((m) => m.BomComponent),
      },
      {
        path: 'procurement',
        loadComponent: () =>
          import('./features/procurement/procurement.component').then(
            (m) => m.ProcurementComponent,
          ),
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./features/inventory/inventory.component').then((m) => m.InventoryComponent),
      },
      {
        path: 'production',
        loadComponent: () =>
          import('./features/production/production.component').then((m) => m.ProductionComponent),
      },
      {
        path: 'quality',
        loadComponent: () =>
          import('./features/quality/quality.component').then((m) => m.QualityComponent),
      },
      {
        path: 'shipment',
        loadComponent: () =>
          import('./features/shipment/shipment.component').then((m) => m.ShipmentComponent),
      },
      {
        path: 'hr',
        loadComponent: () =>
          import('./features/hr/hr.component').then((m) => m.HrComponent),
      },
      {
        path: 'finance',
        loadComponent: () =>
          import('./features/finance/finance.component').then((m) => m.FinanceComponent),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./features/placeholder/placeholder.component').then((m) => m.PlaceholderComponent),
        data: { title: 'Analytics' },
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/placeholder/placeholder.component').then((m) => m.PlaceholderComponent),
        data: { title: 'Settings' },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

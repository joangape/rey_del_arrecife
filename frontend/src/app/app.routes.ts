import { Routes } from '@angular/router';
import { authGuard, unauthGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'inventario',
  },
  {
    path: 'login',
    canActivate: [unauthGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/layout/app-shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      {
        path: 'inventario',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/inventario/inventario-list/inventario-list.component').then(
                (m) => m.InventarioListComponent
              ),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/inventario/inventario-detail/inventario-detail.component').then(
                (m) => m.InventarioDetailComponent
              ),
          },
        ],
      },
      {
        path: 'gastos',
        loadComponent: () =>
          import('./features/gastos/gastos-list/gastos-list.component').then(
            (m) => m.GastosListComponent
          ),
      },
      {
        path: 'admin/usuarios',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () =>
          import('./features/admin/usuarios/usuarios.component').then(
            (m) => m.UsuariosComponent
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'inventario',
  },
];

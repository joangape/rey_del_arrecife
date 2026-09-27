import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-inventario-list',
  standalone: true,
  templateUrl: './inventario-list.component.html',
  styleUrl: './inventario-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventarioListComponent {}

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-inventario-detail',
  standalone: true,
  templateUrl: './inventario-detail.component.html',
  styleUrl: './inventario-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventarioDetailComponent {}

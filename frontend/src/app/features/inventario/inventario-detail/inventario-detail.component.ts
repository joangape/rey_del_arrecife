import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-inventario-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './inventario-detail.component.html',
  styleUrl: './inventario-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventarioDetailComponent {}

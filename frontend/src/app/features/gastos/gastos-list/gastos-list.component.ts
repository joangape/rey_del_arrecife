import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-gastos-list',
  standalone: true,
  templateUrl: './gastos-list.component.html',
  styleUrl: './gastos-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GastosListComponent {}

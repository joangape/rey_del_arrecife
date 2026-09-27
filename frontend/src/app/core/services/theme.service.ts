import { Injectable, computed, signal } from '@angular/core';

export type AppTheme = 'dark' | 'light';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly STORAGE_KEY = 'rda_theme';

  // Deep Marine (Dark Mode) por defecto según directrices UI/UX
  private readonly _theme = signal<AppTheme>(this.getInitialTheme());
  readonly theme = this._theme.asReadonly();
  readonly isDark = computed(() => this._theme() === 'dark');

  constructor() {
    this.applyTheme(this._theme());
  }

  private getInitialTheme(): AppTheme {
    if (typeof window === 'undefined') {
      return 'dark';
    }
    const saved = localStorage.getItem(this.STORAGE_KEY) as AppTheme | null;
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    // Por defecto siempre dark
    return 'dark';
  }

  toggleTheme(): void {
    const nextTheme: AppTheme = this._theme() === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }

  setTheme(theme: AppTheme): void {
    this._theme.set(theme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, theme);
      this.applyTheme(theme);
    }
  }

  private applyTheme(theme: AppTheme): void {
    if (typeof document === 'undefined') {
      return;
    }
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LayoutStateService {
  private readonly SIDEBAR_KEY = 'rda_sidebar_collapsed';

  readonly isSidebarCollapsed = signal<boolean>(this.getInitialSidebarState());
  readonly isMobileDrawerOpen = signal<boolean>(false);
  readonly searchQuery = signal<string>('');

  private getInitialSidebarState(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return localStorage.getItem(this.SIDEBAR_KEY) === 'true';
  }

  toggleSidebar(): void {
    const next = !this.isSidebarCollapsed();
    this.isSidebarCollapsed.set(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.SIDEBAR_KEY, String(next));
    }
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.isSidebarCollapsed.set(collapsed);
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.SIDEBAR_KEY, String(collapsed));
    }
  }

  toggleMobileDrawer(): void {
    this.isMobileDrawerOpen.update((v) => !v);
  }

  closeMobileDrawer(): void {
    this.isMobileDrawerOpen.set(false);
  }
}

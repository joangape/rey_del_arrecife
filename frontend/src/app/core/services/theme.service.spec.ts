import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    TestBed.configureTestingModule({
      providers: [ThemeService],
    });
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('should be created and default to dark theme', () => {
    expect(service).toBeTruthy();
    expect(service.theme()).toBe('dark');
    expect(service.isDark()).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should toggle theme from dark to light and back to dark', () => {
    service.toggleTheme();
    expect(service.theme()).toBe('light');
    expect(service.isDark()).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('rda_theme')).toBe('light');

    service.toggleTheme();
    expect(service.theme()).toBe('dark');
    expect(service.isDark()).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('rda_theme')).toBe('dark');
  });

  it('should set theme explicitly', () => {
    service.setTheme('light');
    expect(service.theme()).toBe('light');
    expect(service.isDark()).toBe(false);
    expect(localStorage.getItem('rda_theme')).toBe('light');
  });
});

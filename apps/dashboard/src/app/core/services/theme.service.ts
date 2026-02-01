import { Injectable, signal, computed, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * ============================================================================
 * THEME SERVICE - Signal-Based Dark/Light Mode Manager
 * ============================================================================
 * 
 * ARCHITECTURAL DECISIONS:
 * 
 * 1. SIGNAL-BASED STATE:
 *    - Uses Angular Signals for reactive theme state management
 *    - Computed signals derive isDarkMode from theme preference
 *    - Effect() automatically syncs DOM class and localStorage
 * 
 * 2. FOUC (Flash of Unstyled Content) PREVENTION:
 *    - Theme is applied via inline script in index.html BEFORE Angular bootstraps
 *    - Service reads existing state rather than re-applying on init
 *    - This ensures no flash between server render and client hydration
 * 
 * 3. SYSTEM PREFERENCE SUPPORT:
 *    - 'system' mode respects OS-level dark mode preference
 *    - Uses matchMedia listener for real-time system preference changes
 *    - Automatically updates when user changes OS theme
 * 
 * 4. PERSISTENCE:
 *    - Theme preference stored in localStorage under 'theme-preference'
 *    - Survives page reloads and browser sessions
 * 
 * ============================================================================
 */

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly STORAGE_KEY = 'theme-preference';
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // Internal signal for system preference (updated by matchMedia listener)
  private readonly _systemPrefersDark = signal<boolean>(false);
  
  // Main theme preference signal
  private readonly _themeMode = signal<ThemeMode>(this.getStoredTheme());

  // Public readonly signals
  readonly themeMode = this._themeMode.asReadonly();
  readonly systemPrefersDark = this._systemPrefersDark.asReadonly();

  /**
   * Computed signal that resolves the actual dark mode state
   * Handles 'system' mode by checking OS preference
   */
  readonly isDarkMode = computed(() => {
    const mode = this._themeMode();
    if (mode === 'system') {
      return this._systemPrefersDark();
    }
    return mode === 'dark';
  });

  /**
   * Computed signal for UI display text
   */
  readonly themeModeLabel = computed(() => {
    const mode = this._themeMode();
    switch (mode) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      case 'system': return 'System';
    }
  });

  constructor() {
    if (this.isBrowser) {
      // Initialize system preference
      this.initSystemPreferenceListener();
      
      // Effect to sync theme to DOM and localStorage
      effect(() => {
        const isDark = this.isDarkMode();
        this.applyThemeToDOM(isDark);
      });

      // Effect to persist theme preference
      effect(() => {
        const mode = this._themeMode();
        this.persistTheme(mode);
      });
    }
  }

  /**
   * Set theme mode (light, dark, or system)
   */
  setThemeMode(mode: ThemeMode): void {
    this._themeMode.set(mode);
  }

  /**
   * Toggle between light and dark (skips system)
   */
  toggleTheme(): void {
    const current = this._themeMode();
    if (current === 'dark' || (current === 'system' && this._systemPrefersDark())) {
      this._themeMode.set('light');
    } else {
      this._themeMode.set('dark');
    }
  }

  /**
   * Cycle through all three modes: light → dark → system → light
   */
  cycleThemeMode(): void {
    const current = this._themeMode();
    const cycle: ThemeMode[] = ['light', 'dark', 'system'];
    const currentIndex = cycle.indexOf(current);
    const nextIndex = (currentIndex + 1) % cycle.length;
    this._themeMode.set(cycle[nextIndex]);
  }

  /**
   * Initialize matchMedia listener for system preference changes
   */
  private initSystemPreferenceListener(): void {
    if (!this.isBrowser) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Set initial value
    this._systemPrefersDark.set(mediaQuery.matches);
    
    // Listen for changes
    const handler = (e: MediaQueryListEvent) => {
      this._systemPrefersDark.set(e.matches);
    };
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      // Legacy browsers
      mediaQuery.addListener(handler);
    }
  }

  /**
   * Apply theme class to document element
   */
  private applyThemeToDOM(isDark: boolean): void {
    if (!this.isBrowser) return;

    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  /**
   * Get stored theme from localStorage
   */
  private getStoredTheme(): ThemeMode {
    if (!this.isBrowser) return 'system';

    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return 'system'; // Default to system preference
  }

  /**
   * Persist theme preference to localStorage
   */
  private persistTheme(mode: ThemeMode): void {
    if (!this.isBrowser) return;
    localStorage.setItem(this.STORAGE_KEY, mode);
  }
}

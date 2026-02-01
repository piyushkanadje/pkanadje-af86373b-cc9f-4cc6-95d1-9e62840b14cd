import { Injectable, inject, NgZone, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, fromEvent, filter, takeUntil } from 'rxjs';

/**
 * ============================================================================
 * SHORTCUT SERVICE - Centralized Keyboard Shortcut Manager
 * ============================================================================
 * 
 * ARCHITECTURAL DECISIONS:
 * 
 * 1. CENTRALIZED EVENT HANDLING:
 *    - Single keydown listener instead of HostListener in every component
 *    - Prevents memory leaks from scattered event listeners
 *    - Easy to manage, test, and extend shortcuts
 * 
 * 2. RxJS fromEvent OUTSIDE ANGULAR ZONE:
 *    - Event listener runs outside NgZone for performance
 *    - Only re-enters zone when actually handling a shortcut
 *    - Prevents unnecessary change detection cycles
 * 
 * 3. SUBJECT-BASED EVENT EMISSION:
 *    - Components subscribe to specific shortcut subjects
 *    - Loose coupling - service doesn't know about components
 *    - Easy to add new shortcuts without modifying components
 * 
 * 4. PROPER CLEANUP:
 *    - Uses takeUntil pattern for automatic cleanup
 *    - OnDestroy implementation for service cleanup
 *    - No memory leaks on app destruction
 * 
 * 5. INPUT ELEMENT AWARENESS:
 *    - Shortcuts are disabled when user is typing in inputs/textareas
 *    - Prevents accidental shortcut triggers during data entry
 * 
 * GOTCHAS:
 *    - Mac uses Cmd (metaKey), Windows/Linux uses Ctrl (ctrlKey)
 *    - Need to check both for cross-platform support
 *    - Escape key should work regardless of modifier keys
 * 
 * ============================================================================
 */

export interface ShortcutEvent {
  key: string;
  originalEvent: KeyboardEvent;
}

@Injectable({
  providedIn: 'root',
})
export class ShortcutService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  
  private readonly destroy$ = new Subject<void>();

  // Shortcut event subjects - components subscribe to these
  readonly newTask$ = new Subject<ShortcutEvent>();
  readonly escape$ = new Subject<ShortcutEvent>();
  readonly save$ = new Subject<ShortcutEvent>();
  readonly search$ = new Subject<ShortcutEvent>();
  readonly help$ = new Subject<ShortcutEvent>();

  constructor() {
    if (this.isBrowser) {
      this.initKeyboardListener();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize the global keyboard listener outside Angular zone
   */
  private initKeyboardListener(): void {
    // Run outside Angular zone for performance
    this.ngZone.runOutsideAngular(() => {
      fromEvent<KeyboardEvent>(document, 'keydown')
        .pipe(
          // Filter out events when user is typing in input fields
          filter(event => !this.isTypingInInput(event)),
          takeUntil(this.destroy$)
        )
        .subscribe(event => {
          this.handleKeydown(event);
        });
    });
  }

  /**
   * Check if user is currently typing in an input element
   */
  private isTypingInInput(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    const isContentEditable = target.isContentEditable;
    
    // Allow Escape to work even in input fields
    if (event.key === 'Escape') {
      return false;
    }
    
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      isContentEditable
    );
  }

  /**
   * Handle keydown events and emit to appropriate subjects
   */
  private handleKeydown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifierKey = isMac ? event.metaKey : event.ctrlKey;
    const shortcutEvent: ShortcutEvent = { key, originalEvent: event };

    // Re-enter Angular zone when emitting events
    // This ensures change detection runs for subscribers

    // Ctrl/Cmd + N → New Task
    if (modifierKey && key === 'n') {
      event.preventDefault();
      this.ngZone.run(() => this.newTask$.next(shortcutEvent));
      return;
    }

    // Ctrl/Cmd + S → Save
    if (modifierKey && key === 's') {
      event.preventDefault();
      this.ngZone.run(() => this.save$.next(shortcutEvent));
      return;
    }

    // Ctrl/Cmd + K → Search (common convention)
    if (modifierKey && key === 'k') {
      event.preventDefault();
      this.ngZone.run(() => this.search$.next(shortcutEvent));
      return;
    }

    // Escape → Close modals/Clear selection
    if (key === 'escape') {
      event.preventDefault();
      this.ngZone.run(() => this.escape$.next(shortcutEvent));
      return;
    }

    // ? → Help (show shortcuts)
    if (key === '?' && event.shiftKey) {
      event.preventDefault();
      this.ngZone.run(() => this.help$.next(shortcutEvent));
      return;
    }
  }

  /**
   * Get human-readable shortcut label for display
   */
  getShortcutLabel(shortcut: 'newTask' | 'escape' | 'save' | 'search' | 'help'): string {
    const isMac = this.isBrowser && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? '⌘' : 'Ctrl';

    switch (shortcut) {
      case 'newTask': return `${modifier} + N`;
      case 'save': return `${modifier} + S`;
      case 'search': return `${modifier} + K`;
      case 'escape': return 'Esc';
      case 'help': return '?';
    }
  }

  /**
   * Get all available shortcuts for help display
   */
  getAllShortcuts(): Array<{ action: string; shortcut: string }> {
    return [
      { action: 'New Task', shortcut: this.getShortcutLabel('newTask') },
      { action: 'Save', shortcut: this.getShortcutLabel('save') },
      { action: 'Search', shortcut: this.getShortcutLabel('search') },
      { action: 'Close/Cancel', shortcut: this.getShortcutLabel('escape') },
      { action: 'Show Help', shortcut: this.getShortcutLabel('help') },
    ];
  }
}

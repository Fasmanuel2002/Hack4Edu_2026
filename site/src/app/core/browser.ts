import { DOCUMENT, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Media queries as signals. On the server (prerender) they keep their defaults. */
@Injectable({ providedIn: 'root' })
export class MediaQueries {
  readonly reducedMotion = signal(false);
  /** Below 768px the sidebar is a drawer. */
  readonly mobile = signal(false);

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return;
    }
    bind('(prefers-reduced-motion: reduce)', (v) => this.reducedMotion.set(v));
    bind('(max-width: 767.98px)', (v) => this.mobile.set(v));
  }
}

function bind(query: string, update: (matches: boolean) => void): void {
  const list = mediaQuery(query);
  if (list) {
    update(list.matches);
    list.addEventListener('change', (event) => update(event.matches));
  }
}

function mediaQuery(query: string): MediaQueryList | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia(query) : null;
}

/** localStorage, or null where it is blocked (some private modes throw on access). */
export function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export type Theme = 'light' | 'dark';
export const THEME_KEY = 'tfc.theme';

/**
 * Light and dark themes. Follows prefers-color-scheme until the user picks one; the pick is
 * saved in localStorage. A small inline script in index.html applies a saved pick before
 * the first paint.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly theme = signal<Theme>('light');

  constructor() {
    if (!this.browser) {
      return;
    }
    const media = mediaQuery('(prefers-color-scheme: dark)');
    this.theme.set(readTheme() ?? (media?.matches ? 'dark' : 'light'));
    media?.addEventListener('change', (event) => {
      if (!readTheme()) {
        this.theme.set(event.matches ? 'dark' : 'light');
      }
    });
  }

  toggle(): void {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    this.root.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage blocked: the theme still applies for this visit.
    }
  }
}

function readTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

export interface Announcement {
  readonly id: number;
  readonly text: string;
}

/**
 * Feeds the single polite live region in the app shell. Used once per finished answer (never
 * word by word), and for short status messages such as "Copied".
 */
@Injectable({ providedIn: 'root' })
export class Announcer {
  readonly messages = signal<readonly Announcement[]>([]);
  private nextId = 0;

  announce(text: string): void {
    const id = ++this.nextId;
    this.messages.update((list) => [...list, { id, text }]);
    setTimeout(() => this.messages.update((list) => list.filter((m) => m.id !== id)), 15_000);
  }
}

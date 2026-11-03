import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../core/browser';
import { HealthService } from '../core/health.service';
import { Icon } from './icon';
import { Logo } from './logo';

export interface MenuButtonState {
  readonly label: string;
  readonly expanded: boolean;
}

const STATUS_TEXT = {
  demo: 'Demo mode',
  checking: 'Checking…',
  online: 'Online',
  offline: 'Offline',
} as const;

const STATUS_TITLE = {
  demo: 'Demo mode: no backend is connected',
  checking: 'Checking the API (GET /health/health)',
  online: 'API online (checked every 30 seconds)',
  offline: 'API offline. Click to check again',
} as const;

/**
 * Flat 56px top bar: the open-sidebar button and the mark (when no sidebar shows them), the
 * route links, the API status, New chat (when the sidebar is hidden) and the theme switch. Its
 * bottom line fades in once the content under it is scrolled.
 */
@Component({
  selector: 'app-top-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, Icon, Logo],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.css',
  host: { '(window:scroll)': 'onWindowScroll()', '(document:keydown.escape)': 'closeMenu()' },
})
export class TopBar implements OnInit {
  protected readonly theme = inject(ThemeService);
  protected readonly health = inject(HealthService);
  /**
   * 'site' is the website header (How it works, What sets us apart, the map, Open the tutor).
   * 'app' is the slim header of the tutor workspace (Chat, Practice, API status).
   */
  readonly variant = input<'site' | 'app'>('site');
  /** The open-sidebar button; null when the sidebar (or no sidebar) needs none. */
  readonly menu = input<MenuButtonState | null>(null);
  /** Show the mark and name here (when the sidebar, which also shows them, is hidden). */
  readonly showBrand = input(true);
  readonly showNewChat = input(false);
  /** The chat's thread is scrolled (the chat page scrolls its stage, not the window). */
  readonly scrolled = input(false);
  readonly menuToggle = output<void>();
  readonly newChatRequest = output<void>();

  /** Practice and How it works scroll the window. */
  private readonly windowScrolled = signal(false);
  protected readonly lined = computed(() => this.scrolled() || this.windowScrolled());
  protected readonly statusText = computed(() => STATUS_TEXT[this.health.status()]);
  protected readonly statusTitle = computed(() => STATUS_TITLE[this.health.status()]);

  ngOnInit(): void {
    // The status pill belongs to the workspace; polling starts once (browser only).
    if (this.variant() === 'app') {
      this.health.start();
    }
  }

  /** The website header's menu on a phone (the app header has only two links and needs none). */
  protected readonly menuOpen = signal(false);

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected onWindowScroll(): void {
    this.windowScrolled.set(window.scrollY > 2);
  }
}

import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../core/browser';
import { Icon } from './icon';
import { Logo } from './logo';

export interface MenuButtonState {
  readonly label: string;
  readonly expanded: boolean;
}

/** Flat top bar: sidebar button, the name (and mark when no sidebar shows it), links, theme. */
@Component({
  selector: 'app-top-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, Icon, Logo],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.css',
})
export class TopBar {
  protected readonly theme = inject(ThemeService);
  readonly menu = input<MenuButtonState | null>(null);
  /** Show the mark and name here (when the sidebar, which also shows them, is hidden). */
  readonly showBrand = input(true);
  readonly menuToggle = output<void>();
}

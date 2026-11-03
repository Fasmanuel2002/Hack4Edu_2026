import { ChangeDetectionStrategy, Component, DOCUMENT, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Announcer } from './core/browser';
import { ScrollProgress } from './shared/scroll-progress';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, ScrollProgress],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly announcer = inject(Announcer);
  private readonly document = inject(DOCUMENT);

  /** With <base href="/">, a bare "#main" link would leave the page, so move focus directly. */
  protected skipToMain(event: Event): void {
    const main = this.document.getElementById('main');
    if (main) {
      event.preventDefault();
      main.focus();
    }
  }
}

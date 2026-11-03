import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, DOCUMENT, PLATFORM_ID, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Announcer } from './core/browser';
import { opensNewPage } from './core/new-page';
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

  constructor() {
    // Every new page starts at its top; the router keeps the old scroll position on its own.
    const router = inject(Router);
    const browser = isPlatformBrowser(inject(PLATFORM_ID));
    let previous: string | null = null;
    router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(({ urlAfterRedirects: url }) => {
        if (browser && opensNewPage(previous, url)) {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
        previous = url;
      });
  }

  /** With <base href="/">, a bare "#main" link would leave the page, so move focus directly. */
  protected skipToMain(event: Event): void {
    const main = this.document.getElementById('main');
    if (main) {
      event.preventDefault();
      main.focus();
    }
  }
}

import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * A 3px line fixed to the top of the window that fills as the page is scrolled, in the accent
 * colour. Pages that scroll inside their own container (the chat) leave it empty.
 */
@Component({
  selector: 'app-scroll-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  host: {
    'aria-hidden': 'true',
    '[style.transform]': '"scaleX(" + progress() + ")"',
    '(window:scroll)': 'update()',
    '(window:resize)': 'update()',
  },
  styles: `
    :host {
      position: fixed;
      inset: 0 0 auto;
      z-index: 60;
      height: 3px;
      background: var(--accent);
      transform-origin: left center;
      pointer-events: none;
    }
  `,
})
export class ScrollProgress {
  protected readonly progress = signal(0);

  constructor() {
    const destroyRef = inject(DestroyRef);
    const router = inject(Router);
    afterNextRender(() => {
      // A new page has a new height, and a growing page changes the ratio without a scroll event.
      const nav = router.events
        .pipe(filter((e) => e instanceof NavigationEnd))
        .subscribe(() => requestAnimationFrame(() => this.update()));
      const ro = new ResizeObserver(() => this.update());
      ro.observe(document.body);
      destroyRef.onDestroy(() => {
        nav.unsubscribe();
        ro.disconnect();
      });
      this.update();
    });
  }

  protected update(): void {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    this.progress.set(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
  }
}

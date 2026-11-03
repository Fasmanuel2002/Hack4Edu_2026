import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input, numberAttribute } from '@angular/core';

/**
 * Fades a block up the first time it scrolls into view. Blocks already on screen at load stay put
 * (no flicker), and nothing hides without JavaScript, on the server, or with reduced motion.
 * `appReveal="120"` delays it by 120 ms, for a staggered row.
 */
@Directive({
  selector: '[appReveal]',
  host: { '[style.--reveal-delay.ms]': 'delay()' },
})
export class Reveal {
  readonly delay = input(0, { alias: 'appReveal', transform: numberAttribute });

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (
        typeof IntersectionObserver === 'undefined' ||
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
        el.getBoundingClientRect().top < window.innerHeight
      ) {
        return;
      }
      el.classList.add('reveal');
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            el.classList.add('reveal-in');
            io.disconnect();
          }
        },
        { threshold: 0.12 },
      );
      io.observe(el);
      destroyRef.onDestroy(() => io.disconnect());
    });
  }
}

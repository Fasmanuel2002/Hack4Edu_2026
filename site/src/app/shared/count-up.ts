import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input, signal } from '@angular/core';

/**
 * Shows a number and, the first time it scrolls into view, counts up to it. The final value is
 * the server-rendered text, so it is what shows without JavaScript or with reduced motion.
 */
@Directive({
  selector: '[appCountUp]',
  host: { '[textContent]': 'text()' },
})
export class CountUp {
  readonly value = input.required<number>({ alias: 'appCountUp' });
  readonly decimals = input(0);
  private readonly shown = signal<number | null>(null);
  protected readonly text = () => this.format(this.shown() ?? this.value());

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
      this.shown.set(0);
      let frame = 0;
      const io = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / 900);
          this.shown.set(this.value() * (1 - Math.pow(1 - t, 3)));
          if (t < 1) frame = requestAnimationFrame(step);
          else this.shown.set(null);
        };
        frame = requestAnimationFrame(step);
      });
      io.observe(el);
      destroyRef.onDestroy(() => {
        io.disconnect();
        cancelAnimationFrame(frame);
      });
    });
  }

  private format(n: number): string {
    const d = this.decimals();
    return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
}

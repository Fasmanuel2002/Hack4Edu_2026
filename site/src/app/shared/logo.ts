import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const WEBP = 'brand/twins-for-change-mark-96.webp 96w, brand/twins-for-change-mark-256.webp 256w';

/**
 * The Twins for Change mark: the two figures and the open book, cropped (558 × 449) from
 * assets/brand/twins-for-change-logo.png without the wordmark. It always sits on white: the
 * tile is white, so in the dark theme it shows as a small white rounded tile on navy.
 * Sized by width with height auto, so it is never stretched.
 */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="mark-tile">
      <picture>
        <source type="image/webp" [attr.srcset]="webp" [attr.sizes]="sizes()" />
        <img
          [attr.sizes]="sizes()"
          [src]="fallback"
          width="558"
          height="449"
          alt="Twins for Change"
          decoding="async"
          [attr.fetchpriority]="priority() ? 'high' : null"
          [style.width.px]="width()"
        />
      </picture>
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    img {
      display: block;
      max-width: none;
      height: auto;
    }
  `,
})
export class Logo {
  /** Display width in CSS pixels. */
  readonly width = input(32);
  readonly priority = input(false);
  protected readonly webp = WEBP;
  // Bound, not static: a static src would start downloading the PNG as soon as the element is
  // created, before the WebP <source> exists.
  protected readonly fallback = 'brand/twins-for-change-mark.png';
  protected readonly sizes = computed(() => `${this.width()}px`);
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const PATHS = {
  panel: [
    'M5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-11A2.5 2.5 0 0 1 5.5 4z',
    'M9.5 4v16',
  ],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  plus: ['M12 5v14', 'M5 12h14'],
  send: ['M12 19V5', 'M5.5 11.5L12 5l6.5 6.5'],
  stop: ['M8 8h8v8H8z'],
  copy: ['M9 8.5h10.5v12H9z', 'M15.5 4.5h-11v12'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  regenerate: [
    'M20 11a8 8 0 0 0-14.7-4.3L4 8.5',
    'M4 4v4.5h4.5',
    'M4 13a8 8 0 0 0 14.7 4.3L20 15.5',
    'M20 20v-4.5h-4.5',
  ],
  sun: [
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    'M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4',
  ],
  moon: ['M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z'],
  pencil: ['M4 20h4.5L19 9.5 14.5 5 4 15.5V20z', 'M13 6.5l4.5 4.5'],
  trash: ['M4 7h16', 'M9.5 7V4.5h5V7', 'M6 7l1 13h10l1-13', 'M10 11v5.5M14 11v5.5'],
  newChat: [
    'M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5',
    'M18.5 3.5a2.1 2.1 0 0 1 3 3L13 15l-4 1 1-4z',
  ],
  chevron: ['M9 6l6 6-6 6'],
  file: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 'M14 3v5h5'],
  image: [
    'M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    'M9 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
    'M21 15l-5-5L5 20',
  ],
  warning: ['M12 3.5l9.5 16.5h-19z', 'M12 10v4.5', 'M12 17.5v.01'],
  user: ['M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M4.5 20.5a7.5 7.5 0 0 1 15 0'],
  calculator: [
    'M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
    'M8.5 7.5h7',
    'M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01',
  ],
  chart: ['M4 19.5h16', 'M5 15.5l4-4 3 3 6.5-6.5', 'M15 8h3.5v3.5'],
  book: [
    'M12 7c-1.6-1.3-3.8-2-6.5-2H4v13h1.5c2.7 0 4.9.7 6.5 2 1.6-1.3 3.8-2 6.5-2H20V5h-1.5c-2.7 0-4.9.7-6.5 2z',
    'M12 7v13',
  ],
  columns: ['M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z', 'M12 4v16'],
  arrowDown: ['M12 5v14', 'M5.5 12.5L12 19l6.5-6.5'],
} as const;

export type IconName = keyof typeof PATHS;

/** Decorative inline SVG icon. The button around it carries the accessible name. */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <svg class="icon" [class.filled]="name() === 'stop'" viewBox="0 0 24 24" focusable="false">
      @for (d of paths(); track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }
    .filled path {
      fill: currentColor;
      stroke: none;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  protected readonly paths = computed(() => PATHS[this.name()]);
}

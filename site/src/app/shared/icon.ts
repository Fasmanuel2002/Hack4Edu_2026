import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Line icons on a 24px grid at a 1.8 stroke. The chat icons follow the shapes of the author's
 * reference UI (sidebar, compose, search, chevronDown, paperclip, arrowUp/Down, stop, copy, check,
 * refresh, x, alert, upload, trash, sun, moon, cpu, clipboard), with rects and circles written as
 * paths so one <path> list draws every icon.
 */
const PATHS = {
  sidebar: [
    'M6 4h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z',
    'M9.5 4v16',
  ],
  compose: [
    'M11 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V13',
    'M17.6 3.6a2 2 0 0 1 2.8 2.8L13 13.8l-3.6.8.8-3.6z',
  ],
  search: ['M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z', 'M16 16l4 4'],
  chevronDown: ['M6 9l6 6 6-6'],
  paperclip: [
    'M20 11.5l-7.8 7.8a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8',
  ],
  arrowUp: ['M12 19V5', 'M5.5 11.5L12 5l6.5 6.5'],
  arrowDown: ['M12 5v14', 'M5.5 12.5L12 19l6.5-6.5'],
  arrowUpRight: ['M7 17L17 7', 'M8.5 7H17v8.5'],
  stop: ['M9 7h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z'],
  copy: [
    'M10.5 8h7a2.5 2.5 0 0 1 2.5 2.5v7a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 8 17.5v-7A2.5 2.5 0 0 1 10.5 8z',
    'M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2',
  ],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  refresh: ['M20 12a8 8 0 1 1-2.4-5.7', 'M20 4v5h-5'],
  x: ['M6 6l12 12', 'M18 6L6 18'],
  alert: ['M12 3.5L2.8 19.5h18.4z', 'M12 10v4.5', 'M12 17.2v.3'],
  upload: ['M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4', 'M12 15V4', 'M7.5 8.5L12 4l4.5 4.5'],
  trash: [
    'M4 7h16',
    'M10 11v6M14 11v6',
    'M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12',
    'M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2',
  ],
  sun: [
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    'M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  ],
  moon: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'],
  cpu: [
    'M8.5 6h7A2.5 2.5 0 0 1 18 8.5v7a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 15.5v-7A2.5 2.5 0 0 1 8.5 6z',
    'M9.5 3v3M14.5 3v3M9.5 18v3M14.5 18v3M3 9.5h3M3 14.5h3M18 9.5h3M18 14.5h3',
  ],
  clipboard: [
    'M7.5 4.5h9A2.5 2.5 0 0 1 19 7v11a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18V7a2.5 2.5 0 0 1 2.5-2.5z',
    'M9 4.5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v.5M9 11h6M9 15h4',
  ],
  plus: ['M12 5v14', 'M5 12h14'],
  pencil: ['M4 20h4.5L19 9.5 14.5 5 4 15.5V20z', 'M13 6.5l4.5 4.5'],
  image: [
    'M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    'M9 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
    'M21 15l-5-5L5 20',
  ],
  user: ['M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M4.5 20.5a7.5 7.5 0 0 1 15 0'],
  book: [
    'M12 7c-1.6-1.3-3.8-2-6.5-2H4v13h1.5c2.7 0 4.9.7 6.5 2 1.6-1.3 3.8-2 6.5-2H20V5h-1.5c-2.7 0-4.9.7-6.5 2z',
    'M12 7v13',
  ],
  columns: ['M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z', 'M12 4v16'],
  chat: ['M5 4.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7.5L7 21v-3.5H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z'],
  target: [
    'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z',
    'M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z',
    'M12 12h.01',
  ],
  layers: ['M12 3.5l8.5 4.5-8.5 4.5L3.5 8z', 'M3.5 12l8.5 4.5 8.5-4.5', 'M3.5 16l8.5 4.5 8.5-4.5'],
  home: ['M4 11l8-6.5 8 6.5', 'M6 9.8V19a1 1 0 0 0 1 1h3.5v-5.5h3V20H17a1 1 0 0 0 1-1V9.8'],
  info: ['M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z', 'M12 11v5', 'M12 7.8h.01'],
  checkCircle: ['M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z', 'M8.5 12.2l2.4 2.4 4.6-4.9'],
  xCircle: ['M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z', 'M9.5 9.5l5 5', 'M14.5 9.5l-5 5'],
  mail: ['M4.5 5.5h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1z', 'M4 6.5l8 6 8-6'],
  phone: ['M6.5 3.5h3l1.5 4.5-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z'],
  globe: ['M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z', 'M3.5 12h17', 'M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5s1.1-6.1 3.4-8.5z'],
  grid: ['M4.5 4.5h6v6h-6z', 'M13.5 4.5h6v6h-6z', 'M4.5 13.5h6v6h-6z', 'M13.5 13.5h6v6h-6z'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  list: ['M9 6h11', 'M9 12h11', 'M9 18h11', 'M4.5 6h.01', 'M4.5 12h.01', 'M4.5 18h.01'],
  calendar: ['M5 5.5h14a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z', 'M4 10h16', 'M8 3.5v4', 'M16 3.5v4'],
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

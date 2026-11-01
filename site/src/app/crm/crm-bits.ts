import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../shared/icon';
import { isHttps } from '../site/research';
import { Org, OrgState, PRIORITY_LABEL, Priority, STATE_LABEL } from './crm-logic';

/*
 * Small presentational pieces shared by the CRM views. Tones are decorative (dots, bars, stripes):
 * a text label always carries the meaning, and badge text stays var(--text) on a light tint.
 */
export const STATE_TONE: Record<OrgState, string> = {
  'Identificada': '#6f9bbb',
  'Contactada': '#3d7fe6',
  'En conversación': '#1f9bb5',
  'Colaboración': '#40d9e9',
  'Pausada': '#eda34b',
  'Descartada': '#8a9eae',
};
export const PRIORITY_TONE: Record<Priority, string> = { Alta: '#eda34b', Media: '#3d7fe6', Baja: '#8a9eae' };
export const REGION_TONE: Record<string, string> = { Central: '#3d7fe6', East: '#1f9bb5', North: '#eda34b', Southern: '#6f9bbb', West: '#40d9e9' };
/** Avatar fills: white initials are at least 6:1 on each. */
const AVATAR = ['#052d4b', '#125cd4', '#0b5f86', '#8a5a1c', '#2d5a7b'];

/** Two-letter monogram: capitalised words first ("ADPP Angola" -> "AA", "Fundación de X" -> "FX"). */
export function initials(name: string): string {
  const words = name.trim().split(/[\s\-–/·,()]+/).filter(Boolean);
  const caps = words.filter((w) => /^[\p{Lu}\p{N}]/u.test(w));
  return (caps.length ? caps : words).slice(0, 2).map((w) => [...w][0].toUpperCase()).join('') || '?';
}

export const avatarColor = (name: string) => AVATAR[[...name].reduce((h, c) => (h * 31 + c.codePointAt(0)!) >>> 0, 7) % AVATAR.length];

/** Counts per key, largest first, ties by name. */
export function countBy<T>(items: readonly T[], key: (x: T) => string): { name: string; n: number }[] {
  const m = items.reduce((acc, x) => acc.set(key(x), (acc.get(key(x)) ?? 0) + 1), new Map<string, number>());
  return [...m].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'en'));
}

/** Records to check before any outreach: no direct route (email or phone), and no route at all. */
export function contactGaps(orgs: readonly Org[]): { noDirect: Org[]; noRoute: Org[] } {
  const noDirect = orgs.filter((o) => !o.email && !o.phone);
  return { noDirect, noRoute: noDirect.filter((o) => !isHttps(o.web)) };
}

const TAG = `
  :host { display: inline-flex; }
  span {
    display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.2rem 0.55rem 0.2rem 0.45rem;
    border: 1px solid color-mix(in srgb, var(--tone) 45%, transparent); border-radius: 999px;
    background: color-mix(in srgb, var(--tone) 14%, var(--raised)); color: var(--text);
    font-size: 0.75rem; font-weight: 700; line-height: 1.3; white-space: nowrap;
  }
  i { width: 0.5rem; height: 0.5rem; border-radius: 50%; background: var(--tone); }
`;

@Component({
  selector: 'app-crm-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [style.--tone]="tone()"><i></i>{{ label() }}</span>`,
  styles: TAG,
})
export class CrmStatus {
  readonly status = input.required<OrgState>();
  protected readonly label = computed(() => STATE_LABEL[this.status()]);
  protected readonly tone = computed(() => STATE_TONE[this.status()]);
}

@Component({
  selector: 'app-crm-priority',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [style.--tone]="tone()"><i></i>{{ label() }}</span>`,
  styles: TAG,
})
export class CrmPriority {
  readonly priority = input.required<Priority>();
  protected readonly label = computed(() => `${PRIORITY_LABEL[this.priority()]} priority`);
  protected readonly tone = computed(() => PRIORITY_TONE[this.priority()]);
}

/** Monogram with the country flag in the corner. Decorative: the name is always next to it. */
@Component({
  selector: 'app-crm-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <span class="mono" [style.background]="color()">{{ letters() }}</span>
    @if (flag()) { <img [src]="flag()" alt="" width="20" height="14" loading="lazy" /> }
  `,
  styles: `
    :host { position: relative; display: inline-flex; flex: none; width: var(--av, 2.5rem); height: var(--av, 2.5rem); }
    .mono {
      display: grid; place-items: center; width: 100%; height: 100%; border-radius: 30%;
      color: #fff; font-size: calc(var(--av, 2.5rem) * 0.36); font-weight: 700; letter-spacing: 0.02em;
      box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.22);
    }
    img {
      position: absolute; right: -0.3rem; bottom: -0.2rem; width: 1.25rem; height: 0.875rem;
      border-radius: 3px; object-fit: cover; box-shadow: 0 0 0 2px var(--raised);
    }
  `,
})
export class CrmAvatar {
  readonly name = input.required<string>();
  readonly flag = input('');
  protected readonly letters = computed(() => initials(this.name()));
  protected readonly color = computed(() => avatarColor(this.name()));
}

/** Email, phone and website links, each shown only when the record has it. */
@Component({
  selector: 'app-crm-routes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    @if (org().email) {
      <a [href]="'mailto:' + org().email" [attr.aria-label]="'Email ' + org().name + ': ' + org().email" [title]="org().email"><app-icon name="mail" /></a>
    }
    @if (org().phone) {
      <a [href]="'tel:' + tel()" [attr.aria-label]="'Phone ' + org().name + ': ' + org().phone" [title]="org().phone"><app-icon name="phone" /></a>
    }
    @if (web()) {
      <a [href]="web()" target="_blank" rel="noopener noreferrer" [attr.aria-label]="'Website of ' + org().name + ' (opens in a new tab)'" [title]="web()"><app-icon name="globe" /></a>
    }
    @if (!org().email && !org().phone && !web()) { <small>No contact route</small> }
  `,
  styles: `
    :host { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 0.25rem; }
    a {
      --icon-size: 1rem;
      display: grid; place-items: center; width: var(--route, 2rem); height: var(--route, 2rem); border: 1px solid var(--border); border-radius: 9px;
      background: var(--raised); color: var(--link);
    }
    a:hover { border-color: var(--link); background: var(--accent-soft); }
    small { color: var(--text-muted); font-size: 0.75rem; }
  `,
})
export class CrmRoutes {
  readonly org = input.required<Org>();
  protected readonly web = computed(() => (isHttps(this.org().web) ? this.org().web : ''));
  protected readonly tel = computed(() => this.org().phone.replace(/[^\d+]/g, ''));
}

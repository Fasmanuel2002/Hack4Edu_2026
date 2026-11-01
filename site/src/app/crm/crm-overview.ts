import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Icon } from '../shared/icon';
import { COUNTRIES, SUMMARY } from '../site/research';
import { Org, PRIORITIES, PRIORITY_LABEL, STATES, STATE_LABEL, followUps, identityPending, isoDate, timeline } from './crm-logic';
import { PRIORITY_TONE, REGION_TONE, STATE_TONE, contactGaps, countBy } from './crm-bits';
import { CrmStore } from './crm-store';

const BY_NAME = new Map(COUNTRIES.map((c) => [c.nameEn, c]));

/** The CRM dashboard: counts, pipeline, coverage and what to check next. Reads the store; changes nothing. */
@Component({
  selector: 'app-crm-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RouterLink, DecimalPipe],
  templateUrl: './crm-overview.html',
  styleUrl: './crm-overview.css',
})
export class CrmOverview {
  private readonly orgs = inject(CrmStore).orgs;
  private readonly contacts = inject(CrmStore).contacts;
  readonly edit = output<Org>();

  protected readonly today = isoDate(new Date());
  protected readonly summary = SUMMARY;
  protected readonly profiles = COUNTRIES.length;
  protected readonly stateLabel = STATE_LABEL;
  protected readonly priorityLabel = PRIORITY_LABEL;
  protected readonly flag = (country: string) => (BY_NAME.has(country) ? `site/flags/${BY_NAME.get(country)!.iso2}.png` : '');

  protected readonly due = computed(() => followUps(this.orgs(), this.today));
  protected readonly nextUp = computed(() => {
    const d = this.due();
    return [...d.overdue, ...d.today, ...d.upcoming].slice(0, 5);
  });
  protected readonly feed = computed(() => timeline(this.orgs()).slice(0, 5));
  protected readonly stats = computed(() => {
    const o = this.orgs();
    return {
      orgs: o.length,
      active: o.filter((x) => x.status === 'En conversación' || x.status === 'Colaboración').length,
      countries: new Set(o.map((x) => x.country)).size,
    };
  });

  /** One stacked bar: each stage's share of all organizations. */
  protected readonly stages = computed(() => {
    const total = Math.max(1, this.orgs().length);
    return STATES.map((s) => {
      const n = this.orgs().filter((o) => o.status === s).length;
      return { state: s, n, pct: (100 * n) / total, tone: STATE_TONE[s] };
    });
  });

  protected readonly prios = computed(() => {
    const total = Math.max(1, this.orgs().length);
    return PRIORITIES.map((p) => {
      const n = this.orgs().filter((o) => o.priority === p).length;
      return { p, n, pct: (100 * n) / total, tone: PRIORITY_TONE[p] };
    });
  });

  protected readonly regions = computed(() => {
    const rows = countBy(this.orgs(), (o) => BY_NAME.get(o.country)?.region ?? 'Other');
    const max = Math.max(1, ...rows.map((r) => r.n));
    return rows.map((r) => ({
      ...r,
      pct: (100 * r.n) / max,
      tone: REGION_TONE[r.name] ?? '#8a9eae',
      countries: new Set(this.orgs().filter((o) => BY_NAME.get(o.country)?.region === r.name).map((o) => o.country)).size,
    }));
  });

  protected readonly topCountries = computed(() => countBy(this.orgs(), (o) => o.country).slice(0, 6));

  protected readonly checks = computed(() => {
    const gaps = contactGaps(this.orgs());
    const ids = new Set(this.orgs().map((o) => o.id));
    const people = this.contacts().filter((c) => ids.has(c.orgId));
    const by = (s: string) => people.filter((c) => c.verification.status === s).length;
    return {
      pending: this.orgs().filter(identityPending), ...gaps, withEmail: this.orgs().filter((o) => o.email).length,
      unverified: by('unverified'), verified: by('verified'), invalid: by('invalid'), needsUpdate: by('needs_update'),
    };
  });
}

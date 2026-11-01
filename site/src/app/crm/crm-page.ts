import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DOCUMENT, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Announcer } from '../core/browser';
import { Icon, IconName } from '../shared/icon';
import { TopBar } from '../shared/top-bar';
import { AfricaExplorer } from '../site/africa-explorer';
import { ANALYSIS_DATE, COUNTRIES, Country, LANGUAGES, LIMITATIONS, SUMMARY, isHttps } from '../site/research';
import {
  CONFIDENCES, CONFIDENCE_LABEL, CONTACT_KINDS, Contact, ContactFilters, CrmView, Filters, KIND_LABEL, NO_CONTACT_FILTERS, NO_FILTERS, Org, OrgState,
  PRIORITIES, PRIORITY_LABEL, Priority, STATES, STATE_LABEL, VERIFY_LABEL, VERIFY_STATES, Verification,
  contactsToCsv, filterContacts, filterOrgs, fold, followUps, identityPending, isoDate, parseBackup, parseCrmQuery, timeline, toCsv,
} from './crm-logic';
import { CrmContactDialog } from './crm-contact-dialog';
import { CrmVerify, CrmVerifyBadge } from './crm-verify';
import seedOrgs from './seed-organizations.json';
import { CrmAvatar, CrmPriority, CrmRoutes, CrmStatus, PRIORITY_TONE, REGION_TONE, STATE_TONE } from './crm-bits';
import { CrmOrgCard } from './crm-org-card';
import { CrmOverview } from './crm-overview';
import { CrmStore } from './crm-store';
import { CrmCountryDrawer } from './crm-country-drawer';
import { CrmOrgDialog } from './crm-org-dialog';

const NAV: { id: CrmView; label: string; icon: IconName }[] = [
  { id: 'overview', label: 'Overview', icon: 'home' },
  { id: 'countries', label: 'Countries', icon: 'layers' },
  { id: 'map', label: 'Map', icon: 'target' },
  { id: 'orgs', label: 'Organizations', icon: 'clipboard' },
  { id: 'contacts', label: 'Contacts', icon: 'user' },
  { id: 'followups', label: 'Follow-ups', icon: 'chat' },
  { id: 'activities', label: 'Activity', icon: 'book' },
  { id: 'sources', label: 'Sources', icon: 'info' },
];

type Layout = 'table' | 'cards' | 'board';
const LAYOUTS: { id: Layout; label: string; icon: IconName }[] = [
  { id: 'table', label: 'Table', icon: 'list' },
  { id: 'cards', label: 'Cards', icon: 'grid' },
  { id: 'board', label: 'Board', icon: 'columns' },
];

const LEAD: Record<CrmView, string> = {
  overview: 'Organizations, follow-ups and the research behind them, in one place.',
  countries: 'Population, connectivity and language coverage for the 55 profiles in the research.',
  map: 'Select a country on the map to read its connectivity and documented languages.',
  orgs: 'Potential partner organizations, their stage, priority and next action.',
  contacts: 'Public contact routes found for each organization, and any you add. Validate them before outreach.',
  followups: 'Dated next steps for organizations that are still open.',
  activities: 'Every activity you have logged, newest first.',
  sources: 'Where the country profiles come from, and what they do not show.',
};

const NO_EVIDENCE = 'Sin evidencia en muestra';
const SEED_COUNT = seedOrgs.length;
/** Shown wherever contact details appear (author's wording). */
export const CONTACT_NOTICE =
  'Contact details were collected from public sources on 2026-11-01 and not re-verified. Verify before contacting. Verification marks are saved only in this browser.';
const BY_NAME = new Map(COUNTRIES.map((c) => [c.nameEn, c]));
const REGIONS = [...new Set(COUNTRIES.map((c) => c.region))].sort();
const GAPS = LANGUAGES.reduce((m, l) => (l.result === NO_EVIDENCE ? m.set(l.country, (m.get(l.country) ?? 0) + 1) : m), new Map<string, number>());
const LANG_NAMES = LANGUAGES.reduce((m, l) => m.set(l.country, `${m.get(l.country) ?? ''} ${l.language}`), new Map<string, string>());

const SOURCES: { name: string; url: string; note: string }[] = [
  { name: 'National population 2024', url: 'https://data.worldbank.org/indicator/SP.POP.TOTL', note: 'World Bank, per-country API' },
  { name: 'Internet users', url: 'https://data.worldbank.org/indicator/IT.NET.USER.ZS', note: 'ITU / World Bank (years shown on each profile)' },
  { name: 'Linguistic and demographic profiles', url: 'https://github.com/factbook/factbook.json', note: 'World Factbook archive (historical years)' },
  { name: 'La francophonie 2025', url: 'https://www.francophonie.org/sites/default/files/2026-03/La_langue_francaise_dans_le_monde_Edition_2026.pdf', note: 'OIF 2026, pp. 30–33' },
  { name: 'Tiny Aya', url: 'https://huggingface.co/CohereLabs/tiny-aya-global', note: 'Declared language coverage of Tiny Aya' },
  { name: 'MORENA / InkubaLM / AfriqueQwen / Goldfish', url: 'https://huggingface.co/models', note: 'Documentation catalogues: see the source on each language record' },
];

/** /crm: a public partner tracker. Data lives only in this browser (CrmStore); nothing is sent anywhere. */
@Component({
  selector: 'app-crm-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TopBar, Icon, RouterLink, DecimalPipe, AfricaExplorer, CrmOrgDialog, CrmContactDialog, CrmCountryDrawer, CrmOverview, CrmOrgCard, CrmAvatar, CrmStatus,
    CrmPriority, CrmRoutes, CrmVerify, CrmVerifyBadge,
  ],
  templateUrl: './crm-page.html',
  styleUrl: './crm-page.css',
})
export class CrmPage {
  private readonly announcer = inject(Announcer);
  private readonly doc = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly crm = inject(CrmStore);
  private readonly params = toSignal(inject(ActivatedRoute).queryParamMap, { initialValue: inject(ActivatedRoute).snapshot.queryParamMap });

  protected readonly nav = NAV;
  protected readonly lead = LEAD;
  protected readonly regions = REGIONS;
  protected readonly countryNames = COUNTRIES.map((c) => c.nameEn);
  protected readonly priorities = PRIORITIES;
  protected readonly states = STATES;
  protected readonly priorityLabel = PRIORITY_LABEL;
  protected readonly stateLabel = STATE_LABEL;
  protected readonly stateTone = STATE_TONE;
  protected readonly priorityTone = PRIORITY_TONE;
  protected readonly regionTone = REGION_TONE;
  protected readonly layouts = LAYOUTS;
  protected readonly regionOf = (country: string) => BY_NAME.get(country)?.region ?? '';
  protected readonly sources = SOURCES;
  protected readonly identityPending = identityPending;
  protected readonly seedRow = (o: Org) => /^(seed|public)-/.test(o.id);
  protected readonly limitations = LIMITATIONS;
  protected readonly summary = SUMMARY;
  protected readonly analysisDate = ANALYSIS_DATE;
  protected readonly flag = (country: string) => (BY_NAME.has(country) ? `site/flags/${BY_NAME.get(country)!.iso2}.png` : '');
  protected readonly gaps = (c: Country) => GAPS.get(c.name) ?? 0;
  protected readonly seedCount = SEED_COUNT;
  protected readonly contactNotice = CONTACT_NOTICE;
  protected readonly verifyStates = VERIFY_STATES;
  protected readonly verifyLabel = VERIFY_LABEL;
  protected readonly kinds = CONTACT_KINDS;
  protected readonly kindLabel = KIND_LABEL;
  protected readonly confidences = CONFIDENCES;
  protected readonly confidenceLabel = CONFIDENCE_LABEL;
  protected readonly isHttps = isHttps;
  protected readonly tel = (phone: string) => phone.replace(/[^\d+]/g, '');

  protected readonly today = isoDate(new Date());
  protected readonly orgs = this.crm.orgs;
  protected readonly confirmingReset = signal(false);
  protected readonly layout = signal<Layout>('table');
  protected readonly filters = signal<Filters>(NO_FILTERS);
  protected readonly importMessage = signal('');
  /** The org dialog is open when this is set. `org` is null for a new row. */
  protected readonly editing = signal<{ org: Org | null; country: string } | null>(null);
  /** The contact dialog is open when this is set. `contact` is null for a new contact. */
  protected readonly editingContact = signal<{ contact: Contact | null } | null>(null);
  protected readonly contactFilters = signal<ContactFilters>(NO_CONTACT_FILTERS);
  protected readonly allContacts = this.crm.contacts;

  private readonly query = computed(() => parseCrmQuery(this.params().get('view'), this.params().get('country'), this.countryNames));
  protected readonly view = computed(() => this.query().view);
  protected readonly viewLabel = computed(() => NAV.find((n) => n.id === this.view())!.label);
  protected readonly openCountry = computed(() => BY_NAME.get(this.query().country) ?? null);

  protected readonly rows = computed(() => filterOrgs(this.orgs(), this.filters(), (c) => BY_NAME.get(c)?.region ?? ''));
  protected readonly contacts = computed(() => filterContacts(this.allContacts(), this.orgs(), this.contactFilters()));
  protected readonly contactCountries = computed(() => [...new Set(filterContacts(this.allContacts(), this.orgs(), NO_CONTACT_FILTERS).map((c) => c.country))].sort());
  protected readonly activeContactFilters = computed(() => {
    const f = this.contactFilters();
    const all: [keyof ContactFilters, string][] = [
      ['query', f.query.trim() && `Search: “${f.query.trim()}”`],
      ['country', f.country && `Country: ${f.country}`],
      ['verify', f.verify && `Verification: ${VERIFY_LABEL[f.verify as Verification['status']]}`],
      ['confidence', f.confidence && CONFIDENCE_LABEL[f.confidence as Contact['confidence']]],
      ['kind', f.kind && `Kind: ${KIND_LABEL[f.kind as Contact['kind']]}`],
    ];
    return all.filter(([, label]) => label);
  });
  protected readonly due = computed(() => followUps(this.rows(), this.today));
  protected readonly feed = computed(() => timeline(this.rows()));
  protected readonly countryRows = computed(() => {
    const { query, region } = this.filters();
    const q = fold(query.trim());
    return COUNTRIES.filter((c) => (!region || c.region === region) && (!q || fold(`${c.nameEn} ${c.name} ${c.region} ${c.languages} ${c.peoples} ${LANG_NAMES.get(c.name) ?? ''}`).includes(q)));
  });
  protected readonly orgCounts = computed(() => this.orgs().reduce((m, o) => m.set(o.country, (m.get(o.country) ?? 0) + 1), new Map<string, number>()));
  protected readonly lanes = computed(() => STATES.map((s) => ({ state: s, list: this.rows().filter((o) => o.status === s) })));
  /** Filters in effect, as removable chips. Country, status and priority only apply to the Organizations view. */
  protected readonly activeFilters = computed(() => {
    const f = this.filters();
    const orgsOnly = this.view() === 'orgs';
    const all: [keyof Filters, string][] = [
      ['query', f.query.trim() && `Search: “${f.query.trim()}”`],
      ['region', f.region && `Region: ${f.region}`],
      ['country', orgsOnly && f.country ? `Country: ${f.country}` : ''],
      ['status', orgsOnly && f.status ? `Status: ${STATE_LABEL[f.status as OrgState]}` : ''],
      ['priority', orgsOnly && f.priority ? `Priority: ${PRIORITY_LABEL[f.priority as Priority]}` : ''],
    ];
    return all.filter(([, label]) => label);
  });

  protected toView(): void {
    this.filters.set(NO_FILTERS);
    this.contactFilters.set(NO_CONTACT_FILTERS);
  }

  protected setContactFilter(key: keyof ContactFilters, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.contactFilters.update((f) => ({ ...f, [key]: value }));
  }

  protected removeContactFilter(key: keyof ContactFilters): void {
    this.contactFilters.update((f) => ({ ...f, [key]: '' }));
  }

  protected verifyContact(c: Contact, v: Verification): void {
    this.crm.verifyContact(c.id, v);
    this.announcer.announce(`Marked ${VERIFY_LABEL[v.status].toLowerCase()}. Saved in this browser.`);
  }

  protected exportContactsCsv(): void {
    this.download(`﻿${contactsToCsv(this.contacts())}`, 'twins-for-change-crm-contacts.csv', 'text/csv;charset=utf-8');
    this.announcer.announce(`Exported ${this.contacts().length} contacts to CSV.`);
  }

  protected setFilter(key: keyof Filters, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.filters.update((f) => ({ ...f, [key]: value }));
  }

  protected removeFilter(key: keyof Filters): void {
    this.filters.update((f) => ({ ...f, [key]: '' }));
  }

  protected clearFilters(): void {
    this.filters.set(NO_FILTERS);
  }

  protected showCountry(name: string | null): void {
    this.router.navigate([], { queryParams: { country: name }, queryParamsHandling: 'merge' });
  }

  protected add(country = ''): void {
    this.editing.set({ org: null, country });
  }

  protected edit(org: Org): void {
    this.editing.set({ org, country: '' });
  }

  protected openById(id: string): void {
    const org = this.orgs().find((o) => o.id === id);
    if (org) this.edit(org);
  }

  protected reset(): void {
    if (!this.confirmingReset()) {
      this.confirmingReset.set(true);
      this.announcer.announce(`Press Confirm reset to replace all your changes and country notes with the ${SEED_COUNT} starting organizations and their contacts.`);
      return;
    }
    this.crm.reset();
    this.confirmingReset.set(false);
    this.editing.set(null);
    this.announcer.announce(`Reset to the ${SEED_COUNT} starting organizations and their contacts.`);
  }

  protected exportCsv(): void {
    this.download(`﻿${toCsv(this.rows())}`, 'twins-for-change-crm.csv', 'text/csv;charset=utf-8');
    this.announcer.announce(`Exported ${this.rows().length} rows to CSV.`);
  }

  protected exportJson(): void {
    this.download(this.crm.exportJson(), `twins-for-change-crm-backup-${this.today}.json`, 'application/json;charset=utf-8');
    this.announcer.announce('Backup downloaded.');
  }

  protected async importJson(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const result = parseBackup(await file.text().catch(() => ''), this.countryNames);
    const message = result.ok
      ? `Imported ${result.orgs.length} organizations, ${result.contacts.length} contacts and ${Object.keys(result.notes).length} country notes${result.skipped ? `; skipped ${result.skipped} invalid` : ''}.`
      : `Import failed. ${result.error}`;
    if (result.ok) this.crm.merge(result.orgs, result.notes, result.contacts);
    this.importMessage.set(message);
    this.announcer.announce(message);
  }

  /** Blob download; nothing is sent anywhere. */
  private download(body: string, name: string, type: string): void {
    const url = URL.createObjectURL(new Blob([body], { type }));
    const a = this.doc.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

}

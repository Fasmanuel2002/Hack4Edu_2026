import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CrmPage } from './crm-page';
import {
  Contact, ContactDraft, NO_CONTACT_FILTERS, Org, OrgDraft, UNVERIFIED, contactsToCsv, filterContacts, migrateContact, migrateOrg, migrateVerification,
  parseBackup, setVerification, validateContact,
} from './crm-logic';
import { COUNTRIES, isHttps } from '../site/research';
import seedOrgs from './seed-organizations.json';
import seedContacts from './seed-contacts.json';

const contacts = seedContacts as unknown as Contact[];
const orgs = seedOrgs as unknown as (Org & { iso2: string })[];
const key = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

describe('seed contacts (contacts_research.csv, 2026-11-01)', () => {
  const byId = new Map(orgs.map((o) => [o.id, o]));
  const iso = new Map(COUNTRIES.map((c) => [c.iso2, c.nameEn]));

  it('imports all 89 rows with unique ids, each attached to an existing organization', () => {
    expect(contacts.length).toBe(89);
    expect(new Set(contacts.map((c) => c.id)).size).toBe(89);
    for (const c of contacts) expect(byId.has(c.orgId), c.id).toBe(true);
  });

  it('adds 38 research organizations to the 61, without duplicating any organization by country and name', () => {
    expect(orgs.length).toBe(99);
    expect(orgs.filter((o) => o.id.startsWith('research-')).length).toBe(38);
    expect(new Set(orgs.map((o) => o.id)).size).toBe(99);
    expect(new Set(orgs.map((o) => `${o.iso2}|${key(o.name)}`)).size).toBe(99);
  });

  it('uses valid ISO2 codes with the same country names as the research', () => {
    for (const o of orgs) expect(iso.get(o.iso2), o.id).toBe(o.country);
    for (const c of contacts) expect(c.id.slice(2, 4)).toBe(byId.get(c.orgId)!.iso2);
  });

  it('keeps every link https, every email well-formed, and has no LinkedIn profile', () => {
    for (const c of contacts) {
      for (const u of [c.contactPageUrl, c.sourceUrl]) if (u) expect(isHttps(u), `${c.id} ${u}`).toBe(true);
      if (c.email) expect(c.email, c.id).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(JSON.stringify(c)).not.toMatch(/linkedin\.com\/in\//i);
    }
    for (const o of orgs.filter((x) => x.id.startsWith('research-'))) {
      for (const u of [o.web, o.sourceUrl]) if (u) expect(isHttps(u), `${o.id} ${u}`).toBe(true);
    }
  });

  it('has a confidence, kind and source on every contact, all unverified', () => {
    expect(contacts.every((c) => ['high', 'medium', 'low'].includes(c.confidence))).toBe(true);
    expect(contacts.every((c) => ['org_generic', 'named_leader', 'press_office'].includes(c.kind))).toBe(true);
    expect(contacts.every((c) => isHttps(c.sourceUrl) && c.dateAccessed === '2026-11-01')).toBe(true);
    expect(contacts.every((c) => c.verification.status === 'unverified')).toBe(true);
  });

  it('passes through migrateContact unchanged (nothing clipped or dropped) and stays NFC', () => {
    for (const c of contacts) expect(migrateContact(c)).toEqual(c);
    for (const o of orgs) expect(migrateOrg(o, COUNTRIES.map((x) => x.nameEn))).toMatchObject({ name: o.name, sector: o.sector });
    expect(JSON.stringify(seedContacts)).toBe(JSON.stringify(seedContacts).normalize('NFC'));
  });
});

describe('contact logic', () => {
  const d: ContactDraft = {
    orgId: 'o1', name: '', role: '', email: 'a@b.org', phone: '', contactPageUrl: '', kind: 'org_generic', sourceUrl: '', sourceType: '',
    dateAccessed: '', confidence: 'high', whyRelevant: '', notes: '', verification: UNVERIFIED,
  };

  it('validates organization, email, https-only links, lengths and a required route', () => {
    expect(validateContact(d, ['o1'])).toEqual({});
    expect(validateContact({ ...d, orgId: 'nope' }, ['o1']).orgId).toBeTruthy();
    expect(validateContact({ ...d, email: 'nope' }, ['o1']).email).toBeTruthy();
    expect(validateContact({ ...d, contactPageUrl: 'http://x.org' }, ['o1']).contactPageUrl).toBeTruthy();
    expect(validateContact({ ...d, sourceUrl: 'javascript:alert(1)' }, ['o1']).sourceUrl).toBeTruthy();
    expect(validateContact({ ...d, name: 'x'.repeat(81) }, ['o1']).name).toBeTruthy();
    expect(validateContact({ ...d, email: '' }, ['o1']).email).toBe('Add an email, a phone or a contact page.');
  });

  it('migrates bad stored contacts safely', () => {
    expect(migrateContact({ name: 'x' })).toBeNull();
    const c = migrateContact({ orgId: 'o1', email: 'bad', contactPageUrl: 'http://x', kind: 'x', confidence: 'x', verification: { status: 'x' } }, 'f1')!;
    expect(c).toMatchObject({ id: 'f1', email: '', contactPageUrl: '', kind: 'org_generic', confidence: 'low', verification: { status: 'unverified' } });
  });

  describe('verification status transitions', () => {
    it('dates every status except unverified, and keeps a trimmed, limited note', () => {
      expect(setVerification('verified', '2026-11-02')).toEqual({ status: 'verified', verifiedAt: '2026-11-02' });
      expect(setVerification('invalid', '2026-11-02', ' bounced ')).toEqual({ status: 'invalid', verifiedAt: '2026-11-02', note: 'bounced' });
      expect(setVerification('needs_update', '2026-11-02').verifiedAt).toBe('2026-11-02');
      expect(setVerification('unverified', '2026-11-02', 'reset')).toEqual({ status: 'unverified', note: 'reset' });
      expect(setVerification('verified', '2026-11-02', 'x'.repeat(300)).note!.length).toBe(200);
    });

    it('rejects unknown statuses and bad dates from storage', () => {
      expect(migrateVerification({ status: 'hacked', verifiedAt: '2026-11-02' })).toEqual({ status: 'unverified' });
      expect(migrateVerification({ status: 'verified', verifiedAt: 'yesterday' })).toEqual({ status: 'verified' });
      expect(migrateVerification(null)).toEqual({ status: 'unverified' });
    });

    it('keeps an organization verification through migrateOrg', () => {
      const o = migrateOrg({ id: 'x', name: 'X', country: 'Ghana', verification: { status: 'verified', verifiedAt: '2026-11-02' } }, ['Ghana']);
      expect(o?.verification).toEqual({ status: 'verified', verifiedAt: '2026-11-02' });
    });
  });

  it('filters by country, status, confidence, kind and search, and sorts', () => {
    const base: OrgDraft = { country: 'Ghana', name: '', sector: '', contact: '', role: '', email: '', phone: '', web: '', status: 'Identificada', priority: 'Media', followUp: '', nextAction: '', notes: '', activities: [] };
    const os: Org[] = [{ ...base, id: 'o1', name: 'Beta' }, { ...base, id: 'o2', name: 'Alpha', country: 'Nigeria' }];
    const cs: Contact[] = [
      { ...d, id: 'c1', orgId: 'o1', confidence: 'low' },
      { ...d, id: 'c2', orgId: 'o2', name: 'Adé', kind: 'named_leader', verification: { status: 'verified', verifiedAt: '2026-11-02' } },
      { ...d, id: 'c3', orgId: 'gone' },
    ];
    const ids = (f = {}) => filterContacts(cs, os, { ...NO_CONTACT_FILTERS, ...f }).map((c) => c.id);
    expect(ids()).toEqual(['c2', 'c1']);
    expect(ids({ country: 'Ghana' })).toEqual(['c1']);
    expect(ids({ verify: 'verified' })).toEqual(['c2']);
    expect(ids({ confidence: 'low' })).toEqual(['c1']);
    expect(ids({ kind: 'named_leader' })).toEqual(['c2']);
    expect(ids({ query: 'ade' })).toEqual(['c2']);
    expect(ids({ sort: 'confidence' })).toEqual(['c2', 'c1']);
    expect(ids({ sort: 'status' })).toEqual(['c1', 'c2']);
  });

  it('exports contacts to CSV with formulas neutralised', () => {
    const csv = contactsToCsv([{ ...d, id: 'c', org: '=HYPERLINK("x")', country: 'Ghana', name: '+1' }]);
    const [, row] = csv.split('\r\n');
    expect(row.startsWith(`"'=HYPERLINK(""x"")","Ghana","'+1"`)).toBe(true);
  });

  it('reads contacts from a backup', () => {
    const r = parseBackup(JSON.stringify({ organizations: [{ id: 'o1', name: 'X', country: 'Ghana' }], contacts: [{ ...d, id: 'c1' }, { bad: 1 }] }), ['Ghana']);
    expect(r.ok && r.contacts.map((c) => c.id)).toEqual(['c1']);
  });
});

describe('Contacts view (render)', () => {
  beforeEach(() => {
    localStorage.removeItem('tfc.crm.v3');
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'crm', component: CrmPage }]), provideHttpClient()] });
  });

  it('lists the 89 seed contacts with the notice, status as text, safe links, and opens the dialogs', async () => {
    const h = await RouterTestingHarness.create('/crm?view=contacts');
    const el: HTMLElement = h.routeNativeElement!;
    expect(el.querySelectorAll('table.contacts tbody tr').length).toBe(89);
    expect(el.textContent).toContain('Contact details were collected from public sources on 2026-11-01 and not re-verified. Verify before contacting. Verification marks are saved only in this browser.');
    expect(el.querySelector('app-crm-verify-badge')?.textContent).toContain('Unverified');
    for (const a of Array.from(el.querySelectorAll<HTMLAnchorElement>('table.contacts a[target="_blank"]'))) {
      expect(a.href.startsWith('https://')).toBe(true);
      expect(a.rel).toBe('noopener noreferrer');
    }
    el.querySelector<HTMLButtonElement>('table.contacts .row-actions button')!.click();
    await h.fixture.whenStable();
    expect(document.querySelector('app-crm-contact-dialog h2')?.textContent).toContain('Edit contact');
  });

  it('shows unverified vs verified counts in the overview', async () => {
    const h = await RouterTestingHarness.create('/crm?view=overview');
    expect(h.routeNativeElement!.textContent).toMatch(/89\s*contacts unverified,\s*0\s*verified/);
  });
});

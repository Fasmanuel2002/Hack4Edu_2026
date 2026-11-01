import { routes } from '../app.routes';
import {
  NO_FILTERS, Org, OrgDraft, addMissingSeeds, filterOrgs, identityPending, followUps, isIsoDate, migrateOrg, parseBackup, parseCrmQuery, timeline, toCsv, validate,
} from './crm-logic';
import { COUNTRIES, isHttps } from '../site/research';
import seed from './seed-organizations.json';

const countries = ['Nigeria', 'Ghana'];
const draft: OrgDraft = {
  country: 'Ghana', name: 'Org X', sector: '', contact: '', role: '', email: '', phone: '', web: '',
  status: 'Descartada', priority: 'Baja', followUp: '', nextAction: '', notes: '', activities: [],
};
const org = (id: string, over: Partial<Org>): Org => ({ id, ...draft, ...over });
const orgs = [
  org('1', { name: 'Alpha NGO', country: 'Nigeria', priority: 'Alta', status: 'En conversación', followUp: '2026-10-25', nextAction: 'Call' }),
  org('2', { name: 'Beta', country: 'Ghana', priority: 'Media', status: 'Contactada', followUp: '2026-10-30', nextAction: 'Mail' }),
  org('3', { name: 'Gamma', country: 'Ghana', priority: 'Alta', status: 'Identificada', followUp: '2026-11-03', nextAction: 'Send' }),
  org('4', { name: 'Delta', country: 'Nigeria' }),
  org('5', { name: 'Eps', country: 'Ghana', status: 'Pausada', followUp: '2026-10-01', nextAction: 'x' }),
  org('6', { name: 'Zeta', country: 'Ghana', status: 'Colaboración', followUp: '2026-11-01', nextAction: 'Today' }),
];

describe('CRM logic', () => {
  it('has a lazy, public /crm route and no /login route', () => {
    expect(routes.find((r) => r.path === 'crm')?.loadComponent).toBeDefined();
    expect(routes.find((r) => r.path === 'crm')?.canActivate).toBeUndefined();
    expect(routes.find((r) => r.path === 'login')).toBeUndefined();
  });

  it('filters by query, country, priority, status and region together', () => {
    expect(filterOrgs(orgs, NO_FILTERS).length).toBe(6);
    expect(filterOrgs(orgs, { ...NO_FILTERS, query: 'ngo' }).map((o) => o.id)).toEqual(['1']);
    expect(filterOrgs(orgs, { ...NO_FILTERS, priority: 'Alta' }).length).toBe(2);
    expect(filterOrgs(orgs, { ...NO_FILTERS, country: 'Ghana', status: 'Contactada' }).map((o) => o.id)).toEqual(['2']);
    const regionOf = (c: string) => (c === 'Ghana' ? 'West' : 'Other');
    expect(filterOrgs(orgs, { ...NO_FILTERS, region: 'Other' }, regionOf).map((o) => o.id)).toEqual(['1', '4']);
  });

  it('searches without regard to case or accents', () => {
    const rows = [org('a', { name: 'Éducation Ọ̀tun' })];
    expect(filterOrgs(rows, { ...NO_FILTERS, query: 'education otun' }).length).toBe(1);
  });

  it('sorts by name, recent update and follow-up date', () => {
    const ids = (sort: 'name' | 'recent' | 'followup', rows = orgs) => filterOrgs(rows, { ...NO_FILTERS, sort }).map((o) => o.id);
    expect(ids('name')).toEqual(['1', '2', '4', '5', '3', '6']);
    expect(ids('followup').slice(0, 3)).toEqual(['5', '1', '2']);
    expect(ids('followup').at(-1)).toBe('4');
    const dated = [org('a', { name: 'A', updatedAt: '2026-01-01' }), org('b', { name: 'B', updatedAt: '2026-02-01' })];
    expect(ids('recent', dated)).toEqual(['b', 'a']);
  });

  it('classifies open follow-ups as overdue, today and upcoming, skipping paused and discarded', () => {
    const { overdue, today, upcoming } = followUps(orgs, '2026-11-01');
    expect(overdue.map((o) => o.id)).toEqual(['1', '2']);
    expect(today.map((o) => o.id)).toEqual(['6']);
    expect(upcoming.map((o) => o.id)).toEqual(['3']);
  });

  it('builds a newest-first timeline across organizations', () => {
    const rows = [
      org('1', { name: 'A', activities: [{ date: '2026-10-01', text: 'Call' }, { date: '', text: 'Old' }] }),
      org('2', { name: 'B', activities: [{ date: '2026-10-09', text: 'Mail' }] }),
    ];
    expect(timeline(rows).map((a) => a.text)).toEqual(['Mail', 'Call', 'Old']);
  });

  it('validates required fields, limits, email, website and dates', () => {
    expect(validate(draft, countries)).toEqual({});
    expect(Object.keys(validate({ ...draft, name: ' ', country: 'Mars' }, countries))).toEqual(['name', 'country']);
    expect(validate({ ...draft, name: 'x'.repeat(81) }, countries).name).toContain('80');
    expect(validate({ ...draft, email: 'nope' }, countries).email).toBeDefined();
    expect(validate({ ...draft, web: 'javascript:alert(1)' }, countries).web).toBeDefined();
    expect(validate({ ...draft, followUp: '2026-13-45', nextAction: 'a' }, countries).followUp).toBeDefined();
    expect(validate({ ...draft, followUp: '2026-11-02' }, countries).nextAction).toBeDefined();
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2026-02-28')).toBe(true);
  });

  it('exports quoted CSV and neutralises spreadsheet formulas', () => {
    const csv = toCsv([org('1', { name: '=SUM(A1)', notes: 'say "hi"' })]);
    const [header, row] = csv.split('\r\n');
    expect(header.startsWith('"Organization","Country"')).toBe(true);
    expect(row.startsWith(`"'=SUM(A1)"`)).toBe(true);
    expect(row).toContain('"say ""hi"""');
  });

  describe('migrateOrg', () => {
    it('adds activities to an old record and maps the retired status', () => {
      const old = { id: 'x', country: 'Ghana', name: 'Old', status: 'Propuesta enviada', priority: 'Alta', followUp: '' };
      const o = migrateOrg(old, countries)!;
      expect(o.activities).toEqual([]);
      expect(o.status).toBe('En conversación');
      expect(o.priority).toBe('Alta');
      expect(o.email).toBe('');
    });

    it('rejects records without a name or with an unknown country, and cleans bad fields', () => {
      expect(migrateOrg({ id: 'x', country: 'Ghana', name: '  ' }, countries)).toBeNull();
      expect(migrateOrg({ id: 'x', country: 'Mars', name: 'A' }, countries)).toBeNull();
      expect(migrateOrg(null, countries)).toBeNull();
      const o = migrateOrg({
        country: 'Ghana', name: 'x'.repeat(200), status: 'nope', priority: 'nope', followUp: '2026-99-99',
        activities: [{ date: 'bad', text: 'ok' }, { date: '2026-01-01', text: '  ' }, { text: 'y'.repeat(999) }, 5],
      }, countries, 'fallback')!;
      expect(o.id).toBe('fallback');
      expect(o.name.length).toBe(80);
      expect(o.status).toBe('Identificada');
      expect(o.priority).toBe('Media');
      expect(o.followUp).toBe('');
      expect(o.activities.map((a) => [a.date, a.text.length])).toEqual([['', 2], ['', 300]]);
    });
  });

  describe('parseBackup', () => {
    it('accepts a backup object or a bare array and counts skipped rows', () => {
      const good = { id: 'a', country: 'Ghana', name: 'Good' };
      const r = parseBackup(JSON.stringify({ organizations: [good, { name: 'No country' }], countryNotes: { Ghana: 'hi', Mars: 'x' } }), countries);
      expect(r).toMatchObject({ ok: true, skipped: 1, notes: { Ghana: 'hi' } });
      expect(parseBackup(JSON.stringify([good]), countries)).toMatchObject({ ok: true, skipped: 0 });
    });

    it('rejects bad JSON, wrong shape, empty results and oversize files with a message', () => {
      for (const text of ['{nope', '{"a":1}', '[]', '[{"name":"x","country":"Mars"}]', ' '.repeat(2_000_001)]) {
        const r = parseBackup(text, countries);
        expect(r.ok).toBe(false);
        expect(r.ok === false && r.error.length > 0).toBe(true);
      }
      expect(parseBackup(JSON.stringify(Array(501).fill({ country: 'Ghana', name: 'a' })), countries).ok).toBe(false);
    });
  });

  describe('parseCrmQuery', () => {
    it('reads view and country, case-insensitively', () => {
      expect(parseCrmQuery('orgs', null, countries)).toEqual({ view: 'orgs', country: '' });
      expect(parseCrmQuery(null, 'nigeria', countries)).toEqual({ view: 'countries', country: 'Nigeria' });
      expect(parseCrmQuery('map', 'Ghana', countries)).toEqual({ view: 'map', country: 'Ghana' });
    });

    it('falls back to the overview for unknown values', () => {
      expect(parseCrmQuery('bogus', 'Mars', countries)).toEqual({ view: 'overview', country: '' });
      expect(parseCrmQuery(null, null, countries)).toEqual({ view: 'overview', country: '' });
    });
  });
});

describe('seed data (ongs_por_pais.csv, 2026-11-01)', () => {
  // The 61 rows of ongs_por_pais.csv; the 38 `research-*` rows are checked in crm-contacts.spec.ts.
  const rows = (seed as (Org & { iso2: string })[]).filter((o) => !o.id.startsWith('research-'));
  const known = new Map(COUNTRIES.map((c) => [c.iso2, c.nameEn]));

  it('has 61 organizations with unique ids and 55 countries', () => {
    expect(rows.length).toBe(61);
    expect(new Set(rows.map((o) => o.id)).size).toBe(61);
    expect(new Set(rows.map((o) => o.iso2)).size).toBe(55);
    expect(rows.filter((o) => o.id.startsWith('seed-')).map((o) => o.id).sort()).toEqual(['seed-1', 'seed-2', 'seed-3', 'seed-4', 'seed-5', 'seed-6']);
  });

  it('joins every row to the research data by ISO2, with the same country name', () => {
    for (const o of rows) expect(known.get(o.iso2), o.id).toBe(o.country);
  });

  it('invents no contact person, collaboration state, priority or follow-up', () => {
    expect(rows.every((o) => !o.contact && !o.role && !o.followUp)).toBe(true);
    expect(rows.every((o) => o.status === 'Identificada' && o.priority === 'Media')).toBe(true);
    // 15 emails and 1 phone from the CSV, plus empty fields filled from the contact research (nothing overwritten).
    expect(rows.filter((o) => o.email).length).toBe(41);
    expect(rows.filter((o) => o.phone).length).toBe(34);
  });

  it('keeps source links https only and flags AFECO as unverified', () => {
    expect(rows.filter((o) => o.sourceUrl).every((o) => isHttps(o.sourceUrl))).toBe(true);
    expect(rows.filter((o) => o.sourceUrl).length).toBe(60);
    expect(rows.filter((o) => identityPending(o as Org)).map((o) => o.name)).toEqual(['AFECO']);
  });

  it('keeps Yorùbá and Spanish characters in NFC', () => {
    expect(rows.every((o) => JSON.stringify(o) === JSON.stringify(o).normalize('NFC'))).toBe(true);
  });
});

describe('addMissingSeeds', () => {
  const a = (id: string, name = id): Org => ({ id, ...draft, name });
  it('adds only the missing ids and never changes existing rows', () => {
    const merged = addMissingSeeds([a('1', 'Edited'), a('x')], [a('1', 'Seed'), a('2')]);
    expect(merged.map((o) => o.id)).toEqual(['1', 'x', '2']);
    expect(merged[0].name).toBe('Edited');
  });
});

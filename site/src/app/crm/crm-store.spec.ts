import { TestBed } from '@angular/core/testing';
import { CRM_LEGACY_KEY, CRM_STORAGE_KEY, CRM_V2_KEY, CrmStore, SEED_SET } from './crm-store';
import seed from './seed-organizations.json';
import seedContacts from './seed-contacts.json';
import { ContactDraft, OrgDraft, UNVERIFIED } from './crm-logic';

const N = seed.length;
const NC = seedContacts.length;
const RESEARCH = seed.filter((o) => o.id.startsWith('research-')).length;
const contactDraft: ContactDraft = {
  orgId: 'seed-1', name: 'Ada', role: '', email: 'ada@x.org', phone: '', contactPageUrl: '', kind: 'named_leader', sourceUrl: '', sourceType: '',
  dateAccessed: '', confidence: 'medium', whyRelevant: '', notes: '', verification: UNVERIFIED,
};

const draft: OrgDraft = {
  country: 'Ghana', name: 'Org X', sector: '', contact: '', role: '', email: '', phone: '', web: '',
  status: 'Identificada', priority: 'Media', followUp: '', nextAction: '', notes: '', activities: [],
};
const fresh = () => {
  TestBed.resetTestingModule();
  return TestBed.inject(CrmStore);
};

describe('CrmStore', () => {
  const clear = () => [CRM_STORAGE_KEY, CRM_V2_KEY, CRM_LEGACY_KEY].forEach((k) => localStorage.removeItem(k));
  beforeEach(clear);
  afterEach(() => { clear(); vi.restoreAllMocks(); });

  it('seeds the organizations (with empty activities) and the 89 contacts on first load', () => {
    const s = fresh();
    const orgs = s.orgs();
    expect(s.contacts().length).toBe(89);
    expect(orgs.length).toBe(N);
    expect(orgs.every((o) => Array.isArray(o.activities) && o.activities.length === 0)).toBe(true);
  });

  it('persists add, edit (with activities) and delete across a reload', () => {
    const s = fresh();
    s.save(draft);
    const id = s.orgs()[N].id;
    s.save({ ...draft, name: 'Org Y', activities: [{ date: '2026-10-01', text: 'Called' }] }, id);
    s.remove('seed-1');
    const again = fresh().orgs();
    expect(again.length).toBe(N);
    expect(again.find((o) => o.id === id)).toMatchObject({ name: 'Org Y', activities: [{ date: '2026-10-01', text: 'Called' }] });
  });

  it('persists country notes and drops a cleared note', () => {
    const s = fresh();
    s.saveNote('Ghana', 'Visit in March');
    expect(fresh().notes()).toEqual({ Ghana: 'Visit in March' });
    s.saveNote('Ghana', '  ');
    expect(fresh().notes()).toEqual({});
  });

  it('migrates v1 records (no activities) from the old key', () => {
    localStorage.setItem(CRM_LEGACY_KEY, JSON.stringify([{ id: 'old1', country: 'Ghana', name: 'Legacy', status: 'Propuesta enviada', priority: 'Alta' }]));
    const orgs = fresh().orgs();
    expect(orgs.length).toBe(N + 1);
    expect(orgs.find((o) => o.id === 'old1')).toMatchObject({ id: 'old1', name: 'Legacy', status: 'En conversación', activities: [] });
  });

  it('merges an import by id and keeps the rest', () => {
    const s = fresh();
    const first = s.orgs().find((o) => o.id === 'seed-1')!;
    s.merge([{ ...first, name: 'Renamed' }, { ...first, id: 'new1', name: 'Added' }], { Nigeria: 'note' });
    const again = fresh();
    expect(again.orgs().length).toBe(N + 1);
    expect(again.orgs().find((o) => o.id === 'seed-1')?.name).toBe('Renamed');
    expect(again.notes()).toEqual({ Nigeria: 'note' });
  });

  it('exports JSON that parses back to the same organizations', () => {
    const json = JSON.parse(fresh().exportJson());
    expect(json.version).toBe(3);
    expect(json.organizations.length).toBe(N);
    expect(json.contacts.length).toBe(NC);
  });

  it('reset restores the seed and clears notes', () => {
    const s = fresh();
    s.remove('seed-1');
    s.saveNote('Ghana', 'x');
    s.reset();
    const again = fresh();
    expect(again.orgs().length).toBe(N);
    expect(again.contacts().length).toBe(NC);
    expect(again.notes()).toEqual({});
  });

  it('falls back to the seed on corrupt storage', () => {
    localStorage.setItem(CRM_STORAGE_KEY, '{nope');
    expect(fresh().orgs().length).toBe(N);
  });

  it('keeps working when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    const s = fresh();
    expect(s.orgs().length).toBe(N);
    s.save(draft);
    expect(s.orgs().length).toBe(N + 1);
  });

  describe('seed merge by id', () => {
    const oldSix = (seed as { id: string }[]).filter((o) => /^seed-[1-6]$/.test(o.id)).map((o) => ({ ...o, web: '', sourceUrl: undefined }));
    const store = (extra: object) => localStorage.setItem(CRM_V2_KEY, JSON.stringify({ version: 2, organizations: oldSix.map((o) => (o.id === 'seed-1' ? { ...o, name: 'My edit', notes: 'mine' } : o)), countryNotes: {}, ...extra }));

    it('adds the missing seeds to the old 6, keeps edits and creates no duplicates', () => {
      store({});
      const orgs = fresh().orgs();
      expect(orgs.length).toBe(N);
      expect(new Set(orgs.map((o) => o.id)).size).toBe(N);
      expect(orgs.find((o) => o.id === 'seed-1')).toMatchObject({ name: 'My edit', notes: 'mine' });
      expect(orgs.find((o) => o.id === 'seed-1')?.sourceUrl).toBeUndefined();
    });

    it('keeps the visitor-added organizations too', () => {
      localStorage.setItem(CRM_V2_KEY, JSON.stringify({ version: 2, organizations: [{ id: 'local-1', country: 'Ghana', name: 'Mine' }], countryNotes: {} }));
      expect(fresh().orgs().length).toBe(N + 1);
    });

    it('does not bring back a seed the visitor deleted once the seed set is recorded', () => {
      const s = fresh();
      s.remove('public-AO-01');
      expect(fresh().orgs().length).toBe(N - 1);
      localStorage.removeItem(CRM_STORAGE_KEY);
      // A v2 browser with the 2026-11-01 seed set keeps its 6 rows and only receives the research organizations.
      store({ seedSet: SEED_SET });
      expect(fresh().orgs().length).toBe(6 + RESEARCH);
    });
  });

  describe('contacts', () => {
    it('migrates a v2 browser: keeps its data, adds seed contacts only for organizations it still has', () => {
      localStorage.setItem(CRM_V2_KEY, JSON.stringify({ version: 2, seedSet: SEED_SET, organizations: seed.filter((o) => o.id !== 'public-AO-01'), countryNotes: { Ghana: 'n' } }));
      const s = fresh();
      expect(s.orgs().length).toBe(N - 1);
      expect(s.notes()).toEqual({ Ghana: 'n' });
      expect(s.contacts().length).toBe(seedContacts.filter((c) => c.orgId !== 'public-AO-01').length);
      expect(s.contacts().every((c) => s.orgs().some((o) => o.id === c.orgId))).toBe(true);
    });

    it('persists add, edit, verification and delete; a deleted seed contact does not return; no duplicates', () => {
      const s = fresh();
      s.saveContact(contactDraft);
      const mine = s.contacts()[NC].id;
      s.saveContact({ ...contactDraft, name: 'Ada B.' }, mine);
      const first = seedContacts[0].id;
      s.verifyContact(first, { status: 'verified', verifiedAt: '2026-11-02', note: 'called' });
      s.removeContact(seedContacts[1].id);
      const again = fresh().contacts();
      expect(again.length).toBe(NC);
      expect(new Set(again.map((c) => c.id)).size).toBe(NC);
      expect(again.find((c) => c.id === mine)?.name).toBe('Ada B.');
      expect(again.find((c) => c.id === first)?.verification).toEqual({ status: 'verified', verifiedAt: '2026-11-02', note: 'called' });
      expect(again.find((c) => c.id === seedContacts[1].id)).toBeUndefined();
    });

    it('deletes the contacts of a deleted organization', () => {
      const s = fresh();
      const orgId = seedContacts[0].orgId;
      s.remove(orgId);
      expect(fresh().contacts().some((c) => c.orgId === orgId)).toBe(false);
    });

    it('merges imported contacts by id and skips those of unknown organizations', () => {
      const s = fresh();
      s.merge([], {}, [{ ...contactDraft, id: 'imp1' }, { ...contactDraft, id: 'imp2', orgId: 'nope' }]);
      expect(fresh().contacts().map((c) => c.id)).toContain('imp1');
      expect(fresh().contacts().map((c) => c.id)).not.toContain('imp2');
    });
  });
});

/** Pure CRM logic for /crm. No storage, no network. Field names and enum values are the wire format of docs/API_CONTRACT.md. */
export const PRIORITIES = ['Alta', 'Media', 'Baja'] as const;
export const STATES = ['Identificada', 'Contactada', 'En conversación', 'Colaboración', 'Pausada', 'Descartada'] as const;
export type Priority = (typeof PRIORITIES)[number];
export type OrgState = (typeof STATES)[number];

/** The UI is English; the contract's enum values are Spanish and are sent unchanged. */
export const PRIORITY_LABEL: Record<Priority, string> = { Alta: 'High', Media: 'Medium', Baja: 'Low' };
export const STATE_LABEL: Record<OrgState, string> = {
  'Identificada': 'Identified',
  'Contactada': 'Contacted',
  'En conversación': 'In conversation',
  'Colaboración': 'Collaboration',
  'Pausada': 'Paused',
  'Descartada': 'Discarded',
};

/** One dated note in an organization's history. `date` is `YYYY-MM-DD` or ''. */
export interface Activity {
  date: string;
  text: string;
}

export interface Org {
  /** '' when creating. */
  id: string;
  /** English country name, as in the language map. */
  country: string;
  name: string;
  sector: string;
  contact: string;
  role: string;
  email: string;
  phone: string;
  web: string;
  status: OrgState;
  priority: Priority;
  /** ISO date `YYYY-MM-DD`, or '' for none. */
  followUp: string;
  nextAction: string;
  notes: string;
  activities: Activity[];
  /** ISO timestamp of the last local edit; '' for the seed rows. */
  updatedAt?: string;
  /** Read-only provenance from the research dataset; absent on organizations the visitor added. */
  sourceUrl?: string;
  orgType?: string;
  researchStatus?: string;
  origin?: string;
  researchDate?: string;
  iso2?: string;
  /** Whether the organization's own email/phone were checked. Absent means unverified. */
  verification?: Verification;
}

/** Provenance keys: shown as information, never edited in the form. */
export const PROVENANCE = ['sourceUrl', 'orgType', 'researchStatus', 'origin', 'researchDate', 'iso2'] as const;

export type OrgDraft = Omit<Org, 'id' | 'updatedAt'>;

export const VERIFY_STATES = ['unverified', 'verified', 'invalid', 'needs_update'] as const;
export type VerifyState = (typeof VERIFY_STATES)[number];
export const VERIFY_LABEL: Record<VerifyState, string> = { unverified: 'Unverified', verified: 'Verified', invalid: 'Invalid', needs_update: 'Needs update' };
export interface Verification {
  status: VerifyState;
  /** `YYYY-MM-DD` the status was set; absent while unverified. */
  verifiedAt?: string;
  note?: string;
}
export const UNVERIFIED: Verification = { status: 'unverified' };

export const CONTACT_KINDS = ['org_generic', 'named_leader', 'press_office'] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];
export const KIND_LABEL: Record<ContactKind, string> = { org_generic: 'Organization contact', named_leader: 'Named leader', press_office: 'Press office' };
export const CONFIDENCES = ['high', 'medium', 'low'] as const;
export type Confidence = (typeof CONFIDENCES)[number];
export const CONFIDENCE_LABEL: Record<Confidence, string> = { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' };

/** A public contact route of an organization (research 2026-11-01) or one the visitor added. */
export interface Contact {
  /** '' when creating. */
  id: string;
  orgId: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  contactPageUrl: string;
  kind: ContactKind;
  sourceUrl: string;
  sourceType: string;
  dateAccessed: string;
  confidence: Confidence;
  whyRelevant: string;
  notes: string;
  verification: Verification;
  updatedAt?: string;
}
export type ContactDraft = Omit<Contact, 'id' | 'updatedAt'>;

export const CONTACT_LIMITS = {
  name: 80, role: 80, email: 120, phone: 60, contactPageUrl: 300, sourceUrl: 300, sourceType: 40, whyRelevant: 300, notes: 500, verifyNote: 200,
} as const;
export const MAX_IMPORT_CONTACTS = 1000;

/** Sets a verification status. Unverified clears the date; any other status is dated today. */
export function setVerification(status: VerifyState, today: string, note = ''): Verification {
  const n = note.trim().slice(0, CONTACT_LIMITS.verifyNote);
  return { status, ...(status === 'unverified' ? {} : { verifiedAt: today }), ...(n ? { note: n } : {}) };
}

export function migrateVerification(raw: unknown): Verification {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const status = VERIFY_STATES.find((s) => s === r['status']) ?? 'unverified';
  const at = typeof r['verifiedAt'] === 'string' && isIsoDate(r['verifiedAt']) && status !== 'unverified' ? r['verifiedAt'] : '';
  const note = clip(r['note'], CONTACT_LIMITS.verifyNote).trim();
  return { status, ...(at ? { verifiedAt: at } : {}), ...(note ? { note } : {}) };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HTTPS_URL = /^https:\/\/\S+$/;

export type ContactErrors = Partial<Record<keyof ContactDraft, string>>;

export function validateContact(d: ContactDraft, orgIds: readonly string[]): ContactErrors {
  const e: ContactErrors = {};
  if (!orgIds.includes(d.orgId)) e.orgId = 'Choose an organization.';
  for (const k of ['name', 'role', 'email', 'phone', 'contactPageUrl', 'sourceUrl', 'notes'] as const) {
    if (d[k].length > CONTACT_LIMITS[k]) e[k] = `Use at most ${CONTACT_LIMITS[k]} characters.`;
  }
  if (!e.email && d.email && !EMAIL.test(d.email)) e.email = 'Use a valid email address.';
  if (!e.contactPageUrl && d.contactPageUrl && !HTTPS_URL.test(d.contactPageUrl)) e.contactPageUrl = 'Use an https:// address.';
  if (!e.sourceUrl && d.sourceUrl && !HTTPS_URL.test(d.sourceUrl)) e.sourceUrl = 'Use an https:// address.';
  if (!e.email && !e.phone && !e.contactPageUrl && !d.email.trim() && !d.phone.trim() && !d.contactPageUrl.trim()) e.email = 'Add an email, a phone or a contact page.';
  if (!CONTACT_KINDS.includes(d.kind)) e.kind = 'Choose a kind.';
  if (!CONFIDENCES.includes(d.confidence)) e.confidence = 'Choose a confidence level.';
  return e;
}

/** Turns a stored, imported or seed record into a Contact, or null without an organization id. Text is cut to the limits; non-https links are dropped. */
export function migrateContact(raw: unknown, fallbackId = ''): Contact | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const orgId = clip(r['orgId'], 60);
  if (!orgId) return null;
  const url = (v: unknown) => (HTTPS_URL.test(clip(v, CONTACT_LIMITS.sourceUrl)) ? clip(v, CONTACT_LIMITS.sourceUrl) : '');
  const email = clip(r['email'], CONTACT_LIMITS.email);
  return {
    id: typeof r['id'] === 'string' && r['id'] ? r['id'].slice(0, 60) : fallbackId,
    orgId,
    name: clip(r['name'], CONTACT_LIMITS.name),
    role: clip(r['role'], CONTACT_LIMITS.role),
    email: EMAIL.test(email) ? email : '',
    phone: clip(r['phone'], CONTACT_LIMITS.phone),
    contactPageUrl: url(r['contactPageUrl']),
    kind: CONTACT_KINDS.find((k) => k === r['kind']) ?? 'org_generic',
    sourceUrl: url(r['sourceUrl']),
    sourceType: clip(r['sourceType'], CONTACT_LIMITS.sourceType),
    dateAccessed: typeof r['dateAccessed'] === 'string' && isIsoDate(r['dateAccessed']) ? r['dateAccessed'] : '',
    confidence: CONFIDENCES.find((c) => c === r['confidence']) ?? 'low',
    whyRelevant: clip(r['whyRelevant'], CONTACT_LIMITS.whyRelevant),
    notes: clip(r['notes'], CONTACT_LIMITS.notes),
    verification: migrateVerification(r['verification']),
    ...(clip(r['updatedAt'], 40) ? { updatedAt: clip(r['updatedAt'], 40) } : {}),
  };
}

export interface ContactRow extends Contact {
  org: string;
  country: string;
}

export interface ContactFilters {
  query: string;
  country: string;
  verify: string;
  confidence: string;
  kind: string;
  sort: 'org' | 'country' | 'confidence' | 'status';
}
export const NO_CONTACT_FILTERS: ContactFilters = { query: '', country: '', verify: '', confidence: '', kind: '', sort: 'org' };

/** Contacts joined to their organization, filtered and sorted. Contacts of a missing organization are left out. */
export function filterContacts(contacts: readonly Contact[], orgs: readonly Org[], f: ContactFilters): ContactRow[] {
  const byId = new Map(orgs.map((o) => [o.id, o]));
  const q = fold(f.query.trim());
  const rows = contacts.flatMap((c): ContactRow[] => {
    const o = byId.get(c.orgId);
    return o ? [{ ...c, org: o.name, country: o.country }] : [];
  }).filter(
    (c) =>
      (!f.country || c.country === f.country) &&
      (!f.verify || c.verification.status === f.verify) &&
      (!f.confidence || c.confidence === f.confidence) &&
      (!f.kind || c.kind === f.kind) &&
      (!q || fold([c.org, c.country, c.name, c.role, c.email, c.phone, c.notes].join(' ')).includes(q)),
  );
  const byOrg = (a: ContactRow, b: ContactRow) => a.org.localeCompare(b.org, 'en') || a.id.localeCompare(b.id);
  const by: Record<ContactFilters['sort'], (a: ContactRow, b: ContactRow) => number> = {
    org: byOrg,
    country: (a, b) => a.country.localeCompare(b.country, 'en') || byOrg(a, b),
    confidence: (a, b) => CONFIDENCES.indexOf(a.confidence) - CONFIDENCES.indexOf(b.confidence) || byOrg(a, b),
    status: (a, b) => VERIFY_STATES.indexOf(a.verification.status) - VERIFY_STATES.indexOf(b.verification.status) || byOrg(a, b),
  };
  return rows.sort(by[f.sort]);
}

const CONTACT_CSV: [string, (c: ContactRow) => string][] = [
  ['Organization', (c) => c.org],
  ['Country', (c) => c.country],
  ['Name', (c) => c.name],
  ['Role', (c) => c.role],
  ['Email', (c) => c.email],
  ['Phone', (c) => c.phone],
  ['Contact page', (c) => c.contactPageUrl],
  ['Kind', (c) => c.kind],
  ['Confidence', (c) => c.confidence],
  ['Verification', (c) => c.verification.status],
  ['Verified at', (c) => c.verification.verifiedAt ?? ''],
  ['Verification note', (c) => c.verification.note ?? ''],
  ['Source', (c) => c.sourceUrl],
  ['Date accessed', (c) => c.dateAccessed],
  ['Notes', (c) => c.notes],
];

export function contactsToCsv(rows: readonly ContactRow[]): string {
  return [CONTACT_CSV.map(([h]) => cell(h)).join(','), ...rows.map((c) => CONTACT_CSV.map(([, get]) => cell(get(c))).join(','))].join('\r\n');
}

export const LIMITS = {
  name: 80, sector: 100, sourceUrl: 300, orgType: 100, researchStatus: 120, origin: 60, researchDate: 10, iso2: 2, contact: 80, role: 60, email: 120, phone: 40, web: 200, nextAction: 120, notes: 500,
  activityText: 300, countryNote: 2000,
} as const;
export const MAX_ACTIVITIES = 100;
export const MAX_IMPORT_ORGS = 500;
export const MAX_IMPORT_BYTES = 2_000_000;

export const VIEWS = ['overview', 'countries', 'map', 'orgs', 'contacts', 'followups', 'activities', 'sources'] as const;
export type CrmView = (typeof VIEWS)[number];

/** `?view=` and `?country=` of /crm. A valid country without a view opens the Countries view. */
export function parseCrmQuery(
  view: string | null | undefined,
  country: string | null | undefined,
  countries: readonly string[],
): { view: CrmView; country: string } {
  const known = country ? countries.find((c) => c.toLowerCase() === country.trim().toLowerCase()) ?? '' : '';
  const v = VIEWS.find((x) => x === view);
  return { view: v ?? (known ? 'countries' : 'overview'), country: known };
}

export interface Filters {
  query: string;
  region: string;
  country: string;
  priority: string;
  status: string;
  sort: 'name' | 'recent' | 'followup';
}

export const NO_FILTERS: Filters = { query: '', region: '', country: '', priority: '', status: '', sort: 'name' };

/** Accent-insensitive, case-insensitive text for searching. */
export const fold = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function filterOrgs(orgs: readonly Org[], f: Filters, regionOf: (country: string) => string = () => ''): Org[] {
  const q = fold(f.query.trim());
  const rows = orgs.filter(
    (o) =>
      (!f.region || regionOf(o.country) === f.region) &&
      (!f.country || o.country === f.country) &&
      (!f.priority || o.priority === f.priority) &&
      (!f.status || o.status === f.status) &&
      (!q || fold([o.name, o.country, o.sector, o.contact, o.role, o.email, o.nextAction, o.notes].join(' ')).includes(q)),
  );
  const by: Record<Filters['sort'], (a: Org, b: Org) => number> = {
    name: (a, b) => a.name.localeCompare(b.name, 'en'),
    recent: (a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '') || a.name.localeCompare(b.name, 'en'),
    followup: (a, b) => (a.followUp || '9999').localeCompare(b.followUp || '9999') || a.name.localeCompare(b.name, 'en'),
  };
  return rows.sort(by[f.sort]);
}

export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  return !isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
}

export type DraftErrors = Partial<Record<keyof OrgDraft, string>>;

export function validate(d: OrgDraft, countries: readonly string[]): DraftErrors {
  const e: DraftErrors = {};
  if (!d.name.trim()) e.name = 'Enter a name.';
  if (!countries.includes(d.country)) e.country = 'Choose a country from the list.';
  for (const k of ['name', 'sector', 'contact', 'role', 'email', 'phone', 'web', 'nextAction', 'notes'] as const) {
    if (!e[k] && d[k].length > LIMITS[k]) e[k] = `Use at most ${LIMITS[k]} characters.`;
  }
  if (!e.email && d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) e.email = 'Use a valid email address.';
  if (!e.web && d.web && !/^https?:\/\/\S+$/i.test(d.web)) e.web = 'Start the website with http:// or https://.';
  if (!PRIORITIES.includes(d.priority)) e.priority = 'Choose a priority.';
  if (!STATES.includes(d.status)) e.status = 'Choose a status.';
  if (d.followUp && !isIsoDate(d.followUp)) e.followUp = 'Use a valid date.';
  if (d.followUp && !d.nextAction.trim()) e.nextAction = 'Describe the next action for this follow-up.';
  return e;
}

/** Paused and discarded organizations never count as follow-ups. */
export const isOpen = (o: Org) => o.status !== 'Pausada' && o.status !== 'Descartada';

/** Open follow-ups by date: before today, today, and after today. Rows without a date are left out. */
export function followUps(orgs: readonly Org[], today: string): { overdue: Org[]; today: Org[]; upcoming: Org[] } {
  const dated = orgs.filter((o) => o.followUp && isOpen(o)).sort((a, b) => a.followUp.localeCompare(b.followUp));
  return {
    overdue: dated.filter((o) => o.followUp < today),
    today: dated.filter((o) => o.followUp === today),
    upcoming: dated.filter((o) => o.followUp > today),
  };
}

export interface TimelineEntry extends Activity {
  org: string;
  orgId: string;
  country: string;
}

/** Every activity of the given organizations, newest first (undated last). */
export function timeline(orgs: readonly Org[]): TimelineEntry[] {
  return orgs
    .flatMap((o) => o.activities.map((a) => ({ ...a, org: o.name, orgId: o.id, country: o.country })))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

/** Local date as `YYYY-MM-DD` (not UTC, so "today" matches the user's calendar). */
export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const CSV_COLUMNS: [string, Exclude<keyof Org, 'activities' | 'verification' | (typeof PROVENANCE)[number]>][] = [
  ['Organization', 'name'],
  ['Country', 'country'],
  ['Sector', 'sector'],
  ['Contact', 'contact'],
  ['Role', 'role'],
  ['Email', 'email'],
  ['Phone', 'phone'],
  ['Website', 'web'],
  ['Priority', 'priority'],
  ['Status', 'status'],
  ['Next action', 'nextAction'],
  ['Follow-up date', 'followUp'],
  ['Notes', 'notes'],
];

function cell(value: string | undefined = ''): string {
  // A leading = + - @ would run as a formula when the file opens in a spreadsheet.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(orgs: readonly Org[]): string {
  const rows = orgs.map((o) => CSV_COLUMNS.map(([, k]) => cell(o[k])).join(','));
  return [CSV_COLUMNS.map(([h]) => cell(h)).join(','), ...rows].join('\r\n');
}

const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

/**
 * Turns a stored or imported record into an Org, or null when it has no name or an unknown country.
 * Old records (no `activities`, the retired status "Propuesta enviada") are migrated; text is cut to the limits.
 */
export function migrateOrg(raw: unknown, countries: readonly string[], fallbackId = ''): Org | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const name = clip(r['name'], LIMITS.name).trim();
  if (!name || typeof r['country'] !== 'string' || !countries.includes(r['country'])) return null;
  const status = r['status'] === 'Propuesta enviada' ? 'En conversación' : STATES.find((s) => s === r['status']) ?? 'Identificada';
  const followUp = typeof r['followUp'] === 'string' && isIsoDate(r['followUp']) ? r['followUp'] : '';
  const activities = (Array.isArray(r['activities']) ? r['activities'] : [])
    .map((a: unknown): Activity => {
      const x = (a ?? {}) as Record<string, unknown>;
      return { date: typeof x['date'] === 'string' && isIsoDate(x['date']) ? x['date'] : '', text: clip(x['text'], LIMITS.activityText).trim() };
    })
    .filter((a) => a.text)
    .slice(0, MAX_ACTIVITIES);
  return {
    id: typeof r['id'] === 'string' && r['id'] ? r['id'].slice(0, 60) : fallbackId,
    country: r['country'],
    name,
    sector: clip(r['sector'], LIMITS.sector),
    contact: clip(r['contact'], LIMITS.contact),
    role: clip(r['role'], LIMITS.role),
    email: clip(r['email'], LIMITS.email),
    phone: clip(r['phone'], LIMITS.phone),
    web: clip(r['web'], LIMITS.web),
    status,
    priority: PRIORITIES.find((p) => p === r['priority']) ?? 'Media',
    followUp,
    nextAction: clip(r['nextAction'], LIMITS.nextAction),
    notes: clip(r['notes'], LIMITS.notes),
    activities,
    updatedAt: clip(r['updatedAt'], 40),
    ...(r['verification'] ? { verification: migrateVerification(r['verification']) } : {}),
    ...Object.fromEntries(PROVENANCE.filter((k) => clip(r[k], LIMITS[k])).map((k) => [k, clip(r[k], LIMITS[k])])),
  };
}

/** True when the research flagged the organization's identity as unverified (AFECO). */
export const identityPending = (o: Org) => /pendiente de verificar/i.test(o.researchStatus ?? '');

/**
 * Seed rows whose id the visitor does not have and has never received (`known`), so a deleted seed does not return.
 * Existing rows are never changed or removed.
 */
export function addMissingSeeds<T extends { id: string }>(existing: readonly T[], seed: readonly T[], known: ReadonlySet<string> = new Set()): T[] {
  const have = new Set(existing.map((o) => o.id));
  return [...existing, ...seed.filter((o) => !have.has(o.id) && !known.has(o.id))];
}

export type CountryNotes = Record<string, string>;

export function cleanNotes(raw: unknown, countries: readonly string[]): CountryNotes {
  const out: CountryNotes = {};
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw)) if (countries.includes(k) && typeof v === 'string' && v) out[k] = v.slice(0, LIMITS.countryNote);
  }
  return out;
}

export type BackupResult = { ok: true; orgs: Org[]; notes: CountryNotes; contacts: Contact[]; skipped: number } | { ok: false; error: string };

/** Validates a JSON backup (`{organizations, countryNotes}` or a bare array). Never throws. */
export function parseBackup(text: string, countries: readonly string[]): BackupResult {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: 'The file is larger than 2 MB.' };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' };
  }
  const obj = (data && typeof data === 'object' && !Array.isArray(data) ? data : {}) as Record<string, unknown>;
  const list = Array.isArray(data) ? data : obj['organizations'];
  if (!Array.isArray(list)) return { ok: false, error: 'No "organizations" list found in the file.' };
  if (list.length > MAX_IMPORT_ORGS) return { ok: false, error: `The file has more than ${MAX_IMPORT_ORGS} organizations.` };
  const stamp = Date.now().toString(36);
  const orgs = list.map((o, i) => migrateOrg(o, countries, `import-${stamp}-${i}`)).filter((o): o is Org => !!o);
  const notes = cleanNotes(obj['countryNotes'], countries);
  const rawContacts = Array.isArray(obj['contacts']) ? obj['contacts'].slice(0, MAX_IMPORT_CONTACTS) : [];
  const contacts = rawContacts.map((c, i) => migrateContact(c, `import-${stamp}-c${i}`)).filter((c): c is Contact => !!c);
  if (!orgs.length && !Object.keys(notes).length) return { ok: false, error: 'No valid organizations or notes in the file.' };
  return { ok: true, orgs, notes, contacts, skipped: list.length - orgs.length };
}

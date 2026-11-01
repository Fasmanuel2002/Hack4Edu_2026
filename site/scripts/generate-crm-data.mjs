// Generates the CRM seed and the missing research field from the author's CRM bundle (read-only).
//   node scripts/generate-crm-data.mjs [bundleDir]
// Reads  ongs_por_pais.csv and paises.csv (UTF-8 with BOM, comma separated) from the bundle.
// Writes src/app/crm/seed-organizations.json (all 61 organizations, ids kept as in the CSV)
//   and adds `offlineEstimate` (estimated_offline_population) to src/app/site/research.json.
// Then reads scripts/data/contacts_research.csv (89 public contact routes, research 2026-11-01) and writes
//   src/app/crm/seed-contacts.json, attaching each contact to an existing organization (org_in_crm_id, or the same
//   ISO2 + normalized name) or to a new `research-<ISO2>-<slug>` organization appended to the seed.
// Text is copied as is (NFC check only): nothing is retyped, no contact is invented.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BUNDLE = process.argv[2] ?? '/Users/administrador/Downloads/Twins_for_Change_CRM_BASE_DATOS_CSV_SQLITE';
const SITE = fileURLToPath(new URL('..', import.meta.url));
const nfc = (t) => t.normalize('NFC');

/** Minimal RFC 4180 parser: quoted cells, doubled quotes, newlines inside quotes. */
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = text.replace(/^﻿/, '').length ? 0 : 0, t = text.replace(/^﻿/, ''); i < t.length; i++) {
    const c = t[i];
    if (quoted) {
      if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, nfc(r[i] ?? '')])));
}
const read = (f) => parseCsv(readFileSync(`${BUNDLE}/${f}`, 'utf8'));

// --- seed organizations -------------------------------------------------------------
const regionName = new Intl.DisplayNames('en', { type: 'region' }); // same as research.ts: ISO2 is the stable key
const orgs = read('ongs_por_pais.csv').map((r) => ({
  id: r.id,
  country: regionName.of(r.codigo_pais),
  name: r.organizacion,
  sector: r.sector,
  contact: r.nombre_contacto,
  role: r.cargo,
  email: r.email,
  phone: r.telefono,
  web: r.web,
  status: r.estado,
  priority: r.prioridad,
  followUp: r.proximo_seguimiento,
  nextAction: r.siguiente_accion,
  notes: r.notas,
  updatedAt: r.actualizado,
  sourceUrl: r.fuente,
  orgType: r.tipo_organizacion,
  researchStatus: r.estado_investigacion,
  origin: r.origen_registro,
  researchDate: r.fecha_investigacion,
  iso2: r.codigo_pais,
}));
if (orgs.length !== 61 || new Set(orgs.map((o) => o.id)).size !== 61) throw new Error('Expected 61 unique organizations');

// --- seed contacts (research 2026-11-01) --------------------------------------------
const rows = parseCsv(readFileSync(`${SITE}scripts/data/contacts_research.csv`, 'utf8'));
if (rows.length !== 89) throw new Error(`Expected 89 contact rows, got ${rows.length}`);
const key = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const slug = (t) => key(t).replace(/ /g, '-').slice(0, 40).replace(/-$/, '');
const https = (u) => (/^https:\/\/\S+$/.test(u) ? u : '');
const byId = new Map(orgs.map((o) => [o.id, o]));
const byName = new Map(orgs.map((o) => [`${o.iso2}|${key(o.name)}`, o]));
const tally = { matchedById: 0, matchedByName: 0, created: 0, idCountryMismatch: [], filled: [] };
const perOrg = new Map();
const contacts = rows.map((r) => {
  const country = regionName.of(r.country_iso2);
  let org = byId.get(r.org_in_crm_id);
  // An id that points to another country's organization is not trusted (Windle Trust: SO row -> public-SS-47).
  if (org && org.iso2 !== r.country_iso2) { tally.idCountryMismatch.push(`${r.country_iso2} ${r.organization} -> ${org.id}`); org = undefined; }
  if (org) tally.matchedById++;
  else if ((org = byName.get(`${r.country_iso2}|${key(r.organization)}`))) tally.matchedByName += org.id.startsWith('research-') ? 0 : 1;
  else {
    org = {
      id: `research-${r.country_iso2}-${slug(r.organization)}`, country, name: r.organization, sector: r.focus,
      contact: '', role: '', email: '', phone: '', web: '', status: 'Identificada', priority: 'Media', followUp: '', nextAction: '', notes: '',
      updatedAt: '', sourceUrl: https(r.source_url), orgType: r.org_type, researchStatus: 'Public contact route found; unverified',
      origin: `Investigacion web ${r.date_accessed}`, researchDate: r.date_accessed, iso2: r.country_iso2,
    };
    if (byId.has(org.id)) throw new Error(`Duplicate id ${org.id}`);
    orgs.push(org); byId.set(org.id, org); byName.set(`${org.iso2}|${key(org.name)}`, org); tally.created++;
  }
  // Only empty fields are filled; nothing already on an organization is overwritten.
  const fill = (k, v) => { if (!org[k] && v) { org[k] = v; if (!org.id.startsWith('research-')) tally.filled.push(`${org.id}.${k}`); } };
  fill('web', https(r.website));
  if (r.contact_kind === 'org_generic') {
    fill('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.contact_email) ? r.contact_email : '');
    fill('phone', r.contact_phone.length <= 40 ? r.contact_phone : '');
  }
  const n = (perOrg.get(org.id) ?? 0) + 1;
  perOrg.set(org.id, n);
  return {
    id: `c-${r.country_iso2}-${slug(r.organization)}-${n}`, orgId: org.id,
    name: r.contact_name, role: r.contact_role, email: r.contact_email, phone: r.contact_phone,
    contactPageUrl: https(r.contact_page_url), kind: r.contact_kind, sourceUrl: https(r.source_url), sourceType: r.source_type,
    dateAccessed: r.date_accessed, confidence: r.confidence, whyRelevant: r.why_relevant, notes: r.notes,
    verification: { status: 'unverified' },
  };
});
if (new Set(contacts.map((c) => c.id)).size !== contacts.length) throw new Error('Duplicate contact ids');
for (const c of contacts) {
  if (!['high', 'medium', 'low'].includes(c.confidence)) throw new Error(`Bad confidence on ${c.id}`);
  if (!['org_generic', 'named_leader', 'press_office'].includes(c.kind)) throw new Error(`Bad kind on ${c.id}`);
  if (/linkedin\.com\/in\//i.test(JSON.stringify(c))) throw new Error(`LinkedIn profile URL on ${c.id}`);
}
writeFileSync(`${SITE}src/app/crm/seed-organizations.json`, `${JSON.stringify(orgs, null, 1)}\n`);
writeFileSync(`${SITE}src/app/crm/seed-contacts.json`, `${JSON.stringify(contacts, null, 1)}\n`);
const longest = (k) => Math.max(...contacts.map((c) => c[k].length));
console.log(`contacts: ${contacts.length}; orgs matched by id ${tally.matchedById}, by name ${tally.matchedByName}, new ${tally.created}; total orgs ${orgs.length}`);
console.log(`id/country mismatch ignored: ${tally.idCountryMismatch.join('; ') || 'none'}; empty fields filled: ${tally.filled.join(', ') || 'none'}`);
console.log('longest:', ['name', 'role', 'email', 'phone', 'contactPageUrl', 'sourceUrl', 'whyRelevant', 'notes'].map((k) => `${k} ${longest(k)}`).join(', '),
  `| org name ${Math.max(...orgs.map((o) => o.name.length))}, sector ${Math.max(...orgs.map((o) => o.sector.length))}, orgType ${Math.max(...orgs.map((o) => o.orgType.length))}`);

// --- research.json: add the one indicator the bundle has and the snapshot lacks ----------
const file = `${SITE}src/app/site/research.json`;
const research = JSON.parse(readFileSync(file, 'utf8'));
const offline = new Map(read('paises.csv').map((p) => [p.iso2, p.estimated_offline_population]));
if (offline.size !== 55 || research.countries.length !== 55) throw new Error('Expected 55 countries');
for (const c of research.countries) {
  if (!offline.has(c.iso2)) throw new Error(`Country ${c.iso2} missing in paises.csv`);
  const v = offline.get(c.iso2);
  c.offlineEstimate = v === '' ? null : Number(v);
}
writeFileSync(file, JSON.stringify(research));
console.log(`seed: ${orgs.length} organizations (61 + research); research.json: ${[...offline.values()].filter(Boolean).length} offline estimates`);

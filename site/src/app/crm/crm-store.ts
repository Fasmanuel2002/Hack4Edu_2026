import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { browserStorage } from '../core/browser';
import { COUNTRIES } from '../site/research';
import {
  Contact, ContactDraft, CountryNotes, LIMITS, Org, OrgDraft, Verification, addMissingSeeds, cleanNotes, migrateContact, migrateOrg,
} from './crm-logic';
import seed from './seed-organizations.json';
import seedContacts from './seed-contacts.json';

/**
 * v3 stores `{ version, seedIds, organizations, contacts, countryNotes }`. `seedIds` lists every seed id (organization or
 * contact) this browser has received, so seeds a visitor deleted are not added back and new seeds still arrive.
 * v2 (`seedSet` marker, no contacts) and v1 (a bare array without activities) are migrated on read.
 */
export const CRM_STORAGE_KEY = 'tfc.crm.v3';
export const CRM_V2_KEY = 'tfc.crm.v2';
export const CRM_LEGACY_KEY = 'tfc.crm.organizations';

/** The v2 marker: such a browser had received the 61 organizations of 2026-11-01 (every seed id except `research-*`). */
export const SEED_SET = 'ongs-2026-11-01';

const NAMES = COUNTRIES.map((c) => c.nameEn);
const freshSeed = (): Org[] => (seed as unknown[]).map((o, i) => migrateOrg(o, NAMES, `seed-${i + 1}`)).filter((o): o is Org => !!o);
const freshContacts = (): Contact[] => (seedContacts as unknown[]).map((c) => migrateContact(c)).filter((c): c is Contact => !!c);
const ALL_SEED_IDS = [...freshSeed().map((o) => o.id), ...freshContacts().map((c) => c.id)];
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** The CRM's data: this browser only. Starts from the 61 seed organizations; edits persist in localStorage. */
@Injectable({ providedIn: 'root' })
export class CrmStore {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly orgs = signal<Org[]>([]);
  readonly notes = signal<CountryNotes>({});
  readonly contacts = signal<Contact[]>([]);

  constructor() {
    this.read();
  }

  /** Edit when `id` is set, otherwise add. */
  save(draft: OrgDraft, id = ''): void {
    const updatedAt = new Date().toISOString();
    this.set(
      id
        ? this.orgs().map((o) => (o.id === id ? { ...draft, id, updatedAt } : o))
        : [...this.orgs(), { ...draft, id: newId('local'), updatedAt }],
      this.notes(),
    );
  }

  /** Deletes the organization and its contacts. */
  remove(id: string): void {
    this.set(this.orgs().filter((o) => o.id !== id), this.notes(), this.contacts().filter((c) => c.orgId !== id));
  }

  saveNote(country: string, text: string): void {
    const { [country]: _old, ...rest } = this.notes();
    this.set(this.orgs(), text.trim() ? { ...rest, [country]: text.slice(0, LIMITS.countryNote) } : rest);
  }

  /** Edit when `id` is set, otherwise add. */
  saveContact(draft: ContactDraft, id = ''): void {
    const updatedAt = new Date().toISOString();
    this.set(
      this.orgs(),
      this.notes(),
      id ? this.contacts().map((c) => (c.id === id ? { ...draft, id, updatedAt } : c)) : [...this.contacts(), { ...draft, id: newId('local-c'), updatedAt }],
    );
  }

  removeContact(id: string): void {
    this.set(this.orgs(), this.notes(), this.contacts().filter((c) => c.id !== id));
  }

  verifyContact(id: string, verification: Verification): void {
    this.set(this.orgs(), this.notes(), this.contacts().map((c) => (c.id === id ? { ...c, verification } : c)));
  }

  /** Imported rows replace rows with the same id and are added otherwise; notes replace per country. Contacts of unknown organizations are skipped. */
  merge(orgs: Org[], notes: CountryNotes, contacts: Contact[] = []): void {
    const byId = new Map(this.orgs().map((o) => [o.id, o]));
    for (const o of orgs) byId.set(o.id, o);
    const people = new Map(this.contacts().map((c) => [c.id, c]));
    for (const c of contacts) if (byId.has(c.orgId)) people.set(c.id, c);
    this.set([...byId.values()], { ...this.notes(), ...notes }, [...people.values()]);
  }

  /** Back to the seed organizations and contacts, with no country notes. */
  reset(): void {
    this.set(freshSeed(), {}, freshContacts());
  }

  exportJson(): string {
    return JSON.stringify(
      { app: 'Twins for Change CRM', version: 3, exportedAt: new Date().toISOString(), organizations: this.orgs(), contacts: this.contacts(), countryNotes: this.notes() },
      null,
      2,
    );
  }

  private set(orgs: Org[], notes: CountryNotes, contacts = this.contacts()): void {
    this.orgs.set(orgs);
    this.notes.set(notes);
    this.contacts.set(contacts);
    try {
      if (this.browser) {
        const data = { version: 3, seedIds: ALL_SEED_IDS, organizations: orgs, contacts, countryNotes: notes };
        browserStorage()?.setItem(CRM_STORAGE_KEY, JSON.stringify(data));
      }
    } catch {
      // Quota or blocked storage: the edit stays in memory for this visit.
    }
  }

  private read(): void {
    let orgs: Org[] | null = null;
    let contacts: Contact[] = [];
    let notes: CountryNotes = {};
    let known = new Set<string>();
    try {
      const storage = this.browser ? browserStorage() : null;
      const raw = storage?.getItem(CRM_STORAGE_KEY) ?? storage?.getItem(CRM_V2_KEY);
      const data = (raw ? JSON.parse(raw) : null) as Record<string, unknown> | null;
      const stored = data?.['organizations'];
      if (Array.isArray(stored)) {
        orgs = stored.map((o, i) => migrateOrg(o, NAMES, `restored-${i}`)).filter((o): o is Org => !!o);
        notes = cleanNotes(data!['countryNotes'], NAMES);
        const people = data!['contacts'];
        if (Array.isArray(people)) contacts = people.map((c, i) => migrateContact(c, `restored-c${i}`)).filter((c): c is Contact => !!c);
        const ids = data!['seedIds'];
        if (Array.isArray(ids)) known = new Set(ids.filter((x): x is string => typeof x === 'string'));
        else if (data!['seedSet'] === SEED_SET) known = new Set(freshSeed().map((o) => o.id).filter((id) => !id.startsWith('research-')));
      } else {
        // First visit since v2: carry over what v1 saved.
        const legacy: unknown = JSON.parse(storage?.getItem(CRM_LEGACY_KEY) ?? 'null');
        if (Array.isArray(legacy)) orgs = legacy.map((o, i) => migrateOrg(o, NAMES, `restored-${i}`)).filter((o): o is Org => !!o);
      }
    } catch {
      // Unreadable storage or bad JSON: start from the seed.
    }
    // Seed rows this browser never received are added once; nothing it has is touched. Contacts need their organization.
    const allOrgs = orgs ? addMissingSeeds(orgs, freshSeed(), known) : freshSeed();
    const orgIds = new Set(allOrgs.map((o) => o.id));
    this.orgs.set(allOrgs);
    this.contacts.set(addMissingSeeds(contacts, freshContacts().filter((c) => orgIds.has(c.orgId)), known));
    this.notes.set(notes);
  }
}

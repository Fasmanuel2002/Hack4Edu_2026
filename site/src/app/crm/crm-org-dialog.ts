import { ChangeDetectionStrategy, Component, ElementRef, OnInit, afterNextRender, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { Announcer } from '../core/browser';
import { COUNTRIES, isHttps } from '../site/research';
import { Icon, IconName } from '../shared/icon';
import {
  DraftErrors, LIMITS, MAX_ACTIVITIES, Org, OrgDraft, PRIORITIES, PRIORITY_LABEL, PROVENANCE, STATES, STATE_LABEL, UNVERIFIED, Verification, isIsoDate, isoDate, validate,
} from './crm-logic';
import { CrmStore } from './crm-store';
import { CrmVerify, CrmVerifyBadge } from './crm-verify';

type Key = Exclude<keyof OrgDraft, 'activities' | 'verification' | (typeof PROVENANCE)[number]>;
type Group = 'org' | 'contact' | 'pipeline';
interface Field { key: Key; label: string; kind: 'text' | 'email' | 'tel' | 'url' | 'country' | 'priority' | 'status' | 'date' | 'area'; group: Group; wide?: boolean }

const FIELDS: Field[] = [
  { key: 'name', label: 'Name (required)', kind: 'text', group: 'org' },
  { key: 'country', label: 'Country (required)', kind: 'country', group: 'org' },
  { key: 'sector', label: 'Sector', kind: 'text', group: 'org', wide: true },
  { key: 'contact', label: 'Contact person', kind: 'text', group: 'contact' },
  { key: 'role', label: 'Contact role', kind: 'text', group: 'contact' },
  { key: 'email', label: 'Email', kind: 'email', group: 'contact' },
  { key: 'phone', label: 'Phone', kind: 'tel', group: 'contact' },
  { key: 'web', label: 'Website', kind: 'url', group: 'contact', wide: true },
  { key: 'priority', label: 'Priority', kind: 'priority', group: 'pipeline' },
  { key: 'status', label: 'Status', kind: 'status', group: 'pipeline' },
  { key: 'followUp', label: 'Follow-up date', kind: 'date', group: 'pipeline' },
  { key: 'nextAction', label: 'Next action', kind: 'text', group: 'pipeline', wide: true },
  { key: 'notes', label: 'Notes', kind: 'area', group: 'pipeline', wide: true },
];

const GROUPS: { id: Group; label: string; icon: IconName }[] = [
  { id: 'org', label: 'Organization', icon: 'clipboard' },
  { id: 'contact', label: 'Contact', icon: 'mail' },
  { id: 'pipeline', label: 'Pipeline and next step', icon: 'target' },
];

const EMPTY: OrgDraft = {
  country: '', name: '', sector: '', contact: '', role: '', email: '', phone: '', web: '',
  status: 'Identificada', priority: 'Media', followUp: '', nextAction: '', notes: '', activities: [],
};

/** Add / edit form in a native modal <dialog>: focus stays inside, Escape closes, focus returns to the opener. */
@Component({
  selector: 'app-crm-org-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, CrmVerify, CrmVerifyBadge],
  templateUrl: './crm-org-dialog.html',
  styleUrl: './crm-org-dialog.css',
})
export class CrmOrgDialog implements OnInit {
  private readonly crm = inject(CrmStore);
  private readonly announcer = inject(Announcer);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  /** The organization to edit, or null to add one. */
  readonly org = input<Org | null>(null);
  /** Country preselected for a new organization. */
  readonly country = input('');
  readonly closed = output<void>();

  protected readonly fields = FIELDS;
  protected readonly groups = GROUPS;
  protected readonly countries = COUNTRIES.map((c) => c.nameEn);
  protected readonly priorities = PRIORITIES;
  protected readonly states = STATES;
  protected readonly priorityLabel = PRIORITY_LABEL;
  protected readonly stateLabel = STATE_LABEL;
  protected readonly isHttps = isHttps;
  protected readonly maxActivities = MAX_ACTIVITIES;
  protected readonly activityMax = LIMITS.activityText;
  protected readonly unverified = UNVERIFIED;
  protected readonly research = (o: Org) => o.id.startsWith('research-');
  protected readonly orgContacts = computed(() => (this.org() ? this.crm.contacts().filter((c) => c.orgId === this.org()!.id) : []));

  protected readonly draft = signal<OrgDraft>({ ...EMPTY });
  protected readonly errors = signal<DraftErrors>({});
  protected readonly activityError = signal('');
  protected readonly confirmingDelete = signal(false);
  protected readonly newDate = signal(isoDate(new Date()));
  protected readonly newText = signal('');

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  ngOnInit(): void {
    const o = this.org();
    this.draft.set(o ? { ...EMPTY, ...o, activities: o.activities.map((a) => ({ ...a })) } : { ...EMPTY, country: this.country() });
  }

  protected maxLen(key: Key): number | null {
    return (LIMITS as Record<string, number>)[key] ?? null;
  }

  protected value(key: Key): string {
    return this.draft()[key];
  }

  protected set(key: Key, event: Event): void {
    const v = (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
    this.draft.update((d) => ({ ...d, [key]: v }));
  }

  protected verifyOrg(v: Verification): void {
    this.draft.update((d) => ({ ...d, verification: v }));
    this.announcer.announce('Verification status set. Press Save to keep it.');
  }

  protected verifyContact(id: string, v: Verification): void {
    this.crm.verifyContact(id, v);
    this.announcer.announce('Contact verification saved.');
  }

  protected addActivity(): boolean {
    const text = this.newText().trim();
    const date = this.newDate();
    this.activityError.set('');
    if (!text) return false;
    if (date && !isIsoDate(date)) return this.fail('Use a valid activity date.');
    if (this.draft().activities.length >= MAX_ACTIVITIES) return this.fail(`At most ${MAX_ACTIVITIES} activities per organization.`);
    this.draft.update((d) => ({
      ...d,
      activities: [...d.activities, { date, text }].sort((a, b) => b.date.localeCompare(a.date)),
    }));
    this.newText.set('');
    this.announcer.announce('Activity added. It is saved with the organization.');
    return true;
  }

  private fail(message: string): false {
    this.activityError.set(message);
    this.announcer.announce(message);
    return false;
  }

  protected removeActivity(index: number): void {
    this.draft.update((d) => ({ ...d, activities: d.activities.filter((_, i) => i !== index) }));
    this.announcer.announce('Activity removed. Press Save to keep the change.');
  }

  protected save(event: Event): void {
    event.preventDefault();
    // Text typed in the new-activity row but not added yet is kept rather than lost.
    if (this.newText().trim() && !this.addActivity()) return;
    const d = { ...this.draft(), name: this.draft().name.trim() };
    const errors = validate(d, this.countries);
    this.errors.set(errors);
    const keys = Object.keys(errors);
    if (keys.length) {
      this.announcer.announce(`The form has ${keys.length} ${keys.length === 1 ? 'error' : 'errors'}. ${Object.values(errors).join(' ')}`);
      this.dialog().nativeElement.querySelector<HTMLElement>(`#f-${keys[0]}`)?.focus();
      return;
    }
    this.crm.save(d, this.org()?.id ?? '');
    this.announcer.announce(`${d.name} ${this.org() ? 'updated' : 'added'}.`);
    this.close();
  }

  /** The first click asks for confirmation; the second deletes. */
  protected remove(): void {
    const o = this.org();
    if (!o) return;
    if (!this.confirmingDelete()) {
      this.confirmingDelete.set(true);
      this.announcer.announce(`Press Confirm delete to delete ${o.name}.`);
      return;
    }
    const n = this.orgContacts().length;
    this.crm.remove(o.id);
    this.announcer.announce(`${o.name} deleted${n ? ` with its ${n} ${n === 1 ? 'contact' : 'contacts'}` : ''}.`);
    this.close();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }
}

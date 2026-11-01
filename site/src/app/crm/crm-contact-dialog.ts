import { ChangeDetectionStrategy, Component, ElementRef, OnInit, afterNextRender, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { Announcer } from '../core/browser';
import { isHttps } from '../site/research';
import { Icon } from '../shared/icon';
import {
  CONFIDENCES, CONFIDENCE_LABEL, CONTACT_KINDS, CONTACT_LIMITS, Contact, ContactDraft, ContactErrors, KIND_LABEL, UNVERIFIED, Verification, validateContact,
} from './crm-logic';
import { CrmStore } from './crm-store';
import { CrmVerify, CrmVerifyBadge } from './crm-verify';

type TextKey = 'name' | 'role' | 'email' | 'phone' | 'contactPageUrl' | 'sourceUrl' | 'notes';
const TEXT_FIELDS: { key: TextKey; label: string; type: string; wide?: boolean }[] = [
  { key: 'name', label: 'Contact person', type: 'text' },
  { key: 'role', label: 'Role', type: 'text' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'contactPageUrl', label: 'Contact page (https://)', type: 'url', wide: true },
  { key: 'sourceUrl', label: 'Source (https://)', type: 'url', wide: true },
];

const EMPTY: ContactDraft = {
  orgId: '', name: '', role: '', email: '', phone: '', contactPageUrl: '', kind: 'org_generic', sourceUrl: '', sourceType: '',
  dateAccessed: '', confidence: 'medium', whyRelevant: '', notes: '', verification: UNVERIFIED,
};

/** Add / edit a contact in a native modal <dialog> (same pattern and styles as the organization dialog). */
@Component({
  selector: 'app-crm-contact-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, CrmVerify, CrmVerifyBadge],
  templateUrl: './crm-contact-dialog.html',
  styleUrl: './crm-org-dialog.css',
})
export class CrmContactDialog implements OnInit {
  private readonly crm = inject(CrmStore);
  private readonly announcer = inject(Announcer);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  /** The contact to edit, or null to add one. */
  readonly contact = input<Contact | null>(null);
  readonly closed = output<void>();

  protected readonly fields = TEXT_FIELDS;
  protected readonly kinds = CONTACT_KINDS;
  protected readonly kindLabel = KIND_LABEL;
  protected readonly confidences = CONFIDENCES;
  protected readonly confidenceLabel = CONFIDENCE_LABEL;
  protected readonly limits = CONTACT_LIMITS;
  protected readonly isHttps = isHttps;
  protected readonly orgs = computed(() => [...this.crm.orgs()].sort((a, b) => a.name.localeCompare(b.name, 'en')));

  protected readonly draft = signal<ContactDraft>({ ...EMPTY });
  protected readonly errors = signal<ContactErrors>({});
  protected readonly confirmingDelete = signal(false);

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  ngOnInit(): void {
    const c = this.contact();
    this.draft.set(c ? { ...EMPTY, ...c } : { ...EMPTY });
  }

  protected set(key: keyof ContactDraft, event: Event): void {
    const v = (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
    this.draft.update((d) => ({ ...d, [key]: v }));
  }

  protected verify(v: Verification): void {
    this.draft.update((d) => ({ ...d, verification: v }));
    this.announcer.announce('Verification status set. Press Save to keep it.');
  }

  protected save(event: Event): void {
    event.preventDefault();
    const d = { ...this.draft(), name: this.draft().name.trim(), email: this.draft().email.trim() };
    const errors = validateContact(d, this.crm.orgs().map((o) => o.id));
    this.errors.set(errors);
    const keys = Object.keys(errors);
    if (keys.length) {
      this.announcer.announce(`The form has ${keys.length} ${keys.length === 1 ? 'error' : 'errors'}. ${Object.values(errors).join(' ')}`);
      this.dialog().nativeElement.querySelector<HTMLElement>(`#cf-${keys[0]}`)?.focus();
      return;
    }
    this.crm.saveContact(d, this.contact()?.id ?? '');
    this.announcer.announce(`Contact ${this.contact() ? 'updated' : 'added'}.`);
    this.close();
  }

  /** The first click asks for confirmation; the second deletes. */
  protected remove(): void {
    const c = this.contact();
    if (!c) return;
    if (!this.confirmingDelete()) {
      this.confirmingDelete.set(true);
      this.announcer.announce('Press Confirm delete to delete this contact.');
      return;
    }
    this.crm.removeContact(c.id);
    this.announcer.announce('Contact deleted.');
    this.close();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }
}

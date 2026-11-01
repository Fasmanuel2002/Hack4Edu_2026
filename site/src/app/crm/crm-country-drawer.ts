import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, computed, inject, input, output, viewChild } from '@angular/core';
import { Announcer } from '../core/browser';
import { Icon } from '../shared/icon';
import { Country, LIMITATIONS, RESULT_EN, isHttps, languagesFor } from '../site/research';
import { LIMITS, Org, PRIORITY_LABEL, STATE_LABEL } from './crm-logic';
import { CrmAvatar, REGION_TONE } from './crm-bits';
import { CrmStore } from './crm-store';

/** Country profile from the bundled research data, plus this country's organizations and the visitor's own notes. */
@Component({
  selector: 'app-crm-country-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, Icon, CrmAvatar],
  templateUrl: './crm-country-drawer.html',
  styleUrl: './crm-country-drawer.css',
})
export class CrmCountryDrawer {
  private readonly crm = inject(CrmStore);
  private readonly announcer = inject(Announcer);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  readonly country = input.required<Country>();
  readonly closed = output<void>();
  readonly addOrg = output<string>();
  readonly editOrg = output<Org>();

  protected readonly noteMax = LIMITS.countryNote;
  protected readonly caveats = LIMITATIONS.slice(0, 4);
  protected readonly resultEn = RESULT_EN;
  protected readonly priorityLabel = PRIORITY_LABEL;
  protected readonly stateLabel = STATE_LABEL;
  protected readonly isHttps = isHttps;
  protected readonly tone = computed(() => REGION_TONE[this.country().region] ?? 'transparent');
  protected readonly languages = computed(() => languagesFor(this.country().name));
  protected readonly orgs = computed(() => this.crm.orgs().filter((o) => o.country === this.country().nameEn));
  protected readonly note = computed(() => this.crm.notes()[this.country().nameEn] ?? '');

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  protected saveNote(event: Event): void {
    this.crm.saveNote(this.country().nameEn, (event.target as HTMLTextAreaElement).value);
  }

  protected noteSaved(): void {
    this.announcer.announce(`Notes for ${this.country().nameEn} saved in this browser.`);
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }
}

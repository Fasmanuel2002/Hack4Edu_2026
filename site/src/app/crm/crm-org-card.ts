import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, output } from '@angular/core';
import { isHttps } from '../site/research';
import { Org, identityPending } from './crm-logic';
import { CrmAvatar, CrmPriority, CrmRoutes, CrmStatus, PRIORITY_TONE } from './crm-bits';

/**
 * One organization as a card (the Cards layout) or a compact card (a Board lane). The name button
 * covers the whole card, so the card opens the editor; the contact links sit above it.
 */
@Component({
  selector: 'app-crm-org-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrmAvatar, CrmStatus, CrmPriority, CrmRoutes],
  template: `
    <article [class.compact]="compact()" [style.--tone]="tone()">
      <header>
        <app-crm-avatar [name]="org().name" [flag]="compact() ? '' : flag()" [style.--av]="compact() ? '2rem' : '2.75rem'" />
        <div class="t">
          @if (compact()) {
            <p class="h"><button type="button" class="name" (click)="edit.emit()">{{ org().name }}</button></p>
          } @else {
            <h3 class="h"><button type="button" class="name" (click)="edit.emit()">{{ org().name }}</button></h3>
          }
          <p class="sub">{{ org().country }}{{ region() ? ' · ' + region() : '' }}</p>
        </div>
      </header>
      @if (!compact() && (org().orgType || pending())) {
        <p class="chips">
          @if (org().orgType) { <span class="chip" [attr.lang]="org().id.startsWith('research-') ? null : 'es'">{{ org().orgType }}</span> }
          @if (pending()) { <span class="chip warn">Identity pending verification</span> }
        </p>
      }
      @if (!compact()) {
        <p class="badges">
          <app-crm-status [status]="org().status" />
          <app-crm-priority [priority]="org().priority" />
          @if (org().followUp) { <span class="due">Follow-up {{ org().followUp }}</span> }
        </p>
      }
      <footer>
        @if (compact()) { <app-crm-priority [priority]="org().priority" /> }
        <app-crm-routes [org]="org()" />
        @if (!compact() && source()) {
          <a class="src" [href]="source()" target="_blank" rel="noopener noreferrer">Source<span class="visually-hidden"> for {{ org().name }} (opens in a new tab)</span></a>
        }
      </footer>
    </article>
  `,
  styles: `
    :host { display: block; height: 100%; }
    article {
      position: relative; display: grid; gap: 0.75rem; align-content: start; height: 100%; padding: 1rem 1.125rem;
      border: 1px solid var(--border); border-radius: 16px; background: var(--raised); box-shadow: inset 0 3px 0 var(--tone), var(--card-shadow);
      transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s var(--ease);
    }
    article:hover { border-color: var(--border-strong); }
    article:has(.name:focus-visible) { outline: 2px solid var(--focus); outline-offset: 2px; }
    @media (prefers-reduced-motion: no-preference) { article:hover { transform: translateY(-2px); } }
    header { display: flex; gap: 0.75rem; align-items: flex-start; }
    .t { min-width: 0; }
    .h { margin: 0; font-size: 1rem; font-weight: 700; line-height: 1.35; letter-spacing: -0.01em; }
    .name { padding: 0; border: 0; background: none; color: var(--text); font: inherit; text-align: start; overflow-wrap: anywhere; }
    .name:focus-visible { outline: none; }
    .name::after { content: ''; position: absolute; inset: 0; border-radius: 16px; }
    .name:hover { text-decoration: underline; text-underline-offset: 0.18em; }
    .sub { margin: 0.125rem 0 0; color: var(--text-muted); font-size: 0.8125rem; }
    .chips, .badges { display: flex; flex-wrap: wrap; gap: 0.375rem; margin: 0; }
    .chip { padding: 0.2rem 0.55rem; border-radius: 7px; background: var(--raised-2); color: var(--text-muted); font-size: 0.75rem; font-weight: 700; }
    .chip.warn { background: color-mix(in srgb, var(--amber) 22%, var(--raised)); color: var(--text); }
    .due { color: var(--text-muted); font-family: var(--font-mono); font-size: 0.75rem; align-self: center; }
    footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.5rem; margin-top: auto; padding-top: 0.625rem; border-top: 1px solid var(--border); }
    app-crm-routes, .src { position: relative; z-index: 1; }
    .src { color: var(--link); font-size: 0.8125rem; font-weight: 700; text-underline-offset: 0.18em; }
    .compact { gap: 0.5rem; padding: 0.75rem; border-radius: 12px; box-shadow: none; }
    .compact .name::after { border-radius: 12px; }
    .compact .h { font-size: 0.875rem; }
    .compact footer { padding-top: 0; border-top: 0; }
    .compact app-crm-routes { --route: 1.75rem; }
  `,
})
export class CrmOrgCard {
  readonly org = input.required<Org>();
  readonly flag = input('');
  readonly region = input('');
  readonly compact = input(false, { transform: booleanAttribute });
  readonly edit = output<void>();

  protected readonly tone = computed(() => PRIORITY_TONE[this.org().priority]);
  protected readonly pending = computed(() => identityPending(this.org()));
  protected readonly source = computed(() => (isHttps(this.org().sourceUrl) ? this.org().sourceUrl : ''));
}

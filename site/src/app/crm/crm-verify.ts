import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { Icon, IconName } from '../shared/icon';
import { CONTACT_LIMITS, VERIFY_LABEL, VERIFY_STATES, Verification, VerifyState, isoDate, setVerification } from './crm-logic';

const ICON: Record<VerifyState, IconName> = { unverified: 'info', verified: 'checkCircle', invalid: 'xCircle', needs_update: 'refresh' };
const TONE: Record<VerifyState, string> = { unverified: '#8a9eae', verified: '#1f9bb5', invalid: '#eda34b', needs_update: '#3d7fe6' };

/** Verification status as icon + text (never color alone), with the date it was set. */
@Component({
  selector: 'app-crm-verify-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `<span [style.--tone]="tone()"><app-icon [name]="icon()" />{{ label() }}@if (value().verifiedAt) { <time>{{ value().verifiedAt }}</time> }</span>`,
  styles: `
    :host { display: inline-flex; }
    span {
      --icon-size: 0.875rem;
      display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.2rem 0.55rem 0.2rem 0.4rem;
      border: 1px solid color-mix(in srgb, var(--tone) 45%, transparent); border-radius: 999px;
      background: color-mix(in srgb, var(--tone) 14%, var(--raised)); color: var(--text);
      font-size: 0.75rem; font-weight: 700; line-height: 1.3; white-space: nowrap;
    }
    time { font-weight: 400; font-variant-numeric: tabular-nums; }
  `,
})
export class CrmVerifyBadge {
  readonly value = input.required<Verification>();
  protected readonly label = computed(() => VERIFY_LABEL[this.value().status]);
  protected readonly icon = computed(() => ICON[this.value().status]);
  protected readonly tone = computed(() => TONE[this.value().status]);
}

let uid = 0;

/** "Validate contact info": a disclosure with status, an optional note, and "Mark as verified today". Emits; the parent saves. */
@Component({
  selector: 'app-crm-verify',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <details>
      <summary>Validate<span class="visually-hidden"> {{ label() }}</span></summary>
      <div class="body">
        <div class="field">
          <label [for]="id + '-s'">Status</label>
          <select [id]="id + '-s'" (change)="status.set($any($event.target).value)">
            @for (s of states; track s) { <option [value]="s" [selected]="s === status()">{{ labels[s] }}</option> }
          </select>
        </div>
        <div class="field">
          <label [for]="id + '-n'">Note (optional)</label>
          <input [id]="id + '-n'" type="text" [attr.maxlength]="noteMax" [value]="note()" (input)="note.set($any($event.target).value)" />
        </div>
        <div class="acts">
          <button type="button" class="btn btn-quiet" (click)="emit(status())">Set status</button>
          <button type="button" class="btn btn-quiet" (click)="emit('verified')"><app-icon name="check" /> Mark as verified today</button>
        </div>
      </div>
    </details>
  `,
  styles: `
    :host { display: block; }
    summary { width: fit-content; color: var(--link); font-size: 0.8125rem; font-weight: 700; cursor: pointer; text-decoration: underline; text-underline-offset: 0.18em; }
    .body { display: grid; gap: 0.5rem; margin-top: 0.5rem; min-width: 12rem; }
    .field { display: grid; gap: 0.2rem; }
    label { color: var(--text-muted); font-size: 0.75rem; font-weight: 700; }
    select, input { width: 100%; min-height: 2.25rem; padding: 0.35rem 0.6rem; border: 1px solid var(--border-strong); border-radius: 8px; background: var(--raised); color: var(--text); font-size: 0.8125rem; }
    .acts { display: flex; flex-wrap: wrap; gap: 0.375rem; }
    .btn { min-height: 2.25rem; font-size: 0.8125rem; }
  `,
})
export class CrmVerify {
  readonly value = input.required<Verification>();
  /** What is being validated, for screen readers ("ADPP Angola contact"). */
  readonly label = input.required<string>();
  readonly changed = output<Verification>();

  protected readonly id = `vfy-${++uid}`;
  protected readonly states = VERIFY_STATES;
  protected readonly labels = VERIFY_LABEL;
  protected readonly noteMax = CONTACT_LIMITS.verifyNote;
  protected readonly status = linkedSignal<VerifyState>(() => this.value().status);
  protected readonly note = linkedSignal(() => this.value().note ?? '');

  protected emit(status: VerifyState): void {
    this.changed.emit(setVerification(status, isoDate(new Date()), this.note()));
  }
}

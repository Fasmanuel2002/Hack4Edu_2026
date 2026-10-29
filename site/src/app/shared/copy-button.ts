import { ChangeDetectionStrategy, Component, DOCUMENT, inject, input, signal } from '@angular/core';
import { Announcer } from '../core/browser';
import { Icon } from './icon';

/** A 30px Copy action. Feedback is the check icon in the button (no toast) and one announcement. */
@Component({
  selector: 'app-copy-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <button
      type="button"
      class="act"
      [attr.aria-label]="copied() ? 'Copied' : label()"
      [attr.aria-describedby]="describedBy()"
      [title]="copied() ? 'Copied' : label()"
      (click)="copy()"
    >
      @if (copied()) {
        <app-icon class="pop" name="check" />
      } @else {
        <app-icon name="copy" />
      }
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .pop {
      animation: pop 0.2s var(--ease) backwards;
    }
  `,
})
export class CopyButton {
  readonly text = input.required<string>();
  readonly label = input('Copy');
  readonly describedBy = input<string | null>(null);
  /** What the live region says after a copy. */
  readonly done = input('Copied.');

  protected readonly copied = signal(false);
  private readonly announcer = inject(Announcer);
  private readonly document = inject(DOCUMENT);

  protected async copy(): Promise<void> {
    const text = this.text();
    let ok: boolean;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = this.legacyCopy(text);
    }
    if (ok) {
      this.copied.set(true);
      this.announcer.announce(this.done());
      setTimeout(() => this.copied.set(false), 2000);
    } else {
      this.announcer.announce('Could not copy. Select the text and copy it instead.');
    }
  }

  /** The Clipboard API needs a secure context; a school LAN may serve the app over http. */
  private legacyCopy(text: string): boolean {
    const active = this.document.activeElement as HTMLElement | null;
    const area = this.document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    this.document.body.appendChild(area);
    area.select();
    try {
      return this.document.execCommand('copy');
    } catch {
      return false;
    } finally {
      area.remove();
      active?.focus();
    }
  }
}

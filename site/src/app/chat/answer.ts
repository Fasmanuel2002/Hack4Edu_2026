import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Announcer } from '../core/browser';
import { ChatStore, slotKey } from '../core/chat-store';
import { ANSWER_LABELS } from '../core/corpus';
import { clockTime, isoTime } from '../core/format';
import { renderMarkdown } from '../core/markdown';
import { AnswerKind, AnswerSlot, Turn } from '../core/models';
import { Icon } from '../shared/icon';
import { Sources } from './sources';

/** One answer card: label, Markdown body revealed word by word, actions, and sources. */
@Component({
  selector: 'app-answer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Sources],
  templateUrl: './answer.html',
  styleUrl: './answer.css',
})
export class Answer {
  readonly conversationId = input.required<string>();
  readonly turn = input.required<Turn>();
  readonly kind = input.required<AnswerKind>();

  protected readonly store = inject(ChatStore);
  private readonly announcer = inject(Announcer);
  private readonly document = inject(DOCUMENT);

  protected readonly label = computed(() => ANSWER_LABELS[this.kind()]);
  protected readonly slot = computed<AnswerSlot>(() => {
    const turn = this.turn();
    return this.kind() === 'plain' && turn.plain ? turn.plain : turn.rag;
  });
  protected readonly key = computed(() =>
    slotKey(this.conversationId(), this.turn().id, this.kind()).replaceAll('/', '-'),
  );
  private readonly shown = computed(() =>
    this.store.reveals().get(slotKey(this.conversationId(), this.turn().id, this.kind())),
  );
  protected readonly revealing = computed(() => this.shown() !== undefined);
  protected readonly html = computed(() => {
    const text = this.slot().text;
    const shown = this.shown();
    return renderMarkdown(shown === undefined ? text : text.slice(0, shown));
  });
  protected readonly hasYoruba = computed(() => this.html().includes('class="yo"'));
  protected readonly elapsed = computed(() => {
    const since = this.slot().requestedAt ?? this.turn().askedAt;
    return Math.max(0, Math.round((this.store.now() - since) / 1000));
  });
  protected readonly copied = signal(false);

  protected readonly clockTime = clockTime;
  protected readonly isoTime = isoTime;

  protected regenerate(): void {
    this.store.regenerate(this.conversationId(), this.turn().id, this.kind());
  }

  protected async copy(): Promise<void> {
    const text = this.slot().text;
    let ok: boolean;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = this.legacyCopy(text);
    }
    if (ok) {
      this.copied.set(true);
      this.announcer.announce('Answer copied.');
      setTimeout(() => this.copied.set(false), 2000);
    } else {
      this.announcer.announce('Could not copy. Select the answer text and copy it instead.');
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

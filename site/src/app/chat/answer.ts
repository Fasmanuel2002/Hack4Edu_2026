import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { ChatStore, slotKey } from '../core/chat-store';
import { API_CONFIG } from '../core/config';
import { answerLabel } from '../core/corpus';
import { clockTime, formatDuration, isoTime } from '../core/format';
import { isFallbackAnswer, renderLines, renderMarkdown } from '../core/markdown';
import { AnswerKind, AnswerSlot, Turn } from '../core/models';
import { CopyButton } from '../shared/copy-button';
import { Icon } from '../shared/icon';
import { Logo } from '../shared/logo';
import { Sources } from './sources';

/** What the pending state says: no fake progress stages, only what is really happening. */
const PENDING_TEXT = {
  demo: 'Preparing the demo answer…',
  rag: 'Searching the corpus…',
  plain: 'Writing an answer with no retrieved context…',
} as const;

/** One answer: avatar, label, sources track, Markdown revealed word by word, then actions. */
@Component({
  selector: 'app-answer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Logo, CopyButton, Sources],
  templateUrl: './answer.html',
  styleUrl: './answer.css',
})
export class Answer {
  readonly conversationId = input.required<string>();
  readonly turn = input.required<Turn>();
  readonly kind = input.required<AnswerKind>();
  /** The latest answer keeps its actions visible; earlier ones show them on hover or focus. */
  readonly latest = input(true);

  protected readonly store = inject(ChatStore);
  private readonly demoMode = inject(API_CONFIG).useMock;

  /** Compare mode: each answer is an outlined column with its CLAUDE.md label. */
  protected readonly compare = computed(() => this.turn().plain !== null);
  /** "Twins for Change"; in compare mode the two labels from CLAUDE.md. */
  protected readonly label = computed(() => answerLabel(this.kind(), this.compare()));
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
  /** The out-of-database answer, known from the full text so its note shows from the first word. */
  protected readonly fallback = computed(() => isFallbackAnswer(this.slot().text));
  protected readonly html = computed(() => {
    const text = this.slot().text;
    const shown = this.shown();
    const visible = shown === undefined ? text : text.slice(0, shown);
    return this.fallback() ? renderLines(visible) : renderMarkdown(visible);
  });
  /** The sources track: Twins for Change answers only, once the answer (or a part) is there. */
  protected readonly showSources = computed(() => {
    const slot = this.slot();
    return (
      this.kind() === 'rag' &&
      (slot.status === 'done' || (slot.status === 'stopped' && slot.sources.length > 0))
    );
  });
  protected readonly pendingText = computed(() =>
    this.demoMode ? PENDING_TEXT.demo : PENDING_TEXT[this.kind()],
  );
  protected readonly elapsed = computed(() => {
    const since = this.slot().requestedAt ?? this.turn().askedAt;
    return Math.max(0, Math.round((this.store.now() - since) / 1000));
  });
  /** When this answer was requested: a finished slot no longer carries it, so it is kept here. */
  private readonly requestedAt = linkedSignal<AnswerSlot, number | null>({
    source: this.slot,
    computation: (slot, previous) =>
      slot.status === 'pending' ? (slot.requestedAt ?? null) : (previous?.value ?? null),
  });
  /** "4.2 s" from request to answer, known when this page saw the request start. */
  protected readonly took = computed(() => {
    const from = this.requestedAt();
    const to = this.slot().receivedAt;
    return from !== null && to ? formatDuration(to - from) : null;
  });

  protected readonly clockTime = clockTime;
  protected readonly isoTime = isoTime;

  protected regenerate(): void {
    this.store.regenerate(this.conversationId(), this.turn().id, this.kind());
  }
}

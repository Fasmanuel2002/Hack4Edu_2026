import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiError, ApiService } from './api.service';
import { Announcer, MediaQueries } from './browser';
import { ANSWER_LABELS } from './corpus';
import { HistoryStorage, groupConversations } from './history';
import { AnswerKind, AnswerSlot, AttachmentInfo, Conversation, Turn } from './models';
import { shortenAtWord } from './yoruba';

const TICK_MS = 33;
const TITLE_LENGTH = 60;

interface Reveal {
  readonly ends: readonly number[];
  readonly step: number;
  readonly onDone: () => void;
  index: number;
}

/** Positions just after each word (and its trailing spaces). Tone marks never start a word. */
export function wordEnds(text: string): number[] {
  const ends: number[] = [];
  for (let i = 1; i < text.length; i++) {
    if (/\s/.test(text[i - 1]) && !/\s/.test(text[i])) {
      ends.push(i);
    }
  }
  ends.push(text.length);
  return ends;
}

export function slotKey(conversationId: string, turnId: string, kind: AnswerKind): string {
  return `${conversationId}/${turnId}/${kind}`;
}

function newId(): string {
  // crypto.randomUUID needs a secure context; school LANs may serve the app over plain http.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function pendingSlot(kind: AnswerKind): AnswerSlot {
  return { kind, status: 'pending', text: '', sources: [], demo: false, requestedAt: Date.now() };
}

/** Chat state: conversations (saved in localStorage), requests, progressive display, stop. */
@Injectable({ providedIn: 'root' })
export class ChatStore {
  private readonly api = inject(ApiService);
  private readonly history = inject(HistoryStorage);
  private readonly announcer = inject(Announcer);
  private readonly media = inject(MediaQueries);

  readonly conversations = signal<readonly Conversation[]>([]);
  readonly activeId = signal<string | null>(null);
  readonly compare = signal(false);
  /** Characters shown so far for answers being revealed, by slot key. */
  readonly reveals = signal<ReadonlyMap<string, number>>(new Map());
  /** Ticks every second while a request is pending, for the elapsed time. */
  readonly now = signal(Date.now());

  readonly active = computed(
    () => this.conversations().find((c) => c.id === this.activeId()) ?? null,
  );
  readonly groups = computed(() => groupConversations(this.conversations()));
  /** True while the open chat waits for an answer or reveals one: the composer shows Stop. */
  readonly generating = computed(() => {
    const conversation = this.active();
    if (!conversation) {
      return false;
    }
    const reveals = this.reveals();
    return conversation.turns.some(
      (turn) =>
        [turn.rag, turn.plain].some((slot) => slot?.status === 'pending') ||
        reveals.has(slotKey(conversation.id, turn.id, 'rag')) ||
        reveals.has(slotKey(conversation.id, turn.id, 'plain')),
    );
  });

  private readonly controllers = new Map<string, AbortController>();
  private readonly revealing = new Map<string, Reveal>();
  private revealTimer: ReturnType<typeof setInterval> | null = null;
  private clockTimer: ReturnType<typeof setInterval> | null = null;
  private loaded = false;

  /** Reads saved history once, in the browser. */
  load(): void {
    if (!this.loaded) {
      this.loaded = true;
      this.conversations.set(this.history.load());
    }
  }

  newChat(): void {
    this.activeId.set(null);
  }

  select(id: string): void {
    this.activeId.set(id);
  }

  rename(id: string, title: string): void {
    const clean = title.replace(/\s+/g, ' ').trim();
    if (clean) {
      this.updateConversation(id, (c) => ({ ...c, title: clean }));
      this.persist();
    }
  }

  remove(id: string): void {
    for (const [key, controller] of this.controllers) {
      if (key.startsWith(`${id}/`)) {
        controller.abort();
      }
    }
    this.dropReveals((key) => key.startsWith(`${id}/`));
    this.conversations.update((list) => list.filter((c) => c.id !== id));
    if (this.activeId() === id) {
      this.activeId.set(null);
    }
    this.persist();
  }

  /** Sends one question (and only the question) to /ask/rag, plus /ask/plain in compare mode. */
  ask(question: string, attachments: readonly AttachmentInfo[] = []): void {
    const text = question.trim();
    if (!text || this.generating()) {
      return;
    }
    const now = Date.now();
    const turn: Turn = {
      id: newId(),
      question: text,
      askedAt: now,
      attachments,
      rag: pendingSlot('rag'),
      plain: this.compare() ? pendingSlot('plain') : null,
    };
    let conversation = this.active();
    if (conversation) {
      this.updateConversation(conversation.id, (c) => ({
        ...c,
        updatedAt: now,
        turns: [...c.turns, turn],
      }));
    } else {
      conversation = {
        id: newId(),
        title: shortenAtWord(text, TITLE_LENGTH),
        createdAt: now,
        updatedAt: now,
        turns: [turn],
      };
      this.conversations.update((list) => [conversation as Conversation, ...list]);
      this.activeId.set(conversation.id);
    }
    this.persist();
    void this.run(conversation.id, turn.id, 'rag', text);
    if (turn.plain) {
      void this.run(conversation.id, turn.id, 'plain', text);
    }
  }

  /** Sends the same question again to the same endpoint (also used by Retry). */
  regenerate(conversationId: string, turnId: string, kind: AnswerKind): void {
    const turn = this.conversations()
      .find((c) => c.id === conversationId)
      ?.turns.find((t) => t.id === turnId);
    if (!turn || this.generating()) {
      return;
    }
    this.updateSlot(conversationId, turnId, kind, () => pendingSlot(kind));
    this.updateConversation(conversationId, (c) => ({ ...c, updatedAt: Date.now() }));
    this.persist();
    void this.run(conversationId, turnId, kind, turn.question);
  }

  /** Stop generating: cancels requests (AbortController) and freezes answers being revealed. */
  stop(): void {
    const id = this.activeId();
    if (!id) {
      return;
    }
    for (const [key, controller] of this.controllers) {
      if (key.startsWith(`${id}/`)) {
        controller.abort();
      }
    }
    const shown = this.reveals();
    for (const key of [...this.revealing.keys()].filter((k) => k.startsWith(`${id}/`))) {
      const [conversationId, turnId, kind] = key.split('/') as [string, string, AnswerKind];
      const length = shown.get(key) ?? 0;
      this.updateSlot(conversationId, turnId, kind, (slot) => ({
        ...slot,
        status: 'stopped',
        text: slot.text.slice(0, length),
      }));
    }
    this.dropReveals((key) => key.startsWith(`${id}/`));
    this.persist();
  }

  private async run(
    conversationId: string,
    turnId: string,
    kind: AnswerKind,
    question: string,
  ): Promise<void> {
    const key = slotKey(conversationId, turnId, kind);
    const controller = new AbortController();
    this.controllers.set(key, controller);
    this.startClock();
    try {
      const result = await this.api.ask(kind, question, controller.signal);
      this.updateSlot(conversationId, turnId, kind, () => ({
        kind,
        status: 'done',
        text: result.answer,
        sources: result.sources,
        demo: result.demo,
        receivedAt: Date.now(),
      }));
      this.persist();
      if (this.media.reducedMotion() || !result.answer) {
        this.announceDone(kind, result.demo);
      } else {
        this.startReveal(key, result.answer, kind, result.demo);
      }
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'aborted') {
        this.updateSlot(conversationId, turnId, kind, (slot) => ({ ...slot, status: 'stopped' }));
      } else {
        const message =
          error instanceof ApiError ? error.message : 'Something went wrong. Try again.';
        this.updateSlot(conversationId, turnId, kind, (slot) => ({
          ...slot,
          status: 'error',
          error: message,
        }));
        this.announcer.announce(`${ANSWER_LABELS[kind]} could not answer. ${message}`);
      }
      this.persist();
    } finally {
      this.controllers.delete(key);
      if (this.controllers.size === 0 && this.clockTimer) {
        clearInterval(this.clockTimer);
        this.clockTimer = null;
      }
    }
  }

  private startReveal(key: string, text: string, kind: AnswerKind, demo: boolean): void {
    const ends = wordEnds(text);
    const duration = Math.min(Math.max(ends.length * 28, 700), 4000);
    const step = Math.max(1, Math.ceil(ends.length / Math.max(1, duration / TICK_MS)));
    const onDone = () => this.announceDone(kind, demo);
    this.revealing.set(key, { ends, step, onDone, index: 0 });
    this.reveals.update((map) => new Map(map).set(key, 0));
    this.revealTimer ??= setInterval(() => this.tick(), TICK_MS);
  }

  private tick(): void {
    const next = new Map(this.reveals());
    for (const [key, reveal] of this.revealing) {
      reveal.index = Math.min(reveal.index + reveal.step, reveal.ends.length);
      if (reveal.index >= reveal.ends.length) {
        next.delete(key);
        this.revealing.delete(key);
        reveal.onDone();
      } else {
        next.set(key, reveal.ends[reveal.index - 1]);
      }
    }
    this.reveals.set(next);
    if (this.revealing.size === 0 && this.revealTimer) {
      clearInterval(this.revealTimer);
      this.revealTimer = null;
    }
  }

  private dropReveals(match: (key: string) => boolean): void {
    const next = new Map(this.reveals());
    for (const key of [...this.revealing.keys()].filter(match)) {
      this.revealing.delete(key);
      next.delete(key);
    }
    this.reveals.set(next);
  }

  private announceDone(kind: AnswerKind, demo: boolean): void {
    this.announcer.announce(`Answer ready: ${ANSWER_LABELS[kind]}.${demo ? ' Demo data.' : ''}`);
  }

  private startClock(): void {
    this.now.set(Date.now());
    this.clockTimer ??= setInterval(() => this.now.set(Date.now()), 1000);
  }

  private updateConversation(id: string, change: (c: Conversation) => Conversation): void {
    this.conversations.update((list) => list.map((c) => (c.id === id ? change(c) : c)));
  }

  private updateSlot(
    conversationId: string,
    turnId: string,
    kind: AnswerKind,
    change: (slot: AnswerSlot) => AnswerSlot,
  ): void {
    this.updateConversation(conversationId, (c) => ({
      ...c,
      turns: c.turns.map((t) => {
        if (t.id !== turnId) {
          return t;
        }
        if (kind === 'rag') {
          return { ...t, rag: change(t.rag) };
        }
        return t.plain ? { ...t, plain: change(t.plain) } : t;
      }),
    }));
  }

  private persist(): void {
    this.history.save(this.conversations());
  }
}

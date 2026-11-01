import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { browserStorage } from './browser';
import { AnswerSlot, Conversation, CorpusSource, Turn } from './models';

/** localStorage key. History lives only in this browser; the backend never sees it. */
export const HISTORY_KEY = 'tfc.chats.v1';

/** A new `session_id` for one conversation. randomUUID needs a secure context (plain http on a school LAN has none). */
export function newSessionId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

const RELOADED = 'The page was reloaded before this answer arrived.';

@Injectable({ providedIn: 'root' })
export class HistoryStorage {
  private readonly storage = isPlatformBrowser(inject(PLATFORM_ID)) ? browserStorage() : null;

  load(): Conversation[] {
    return this.storage ? parseHistory(this.storage.getItem(HISTORY_KEY)) : [];
  }

  save(conversations: readonly Conversation[]): void {
    try {
      this.storage?.setItem(HISTORY_KEY, serializeHistory(conversations));
    } catch {
      // Storage full or blocked (private mode): the chat keeps working in memory.
    }
  }
}

export function serializeHistory(conversations: readonly Conversation[]): string {
  return JSON.stringify({ version: 1, conversations });
}

/** Reads saved history. Anything malformed is skipped instead of breaking the app. */
export function parseHistory(raw: string | null): Conversation[] {
  if (!raw) {
    return [];
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  const list = (data as { conversations?: unknown } | null)?.conversations;
  if (!Array.isArray(list)) {
    return [];
  }
  // Chats saved before uploads existed have no session id: give them one.
  return list
    .filter(isConversation)
    .map((c) => ({ ...c, sessionId: c.sessionId ?? newSessionId(), turns: c.turns.map(settleTurn) }));
}

function isConversation(value: unknown): value is Omit<Conversation, 'sessionId'> & { sessionId?: string } {
  const c = value as Conversation | null;
  return (
    typeof c?.id === 'string' &&
    (c.sessionId === undefined || typeof c.sessionId === 'string') &&
    typeof c.title === 'string' &&
    typeof c.createdAt === 'number' &&
    typeof c.updatedAt === 'number' &&
    Array.isArray(c.turns) &&
    c.turns.every(isTurn)
  );
}

function isTurn(value: unknown): value is Turn {
  const t = value as Turn | null;
  return (
    typeof t?.id === 'string' &&
    typeof t.question === 'string' &&
    typeof t.askedAt === 'number' &&
    Array.isArray(t.attachments) &&
    isSlot(t.rag) &&
    (t.plain === null || isSlot(t.plain))
  );
}

function isSlot(value: unknown): value is AnswerSlot {
  const s = value as AnswerSlot | null;
  return typeof s?.text === 'string' && typeof s.status === 'string' && Array.isArray(s.sources);
}

function isSource(value: unknown): value is CorpusSource {
  const s = value as CorpusSource | null;
  return (
    typeof s?.rank === 'number' &&
    typeof s.source_dataset === 'string' &&
    typeof s.search_context === 'string' &&
    typeof s.pedagogical_answer === 'string'
  );
}

/**
 * A request cannot survive a reload: show it as an error with a retry action. Saved sources that
 * are malformed are dropped, so they can never break the sources drawer.
 */
function settleTurn(turn: Turn): Turn {
  const settle = (slot: AnswerSlot): AnswerSlot => {
    const clean = { ...slot, sources: slot.sources.filter(isSource) };
    return slot.status === 'pending' ? { ...clean, status: 'error', error: RELOADED } : clean;
  };
  return { ...turn, rag: settle(turn.rag), plain: turn.plain ? settle(turn.plain) : null };
}

export interface HistoryGroup {
  readonly label: string;
  readonly conversations: readonly Conversation[];
}

/** Groups chats by the date of their last activity, newest first. */
export function groupConversations(
  conversations: readonly Conversation[],
  now: Date = new Date(),
): HistoryGroup[] {
  const day = (offset: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset).getTime();
  const buckets = [
    { label: 'Today', from: day(0) },
    { label: 'Yesterday', from: day(1) },
    { label: 'Previous 7 days', from: day(7) },
    { label: 'Previous 30 days', from: day(30) },
    { label: 'Older', from: -Infinity },
  ];
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  return buckets
    .map((bucket, i) => ({
      label: bucket.label,
      conversations: sorted.filter(
        (c) => c.updatedAt >= bucket.from && (i === 0 || c.updatedAt < buckets[i - 1].from),
      ),
    }))
    .filter((group) => group.conversations.length > 0);
}

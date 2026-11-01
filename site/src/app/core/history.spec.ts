import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';
import { ChatStore } from './chat-store';
import { API_CONFIG } from './config';
import {
  HISTORY_KEY,
  HistoryStorage,
  groupConversations,
  parseHistory,
  serializeHistory,
} from './history';
import { DEMO_ANSWERS } from './demo-data';
import { Conversation } from './models';
import { STARTERS } from './starters';

function conversation(id: string, updatedAt: number, question = STARTERS[3].yo): Conversation {
  return {
    id,
    sessionId: `session-${id}`,
    title: question,
    createdAt: updatedAt,
    updatedAt,
    turns: [
      {
        id: `${id}-t1`,
        question,
        askedAt: updatedAt,
        attachments: [],
        rag: { kind: 'rag', status: 'done', text: 'Answer', sources: [], demo: true },
        plain: null,
      },
    ],
  };
}

function savedConversations(): Conversation[] {
  return parseHistory(localStorage.getItem(HISTORY_KEY));
}

beforeEach(() => {
  localStorage.clear();
  TestBed.configureTestingModule({
    providers: [{ provide: API_CONFIG, useValue: { apiBaseUrl: 'http://localhost:8000', useMock: true } }],
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('HistoryStorage', () => {
  it('saves to and loads from localStorage, keeping Yorùbá text unchanged', () => {
    const storage = TestBed.inject(HistoryStorage);
    const chats = [conversation('a', 1000, STARTERS[0].yo)];
    storage.save(chats);
    expect(localStorage.getItem(HISTORY_KEY)).toBe(serializeHistory(chats));
    expect(storage.load()).toEqual(chats);
    expect(storage.load()[0].turns[0].question).toBe(STARTERS[0].yo);
  });

  it('returns an empty history for missing or corrupt data', () => {
    const storage = TestBed.inject(HistoryStorage);
    expect(storage.load()).toEqual([]);
    localStorage.setItem(HISTORY_KEY, '{not json');
    expect(storage.load()).toEqual([]);
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ conversations: [{ id: 1 }] }));
    expect(storage.load()).toEqual([]);
  });

  it('keeps the ranked sources of an answer and drops a saved source that is malformed', () => {
    const chat = conversation('a', 1000, STARTERS[1].yo);
    const sources = DEMO_ANSWERS[1].sources;
    const withSources: Conversation = {
      ...chat,
      turns: [{ ...chat.turns[0], rag: { ...chat.turns[0].rag, sources } }],
    };
    const raw = JSON.parse(serializeHistory([withSources])) as {
      conversations: { turns: { rag: { sources: unknown[] } }[] }[];
    };
    raw.conversations[0].turns[0].rag.sources.push({ rank: 4, source_dataset: 'afrimmlu_test' });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(raw));

    const loaded = TestBed.inject(HistoryStorage).load();

    expect(loaded[0].turns[0].rag.sources).toEqual(sources);
  });

  it('shows an answer that was pending at reload as an error with a retry', () => {
    const chat = conversation('a', 1000);
    const pending: Conversation = {
      ...chat,
      turns: [{ ...chat.turns[0], rag: { ...chat.turns[0].rag, status: 'pending', text: '' } }],
    };
    localStorage.setItem(HISTORY_KEY, serializeHistory([pending]));
    const loaded = TestBed.inject(HistoryStorage).load();
    expect(loaded[0].turns[0].rag.status).toBe('error');
    expect(loaded[0].turns[0].rag.error).toContain('reloaded');
  });
});

describe('groupConversations', () => {
  it('groups chats by date of last activity, newest first', () => {
    const now = new Date(2026, 9, 25, 15, 0);
    const at = (days: number, hour = 10) =>
      new Date(2026, 9, 25 - days, hour, 0).getTime();
    const groups = groupConversations(
      [
        conversation('older', at(40)),
        conversation('today-early', at(0, 8)),
        conversation('yesterday', at(1)),
        conversation('today-late', at(0, 14)),
        conversation('week', at(5)),
        conversation('month', at(20)),
      ],
      now,
    );
    expect(groups.map((g) => g.label)).toEqual([
      'Today',
      'Yesterday',
      'Previous 7 days',
      'Previous 30 days',
      'Older',
    ]);
    expect(groups[0].conversations.map((c) => c.id)).toEqual(['today-late', 'today-early']);
    expect(groups.flatMap((g) => g.conversations).length).toBe(6);
  });
});

describe('ChatStore and saved history', () => {
  it('saves a new chat, renames it, and deletes it', async () => {
    vi.useFakeTimers();
    const store = TestBed.inject(ChatStore);
    store.load();

    store.ask(STARTERS[1].yo);
    const id = store.activeId() as string;
    expect(savedConversations()[0].turns[0].question).toBe(STARTERS[1].yo);
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) as string) as {
      conversations: Conversation[];
    };
    expect(raw.conversations[0].turns[0].rag.status).toBe('pending');

    await vi.advanceTimersByTimeAsync(10_000);
    expect(savedConversations()[0].turns[0].rag.status).toBe('done');
    expect(savedConversations()[0].turns[0].rag.sources.length).toBe(3);

    store.rename(id, '  Algebra   practice ');
    expect(savedConversations()[0].title).toBe('Algebra practice');

    store.remove(id);
    expect(savedConversations()).toEqual([]);
    expect(store.activeId()).toBeNull();
  });

  it('loads saved chats on start', () => {
    localStorage.setItem(HISTORY_KEY, serializeHistory([conversation('saved', 5000)]));
    const store = TestBed.inject(ChatStore);
    store.load();
    expect(store.conversations().map((c) => c.id)).toEqual(['saved']);
  });

  it('sends only the new question, never the earlier messages', async () => {
    vi.useFakeTimers();
    const api = TestBed.inject(ApiService);
    const ask = vi.spyOn(api, 'ask');
    const store = TestBed.inject(ChatStore);
    store.load();

    store.ask(STARTERS[0].yo);
    await vi.advanceTimersByTimeAsync(10_000);
    store.ask(STARTERS[2].yo);

    expect(ask).toHaveBeenCalledTimes(2);
    expect(ask.mock.calls[1].slice(0, 2)).toEqual(['rag', STARTERS[2].yo]);
  });

  it('asks both endpoints at once in compare mode', () => {
    const api = TestBed.inject(ApiService);
    const ask = vi.spyOn(api, 'ask');
    const store = TestBed.inject(ChatStore);
    store.compare.set(true);

    store.ask(STARTERS[0].yo);

    expect(ask.mock.calls.map((call) => call[0])).toEqual(['rag', 'plain']);
    expect(store.active()?.turns[0].plain?.status).toBe('pending');
  });

  it('stops a pending answer', async () => {
    vi.useFakeTimers();
    const store = TestBed.inject(ChatStore);
    store.ask(STARTERS[0].yo);
    expect(store.generating()).toBe(true);

    store.stop();
    await vi.advanceTimersByTimeAsync(0);

    expect(store.generating()).toBe(false);
    expect(savedConversations()[0].turns[0].rag.status).toBe('stopped');
  });
});

describe('conversation session ids', () => {
  it('gives each new chat a valid session id and keeps it in saved history', () => {
    const store = TestBed.inject(ChatStore);
    const draft = store.sessionId();
    store.ask(STARTERS[0].yo);
    const saved = savedConversations()[0].sessionId;
    expect(saved).toBe(draft);
    expect(saved).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    expect(store.sessionId()).toBe(saved);
    store.newChat();
    expect(store.sessionId()).not.toBe(saved);
  });

  it('adds a session id to chats saved before uploads existed', () => {
    const { sessionId, ...old } = conversation('old', 1000);
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ version: 1, conversations: [old] }));
    expect(sessionId).toBeDefined();
    expect(TestBed.inject(HistoryStorage).load()[0].sessionId).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
  });

  it('asks /ask/rag with the session id only after files were attached', async () => {
    vi.useFakeTimers();
    const api = TestBed.inject(ApiService);
    const ask = vi.spyOn(api, 'ask');
    const store = TestBed.inject(ChatStore);
    store.ask(STARTERS[0].yo);
    await vi.advanceTimersByTimeAsync(10_000);
    store.ask(STARTERS[2].yo, [{ name: 'notes.txt', size: 5 }]);
    expect(ask.mock.calls[0][3]).toBeUndefined();
    expect(ask.mock.calls[1][3]).toBe(store.active()?.sessionId);
  });
});

import { TestBed } from '@angular/core/testing';
import {
  ApiError,
  ApiService,
  DEMO_PLAIN_ANSWER,
  DEMO_UNKNOWN_ANSWER,
  REQUEST_TIMEOUT_MS,
} from './api.service';
import { API_CONFIG } from './config';
import { STARTERS } from './starters';

function setup(useMock: boolean, apiBaseUrl = 'http://localhost:8000'): ApiService {
  TestBed.configureTestingModule({
    providers: [{ provide: API_CONFIG, useValue: { apiBaseUrl, useMock } }],
  });
  return TestBed.inject(ApiService);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ApiService in mock mode', () => {
  beforeEach(() => vi.useFakeTimers());

  it('answers every starter question with demo data and 3 ranked corpus sources, offline', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const api = setup(true);
    for (const starter of STARTERS) {
      const pending = api.ask('rag', starter.yo);
      await vi.advanceTimersByTimeAsync(2000);
      const result = await pending;
      expect(result.demo).toBe(true);
      expect(result.answer).not.toBe(DEMO_UNKNOWN_ANSWER);
      expect(result.sources.map((s) => s.rank)).toEqual([1, 2, 3]);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('builds the first answer from the AfriMGSM row (verified answer 11)', async () => {
    const api = setup(true);
    const pending = api.ask('rag', STARTERS[0].yo);
    await vi.advanceTimersByTimeAsync(2000);
    const result = await pending;
    expect(result.sources[0].source_dataset).toBe('afrimgsm_train');
    expect(result.sources[0].pedagogical_answer).toContain('[Exact Final Answer]: 11');
    expect(result.answer).toContain('Exact final answer: **11**');
  });

  it('matches a question typed with extra spaces', async () => {
    const api = setup(true);
    const pending = api.ask('rag', `  ${STARTERS[1].yo.replace(' ', '   ')} `);
    await vi.advanceTimersByTimeAsync(2000);
    expect((await pending).sources.length).toBe(3);
  });

  it('returns the labelled placeholder for plain Gemma', async () => {
    const api = setup(true);
    const pending = api.ask('plain', STARTERS[0].yo);
    await vi.advanceTimersByTimeAsync(2000);
    expect(await pending).toEqual({ answer: DEMO_PLAIN_ANSWER, sources: [], demo: true });
  });

  it('says when a question has no demo answer', async () => {
    const api = setup(true);
    const pending = api.ask('rag', 'What is photosynthesis?');
    await vi.advanceTimersByTimeAsync(2000);
    expect(await pending).toEqual({ answer: DEMO_UNKNOWN_ANSWER, sources: [], demo: true });
  });

  it('stops waiting when the request is aborted', async () => {
    const api = setup(true);
    const controller = new AbortController();
    const pending = api.ask('rag', STARTERS[0].yo, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ kind: 'aborted' });
  });
});

describe('ApiService with the real backend', () => {
  it('POSTs exactly {"question": ...} to /ask/rag and returns the answer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ answer: '**Ìdáhùn:** 11' }));
    vi.stubGlobal('fetch', fetchMock);
    const api = setup(false);

    const result = await api.ask('rag', STARTERS[1].yo);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:8000/ask/rag');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ question: STARTERS[1].yo });
    expect(result).toEqual({ answer: '**Ìdáhùn:** 11', sources: [], demo: false });
  });

  it('sends the baseline question to /ask/plain on the configured base URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ answer: 'baseline' }));
    vi.stubGlobal('fetch', fetchMock);
    const api = setup(false, 'https://abc123-8000.proxy.runpod.net');

    await api.ask('plain', 'Hello');

    expect(fetchMock.mock.calls[0][0]).toBe('https://abc123-8000.proxy.runpod.net/ask/plain');
  });

  it('turns 422 and 500 into clear errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ detail: 'invalid' }, 422))
        .mockResolvedValueOnce(jsonResponse({ detail: 'error' }, 500)),
    );
    const api = setup(false);
    await expect(api.ask('rag', 'q')).rejects.toMatchObject({ kind: 'invalid', status: 422 });
    await expect(api.ask('rag', 'q')).rejects.toMatchObject({ kind: 'server', status: 500 });
  });

  it('explains an unreachable backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const api = setup(false);
    const error = await api.ask('rag', 'q').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).kind).toBe('network');
    expect((error as ApiError).message).toContain('http://localhost:8000');
  });

  it('rejects a response without an answer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ result: 'x' })));
    const api = setup(false);
    await expect(api.ask('rag', 'q')).rejects.toMatchObject({ kind: 'bad-response' });
  });

  it('waits at least 120 seconds before timing out', async () => {
    expect(REQUEST_TIMEOUT_MS).toBeGreaterThanOrEqual(120_000);
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) =>
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            ),
          ),
      ),
    );
    const api = setup(false);
    let settled = false;
    const pending = api.ask('rag', 'q').finally(() => (settled = true));
    const outcome = expect(pending).rejects.toMatchObject({ kind: 'timeout' });

    await vi.advanceTimersByTimeAsync(120_000);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    await outcome;
  });

  it('cancels the request with AbortController when the user stops', async () => {
    let requestSignal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            requestSignal = init.signal ?? undefined;
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      ),
    );
    const api = setup(false);
    const controller = new AbortController();
    const pending = api.ask('rag', 'q', controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ kind: 'aborted' });
    expect(requestSignal?.aborted).toBe(true);
  });

  it('reads GET /health/health, including the backend spelling "healty"', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ status: 'healty' }))
      .mockResolvedValueOnce(jsonResponse({ detail: 'down' }, 500))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);
    const api = setup(false);

    expect(await api.health()).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/health/health');
    expect(await api.health()).toBe(false);
    expect(await api.health()).toBe(false);
  });
});

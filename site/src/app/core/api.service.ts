import { Injectable, inject } from '@angular/core';
import { API_CONFIG, isLocalApi } from './config';
import { DEMO_ANSWERS } from './demo-data';
import { AnswerKind, AskResult, CorpusSource, UploadResult } from './models';

/** Client timeout for one answer. CLAUDE.md: never below 120 seconds (laptop CPUs are slow). */
export const REQUEST_TIMEOUT_MS = 300_000;
/** Proxies often close a long request after about 100 seconds. */
const PROXY_LIMIT_MS = 90_000;
const HEALTH_TIMEOUT_MS = 10_000;
/** "A short delay" for demo answers, different per endpoint so each loading state shows. */
export const DEMO_DELAY_MS: Record<AnswerKind, readonly [number, number]> = {
  rag: [1100, 1700],
  plain: [700, 1200],
};

export const DEMO_PLAIN_ANSWER =
  '**No baseline answer in demo mode.**\n\n' +
  'With the backend connected, this panel shows `gemma3:4b` answering the same question with no ' +
  'retrieved context (`POST /ask/plain`), next to the Twins for Change answer.\n';

export const DEMO_UNKNOWN_ANSWER =
  '**No demo answer for this question.**\n\n' +
  'Demo mode has prepared answers only for the four starter questions on the welcome screen. ' +
  'No search or model runs in demo mode. Connect the backend to ask anything else.\n';

export type ApiErrorKind =
  | 'aborted'
  | 'timeout'
  | 'proxy-timeout'
  | 'network'
  | 'unavailable'
  | 'invalid'
  | 'server'
  | 'http'
  | 'bad-response';

/** A failed request, with a message written for the student or teacher. */
export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Questions match demo answers after Unicode NFC and whitespace normalization. */
export function questionKey(question: string): string {
  return question.normalize('NFC').replace(/\s+/g, ' ').trim();
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly config = inject(API_CONFIG);

  /**
   * POST /ask/rag or /ask/plain with {"question": ...}. No chat history is sent. `sessionId` goes
   * only to /ask/rag, and only when the chat has uploaded files.
   */
  ask(kind: AnswerKind, question: string, signal?: AbortSignal, sessionId?: string): Promise<AskResult> {
    return this.config.useMock
      ? this.askDemo(kind, question, signal)
      : this.askBackend(kind, question, signal, sessionId);
  }

  /** POST /upload/file?session_id=... (multipart, field "file"). In mock mode nothing is sent. */
  async upload(file: File, sessionId: string, signal?: AbortSignal): Promise<UploadResult> {
    if (this.config.useMock) {
      return { filename: file.name, chunks: 0, demo: true };
    }
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    const form = new FormData();
    form.append('file', file);
    let response: Response;
    try {
      response = await fetch(
        `${this.config.apiBaseUrl}/upload/file?session_id=${encodeURIComponent(sessionId)}`,
        { method: 'POST', body: form, signal: combined },
      );
    } catch {
      throw signal?.aborted
        ? new ApiError('aborted', 'Stopped.')
        : new ApiError('network', `Could not upload ${file.name}: the API at ${this.config.apiBaseUrl} is not reachable.`);
    }
    if (!response.ok) {
      // The backend explains 400, 413 and 422 in {"detail": string}.
      const detail = ((await response.json().catch(() => null)) as { detail?: unknown } | null)?.detail;
      throw new ApiError(
        'http',
        `${file.name} was not uploaded (${response.status})${typeof detail === 'string' ? `: ${detail}` : '.'}`,
        response.status,
      );
    }
    const body = (await response.json().catch(() => null)) as { filename?: unknown; chunks?: unknown } | null;
    if (typeof body?.filename !== 'string' || typeof body.chunks !== 'number') {
      throw new ApiError('bad-response', 'The API sent an unexpected response to the upload.');
    }
    return { filename: body.filename, chunks: body.chunks, demo: false };
  }

  /** GET /health/health. Only says that the API process is up, not Ollama or Qdrant. */
  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/health/health`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
      });
      if (!response.ok) {
        return false;
      }
      const body: unknown = await response.json();
      const status = (body as { status?: unknown } | null)?.status;
      // The backend returns "healty" (sic); also accept the corrected spelling.
      return status === 'healty' || status === 'healthy';
    } catch {
      return false;
    }
  }

  private async askBackend(
    kind: AnswerKind,
    question: string,
    signal?: AbortSignal,
    sessionId?: string,
  ): Promise<AskResult> {
    const controller = new AbortController();
    let timedOut = false;
    const onAbort = () => controller.abort();
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) {
      controller.abort();
    }
    const started = Date.now();

    const failure = (): ApiError => {
      if (timedOut) {
        return new ApiError(
          'timeout',
          `No answer after ${REQUEST_TIMEOUT_MS / 60_000} minutes, so the request was cancelled. The backend may be very slow on this machine. Try again.`,
        );
      }
      if (signal?.aborted) {
        return new ApiError('aborted', 'Stopped.');
      }
      if (!isLocalApi(this.config.apiBaseUrl) && Date.now() - started >= PROXY_LIMIT_MS) {
        return new ApiError(
          'proxy-timeout',
          'The connection closed before the answer arrived: a proxy may end long requests. The answer may still be generating on the server. Try again.',
        );
      }
      return new ApiError(
        'network',
        `Could not reach the API at ${this.config.apiBaseUrl}. The backend may be stopped, or still loading the 15,791 documents after a start.`,
      );
    };

    try {
      let response: Response;
      try {
        response = await fetch(`${this.config.apiBaseUrl}/ask/${kind}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(kind === 'rag' && sessionId ? { question, session_id: sessionId } : { question }),
          signal: controller.signal,
        });
      } catch {
        throw failure();
      }
      if (!response.ok) {
        throw errorForStatus(response.status);
      }
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw controller.signal.aborted
          ? failure()
          : new ApiError('bad-response', 'The API sent a response that is not valid JSON.');
      }
      const data = body as { answer?: unknown; sources?: unknown } | null;
      if (typeof data?.answer !== 'string') {
        throw new ApiError('bad-response', 'The API sent a response without an answer.');
      }
      // Only /ask/rag returns sources. An older backend sends none: the drawer then says so.
      return {
        answer: data.answer,
        sources: kind === 'rag' ? readSources(data.sources) : [],
        demo: false,
      };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }

  private askDemo(kind: AnswerKind, question: string, signal?: AbortSignal): Promise<AskResult> {
    const result = demoResult(kind, question);
    const [min, max] = DEMO_DELAY_MS[kind];
    const delay = min + Math.random() * (max - min);
    return new Promise<AskResult>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new ApiError('aborted', 'Stopped.'));
        return;
      }
      const onAbort = () => {
        clearTimeout(timer);
        reject(new ApiError('aborted', 'Stopped.'));
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve(result);
      }, delay);
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }
}

/**
 * The `sources` of POST /ask/rag: the retrieved documents, best first, with no scores. Anything
 * malformed counts as no source instead of breaking the answer. The rank is the position in the
 * backend's list, so a skipped item never shifts the ranks of the others.
 */
export function readSources(value: unknown): CorpusSource[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item: unknown, index) => {
    const source = item as Partial<Record<keyof CorpusSource, unknown>> | null;
    return typeof source?.source_dataset === 'string' &&
      typeof source.search_context === 'string' &&
      typeof source.pedagogical_answer === 'string'
      ? [
          {
            rank: index + 1,
            source_dataset: source.source_dataset,
            search_context: source.search_context,
            pedagogical_answer: source.pedagogical_answer,
          },
        ]
      : [];
  });
}

function demoResult(kind: AnswerKind, question: string): AskResult {
  if (kind === 'plain') {
    return { answer: DEMO_PLAIN_ANSWER, sources: [], demo: true };
  }
  const key = questionKey(question);
  const entry = DEMO_ANSWERS.find((demo) => questionKey(demo.question) === key);
  return entry
    ? { answer: entry.answer, sources: entry.sources, demo: true }
    : { answer: DEMO_UNKNOWN_ANSWER, sources: [], demo: true };
}

function errorForStatus(status: number): ApiError {
  if (status === 422) {
    return new ApiError(
      'invalid',
      'The API rejected the request as invalid (422). Try again. If it keeps happening, the frontend and backend may be out of step.',
      status,
    );
  }
  if (status === 500) {
    return new ApiError(
      'server',
      'The tutor could not answer (500). Ollama or Qdrant may be unavailable on the backend.',
      status,
    );
  }
  if (status === 504 || status === 524) {
    return new ApiError(
      'proxy-timeout',
      `The request timed out at the proxy (${status}). The answer may still be generating on the server. Try again.`,
      status,
    );
  }
  if (status === 502 || status === 503) {
    return new ApiError(
      'unavailable',
      `The backend is not available right now (${status}). The pod may be stopped, or still starting and loading the 15,791 documents.`,
      status,
    );
  }
  return new ApiError('http', `The API returned an error (${status}). Try again.`, status);
}

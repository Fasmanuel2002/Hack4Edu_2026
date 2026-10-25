/** The two backend endpoints compared in the demo: POST /ask/rag and POST /ask/plain. */
export type AnswerKind = 'rag' | 'plain';

/** One retrieved corpus row, shown in the sources drawer. `rank` is a position, never a score. */
export interface CorpusSource {
  readonly rank: number;
  readonly source_dataset: string;
  readonly search_context: string;
  readonly pedagogical_answer: string;
}

/** What the API service returns for one question. `demo` is true for mock data. */
export interface AskResult {
  readonly answer: string;
  readonly sources: readonly CorpusSource[];
  readonly demo: boolean;
}

export type SlotStatus = 'pending' | 'done' | 'stopped' | 'error';

/** One answer to one question, from one endpoint. Saved in localStorage with the chat. */
export interface AnswerSlot {
  readonly kind: AnswerKind;
  readonly status: SlotStatus;
  readonly text: string;
  readonly sources: readonly CorpusSource[];
  readonly demo: boolean;
  readonly error?: string;
  readonly requestedAt?: number;
  readonly receivedAt?: number;
}

/** A file the student attached. Only its name and size are kept: files are not sent. */
export interface AttachmentInfo {
  readonly name: string;
  readonly size: number;
}

/** A question and its answer (or two answers in compare mode). */
export interface Turn {
  readonly id: string;
  readonly question: string;
  readonly askedAt: number;
  readonly attachments: readonly AttachmentInfo[];
  readonly rag: AnswerSlot;
  readonly plain: AnswerSlot | null;
}

export interface Conversation {
  readonly id: string;
  readonly title: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly turns: readonly Turn[];
}

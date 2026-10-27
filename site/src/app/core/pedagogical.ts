import { looksYoruba } from './yoruba';

export type TextLang = 'yo' | 'en' | null;

/** One line of a pedagogical_answer: a "[Label]:" section, a "- Key:" field, or plain text. */
export interface AnswerSegment {
  readonly kind: 'section' | 'field' | 'text';
  /** The corpus label exactly as written, without the brackets and the colon. */
  readonly label: string | null;
  readonly text: string;
  /** For "Options (...)" fields: the options split on " | ". */
  readonly options: readonly string[] | null;
  readonly lang: TextLang;
}

const SECTION = /^\[(.+?)\]:\s?(.*)$/;
const FIELD = /^- (.+?): (.*)$/;
const YORUBA_WORD = /yor[uù]b[aá]/i;

function langOf(label: string, text: string): TextLang {
  if (!text) {
    return null;
  }
  if (label.includes('->')) {
    return looksYoruba(text) ? 'yo' : null;
  }
  if (YORUBA_WORD.test(label.normalize('NFC'))) {
    return 'yo';
  }
  if (/english/i.test(label)) {
    return 'en';
  }
  return looksYoruba(text) ? 'yo' : null;
}

/** Splits a pedagogical_answer into labelled segments for the sources drawer. Text is not changed. */
export function parsePedagogicalAnswer(answer: string): AnswerSegment[] {
  const segments: AnswerSegment[] = [];
  let lastLang: TextLang = null;
  for (const line of answer.split('\n')) {
    const match = SECTION.exec(line) ?? FIELD.exec(line);
    if (match) {
      const [, label, rest] = match;
      const text = rest.trim();
      const lang = langOf(label, text);
      lastLang = lang;
      segments.push({
        kind: line.startsWith('[') ? 'section' : 'field',
        label,
        text,
        options: label.startsWith('Options') ? text.split(' | ').map((o) => o.trim()) : null,
        lang,
      });
    } else if (line.trim()) {
      // Continuation lines (for example GSM8K steps) keep the language of their section.
      segments.push({ kind: 'text', label: null, text: line.trim(), options: null, lang: lastLang });
    }
  }
  return segments;
}

export interface ContextPart {
  readonly text: string;
  readonly lang: TextLang;
  /** AfriMMLU rows end with their subject id, for example "elementary_mathematics". */
  readonly isSubject: boolean;
}

/**
 * Splits a search_context ("Yorùbá | English", plus a subject for AfriMMLU) into its parts. A row
 * whose own text contains " | " (3 MAFAND news sentences) cannot be split safely: it stays whole.
 */
export function splitSearchContext(searchContext: string, sourceDataset: string): ContextPart[] {
  const whole = searchContext.trim();
  if (sourceDataset.startsWith('gsm8k')) {
    return [{ text: whole, lang: 'en', isSubject: false }];
  }
  const parts = whole.split(/\s+\|\s+/);
  if (parts.length !== (sourceDataset.startsWith('afrimmlu') ? 3 : 2)) {
    return [{ text: whole, lang: null, isSubject: false }];
  }
  return parts.map((text, index) => ({
    text,
    lang: index === 0 ? 'yo' : index === 1 ? 'en' : null,
    isSubject: index === 2,
  }));
}

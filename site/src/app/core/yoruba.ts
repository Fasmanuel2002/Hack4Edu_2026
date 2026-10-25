export interface ToneMark {
  /** The exact sequence inserted. Some are a letter plus one or more combining marks. */
  readonly value: string;
  /** Spoken name for screen readers. */
  readonly name: string;
}

/**
 * Characters of the Yorùbá tone mark bar (CLAUDE.md, Features 3), in NFC.
 * Written as escapes so no editor or tool can silently change them.
 */
export const TONE_MARKS: readonly ToneMark[] = [
  { value: '\u1EB9', name: 'e with dot below' },
  { value: '\u1EB9\u0301', name: 'e with dot below, high tone' },
  { value: '\u1EB9\u0300', name: 'e with dot below, low tone' },
  { value: '\u1ECD', name: 'o with dot below' },
  { value: '\u1ECD\u0301', name: 'o with dot below, high tone' },
  { value: '\u1ECD\u0300', name: 'o with dot below, low tone' },
  { value: '\u1E63', name: 's with dot below' },
  { value: '\u0144', name: 'n, high tone' },
  { value: '\u01F9', name: 'n, low tone' },
  { value: '\u00E1', name: 'a, high tone' },
  { value: '\u00E0', name: 'a, low tone' },
  { value: '\u00E9', name: 'e, high tone' },
  { value: '\u00E8', name: 'e, low tone' },
  { value: '\u00ED', name: 'i, high tone' },
  { value: '\u00EC', name: 'i, low tone' },
  { value: '\u00F3', name: 'o, high tone' },
  { value: '\u00F2', name: 'o, low tone' },
  { value: '\u00FA', name: 'u, high tone' },
  { value: '\u00F9', name: 'u, low tone' },
];

export interface InsertResult {
  readonly value: string;
  /** Cursor position after the inserted sequence. */
  readonly caret: number;
}

/**
 * Inserts `insert` at the selection (replacing any selected text) and returns the new
 * value with the caret placed after the whole inserted sequence, combining marks included.
 */
export function insertAtCursor(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  insert: string,
): InsertResult {
  const start = clamp(Math.min(selectionStart, selectionEnd), 0, value.length);
  const end = clamp(Math.max(selectionStart, selectionEnd), 0, value.length);
  return {
    value: value.slice(0, start) + insert + value.slice(end),
    caret: start + insert.length,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

const DOT_BELOW_LETTERS = /[\u1EB8\u1EB9\u1ECC\u1ECD\u1E62\u1E63]/;
const COMBINING_TONES = /[\u0300\u0301\u0304\u0323]/;
const TONED_VOWELS = /[\u00C0\u00C1\u00C8\u00C9\u00CC\u00CD\u00D2\u00D3\u00D9\u00DA\u00E0\u00E1\u00E8\u00E9\u00EC\u00ED\u00F2\u00F3\u00F9\u00FA\u0143\u0144\u01F8\u01F9]/g;

/**
 * Heuristic used to set lang="yo" on text whose language is not labelled (Gemma's Markdown,
 * the student's question). It looks for dot-below letters, combining tone marks, or at least
 * two tone-marked vowels. Yorùbá written without any diacritics is not detected.
 */
export function looksYoruba(text: string): boolean {
  if (DOT_BELOW_LETTERS.test(text) || COMBINING_TONES.test(text)) {
    return true;
  }
  return (text.match(TONED_VOWELS)?.length ?? 0) >= 2;
}

/** Shortens text at a word boundary, so a letter is never split from its tone marks. */
export function shortenAtWord(text: string, maxLength: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) {
    return clean;
  }
  const cut = clean.lastIndexOf(' ', maxLength);
  // One very long word: keep it whole rather than risk cutting through a letter's marks.
  return cut > 0 ? `${clean.slice(0, cut)}…` : clean;
}

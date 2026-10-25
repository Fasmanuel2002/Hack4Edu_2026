import { STARTERS } from './starters';
import { TONE_MARKS, insertAtCursor, looksYoruba, shortenAtWord } from './yoruba';

const O_HIGH = '\u1ECD\u0301'; // ọ́: o with dot below plus a combining acute (two code units)
const E_LOW = '\u1EB9\u0300'; // ẹ̀

describe('insertAtCursor', () => {
  it('inserts in the middle of a word and puts the caret after the whole sequence', () => {
    const result = insertAtCursor('bla', 1, 1, O_HIGH);
    expect(result.value).toBe(`b${O_HIGH}la`);
    expect(result.caret).toBe(1 + O_HIGH.length);
  });

  it('replaces the selected text', () => {
    const result = insertAtCursor('bxxla', 1, 3, E_LOW);
    expect(result.value).toBe(`b${E_LOW}la`);
    expect(result.caret).toBe(3);
  });

  it('works at the start and at the end', () => {
    expect(insertAtCursor('ko', 0, 0, '\u1E63')).toEqual({ value: '\u1E63ko', caret: 1 });
    expect(insertAtCursor('k', 1, 1, '\u00F2')).toEqual({ value: 'k\u00F2', caret: 2 });
  });

  it('accepts a backwards selection and positions outside the text', () => {
    expect(insertAtCursor('abc', 3, 1, '\u0144').value).toBe('a\u0144');
    expect(insertAtCursor('abc', 99, 99, '\u01F9')).toEqual({ value: 'abc\u01F9', caret: 4 });
  });

  it('never splits a letter from its tone marks when inserting next to one', () => {
    const word = `b${O_HIGH}`;
    const result = insertAtCursor(word, word.length, word.length, O_HIGH);
    expect(result.value).toBe(`b${O_HIGH}${O_HIGH}`);
    expect(result.value.normalize('NFC')).toBe(result.value);
  });
});

describe('TONE_MARKS', () => {
  it('has the 19 characters from CLAUDE.md, in order and in NFC', () => {
    const fromClaudeMd =
      '\u1EB9 \u1EB9\u0301 \u1EB9\u0300 \u1ECD \u1ECD\u0301 \u1ECD\u0300 \u1E63 \u0144 \u01F9 ' +
      '\u00E1 \u00E0 \u00E9 \u00E8 \u00ED \u00EC \u00F3 \u00F2 \u00FA \u00F9';
    expect(TONE_MARKS.map((mark) => mark.value).join(' ')).toBe(fromClaudeMd);
    for (const mark of TONE_MARKS) {
      expect(mark.value.normalize('NFC')).toBe(mark.value);
      expect(mark.name.length).toBeGreaterThan(0);
    }
  });
});

describe('looksYoruba', () => {
  it('detects Yor\u00F9b\u00E1 text', () => {
    for (const starter of STARTERS) {
      expect(looksYoruba(starter.yo)).toBe(true);
    }
  });

  it('leaves English and numbers alone', () => {
    for (const starter of STARTERS) {
      expect(looksYoruba(starter.en)).toBe(false);
    }
    expect(looksYoruba('5 + 6 = 11')).toBe(false);
  });
});

describe('shortenAtWord', () => {
  it('cuts at a space so tone marks stay with their letters', () => {
    const text = STARTERS[0].yo;
    const short = shortenAtWord(text, 30);
    expect(short.endsWith('\u2026')).toBe(true);
    expect(text.startsWith(short.slice(0, -1))).toBe(true);
    expect(short.slice(0, -1).endsWith(' ')).toBe(false);
  });

  it('keeps short text as it is', () => {
    expect(shortenAtWord('  B\u00E1wo   ni! ', 30)).toBe('B\u00E1wo ni!');
  });
});

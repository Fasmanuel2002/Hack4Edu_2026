import { DEMO_ANSWERS } from './demo-data';
import { renderMarkdown } from './markdown';
import { parsePedagogicalAnswer, splitSearchContext } from './pedagogical';
import { STARTERS } from './starters';

describe('demo data', () => {
  it('has one prepared answer per starter question, with the same Yorùbá text', () => {
    expect(DEMO_ANSWERS.map((d) => d.question)).toEqual(STARTERS.map((s) => s.yo));
  });

  it('uses each starter row as source 1, with ranks 1 to 3', () => {
    DEMO_ANSWERS.forEach((demo, i) => {
      expect(demo.sources.map((s) => s.rank)).toEqual([1, 2, 3]);
      expect(demo.sources[0].search_context).toContain(STARTERS[i].yo);
      // Rows are copied exactly as they are in dataset_rag.csv. Not every corpus row is in NFC,
      // and the app must not normalize them, so only the starter rows are checked here.
      expect(demo.sources[0].pedagogical_answer.normalize('NFC')).toBe(
        demo.sources[0].pedagogical_answer,
      );
    });
  });

  it('render like a real answer: two language blocks, each ending with its final-answer callout', () => {
    for (const demo of DEMO_ANSWERS) {
      const root = document.createElement('div');
      root.innerHTML = renderMarkdown(demo.answer);
      const blocks = Array.from(root.querySelectorAll('.lang-block'));
      expect(blocks.map((block) => block.getAttribute('lang'))).toEqual(['yo', 'en']);
      for (const block of blocks) {
        expect(block.lastElementChild?.classList.contains('final-answer')).toBe(true);
      }
    }
  });

  it('keeps the verified answers from CLAUDE.md', () => {
    expect(DEMO_ANSWERS[0].sources[0].pedagogical_answer).toContain('[Exact Final Answer]: 11');
    expect(DEMO_ANSWERS[1].sources[0].pedagogical_answer).toContain(
      '- Verified Answer (English): C) p = 12',
    );
    expect(DEMO_ANSWERS[2].sources[0].pedagogical_answer).toContain(
      '- Verified Answer (English): B) The price of hamburgers',
    );
    expect(DEMO_ANSWERS[3].sources[0].pedagogical_answer).toContain(
      '[Verified Answer (English)]: On the north end, along the fence',
    );
  });
});

describe('parsePedagogicalAnswer', () => {
  it('reads Belebele section labels and their languages', () => {
    const segments = parsePedagogicalAnswer(DEMO_ANSWERS[3].sources[0].pedagogical_answer);
    expect(segments.map((s) => [s.label, s.lang])).toEqual([
      ['Reading Passage (Yorùbá)', 'yo'],
      ['Reading Passage (English)', 'en'],
      ['Verified Answer (Yorùbá)', 'yo'],
      ['Verified Answer (English)', 'en'],
    ]);
  });

  it('reads AfriMMLU fields and splits the options', () => {
    const segments = parsePedagogicalAnswer(DEMO_ANSWERS[1].sources[0].pedagogical_answer);
    expect(segments[0]).toMatchObject({ kind: 'section', text: '' });
    const options = segments.find((s) => s.label === 'Options (English)');
    expect(options?.options).toEqual(['A) p = 4', 'B) p = 8', 'C) p = 12', 'D) p = 24']);
    expect(segments.find((s) => s.label === 'Yorùbá Question')?.lang).toBe('yo');
  });

  it('keeps GSM8K continuation lines in English', () => {
    const gsm8k = DEMO_ANSWERS[0].sources[1];
    expect(gsm8k.source_dataset).toBe('gsm8k_train');
    const segments = parsePedagogicalAnswer(gsm8k.pedagogical_answer);
    const continuation = segments.find((s) => s.kind === 'text');
    expect(continuation?.lang).toBe('en');
    expect(continuation?.text.startsWith('Melissa spent')).toBe(true);
  });
});

describe('splitSearchContext', () => {
  it('splits Yorùbá | English | subject for AfriMMLU', () => {
    const parts = splitSearchContext(DEMO_ANSWERS[1].sources[0].search_context, 'afrimmlu_test');
    expect(parts.map((p) => p.lang)).toEqual(['yo', 'en', null]);
    expect(parts[0].text).toBe(STARTERS[1].yo);
    expect(parts[2]).toMatchObject({ text: 'elementary_mathematics', isSubject: true });
  });

  it('keeps a row whole when its own text contains " | " (3 MAFAND rows)', () => {
    const text = 'Title one | Caption one | Title two | Caption two';
    expect(splitSearchContext(text, 'mafand_train')).toEqual([{ text, lang: null, isSubject: false }]);
  });

  it('splits only on a spaced pipe, as the corpus writes it', () => {
    const parts = splitSearchContext(DEMO_ANSWERS[0].sources[0].search_context, 'afrimgsm_train');
    expect(parts.map((p) => p.lang)).toEqual(['yo', 'en']);
    expect(parts[1].text.startsWith('Question: Roger has 5 tennis balls.')).toBe(true);
    expect(splitSearchContext('a|b | c', 'mafand_train').map((p) => p.text)).toEqual(['a|b', 'c']);
  });

  it('keeps an English-only GSM8K question whole', () => {
    const source = DEMO_ANSWERS[0].sources[1];
    expect(splitSearchContext(source.search_context, source.source_dataset)).toEqual([
      { text: source.search_context, lang: 'en', isSubject: false },
    ]);
  });
});

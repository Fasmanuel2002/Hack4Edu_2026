import { flagImages, isFallbackAnswer, renderLines, renderMarkdown, separateFinalAnswers } from './markdown';
import { STARTERS } from './starters';

// Yorùbá test strings are written as escapes, copied from the tutor prompt's examples.
const IDAHUN = 'Ìdáhùn';
const YO_HEADING = 'Àlàyé ní Èdè Yorùbá';
const YO_STEP_1 =
  '2 × 3 = 6 — Agolo 2 ló wà, bọ́ọ́lù aláfajọ̀gbá 3 sì wà nínú agolo kọ̀ọ̀kan.';

/** A typical Twins for Change answer: the final-answer lines come right after a list item. */
const ANSWER = [
  `### ${YO_HEADING}`,
  'Ẹ jẹ́ kí a yanjú ìṣirò yìí ní ìgbésẹ̀-n-ìgbésẹ̀:',
  `- **Ìgbésẹ̀ 1:** ${YO_STEP_1}`,
  '- **Ìgbésẹ̀ 2:** 5 + 6 = 11 — Roger bẹ̀rẹ̀ pẹ̀lú bọ́ọ́lù 5, a sì fi 6 kún un.',
  `**${IDAHUN} / Answer:** 11`,
  '',
  '---',
  '',
  '### Explanation in English',
  '- **Step 1:** 2 × 3 = 6 — 2 cans with 3 tennis balls in each can.',
  '- **Step 2:** 5 + 6 = 11 — Roger started with 5 balls, so we add 6.',
  '**Answer:** 11',
].join('\n');

/** The out-of-database answer, exactly as the tutor prompt asks for it. */
const FALLBACK = [
  'Ẹ má bínú, ìbéèrè yìí kò tíì sí nínú àkójọ ìmọ̀ wa.',
  'Sorry, this question is not in our verified database yet.',
].join('\n');

function dom(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

describe('renderMarkdown', () => {
  it('shows raw HTML from the model as text', () => {
    const html = renderMarkdown('Hi <script>alert(1)</script> <b onclick="x()">bold</b>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<b ');
    expect(html).toContain('&lt;script&gt;');
  });

  it('never renders images, so nothing loads from the internet', () => {
    const html = renderMarkdown('![a chart](https://example.com/chart.png)');
    expect(html).not.toContain('<img');
    expect(html).toContain('a chart');
  });

  it('keeps links safe and drops javascript: links', () => {
    expect(renderMarkdown('[site](https://example.org)')).toContain(
      'rel="noopener noreferrer"',
    );
    expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('href');
  });

  it('starts headings at h3 and never skips a level', () => {
    const html = renderMarkdown('# Top\n\n### Deeper\n\n## Middle');
    expect(html).not.toMatch(/<h[12][ >]/);
    expect(html).toMatch(/<h3[^>]*>Top<\/h3>/);
    expect(html).toMatch(/<h4[^>]*>Deeper<\/h4>/);
    expect(html).toMatch(/<h4[^>]*>Middle<\/h4>/);
  });

  it('marks Yorùbá paragraphs with lang="yo" and leaves English ones alone', () => {
    const root = dom(renderMarkdown(`${STARTERS[1].yo}\n\n${STARTERS[1].en}`));
    const [yo, en] = Array.from(root.querySelectorAll('p'));
    expect(yo.getAttribute('lang')).toBe('yo');
    expect(yo.textContent).toBe(STARTERS[1].yo);
    expect(en.hasAttribute('lang')).toBe(false);
    expect(en.textContent).toBe(STARTERS[1].en);
  });

  it('marks each Yorùbá list item, without the old per-block rule classes', () => {
    const html = renderMarkdown(`1. ${STARTERS[0].yo}\n2. ${STARTERS[3].yo}\n3. 5 + 6 = 11`);
    expect(html.match(/<li lang="yo"/g)?.length).toBe(2);
    expect(html).not.toContain('yo-list');
    expect(html).not.toContain('class="yo"');
  });

  it('renders numbered steps and code blocks', () => {
    const html = renderMarkdown('1. 24 = 2p\n2. p = 12\n\n```\n24 / 2 = 12\n```');
    expect(html).toContain('<ol>');
    expect(html).toContain('<pre><code>24 / 2 = 12');
  });
});

describe('final-answer callout', () => {
  it('takes the answer line out of the list item it follows, without changing the text', () => {
    const root = dom(renderMarkdown(ANSWER));
    const callouts = Array.from(root.querySelectorAll('p.final-answer'));
    expect(callouts.map((p) => p.textContent)).toEqual([`${IDAHUN} / Answer: 11`, 'Answer: 11']);
    for (const item of Array.from(root.querySelectorAll('li'))) {
      expect(item.textContent).not.toContain('Answer');
    }
    expect(root.querySelector('li')?.textContent).toBe(`Ìgbésẹ̀ 1: ${YO_STEP_1}`);
  });

  it('handles the NFD spelling of Ìdáhùn and keeps it as written', () => {
    const nfd = IDAHUN.normalize('NFD');
    expect(nfd).not.toBe(IDAHUN);
    const root = dom(renderMarkdown(`1. 24 ÷ 2 = 12\n**${nfd}:** C) p = 12`));
    expect(root.querySelector('p.final-answer')?.textContent).toBe(`${nfd}: C) p = 12`);
    expect(root.querySelector('li')?.textContent).toBe('24 ÷ 2 = 12');
  });

  it('also separates the line from a paragraph, but not other bold text', () => {
    const root = dom(renderMarkdown('Therefore, option C is correct.\n**Answer:** C) 20\n\n**Answers vary.**'));
    expect(root.querySelectorAll('p.final-answer').length).toBe(1);
    expect(root.querySelector('p.final-answer')?.textContent).toBe('Answer: C) 20');
  });

  it('only adds line breaks, and never inside a code block', () => {
    const separated = separateFinalAnswers(ANSWER);
    expect(separated).not.toBe(ANSWER);
    expect(separated.replace(/\n/g, '')).toBe(ANSWER.replace(/\n/g, ''));
    const code = '```\nx = 1\n**Answer:** 1\n```';
    expect(separateFinalAnswers(code)).toBe(code);
  });
});

describe('language blocks', () => {
  it('turns the Yorùbá and English sections into two continuous blocks with YO and EN tags', () => {
    const root = dom(renderMarkdown(ANSWER));
    const blocks = Array.from(root.querySelectorAll('.lang-block'));
    expect(blocks.map((b) => b.getAttribute('lang'))).toEqual(['yo', 'en']);
    expect(root.children.length).toBe(2);
    expect(root.querySelector('hr')).toBeNull();

    const tags = blocks.map((b) => b.querySelector('h3 .lang-tag'));
    expect(tags.map((t) => t?.textContent)).toEqual(['YO', 'EN']);
    expect(tags.every((t) => t?.getAttribute('aria-hidden') === 'true')).toBe(true);
    const yoHeading = blocks[0].querySelector('h3') as HTMLElement;
    expect(yoHeading.textContent).toBe(`YO${YO_HEADING}`);
    expect(blocks[0].querySelectorAll('li').length).toBe(2);
    expect(blocks[0].querySelector('.final-answer')?.textContent).toContain(IDAHUN);
    expect(blocks[1].querySelector('.final-answer')?.textContent).toBe('Answer: 11');
  });

  it('leaves answers without those headings as they are', () => {
    const root = dom(renderMarkdown(`${STARTERS[3].yo}\n\n**${IDAHUN}:** 11`));
    expect(root.querySelector('.lang-block')).toBeNull();
    expect(root.querySelector('.final-answer')).not.toBeNull();
  });
});

describe('equations', () => {
  it('wraps arithmetic in tabular-figure spans and leaves Yorùbá words alone', () => {
    const root = dom(renderMarkdown(ANSWER));
    const equations = Array.from(root.querySelectorAll('span.eq')).map((s) => s.textContent);
    expect(equations).toContain('2 × 3 = 6');
    expect(equations).toContain('5 + 6 = 11');
    for (const equation of equations) {
      expect(equation).toMatch(/^[\d\s.,%$()[\]a-z+\-=*/×÷−–]+$/);
    }
    // "ìgbésẹ̀-n-ìgbésẹ̀" has hyphens between letters, never an equation.
    expect(root.querySelector('.lang-block p')?.innerHTML).not.toContain('class="eq"');
  });

  it('never changes the characters, and keeps HTML and code untouched', () => {
    const sentence = `Agolo 2 ló wà: 2 × 3 = 6, àti $200 ÷ 2 = $100. Kini p? 24 = 2p.`;
    const root = dom(renderMarkdown(sentence));
    expect(root.textContent?.trim()).toBe(sentence);
    expect(Array.from(root.querySelectorAll('.eq')).map((s) => s.textContent)).toEqual([
      '2 × 3 = 6',
      '$200 ÷ 2 = $100',
      '24 = 2p',
    ]);

    const html = renderMarkdown('Hi <b>5 + 6 = 11</b> and `2 + 2 = 4`');
    expect(html).toContain('&lt;b&gt;<span class="eq">5 + 6 = 11</span>&lt;/b&gt;');
    expect(html).toContain('<code>2 + 2 = 4</code>');
  });
});

describe('out-of-database answer', () => {
  it('recognizes the two lines, in NFC or NFD', () => {
    expect(isFallbackAnswer(FALLBACK)).toBe(true);
    expect(isFallbackAnswer(`\n${FALLBACK.normalize('NFD')}\n`)).toBe(true);
    expect(isFallbackAnswer(ANSWER)).toBe(false);
    expect(isFallbackAnswer(`${FALLBACK}\nBut here is a long explanation anyway.`)).toBe(false);
  });

  it('renders each line as its own paragraph with its language', () => {
    const root = dom(renderLines(FALLBACK));
    const [yo, en] = Array.from(root.querySelectorAll('p'));
    expect(root.querySelectorAll('p').length).toBe(2);
    expect(yo.getAttribute('lang')).toBe('yo');
    expect(yo.textContent).toBe(FALLBACK.split('\n')[0]);
    expect(en.hasAttribute('lang')).toBe(false);
    expect(en.textContent).toBe('Sorry, this question is not in our verified database yet.');
  });
});

describe('flagImages', () => {
  it('swaps flag emoji for the bundled PNG flags', () => {
    const html = flagImages('\u{1F1F3}\u{1F1EC} Yor\u00f9b\u00e1 \u{1F1EC}\u{1F1E7} English');
    expect(html).toContain('src="site/flags/NG.png"');
    expect(html).toContain('src="site/flags/GB.png"');
    expect(html).not.toMatch(/[\u{1F1E6}-\u{1F1FF}]/u);
  });

  it('keeps a flag that has no file, and lone indicators', () => {
    expect(flagImages('\u{1F1EB}\u{1F1F7}')).toBe('\u{1F1EB}\u{1F1F7}');
    expect(flagImages('\u{1F1F3}')).toBe('\u{1F1F3}');
  });
});

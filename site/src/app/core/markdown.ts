import { Marked, Token, Tokens } from 'marked';
import { looksYoruba } from './yoruba';

/** Each answer card has an h2 label, so headings inside an answer start at h3. */
const ANSWER_HEADING_LEVEL = 2;

/**
 * Bold final-answer labels (CLAUDE.md, Features 7): **Ìdáhùn / Answer:**, **Ìdáhùn:**, **Answer:**.
 * Compared in NFC, so the NFD spelling of Ìdáhùn matches too. Written as escapes so no editor
 * or tool can silently change the tone marks.
 */
const IDAHUN = 'Ìdáhùn';
const FINAL_LINE = new RegExp(`^\\*\\*(?:${IDAHUN}|Answer)\\b`, 'i');
const FINAL_LABEL = new RegExp(`^(?:${IDAHUN}(?:\\s*/\\s*Answer)?|Answer)\\s*:?$`, 'i');

/** Headings that open the Yorùbá and the English section, such as "Àlàyé ní Èdè Yorùbá". */
const YORUBA_HEADING = /yor[uù]b[aá]/i;
const ENGLISH_HEADING = /english/i;

/**
 * Arithmetic such as "2 × 3 = 6" or "$200 ÷ 2 = $100": operands (numbers, with an optional
 * currency sign, percent sign, brackets, or a one-letter variable such as 2p) joined by
 * operators. It never starts or ends inside a word, so Yorùbá words are never touched.
 */
const OPERAND = String.raw`[(\[]*(?:[$₦£€]?\d+(?:[.,]\d+)*%?[a-z]?|[a-z])[)\]]*`;
const OPERATOR = String.raw`\s?[-+=*/×÷−–]\s?`;
// Group 1 is the character before the equation (no lookbehind: older Safari cannot parse it).
const EQUATION = new RegExp(
  String.raw`(^|[^\p{L}\p{M}\p{N}])(${OPERAND}(?:${OPERATOR}${OPERAND})+)(?![\p{L}\p{M}\p{N}])`,
  'gu',
);

/**
 * Flag emoji (two regional indicators, such as the Nigerian and British flags the tutor prompt
 * puts in its headings) show as plain letters on Windows, so they are swapped for the bundled
 * PNG flags in public/site/flags. A code with no file keeps its emoji.
 */
const FLAG_PAIR = /([\u{1F1E6}-\u{1F1FF}])([\u{1F1E6}-\u{1F1FF}])/gu;
const FLAG_FILES = new Set(
  'AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG EH ER ET GA GB GH GM GN GQ GW KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RW SC SD SL SN SO SS ST SZ TD TG TN TZ UG ZA ZM ZW'.split(' '),
);

/** Replaces flag emoji with <img class="flag"> (decorative: the heading text names the language). */
export function flagImages(html: string): string {
  return html.replace(FLAG_PAIR, (pair, a: string, b: string) => {
    const code = String.fromCharCode(a.codePointAt(0)! - 0x1f1e6 + 65, b.codePointAt(0)! - 0x1f1e6 + 65);
    return FLAG_FILES.has(code)
      ? `<img class="flag" src="site/flags/${code}.png" alt="" height="16" decoding="async">`
      : pair;
  });
}

/** marked's own escaping: entities such as &amp; are kept, everything else is escaped. */
const ESCAPE = /[<>"']|&(?!(?:#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g;
const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(text: string): string {
  return text.replace(ESCAPE, (ch) => ESCAPES[ch]);
}

/** lang="yo" for text that looks like Yorùbá (screen reader voice and line height). */
function langAttr(text: string): string {
  return looksYoruba(text) ? ' lang="yo"' : '';
}

/** Wraps arithmetic in <span class="eq"> (tabular figures). The characters are not changed. */
function markEquations(text: string): string {
  let html = '';
  let last = 0;
  for (const match of text.matchAll(EQUATION)) {
    const [, boundary, found] = match;
    if (!/\d/.test(found)) {
      continue;
    }
    const start = (match.index ?? 0) + boundary.length;
    html += `${escapeHtml(text.slice(last, start))}<span class="eq">${escapeHtml(found)}</span>`;
    last = start + found.length;
  }
  return html + escapeHtml(text.slice(last));
}

const headingLevels = new WeakMap<object, number>();
/** Headings that open a language block, with the tag they show. */
const blockTags = new WeakMap<object, string>();

const md = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    // Raw HTML in a model answer is shown as text, never parsed.
    html({ text }) {
      return escapeHtml(text);
    },
    // Images would load from the internet: show the alt text instead.
    image({ text }) {
      return escapeHtml(text);
    },
    checkbox({ checked }) {
      return checked ? '[x] ' : '[ ] ';
    },
    link({ href, tokens }) {
      const inner = this.parser.parseInline(tokens);
      if (!/^(https?:|mailto:)/i.test(href)) {
        return inner;
      }
      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
    },
    heading(token) {
      const level = headingLevels.get(token) ?? ANSWER_HEADING_LEVEL + 1;
      const tag = blockTags.get(token);
      // The tag is decoration: the heading text already names the language.
      const tagHtml = tag ? `<span class="lang-tag" aria-hidden="true">${tag}</span>` : '';
      return `<h${level}${langAttr(token.text)}>${tagHtml}${this.parser.parseInline(token.tokens)}</h${level}>\n`;
    },
    paragraph({ tokens, text }) {
      const first = tokens[0];
      const final =
        first?.type === 'strong' && FINAL_LABEL.test(first.text.normalize('NFC').trim());
      const cls = final ? ' class="final-answer"' : '';
      return `<p${cls}${langAttr(text)}>${this.parser.parseInline(tokens)}</p>\n`;
    },
    listitem(item) {
      return `<li${langAttr(item.text)}>${this.parser.parse(item.tokens)}</li>\n`;
    },
    tablecell(cell) {
      const tag = cell.header ? 'th' : 'td';
      const align = cell.align ? ` align="${cell.align}"` : '';
      return `<${tag}${align}${langAttr(cell.text)}>${this.parser.parseInline(cell.tokens)}</${tag}>\n`;
    },
    text(token) {
      if ('tokens' in token && token.tokens) {
        return this.parser.parseInline(token.tokens);
      }
      // Text inside raw HTML is escaped too: model output is never parsed as HTML.
      return flagImages(markEquations(token.text));
    },
  },
});

/**
 * Puts each final-answer line in its own paragraph. Gemma often writes it on the line right
 * after a list item, where Markdown would join it to that item. Only a line break is added.
 */
export function separateFinalAnswers(source: string): string {
  const lines = source.split('\n');
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s{0,3}(```|~~~)/.test(lines[i])) {
      inFence = !inFence;
    } else if (!inFence && i > 0 && lines[i - 1].trim() && FINAL_LINE.test(lines[i].normalize('NFC'))) {
      lines[i] = `\n${lines[i]}`;
    }
  }
  return lines.join('\n');
}

function blockLang(token: Token): 'yo' | 'en' | null {
  if (token.type !== 'heading') {
    return null;
  }
  const text = (token as Tokens.Heading).text.normalize('NFC');
  return YORUBA_HEADING.test(text) ? 'yo' : ENGLISH_HEADING.test(text) ? 'en' : null;
}

/** The separator between the two sections is replaced by the blocks themselves. */
function withoutTrailingRules(tokens: Token[]): Token[] {
  let end = tokens.length;
  while (end > 1 && (tokens[end - 1].type === 'hr' || tokens[end - 1].type === 'space')) {
    end--;
  }
  return tokens.slice(0, end);
}

/**
 * Renders Gemma's Markdown to HTML. The result is still bound with [innerHTML], so Angular's
 * sanitizer runs on it as well. Heading levels are shifted to sit under the answer's h2 and
 * never skip a level, so the page keeps one h1 and a logical heading order. The sections under
 * a Yorùbá and an English heading become two continuous language blocks with YO and EN tags.
 */
export function renderMarkdown(source: string): string {
  const tokens = md.lexer(separateFinalAnswers(source));
  const headings: Tokens.Heading[] = [];
  md.walkTokens(tokens, (token) => {
    if (token.type === 'heading') {
      headings.push(token as Tokens.Heading);
    }
  });
  const minDepth = Math.min(...headings.map((h) => h.depth));
  let previous = ANSWER_HEADING_LEVEL;
  for (const heading of headings) {
    const level = Math.min(ANSWER_HEADING_LEVEL + 1 + heading.depth - minDepth, previous + 1, 6);
    headingLevels.set(heading, level);
    previous = level;
  }

  const before: Token[] = [];
  const blocks: { lang: 'yo' | 'en'; tokens: Token[] }[] = [];
  for (const token of tokens) {
    const lang = blockLang(token);
    if (lang) {
      blockTags.set(token, lang.toUpperCase());
      blocks.push({ lang, tokens: [token] });
    } else {
      (blocks.at(-1)?.tokens ?? before).push(token);
    }
  }
  return (
    md.parser(before) +
    blocks
      .map(
        (block) =>
          `<div class="lang-block" lang="${block.lang}">\n${md.parser(withoutTrailingRules(block.tokens))}</div>\n`,
      )
      .join('')
  );
}

/**
 * The answer the tutor prompt asks for when nothing relevant was retrieved: two short lines,
 * Yorùbá then English ("Sorry, this question is not in our verified database yet."). It is
 * shown as a calm note, not as an error.
 */
export function isFallbackAnswer(text: string): boolean {
  const lines = text.split('\n').filter((line) => line.trim());
  return lines.length <= 2 && lines.some((line) => /not in our verified database/i.test(line));
}

/** Renders the fallback line by line, so each line gets its own paragraph and language. */
export function renderLines(text: string): string {
  return text
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => renderMarkdown(line))
    .join('');
}

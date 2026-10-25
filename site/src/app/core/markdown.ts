import { Marked, Tokens } from 'marked';
import { looksYoruba } from './yoruba';

/** Each answer card has an h2 label, so headings inside an answer start at h3. */
const ANSWER_HEADING_LEVEL = 2;

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

/** lang="yo" plus a class for blocks that look like Yorùbá, so both registers stay distinct. */
function yorubaAttrs(text: string): string {
  return looksYoruba(text) ? ' lang="yo" class="yo"' : '';
}

const headingLevels = new WeakMap<object, number>();

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
      return `<h${level}${yorubaAttrs(token.text)}>${this.parser.parseInline(token.tokens)}</h${level}>\n`;
    },
    paragraph({ tokens, text }) {
      return `<p${yorubaAttrs(text)}>${this.parser.parseInline(tokens)}</p>\n`;
    },
    // Same output as marked's default list, plus a class when most items are Yorùbá, so the
    // whole list gets one twin rule instead of one per item.
    list(token) {
      const tag = token.ordered ? 'ol' : 'ul';
      const start = token.ordered && token.start !== 1 ? ` start="${token.start}"` : '';
      const yorubaItems = token.items.filter((item) => looksYoruba(item.text)).length;
      const marker = yorubaItems * 2 > token.items.length ? ' class="yo-list"' : '';
      const body = token.items.map((item) => this.listitem(item)).join('');
      return `<${tag}${start}${marker}>\n${body}</${tag}>\n`;
    },
    listitem(item) {
      return `<li${yorubaAttrs(item.text)}>${this.parser.parse(item.tokens)}</li>\n`;
    },
    tablecell(cell) {
      const tag = cell.header ? 'th' : 'td';
      const align = cell.align ? ` align="${cell.align}"` : '';
      return `<${tag}${align}${yorubaAttrs(cell.text)}>${this.parser.parseInline(cell.tokens)}</${tag}>\n`;
    },
  },
});

/**
 * Renders Gemma's Markdown to HTML. The result is still bound with [innerHTML], so Angular's
 * sanitizer runs on it as well. Heading levels are shifted to sit under the answer's h2 and
 * never skip a level, so the page keeps one h1 and a logical heading order.
 */
export function renderMarkdown(source: string): string {
  const tokens = md.lexer(source);
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
  return md.parser(tokens);
}

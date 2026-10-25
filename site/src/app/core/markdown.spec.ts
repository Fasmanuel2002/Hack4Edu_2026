import { renderMarkdown } from './markdown';
import { STARTERS } from './starters';

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

  it('marks Yorùbá blocks with lang="yo" and leaves English blocks alone', () => {
    const html = renderMarkdown(`${STARTERS[1].yo}\n\n${STARTERS[1].en}`);
    expect(html).toContain(`<p lang="yo" class="yo">${STARTERS[1].yo}</p>`);
    expect(html).toContain(`<p>${STARTERS[1].en}</p>`);
  });

  it('marks a mostly Yorùbá list once, and each Yorùbá item', () => {
    const html = renderMarkdown(`1. ${STARTERS[0].yo}\n2. ${STARTERS[3].yo}\n3. 5 + 6 = 11`);
    expect(html).toContain('<ol class="yo-list">');
    expect(html.match(/<li lang="yo"/g)?.length).toBe(2);
  });

  it('renders numbered steps and code blocks', () => {
    const html = renderMarkdown('1. 24 = 2p\n2. p = 12\n\n```\n24 / 2 = 12\n```');
    expect(html).toContain('<ol>');
    expect(html).toContain('<pre><code>24 / 2 = 12');
  });
});

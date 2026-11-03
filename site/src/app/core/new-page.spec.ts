import { opensNewPage, pathOf } from './new-page';

describe('opensNewPage', () => {
  it('is true when the path changes', () => {
    expect(opensNewPage('/difference', '/architecture')).toBe(true);
    expect(opensNewPage('/', '/chat?x=1')).toBe(true);
  });

  it('is false for the first navigation', () => {
    expect(opensNewPage(null, '/chat')).toBe(false);
  });

  it('is false for a query change or an anchor on the same page', () => {
    expect(opensNewPage('/crm?view=map', '/crm?view=orgs')).toBe(false);
    expect(opensNewPage('/crm', '/crm?country=Ghana')).toBe(false);
    expect(opensNewPage('/paper', '/paper#read')).toBe(false);
  });

  it('is false when the target is an anchor, even on another page', () => {
    expect(opensNewPage('/chat', '/#mapa')).toBe(false);
  });

  it('pathOf drops the query and the fragment', () => {
    expect(pathOf('/crm?view=map#top')).toBe('/crm');
  });
});

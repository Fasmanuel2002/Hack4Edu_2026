import { Org, OrgDraft } from './crm-logic';
import { avatarColor, contactGaps, countBy, initials } from './crm-bits';

const base: OrgDraft = {
  country: 'Ghana', name: 'X', sector: '', contact: '', role: '', email: '', phone: '', web: '',
  status: 'Identificada', priority: 'Media', followUp: '', nextAction: '', notes: '', activities: [],
};
const org = (id: string, over: Partial<Org>): Org => ({ id, ...base, ...over });

describe('CRM view helpers', () => {
  it('builds a two-letter monogram from capitalised words, keeping accents', () => {
    expect(initials('ADPP Angola')).toBe('AA');
    expect(initials('Fundación de Ëducación')).toBe('FË');
    expect(initials('AFECO')).toBe('A');
    expect(initials('ong local')).toBe('OL');
    expect(initials('  ')).toBe('?');
  });

  it('gives the same avatar colour to the same name', () => {
    expect(avatarColor('Abaarso Network')).toBe(avatarColor('Abaarso Network'));
    expect(avatarColor('Abaarso Network')).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('counts per key, largest first and ties by name', () => {
    const rows = [org('1', { country: 'Kenya' }), org('2', { country: 'Benin' }), org('3', { country: 'Nigeria' }), org('4', { country: 'Nigeria' })];
    expect(countBy(rows, (o) => o.country)).toEqual([{ name: 'Nigeria', n: 2 }, { name: 'Benin', n: 1 }, { name: 'Kenya', n: 1 }]);
  });

  it('lists organizations without email or phone, and those with no https route at all', () => {
    const rows = [
      org('mail', { email: 'a@b.org' }),
      org('tel', { phone: '+234 1' }),
      org('web', { web: 'https://x.org' }),
      org('http', { web: 'http://x.org' }),
      org('none', {}),
    ];
    const gaps = contactGaps(rows);
    expect(gaps.noDirect.map((o) => o.id)).toEqual(['web', 'http', 'none']);
    expect(gaps.noRoute.map((o) => o.id)).toEqual(['http', 'none']);
  });
});

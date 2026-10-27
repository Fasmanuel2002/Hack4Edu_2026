import { LETTERS, subjectLabel } from './quiz';
import { QUIZ_BANK } from './quiz-bank';
import { STARTERS } from './starters';

const SUBJECTS = [
  'elementary_mathematics',
  'high_school_geography',
  'high_school_microeconomics',
  'international_law',
  'global_facts',
];

describe('quiz bank', () => {
  it('has 25 AfriMMLU questions, 5 per subject, with unique ids', () => {
    expect(QUIZ_BANK.length).toBe(25);
    for (const subject of SUBJECTS) {
      expect(QUIZ_BANK.filter((item) => item.subject === subject).length).toBe(5);
    }
    expect(new Set(QUIZ_BANK.map((item) => item.id)).size).toBe(QUIZ_BANK.length);
    for (const item of QUIZ_BANK) {
      expect(item.source_dataset).toMatch(/^afrimmlu_(dev|validation|test)$/);
      expect(item.id.startsWith(`${item.source_dataset}-`)).toBe(true);
    }
  });

  it('has 4 different options in both languages and a verified answer from A to D', () => {
    for (const item of QUIZ_BANK) {
      expect(item.options.yo.length).toBe(4);
      expect(item.options.en.length).toBe(4);
      expect(new Set(item.options.yo).size).toBe(4);
      expect(new Set(item.options.en).size).toBe(4);
      expect(LETTERS).toContain(item.answer);
      expect(item.yo.trim().length).toBeGreaterThan(0);
      expect(item.en.trim().length).toBeGreaterThan(0);
    }
  });

  it('leaves out the starter questions, so they stay fresh for the A/B demo', () => {
    const starters = STARTERS.flatMap((s) => [s.yo.normalize('NFC'), s.en]);
    for (const item of QUIZ_BANK) {
      expect(starters).not.toContain(item.yo.normalize('NFC'));
      expect(starters).not.toContain(item.en);
    }
  });
});

describe('subjectLabel', () => {
  it('names subjects the way CLAUDE.md does', () => {
    expect(subjectLabel('high_school_geography')).toBe('High school geography');
    expect(subjectLabel('global_facts')).toBe('Global facts');
  });
});

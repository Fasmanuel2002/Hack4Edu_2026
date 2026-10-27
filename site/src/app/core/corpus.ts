// Facts from CLAUDE.md ("Source of truth"). Numbers are written as text so they read the same
// in every locale. Do not add numbers that are not in CLAUDE.md.

export interface CorpusTableRow {
  readonly subject: string;
  readonly datasets: readonly string[];
  readonly rows: string;
  readonly languages: string;
  readonly content: string;
}

export const CORPUS_TABLE: readonly CorpusTableRow[] = [
  {
    subject: 'Mathematics',
    datasets: ['afrimgsm_train', 'afrimgsm_test'],
    rows: '8 + 250',
    languages: 'Yorùbá + English',
    content:
      'Word problems. Train rows have step-by-step solutions; test rows have only the final number.',
  },
  {
    subject: 'Mathematics',
    datasets: ['gsm8k_train'],
    rows: '7,473',
    languages: 'English only',
    content: 'Worked examples with step-by-step solutions.',
  },
  {
    subject: 'Sciences and humanities',
    datasets: ['afrimmlu_dev', 'afrimmlu_validation', 'afrimmlu_test'],
    rows: '25 + 83 + 500',
    languages: 'Yorùbá + English',
    content:
      'Multiple choice with 4 options. Subjects: elementary mathematics (125), high school geography (125), high school microeconomics (125), international law (118), global facts (115).',
  },
  {
    subject: 'Reading comprehension',
    datasets: ['belebele_test'],
    rows: '900',
    languages: 'Yorùbá + English',
    content: 'Reading passage, question, and verified answer.',
  },
  {
    subject: 'Translation',
    datasets: ['mafand_train'],
    rows: '6,552',
    languages: 'Yorùbá → English',
    content: 'News sentences with verified translations.',
  },
];

/** Subject shown next to a source_dataset badge. */
export function subjectOf(sourceDataset: string): string {
  if (sourceDataset.startsWith('afrimgsm') || sourceDataset.startsWith('gsm8k')) {
    return 'Mathematics';
  }
  if (sourceDataset.startsWith('afrimmlu')) {
    return 'Sciences and humanities';
  }
  if (sourceDataset.startsWith('belebele')) {
    return 'Reading comprehension';
  }
  if (sourceDataset.startsWith('mafand')) {
    return 'Translation';
  }
  return '';
}

/** The compare-mode labels from CLAUDE.md. Outside compare mode the tutor is just "Twins for Change". */
export const ANSWER_LABELS = {
  rag: 'Twins for Change (Gemma + RAG)',
  plain: 'Plain Gemma (no RAG)',
} as const;

export function answerLabel(kind: keyof typeof ANSWER_LABELS, compare: boolean): string {
  return compare ? ANSWER_LABELS[kind] : 'Twins for Change';
}

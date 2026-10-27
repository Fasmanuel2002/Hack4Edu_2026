import type { QuizItem } from './quiz-bank';

export type Letter = QuizItem['answer'];
export const LETTERS: readonly Letter[] = ['A', 'B', 'C', 'D'];

/** "high_school_geography" -> "High school geography", the way CLAUDE.md names the subjects. */
export function subjectLabel(subject: string): string {
  const words = subject.replaceAll('_', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

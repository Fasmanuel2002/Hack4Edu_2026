import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Footer } from '../shared/footer';
import { Icon } from '../shared/icon';
import { Reveal } from '../shared/reveal';
import { TopBar } from '../shared/top-bar';

/** One task of the SAHARA benchmark, with the scores of the two models we compare (Table E4, page 28). */
interface Task {
  readonly name: string;
  readonly metric: string;
  readonly gemma: number;
  readonly gpt: number;
  readonly grounded?: boolean;
}

const TASKS: readonly Task[] = [
  { name: 'Translate from English into African languages', metric: 'spBLEU', gemma: 3.4, gpt: 12.36 },
  { name: 'Translate from French into African languages', metric: 'spBLEU', gemma: 1.32, gpt: 3.42 },
  { name: 'Solve math problems (MGSM)', metric: 'exact match', gemma: 0.7, gpt: 29.5 },
  { name: 'Answer a question about a passage you give it (SQuAD-QA)', metric: 'F1', gemma: 74.97, gpt: 76.11, grounded: true },
];

/** /paper: the research this project builds on, with the PDF to read or download. */
@Component({
  selector: 'app-paper-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TopBar, Footer, Icon, Reveal],
  templateUrl: './paper-page.html',
  styleUrl: './paper-page.css',
})
export class PaperPage {
  protected readonly pdf = 'papers/where-are-we-african-languages.pdf';
  protected readonly tasks = TASKS;
  protected readonly findings = [
    {
      title: 'Strong on a few languages',
      text: 'Leading models do reasonably well on a handful of languages.',
    },
    {
      title: 'Many left behind',
      text: 'Many Indigenous languages are marginalized because very little data exists for them.',
    },
    {
      title: 'Policy shapes data',
      text: 'Language policies that favour foreign languages create the data gaps that models then inherit.',
    },
  ] as const;

  /** With <base href="/"> a bare #read link would leave the page, so scroll to the reader directly. */
  protected scrollToReader(event: Event): void {
    event.preventDefault();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('read')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  protected width(value: number): number {
    return Math.max(value, 0.6);
  }
}

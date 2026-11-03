import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { Announcer, MediaQueries } from '../core/browser';
import { ChatStore } from '../core/chat-store';
import { LETTERS, Letter, subjectLabel } from '../core/quiz';
import { QUIZ_BANK } from '../core/quiz-bank';
import { Footer } from '../shared/footer';
import { Icon } from '../shared/icon';
import { TopBar } from '../shared/top-bar';

/**
 * /practice (CLAUDE.md, Features 6): a plain quiz over the AfriMMLU bank, one question at a time.
 * Nothing is stored.
 */
@Component({
  selector: 'app-practice-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TopBar, Icon, Footer],
  templateUrl: './practice-page.html',
  styleUrl: './practice-page.css',
})
export class PracticePage {
  private readonly chat = inject(ChatStore);
  private readonly router = inject(Router);
  private readonly announcer = inject(Announcer);
  private readonly media = inject(MediaQueries);
  private readonly injector = inject(Injector);

  protected readonly total = QUIZ_BANK.length;
  protected readonly position = signal(0);
  protected readonly item = computed(() => QUIZ_BANK[this.position()]);
  protected readonly subject = computed(() => subjectLabel(this.item().subject));
  protected readonly choice = signal<Letter | null>(null);
  protected readonly answered = computed(() => this.choice() !== null);
  protected readonly correct = computed(() => this.choice() === this.item().answer);

  protected readonly options = computed(() => {
    const item = this.item();
    return LETTERS.map((letter, i) => ({
      letter,
      yo: item.options.yo[i],
      en: item.options.en[i],
      correct: letter === item.answer,
      chosen: letter === this.choice(),
    }));
  });
  protected readonly verified = computed(() => {
    const item = this.item();
    const i = LETTERS.indexOf(item.answer);
    return { yo: `${item.answer}) ${item.options.yo[i]}`, en: `${item.answer}) ${item.options.en[i]}` };
  });

  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');
  private readonly result = viewChild<ElementRef<HTMLElement>>('result');

  protected choose(letter: Letter): void {
    if (this.answered()) {
      return;
    }
    this.choice.set(letter);
    const verdict = letter === this.item().answer ? 'Correct.' : 'Not quite.';
    this.announcer.announce(`${verdict} Verified answer: ${this.verified().en}.`);
    // Bring the result and "Next question" into view; focus stays on the chosen option.
    const behavior = this.media.reducedMotion() ? 'auto' : 'smooth';
    this.afterRender(() => this.result()?.nativeElement.scrollIntoView({ block: 'nearest', behavior }));
  }

  protected next(): void {
    this.position.update((position) => (position + 1) % this.total);
    this.choice.set(null);
    this.afterRender(() => this.heading().nativeElement.focus());
  }

  /** "Ask Twins for Change to explain": a new chat that sends the Yorùbá question. */
  protected explain(): void {
    this.chat.queueQuestion(this.item().yo);
    void this.router.navigateByUrl('/chat');
  }

  private afterRender(action: () => void): void {
    afterNextRender(action, { injector: this.injector });
  }
}

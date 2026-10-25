import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { MediaQueries } from '../core/browser';
import { subjectOf } from '../core/corpus';
import { CorpusSource } from '../core/models';
import { parsePedagogicalAnswer, splitSearchContext } from '../core/pedagogical';
import { Icon } from '../shared/icon';

/** Fired (bubbling) when a sources drawer opens, so the thread stops following new text. */
export const SOURCES_OPEN_EVENT = 'sourcesopen';

/** "Verified sources (top 3)": the rows retrieved for a Twins for Change answer. */
@Component({
  selector: 'app-sources',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './sources.html',
  styleUrl: './sources.css',
})
export class Sources {
  readonly sources = input.required<readonly CorpusSource[]>();
  readonly demo = input(false);
  /** Unique per answer, for the panel id. */
  readonly panelId = input.required<string>();

  protected readonly open = signal(false);
  private readonly media = inject(MediaQueries);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');

  protected readonly items = computed(() =>
    this.sources().map((source) => ({
      ...source,
      subject: subjectOf(source.source_dataset),
      context: splitSearchContext(source.search_context, source.source_dataset),
      segments: parsePedagogicalAnswer(source.pedagogical_answer),
    })),
  );

  protected toggle(): void {
    const open = !this.open();
    this.open.set(open);
    if (!open) {
      return;
    }
    this.host.nativeElement.dispatchEvent(new CustomEvent(SOURCES_OPEN_EVENT, { bubbles: true }));
    // After the 0.2s opening transition, bring as much of the drawer into view as fits.
    const reduced = this.media.reducedMotion();
    setTimeout(
      () =>
        this.panel().nativeElement.scrollIntoView({
          block: 'nearest',
          behavior: reduced ? 'auto' : 'smooth',
        }),
      reduced ? 0 : 220,
    );
  }
}

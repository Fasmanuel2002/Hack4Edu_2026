import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CORPUS_TABLE } from '../core/corpus';
import { Footer } from '../shared/footer';
import { Icon } from '../shared/icon';
import { Reveal } from '../shared/reveal';
import { TopBar } from '../shared/top-bar';

/** /architecture: how Twins for Change works. Prerendered at build time. */
@Component({
  selector: 'app-architecture-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TopBar, Icon, Footer, Reveal],
  templateUrl: './architecture-page.html',
  styleUrl: './architecture-page.css',
})
export class ArchitecturePage {
  protected readonly corpus = CORPUS_TABLE;
  // Written here because "{" starts an ICU expression in Angular templates.
  protected readonly askBody = '{"question": string}';
  protected readonly answerBody = '{"answer": string}';
  protected readonly ragBody =
    '{"answer": string, "sources": [{"source_dataset": string, "search_context": string, "pedagogical_answer": string}]}';
  protected readonly healthBody = '{"status": "healty"}';
}

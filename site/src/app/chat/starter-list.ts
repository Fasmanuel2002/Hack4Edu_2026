import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { API_CONFIG } from '../core/config';
import { STARTERS } from '../core/starters';

/** The four real corpus questions, as light tiles in a 2-column grid under the composer. */
@Component({
  selector: 'app-starter-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './starter-list.html',
  styleUrl: './starter-list.css',
})
export class StarterList {
  /** Emits the Yorùbá question of the tile that was chosen. */
  readonly ask = output<string>();
  /** "Mathematics (AfriMGSM)" is shown as "Mathematics · AfriMGSM"; the data is not changed. */
  protected readonly starters = STARTERS.map((starter) => ({
    ...starter,
    label: starter.subject.replace(/\s*\((.+)\)$/, ' · $1'),
  }));
  protected readonly demo = inject(API_CONFIG).useMock;
}

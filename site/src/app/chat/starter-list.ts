import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { API_CONFIG } from '../core/config';
import { STARTERS } from '../core/starters';
import { Icon, IconName } from '../shared/icon';

/** Line icon per starter, in STARTERS order: two mathematics questions, economics, reading. */
const ICONS: readonly IconName[] = ['calculator', 'calculator', 'chart', 'book'];

/** The four real corpus questions, as quiet rows under the composer on the empty-chat screen. */
@Component({
  selector: 'app-starter-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './starter-list.html',
  styleUrl: './starter-list.css',
})
export class StarterList {
  /** Emits the Yorùbá question of the row that was chosen. */
  readonly ask = output<string>();
  protected readonly starters = STARTERS.map((starter, i) => ({ ...starter, icon: ICONS[i] }));
  protected readonly demo = inject(API_CONFIG).useMock;
}

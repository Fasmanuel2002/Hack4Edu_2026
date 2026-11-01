import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TopBar } from '../shared/top-bar';
import { ANALYSIS_DATE } from './research';
import { AfricaExplorer } from './africa-explorer';

/** `/mapa`: the language explorer on its own page. */
@Component({
  selector: 'app-map-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TopBar, AfricaExplorer],
  templateUrl: './map-page.html',
  styleUrl: './map-page.css',
})
export class MapPage {
  protected readonly analysisDate = ANALYSIS_DATE;
}

import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  COUNTRIES,
  Country,
  RESULT_EN,
  isHttps,
  languagesFor,
  mapX,
  mapY,
} from './research';

type Metric = 'documentation' | 'internet';
/** Pin shapes carry the meaning, so it never depends on color alone. */
type PinKind = 'full' | 'open' | 'unknown';

/** Read-only language explorer over the bundled research snapshot. No network calls. Shared by `/` and `/mapa`. */
@Component({
  selector: 'app-africa-explorer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './africa-explorer.html',
  styleUrl: './africa-explorer.css',
})
export class AfricaExplorer {
  protected readonly regions = [...new Set(COUNTRIES.map((c) => c.region))].sort();
  protected readonly query = signal('');
  protected readonly region = signal('');
  protected readonly metric = signal<Metric>('documentation');
  private readonly selectedName = signal('Nigeria');

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const region = this.region();
    return COUNTRIES.filter(
      (c) =>
        (!region || c.region === region) &&
        (!q || `${c.nameEn} ${c.name} ${c.languages} ${c.peoples}`.toLowerCase().includes(q)),
    );
  });
  /** The chosen country, or the first match when a filter hides it. */
  protected readonly selected = computed(
    () => this.filtered().find((c) => c.name === this.selectedName()) ?? this.filtered()[0],
  );
  protected readonly languages = computed(() => {
    const c = this.selected();
    return c ? languagesFor(c.name) : [];
  });
  protected readonly tags = computed(() =>
    (this.selected()?.languages ?? '').split(';').map((t) => t.trim()).filter(Boolean),
  );
  /** People not using the internet, summed over the countries on screen that have a comparable figure. */
  protected readonly offline = computed(() => {
    const withData = this.filtered().filter((c) => c.offlineEstimate != null);
    return {
      people: withData.reduce((sum, c) => sum + (c.offlineEstimate ?? 0), 0),
      counted: withData.length,
      shown: this.filtered().length,
    };
  });
  protected readonly legend = computed(() =>
    this.metric() === 'internet'
      ? [
          { kind: 'full', text: 'Internet use 40% or more' },
          { kind: 'open', text: 'Internet use below 40%' },
          { kind: 'unknown', text: 'No comparable figure' },
        ]
      : [
          { kind: 'full', text: 'Every selected language has some evidence in the sample' },
          { kind: 'open', text: 'At least one selected language has no evidence in the sample' },
        ],
  );

  protected readonly x = mapX;
  protected readonly y = mapY;
  protected readonly https = isHttps;
  protected readonly flag = (c: Country) => `site/flags/${c.iso2}.png`;
  protected readonly result = (r: string) => RESULT_EN[r] ?? r;
  protected readonly people = (v: number | null) =>
    v === null ? 'Not available' : new Intl.NumberFormat('en-US').format(v);
  protected readonly internet = (v: number | null) => (v === null ? 'No comparable figure' : `${v}%`);
  protected readonly modelLink = (l: { modelSource?: string; source?: string }) => l.modelSource || l.source;

  protected readonly million = (v: number) => `${Math.round(v / 1e6).toLocaleString('en-US')} million`;
  /** Halo diameter in rem: area grows with the number of people not online (Nigeria is about 6.5rem). */
  protected halo = (c: Country) => (c.offlineEstimate ? 0.55 * Math.sqrt(c.offlineEstimate / 1e6) + 0.8 : 0);

  protected pinKind(c: Country): PinKind {
    if (this.metric() === 'internet') {
      return c.internetPct === null ? 'unknown' : c.internetPct < 40 ? 'open' : 'full';
    }
    return c.unknownCount > 0 ? 'open' : 'full';
  }
  protected select(country: Country): void {
    this.selectedName.set(country.name);
  }
  protected onPick(event: Event): void {
    this.selectedName.set((event.target as HTMLSelectElement).value);
  }
  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
  protected onRegion(event: Event): void {
    this.region.set((event.target as HTMLSelectElement).value);
  }
  protected onMetric(event: Event): void {
    this.metric.set((event.target as HTMLSelectElement).value as Metric);
  }
  protected showOnMap(): void {
    this.metric.set('internet');
  }
  protected reset(): void {
    this.query.set('');
    this.region.set('');
    this.metric.set('documentation');
  }
}

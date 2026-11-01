import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { COUNTRIES, LANGUAGES, RESULT_EN, isHttps } from './research';

const PAGE_SIZE = 12;
const NAME_EN = new Map(COUNTRIES.map((c) => [c.name, c.nameEn]));

/** The 185 country-language rows of the research snapshot, with search and filters. Read-only, no network. */
@Component({
  selector: 'app-research-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './research-table.html',
  styleUrl: './research-table.css',
})
export class ResearchTable {
  protected readonly total = LANGUAGES.length;
  protected readonly countries = COUNTRIES.filter((c) => LANGUAGES.some((l) => l.country === c.name));
  protected readonly results = Object.keys(RESULT_EN);
  protected readonly query = signal('');
  protected readonly country = signal('');
  protected readonly result = signal('');
  protected readonly page = signal(0);

  protected readonly rows = computed(() => {
    const q = this.query().trim().toLowerCase();
    const country = this.country();
    const result = this.result();
    return LANGUAGES.filter(
      (l) =>
        (!country || l.country === country) &&
        (!result || l.result === result) &&
        (!q || `${NAME_EN.get(l.country) ?? ''} ${l.country} ${l.language} ${l.iso}`.toLowerCase().includes(q)),
    );
  });
  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.rows().length / PAGE_SIZE)));
  protected readonly visible = computed(() => {
    const start = Math.min(this.page(), this.pages() - 1) * PAGE_SIZE;
    return this.rows().slice(start, start + PAGE_SIZE);
  });
  protected readonly current = computed(() => Math.min(this.page(), this.pages() - 1));

  protected readonly name = (country: string) => NAME_EN.get(country) ?? country;
  protected readonly label = (r: string) => RESULT_EN[r] ?? r;
  protected readonly link = (l: { modelSource?: string; source?: string }) =>
    isHttps(l.modelSource) ? l.modelSource : isHttps(l.source) ? l.source : null;

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.page.set(0);
  }
  protected onCountry(event: Event): void {
    this.country.set((event.target as HTMLSelectElement).value);
    this.page.set(0);
  }
  protected onResult(event: Event): void {
    this.result.set((event.target as HTMLSelectElement).value);
    this.page.set(0);
  }
  protected go(delta: number): void {
    this.page.set(Math.min(this.pages() - 1, Math.max(0, this.current() + delta)));
  }
}

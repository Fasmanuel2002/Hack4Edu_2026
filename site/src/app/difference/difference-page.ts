import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TopBar } from '../shared/top-bar';

interface System {
  readonly id: string;
  readonly name: string;
  readonly detail: string;
  /** TCO in USD per school after 1, 3 and 5 years (CAPEX + n × OPEX). */
  readonly tco: readonly [number, number, number];
  readonly ours?: boolean;
}

/** Source: investigacion_financiera_deeplanguage_africa.xlsx, summarized in the cost study (section 1). */
const SYSTEMS: readonly System[] = [
  { id: 'ryzen', name: 'DeepLanguage · Ryzen 7 5700U 32GB', detail: 'Offline, Gemma 3 4B + hybrid RAG', tco: [865, 935, 1005], ours: true },
  { id: 'n100', name: 'DeepLanguage · Mini PC N100 16GB', detail: 'Offline, same stack', tco: [750, 810, 870] },
  { id: 'mini4g', name: 'Cloud · GPT-4o-mini + 4G', detail: 'Mobile data + per-token fees', tco: [1136.18, 2028.54, 2920.9] },
  { id: 'mini', name: 'Cloud · GPT-4o-mini + Starlink', detail: 'Satellite link + per-token fees', tco: [1711.18, 2853.54, 3995.9] },
  { id: 'flag', name: 'Cloud · GPT-4o + Starlink', detail: 'Flagship model + satellite link', tco: [2356.4, 4789.2, 7222] },
];

const HORIZONS = ['Year 1', 'Year 3', 'Year 5'] as const;

/** /difference: what sets Twins for Change apart, as a cost benchmark chart. */
@Component({
  selector: 'app-difference-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TopBar, RouterLink],
  templateUrl: './difference-page.html',
  styleUrl: './difference-page.css',
})
export class DifferencePage {
  protected readonly systems = SYSTEMS;
  private readonly allGroups = HORIZONS.map((label, i) => ({
    label,
    bars: SYSTEMS.map((s) => ({ ...s, value: s.tco[i] })),
  }));
  protected readonly horizons = ['All years', ...HORIZONS];
  /** 0 = all years, otherwise 1..3 for Year 1, 3, 5. */
  protected readonly horizon = signal(0);
  /** The system the reader isolated in the legend (others fade), or null. */
  protected readonly focus = signal<string | null>(null);
  protected readonly groups = computed(() =>
    this.horizon() === 0 ? this.allGroups : [this.allGroups[this.horizon() - 1]],
  );
  protected readonly links = [
    { to: '/chat', title: 'Try the tutor', text: 'Ask a question in Yorùbá or English and compare it with plain Gemma.' },
    { to: '/architecture', title: 'How it works', text: 'From question to bilingual answer, step by step.' },
    { to: '/practice', title: 'Practice', text: 'Answer real exam questions, then ask the tutor to explain.' },
  ];

  protected toggleFocus(id: string): void {
    this.focus.update((f) => (f === id ? null : id));
  }
  /** The x axis runs 0 to AXIS_MAX; the cloud flagship at year 5 ($7,222) is the longest bar. */
  protected readonly ticks = [0, 3000, 6000, 9000];
  private readonly AXIS_MAX = 9000;

  protected pct(value: number): number {
    return (value / this.AXIS_MAX) * 100;
  }

  protected usd(value: number): string {
    return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
}

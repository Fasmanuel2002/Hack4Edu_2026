import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CountUp } from '../shared/count-up';
import { Footer } from '../shared/footer';
import { Icon } from '../shared/icon';
import { Reveal } from '../shared/reveal';
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
  { id: 'ryzen', name: 'Twins for Change · Ryzen 7 5700U 32GB', detail: 'Offline, Gemma 3 4B + hybrid RAG', tco: [865, 935, 1005], ours: true },
  { id: 'n100', name: 'Twins for Change · Mini PC N100 16GB', detail: 'Offline, same stack', tco: [750, 810, 870] },
  { id: 'mini4g', name: 'Cloud · GPT-4o-mini + 4G', detail: 'Mobile data + per-token fees', tco: [1136.18, 2028.54, 2920.9] },
  { id: 'mini', name: 'Cloud · GPT-4o-mini + Starlink', detail: 'Satellite link + per-token fees', tco: [1711.18, 2853.54, 3995.9] },
  { id: 'flag', name: 'Cloud · GPT-4o + Starlink', detail: 'Flagship model + satellite link', tco: [2356.4, 4789.2, 7222] },
];

/** Traffic model of the cost study (section 4.1): 40 students, 10 questions each, 22 school days a month. */
const QUESTIONS_PER_YEAR = 40 * 10 * 22 * 12;
const TOKENS_IN = 1200;
const TOKENS_OUT = 350;

interface Model {
  readonly id: string;
  readonly name: string;
  readonly vendor: string;
  /** USD per 1M input and output tokens. */
  readonly rate: readonly [number, number];
}

const MODELS: readonly Model[] = [
  { id: 'gpt4omini', name: 'GPT-4o mini', vendor: 'OpenAI', rate: [0.15, 0.6] },
  { id: 'gpt41mini', name: 'GPT-4.1 mini', vendor: 'OpenAI', rate: [0.4, 1.6] },
  { id: 'haiku', name: 'Claude Haiku 4.5', vendor: 'Anthropic', rate: [1, 5] },
  { id: 'gpt41', name: 'GPT-4.1', vendor: 'OpenAI', rate: [2, 8] },
  { id: 'gpt4o', name: 'GPT-4o', vendor: 'OpenAI', rate: [2.5, 10] },
];

const HORIZONS = ['Year 1', 'Year 3', 'Year 5'] as const;

/** /difference: what sets Twins for Change apart, as a cost benchmark chart. */
@Component({
  selector: 'app-difference-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TopBar, Icon, Footer, Reveal, CountUp, RouterLink],
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
  protected readonly points = [
    { icon: 'cpu', title: 'No connection needed', text: 'After a one-time setup, everything runs on one machine in the classroom.' },
    { icon: 'search', title: 'Answers from verified data', text: 'Hybrid search over 15,791 verified Yorùbá–English rows, so Gemma answers from real examples.' },
    { icon: 'check', title: 'Costs that stay flat', text: 'No token fees and no internet bill. Only maintenance remains, $35 a year.' },
  ] as const;

  /** Savings calculator: per-school TCO of the chart above, times the number of schools. */
  protected readonly schoolSteps = [1, 5, 10, 25, 50, 100, 250, 500] as const;
  protected readonly schoolIdx = signal(5);
  /** Index into HORIZONS: Year 1, 3 or 5. */
  protected readonly horizonIdx = signal(2);
  protected readonly yearsLabel = ['1 year', '3 years', '5 years'] as const;
  protected readonly rivals = SYSTEMS.filter((s) => ['mini4g', 'mini', 'flag'].includes(s.id));
  protected readonly rivalId = signal('mini');
  protected readonly calc = computed(() => {
    const n = this.schoolSteps[this.schoolIdx()];
    const h = this.horizonIdx();
    const rival = SYSTEMS.find((s) => s.id === this.rivalId()) ?? this.rivals[0];
    const ours = SYSTEMS[0].tco[h] * n;
    const theirs = rival.tco[h] * n;
    return {
      n,
      rival: rival.name,
      years: this.yearsLabel[h],
      ours,
      theirs,
      saved: theirs - ours,
      pct: ((theirs - ours) / theirs) * 100,
      ourWidth: (ours / theirs) * 100,
    };
  });

  protected setSchools(event: Event): void {
    this.schoolIdx.set(Number((event.target as HTMLInputElement).value));
  }

  protected readonly faq = [
    {
      q: 'Does it really work without internet?',
      a: 'Yes, once it is set up. Internet is needed one time, to download the Ollama models, the Qdrant image and the BM25 model. After that the tutor, the search and the model all run on one computer in the classroom. The online demo exists so you can try it without installing anything.',
    },
    {
      q: 'What does it cost a school?',
      a: "In the cost study's estimates, the Ryzen setup costs $865 in the first year and $1,005 over five years, with no token fees and no internet bill. A cloud setup with GPT-4o mini and Starlink costs $1,711 in the first year and $3,996 over five. These are modelled estimates, not measured results.",
    },
    {
      q: 'Which languages does it support?',
      a: 'Yorùbá and English. The language map shows research on other African languages, but a language listed there is not a language the tutor supports yet. More languages are planned.',
    },
    {
      q: 'How do you stop it from making things up?',
      a: "Before Gemma answers, the question is matched against 15,791 verified bilingual rows, and the 3 best matches are given to the model. Every answer lists those sources so you can check them. We haven't measured an accuracy figure yet, so we don't claim one. Compare mode shows plain Gemma next to Twins for Change on the same question.",
    },
    {
      q: 'Where are chats stored?',
      a: "Your chat history is saved only in your browser. The backend keeps no conversation memory: each request is a single question. In local mode nothing leaves the school's computer.",
    },
    {
      q: 'Who is it for?',
      a: 'Teachers and students in bilingual Yorùbá–English classrooms, and researchers working on retrieval for low-resource languages.',
    },
  ] as const;

  protected toggleFocus(id: string): void {
    this.focus.update((f) => (f === id ? null : id));
  }
  /** The x axis runs 0 to AXIS_MAX; the cloud flagship at year 5 ($7,222) is the longest bar. */
  protected readonly ticks = [0, 3000, 6000, 9000];
  private readonly AXIS_MAX = 9000;

  /** Token bill per school; the local Gemma model has no per-token fee. */
  protected readonly models = [
    { id: 'twins', name: 'Twins for Change', vendor: 'Gemma 3 4B, local', rate: [0, 0] as const, perQuestion: 0, year: 0, ours: true },
    ...MODELS.map((m) => {
      const perQuestion = (TOKENS_IN * m.rate[0] + TOKENS_OUT * m.rate[1]) / 1e6;
      return { ...m, perQuestion, year: perQuestion * QUESTIONS_PER_YEAR, ours: false };
    }),
  ];
  protected readonly traffic = [
    { value: '400', label: 'questions a day in one classroom of 40 students' },
    { value: '13.64M', label: 'tokens a month: 10.56M in, 3.08M out' },
    { value: '1,200 + 350', label: 'tokens in and out for each question' },
    { value: '163.68M', label: 'tokens a year, for a single school' },
  ] as const;
  /** Bars show one school or a network of 500. */
  protected readonly scale = signal<1 | 500>(1);
  protected readonly scales = [
    { n: 1, label: '1 school' },
    { n: 500, label: '500 schools' },
  ] as const;
  protected readonly bills = computed(() => {
    const n = this.scale();
    const max = Math.max(...this.models.map((m) => m.year * n));
    return this.models.map((m) => ({ ...m, total: m.year * n, width: (m.year * n * 100) / max }));
  });
  protected readonly hidden = [
    { value: '$2,400', text: 'of satellite internet over 5 years for each school, plus a dish that draws 50–75 W non-stop. $1.2M for 500 schools.' },
    { value: '$1,800', text: 'of 4G data over 5 years for each school, with only 50–70% real availability when rural cells are congested.' },
    { value: '$1.7M', text: 'in token fees over 5 years for 500 schools on GPT-4o alone, before paying for any connection.' },
  ] as const;

  protected money(value: number, cents = false): string {
    return '$' + value.toLocaleString('en-US', cents ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 });
  }

  protected pct(value: number): number {
    return (value / this.AXIS_MAX) * 100;
  }

  protected usd(value: number): string {
    return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
}

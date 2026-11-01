import data from './research.json';

/**
 * Read-only snapshot of the language research (analysis date 2026-10-20), copied from the team's
 * Twins_for_Change_Angular_FastAPI project. The outreach contacts (seedOrganizations) were left out.
 * Values such as `result` and `peoples` are kept as the researchers wrote them (Spanish).
 */
export interface Country {
  /** Spanish name as in the snapshot; it is the key used by `LANGUAGES`. */
  name: string;
  /** English display name, from the ISO code. */
  nameEn: string;
  region: string;
  population: number | null;
  year: number | null;
  iso2: string;
  lat: number | null;
  lon: number | null;
  languages: string;
  peoples: string;
  languageCount: number;
  /** Selected languages with "no evidence in sample" in the desk review. */
  unknownCount: number;
  internetPct: number | null;
  internetYear: number | null;
  /** Per-indicator source pages (population: World Bank SP.POP.TOTL, internet: IT.NET.USER.ZS). */
  populationSource?: string;
  internetSource?: string;
  /** Orientative estimate: population × (100 − internet %) for the same year. Null when the years differ or data are missing. */
  offlineEstimate?: number | null;
  connectivityQualifier?: string;
  isTerritory?: boolean;
  sources: { population?: string; factbook?: string };
}

export interface LanguageRecord {
  country: string;
  language: string;
  iso: string;
  result: string;
  modelSource?: string;
  source?: string;
}

const REGION_EN: Record<string, string> = {
  Austral: 'Southern',
  Central: 'Central',
  Norte: 'North',
  Occidental: 'West',
  Oriental: 'East',
};
const names = new Intl.DisplayNames('en', { type: 'region' });

export const COUNTRIES: Country[] = (data.countries as unknown as Country[])
  .map((c) => ({ ...c, nameEn: names.of(c.iso2) ?? c.name, region: REGION_EN[c.region] ?? c.region }))
  .sort((a, b) => a.nameEn.localeCompare(b.nameEn, 'en'));
export const LANGUAGES = data.languages as unknown as LanguageRecord[];
export const SUMMARY = data.researchSummary;
export const ANALYSIS_DATE = data.analysisDate;

/** English labels for the four result categories used in the snapshot. */
export const RESULT_EN: Record<string, string> = {
  'Modelo pequeño documentado': 'Small model documented',
  'LLM documentado': 'LLM documented',
  'Sin evidencia en muestra': 'No evidence in sample',
  'Solo corpus en esta revisión': 'Corpus only in this review',
};

/** English renderings of the first six notes in the snapshot's `limitations` (the seventh is about outreach contacts). */
export const LIMITATIONS = [
  'Desk research (20 Oct 2026), with no model inference tests on local languages.',
  '"No evidence in sample" does NOT mean that no model exists or that it cannot answer.',
  'The catalogue of 185 country-language records does not cover every language spoken in Africa.',
  'Not using the internet does not mean having no access to education or being excluded linguistically.',
  'Francophone figures are OIF 2025 estimates: they do not count people who speak no international language.',
  'The Factbook ethnolinguistic data are historical; check the year shown.',
];

export function languagesFor(country: string): LanguageRecord[] {
  return LANGUAGES.filter((l) => l.country === country);
}

/** Pins are approximate positions over the reference map image, not survey boundaries. */
export const mapX = (lon: number | null) =>
  lon === null ? 50 : Math.min(95, Math.max(5, ((lon + 27) / 88) * 100));
export const mapY = (lat: number | null) =>
  lat === null ? 50 : Math.min(95, Math.max(4, ((39 - lat) / 80) * 100));

/** Only https links from the snapshot are ever rendered as links. */
export const isHttps = (url: string | undefined): url is string => !!url && /^https:\/\//.test(url);

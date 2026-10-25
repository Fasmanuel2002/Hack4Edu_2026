import { InjectionToken } from '@angular/core';
import { environment } from '../../environments/environment';

export interface ApiConfig {
  /** Backend base URL, without a trailing slash. */
  readonly apiBaseUrl: string;
  /** When true, no request leaves the browser: answers are demo data. */
  readonly useMock: boolean;
}

/** Comes from src/environments/. Switching to the real backend only means editing those files. */
export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    apiBaseUrl: environment.apiBaseUrl.replace(/\/+$/, ''),
    useMock: environment.useMock,
  }),
});

/** True when the API runs on this machine (local mode, no internet needed after setup). */
export function isLocalApi(apiBaseUrl: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?(\/|$)/i.test(apiBaseUrl);
}

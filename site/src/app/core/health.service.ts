import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ApiService } from './api.service';
import { API_CONFIG } from './config';

export type ApiStatus = 'demo' | 'checking' | 'online' | 'offline';

const POLL_MS = 30_000;

/** Polls GET /health/health every 30 seconds. In mock mode nothing is polled: "Demo mode". */
@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly api = inject(ApiService);
  private readonly config = inject(API_CONFIG);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly status = signal<ApiStatus>(this.config.useMock ? 'demo' : 'checking');

  start(): void {
    if (this.config.useMock || !this.browser || this.timer) {
      return;
    }
    void this.check();
    this.timer = setInterval(() => void this.check(), POLL_MS);
  }

  async check(): Promise<void> {
    if (this.config.useMock) {
      return;
    }
    this.status.set((await this.api.health()) ? 'online' : 'offline');
  }
}

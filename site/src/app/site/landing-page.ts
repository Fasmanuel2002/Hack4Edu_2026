import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ThemeService } from '../core/browser';
import { ChatStore } from '../core/chat-store';
import { STARTERS, Starter } from '../core/starters';
import seeds from '../crm/seed-organizations.json';
import { Icon } from '../shared/icon';
import { Logo } from '../shared/logo';
import { AfricaExplorer } from './africa-explorer';
import { ANALYSIS_DATE, COUNTRIES, LANGUAGES } from './research';
import { ResearchTable } from './research-table';

/** English labels for the Spanish values stored in the CRM seed rows (read-only preview). */
const SECTOR: Record<string, string> = { 'ONG / Educación': 'NGO / Education' };
const STATUS: Record<string, string> = { Identificada: 'Identified' };
const PRIORITY: Record<string, string> = { Media: 'Medium', Alta: 'High', Baja: 'Low' };

const PREVIEW_ROWS = 8;

/** `/`: the public landing page. Static copy only; every claim here comes from CLAUDE.md or the bundled research. */
@Component({
  selector: 'app-landing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Logo, AfricaExplorer, ResearchTable],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css',
  host: { '(document:keydown.escape)': 'closeMenu(true)' },
})
export class LandingPage {
  private readonly chat = inject(ChatStore);
  private readonly router = inject(Router);
  protected readonly theme = inject(ThemeService);

  protected readonly starters = STARTERS;
  protected readonly menuOpen = signal(false);
  protected readonly countryCount = COUNTRIES.length;
  protected readonly recordCount = LANGUAGES.length;
  protected readonly analysisDate = ANALYSIS_DATE;

  /** Read-only preview of the CRM seed rows. The CRM store is not touched. */
  protected readonly orgs = seeds.map((o) => ({
    name: o.name,
    country: o.country,
    sector: SECTOR[o.sector] ?? o.sector,
    status: STATUS[o.status] ?? o.status,
    priority: PRIORITY[o.priority] ?? o.priority,
  }));
  /** Only the first rows are shown on the landing page; the counts above use all of them. */
  protected readonly preview = this.orgs.slice(0, PREVIEW_ROWS);
  protected readonly orgCountries = new Set(seeds.map((o) => o.country)).size;
  protected readonly followUps = seeds.filter((o) => o.followUp).length;

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(fromKey = false): void {
    if (!this.menuOpen()) {
      return;
    }
    this.menuOpen.set(false);
    if (fromKey) {
      document.getElementById('landing-menu-button')?.focus();
    }
  }

  /** Same mechanism as "Ask Twins for Change to explain" on /practice: queue the question, open /chat. */
  protected ask(starter: Starter): void {
    this.chat.queueQuestion(starter.yo);
    void this.router.navigateByUrl('/chat');
  }
}

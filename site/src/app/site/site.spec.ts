import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { routes } from '../app.routes';
import { ChatStore } from '../core/chat-store';
import { STARTERS } from '../core/starters';
import { LandingPage } from './landing-page';
import { LANGUAGES, RESULT_EN, isHttps, mapX, mapY } from './research';

describe('landing and map routes', () => {
  it('serves the landing page at / and keeps /app as a redirect to /chat', () => {
    expect(routes.find((r) => r.path === '')?.loadComponent).toBeDefined();
    expect(routes.find((r) => r.path === 'app')?.redirectTo).toBe('chat');
    expect(routes.find((r) => r.path === 'chat')?.component).toBeDefined();
    expect(routes.find((r) => r.path === 'mapa')?.title).toContain('Twins for Change');
  });
});

describe('research snapshot helpers', () => {
  it('labels every result category in English', () => {
    for (const l of LANGUAGES) expect(RESULT_EN[l.result]).toBeDefined();
  });

  it('keeps pins inside the map and renders only https links', () => {
    expect(mapX(null)).toBe(50);
    expect(mapX(500)).toBe(95);
    expect(mapY(-500)).toBe(95);
    expect(isHttps('https://example.org')).toBe(true);
    expect(isHttps('http://example.org')).toBe(false);
    expect(isHttps('javascript:alert(1)')).toBe(false);
    expect(isHttps(undefined)).toBe(false);
  });
});

describe('landing page', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] }),
  );

  it('has one h1, the four real starters, and queues the Yorùbá question for /chat', async () => {
    const fixture = TestBed.createComponent(LandingPage);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('h1').length).toBe(1);
    const buttons = el.querySelectorAll<HTMLButtonElement>('.starters button');
    expect(buttons.length).toBe(STARTERS.length);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    buttons[1].click();
    expect(navigate).toHaveBeenCalledWith('/chat');
    expect(TestBed.inject(ChatStore).takeQueuedQuestion()).toBe(STARTERS[1].yo);
  });

  it('previews the CRM seed rows without calling any API', async () => {
    const fixture = TestBed.createComponent(LandingPage);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('#crm tbody tr').length).toBe(8);
    expect(fixture.nativeElement.querySelector('#crm .kpis strong').textContent).toBe('99');
    expect(fixture.nativeElement.querySelector('#crm').textContent).toContain('Showing 8 of 99 organizations');
  });
});

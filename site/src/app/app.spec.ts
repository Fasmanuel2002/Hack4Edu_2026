import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { Announcer } from './core/browser';

describe('App shell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('has a skip link and one polite live region', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('a.skip-link')?.getAttribute('href')).toBe('#main');
    expect(root.querySelectorAll('[aria-live]').length).toBe(1);
    expect(root.querySelector('[aria-live]')?.getAttribute('aria-live')).toBe('polite');
  });

  it('announces a message through the live region', async () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(Announcer).announce('Answer ready: Twins for Change (Gemma + RAG).');
    await fixture.whenStable();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[aria-live]')?.textContent).toContain(
      'Answer ready',
    );
  });
});

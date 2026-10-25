import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../core/config';
import { ChatStore } from '../core/chat-store';
import { TONE_MARKS } from '../core/yoruba';
import { Composer } from './composer';

function setup() {
  TestBed.configureTestingModule({
    imports: [Composer],
    providers: [{ provide: API_CONFIG, useValue: { apiBaseUrl: 'http://localhost:8000', useMock: true } }],
  });
  const fixture = TestBed.createComponent(Composer);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const textarea = root.querySelector('textarea') as HTMLTextAreaElement;
  const type = (value: string) => {
    textarea.value = value;
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  return { fixture, root, textarea, type };
}

function toneButton(root: HTMLElement, value: string): HTMLButtonElement {
  const index = TONE_MARKS.findIndex((mark) => mark.value === value);
  return root.querySelectorAll<HTMLButtonElement>('.tone')[index];
}

beforeEach(() => localStorage.clear());

describe('Composer tone mark bar', () => {
  it('inserts a letter with combining marks in the middle of a word and moves the caret after it', () => {
    const { root, textarea, type } = setup();
    const oHigh = TONE_MARKS[4].value; // o with dot below, high tone: two code units
    expect(oHigh.length).toBe(2);
    type('bla');
    textarea.focus();
    textarea.setSelectionRange(1, 1);

    toneButton(root, oHigh).click();

    expect(textarea.value).toBe(`b${oHigh}la`);
    expect(textarea.selectionStart).toBe(1 + oHigh.length);
    expect(textarea.selectionEnd).toBe(1 + oHigh.length);
    expect(document.activeElement).toBe(textarea);
  });

  it('replaces selected text', () => {
    const { root, textarea, type } = setup();
    const s = TONE_MARKS[6].value;
    type('xxo');
    textarea.setSelectionRange(0, 2);

    toneButton(root, s).click();

    expect(textarea.value).toBe(`${s}o`);
    expect(textarea.selectionStart).toBe(s.length);
  });

  it('is hidden until the Tone marks button opens it', () => {
    const { fixture, root } = setup();
    const bar = root.querySelector('[role="toolbar"]') as HTMLElement;
    const toggle = root.querySelector('[aria-controls="tone-bar"]') as HTMLButtonElement;
    expect(bar.hidden).toBe(true);
    toggle.click();
    fixture.detectChanges();
    expect(bar.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('Composer chips', () => {
  it('toggles compare mode with the Compare chip, named "Compare with plain Gemma"', () => {
    const { fixture, root } = setup();
    const store = TestBed.inject(ChatStore);
    const chip = [...root.querySelectorAll<HTMLButtonElement>('button.chip')].find((b) =>
      b.textContent?.includes('Compare'),
    ) as HTMLButtonElement;
    expect(chip.textContent?.replace(/\s+/g, ' ').trim()).toBe('Compare with plain Gemma');
    expect(chip.getAttribute('aria-pressed')).toBe('false');
    chip.click();
    fixture.detectChanges();
    expect(store.compare()).toBe(true);
    expect(chip.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('Composer sending', () => {
  it('sends with Enter, adds nothing for Shift + Enter, and disables Send when empty', () => {
    const { fixture, root, textarea, type } = setup();
    const store = TestBed.inject(ChatStore);
    const ask = vi.spyOn(store, 'ask');
    const send = root.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(send.disabled).toBe(true);

    type('What is 24 / 2?');
    expect(send.disabled).toBe(false);
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));
    expect(ask).not.toHaveBeenCalled();

    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(ask).toHaveBeenCalledWith('What is 24 / 2?', []);
    expect(textarea.value).toBe('');
  });

  it('rejects unsupported and oversized files with a message', () => {
    const { fixture, root } = setup();
    const component = fixture.componentInstance;
    const big = new File(['x'], 'notes.pdf');
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });

    component.addFiles([new File(['x'], 'tool.exe'), big, new File(['hello'], 'notes.txt')]);
    fixture.detectChanges();

    const message = root.querySelector('[aria-live="polite"]')?.textContent ?? '';
    expect(message).toContain('tool.exe was not added');
    expect(message).toContain('notes.pdf was not added');
    expect(root.querySelectorAll('.file').length).toBe(1);
    expect(root.textContent).toContain('Attachments are not sent');
  });
});

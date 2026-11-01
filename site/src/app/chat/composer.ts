import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { ApiService } from '../core/api.service';
import { API_CONFIG } from '../core/config';
import { ChatStore } from '../core/chat-store';
import { formatSize } from '../core/format';
import { TONE_MARKS, insertAtCursor, looksYoruba } from '../core/yoruba';
import { Icon } from '../shared/icon';

/** The types the backend can read (POST /upload/file). */
export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt'];
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_HEIGHT_PX = 200;

interface PendingFile {
  readonly id: number;
  readonly name: string;
  readonly size: number;
  readonly file: File;
  /** The session the file was uploaded to; null until it is uploaded. */
  readonly session: string | null;
  readonly status: 'ready' | 'uploading' | 'error';
  readonly error?: string;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

@Component({
  selector: 'app-composer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './composer.html',
  styleUrl: './composer.css',
  host: {
    '(window:dragenter)': 'onDragEnter($event)',
    '(window:dragover)': 'onDragOver($event)',
    '(window:dragleave)': 'onDragLeave($event)',
    '(window:drop)': 'onDrop($event)',
  },
})
export class Composer {
  protected readonly store = inject(ChatStore);
  private readonly api = inject(ApiService);
  protected readonly marks = TONE_MARKS;
  /** ẹ́ (e with dot below and high tone), shown on the tone bar toggle. */
  protected readonly toneGlyph = '\u1EB9\u0301';
  protected readonly accept = ACCEPTED_EXTENSIONS.join(',');
  protected readonly formatSize = formatSize;
  /** The extension badge of a file chip, for example "pdf". */
  protected readonly extOf = (name: string) => extensionOf(name).slice(1);

  protected readonly text = signal('');
  protected readonly files = signal<readonly PendingFile[]>([]);
  /** Closed by default so the starter cards stay visible; one click opens it. */
  protected readonly toneBarOpen = signal(false);
  protected readonly toneIndex = signal(0);
  protected readonly message = signal('');
  protected readonly dragging = signal(false);
  protected readonly uploading = computed(() => this.files().some((f) => f.status === 'uploading'));
  protected readonly canSend = computed(() => this.text().trim().length > 0);
  protected readonly yoruba = computed(() => looksYoruba(this.text()));

  private readonly input = viewChild.required<ElementRef<HTMLTextAreaElement>>('input');
  private readonly toneKeys = viewChildren<ElementRef<HTMLButtonElement>>('toneKey');
  private dragDepth = 0;
  private nextFileId = 0;
  private readonly mock = inject(API_CONFIG).useMock;
  protected readonly mockMode = this.mock;

  focus(): void {
    this.input().nativeElement.focus();
  }

  protected onInput(): void {
    this.text.set(this.input().nativeElement.value);
    this.resize();
  }

  /** Enter sends; Shift + Enter adds a new line (that key combination never reaches here). */
  protected onEnter(event: Event): void {
    if ((event as KeyboardEvent).isComposing) {
      return;
    }
    event.preventDefault();
    void this.send();
  }

  /** The round button: Send, or Stop while an answer is on its way. */
  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (this.store.generating()) {
      this.store.stop();
    } else {
      void this.send();
    }
  }

  /** Uploads the attached files to this chat's session, then asks. A failed upload stops the send. */
  private async send(): Promise<void> {
    if (!this.canSend() || this.store.generating() || this.uploading()) {
      return;
    }
    const sessionId = this.store.sessionId();
    for (const file of this.files().filter((f) => f.session !== sessionId)) {
      this.setFile(file.id, { status: 'uploading', error: undefined });
      this.message.set(`Uploading ${file.name}…`);
      try {
        await this.api.upload(file.file, sessionId);
        this.setFile(file.id, { status: 'ready', session: sessionId });
      } catch (error) {
        const reason = error instanceof Error ? error.message : `${file.name} was not uploaded.`;
        this.setFile(file.id, { status: 'error', error: reason });
        this.message.set(`${reason} The question was not sent. Remove the file or try again.`);
        return;
      }
    }
    const attachments = this.files().map(({ name, size }) => ({
      name,
      size,
      ...(this.mock ? { demo: true } : {}),
    }));
    this.store.ask(this.text(), attachments);
    this.setText('');
    this.files.set([]);
    this.message.set(
      attachments.length
        ? this.mock
          ? 'Question sent. Demo data: the files were not uploaded.'
          : `Question sent with ${attachments.length === 1 ? '1 file' : `${attachments.length} files`}.`
        : '',
    );
  }

  /** Inserts a tone-marked character (letter plus combining marks) at the cursor. */
  protected insert(value: string, index: number): void {
    const element = this.input().nativeElement;
    const result = insertAtCursor(
      element.value,
      element.selectionStart ?? element.value.length,
      element.selectionEnd ?? element.value.length,
      value,
    );
    this.setText(result.value);
    element.focus();
    element.setSelectionRange(result.caret, result.caret);
    this.toneIndex.set(index);
  }

  /** Arrow keys, Home and End move between the tone mark buttons (one tab stop for the bar). */
  protected onToneKeydown(event: KeyboardEvent): void {
    const count = this.marks.length;
    const moves: Record<string, number> = {
      ArrowRight: (this.toneIndex() + 1) % count,
      ArrowLeft: (this.toneIndex() - 1 + count) % count,
      Home: 0,
      End: count - 1,
    };
    const next = moves[event.key];
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    this.toneIndex.set(next);
    this.toneKeys()[next]?.nativeElement.focus();
  }

  protected onPick(event: Event): void {
    const picker = event.target as HTMLInputElement;
    this.addFiles(Array.from(picker.files ?? []));
    picker.value = '';
  }

  protected removeFile(file: PendingFile): void {
    this.files.update((list) => list.filter((f) => f.id !== file.id));
    this.message.set(`Removed ${file.name}.`);
    this.focus();
  }

  addFiles(list: readonly File[]): void {
    const notes: string[] = [];
    const added: PendingFile[] = [];
    for (const file of list) {
      const extension = extensionOf(file.name);
      if (!ACCEPTED_EXTENSIONS.includes(extension)) {
        notes.push(`${file.name} was not added: use PDF, DOCX or TXT files.`);
      } else if (file.size > MAX_FILE_BYTES) {
        notes.push(`${file.name} was not added: it is ${formatSize(file.size)}, and the limit is 10 MB.`);
      } else {
        added.push({
          id: ++this.nextFileId,
          name: file.name,
          size: file.size,
          file,
          session: null,
          status: 'ready',
        });
      }
    }
    if (added.length) {
      this.files.update((current) => [...current, ...added]);
      notes.push(
        `${added.length === 1 ? '1 file' : `${added.length} files`} attached. ${this.mock ? 'Demo data: files are not uploaded.' : 'They upload when you send.'}`,
      );
    }
    this.message.set(notes.join(' '));
  }

  protected onDragEnter(event: DragEvent): void {
    if (hasFiles(event)) {
      event.preventDefault();
      this.dragDepth++;
      this.dragging.set(true);
    }
  }

  protected onDragOver(event: DragEvent): void {
    if (hasFiles(event)) {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
    }
  }

  protected onDragLeave(event: DragEvent): void {
    if (hasFiles(event)) {
      this.dragDepth = Math.max(0, this.dragDepth - 1);
      this.dragging.set(this.dragDepth > 0);
    }
  }

  protected onDrop(event: DragEvent): void {
    if (hasFiles(event)) {
      event.preventDefault();
      this.dragDepth = 0;
      this.dragging.set(false);
      this.addFiles(Array.from(event.dataTransfer?.files ?? []));
    }
  }

  private setText(value: string): void {
    this.input().nativeElement.value = value;
    this.text.set(value);
    this.resize();
  }

  /** Grows with the text up to 200px, then scrolls inside. */
  private resize(): void {
    const element = this.input().nativeElement;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT_PX)}px`;
  }

  private setFile(id: number, change: Partial<PendingFile>): void {
    this.files.update((list) => list.map((f) => (f.id === id ? { ...f, ...change } : f)));
  }
}

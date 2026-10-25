import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChatStore } from '../core/chat-store';
import { API_CONFIG, isLocalApi } from '../core/config';
import { HealthService } from '../core/health.service';
import { looksYoruba } from '../core/yoruba';
import { Icon } from '../shared/icon';
import { Logo } from '../shared/logo';

const API_LABELS = {
  demo: 'Demo mode',
  checking: 'checking…',
  online: 'online',
  offline: 'offline',
} as const;

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Logo],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  readonly showClose = input(false);
  readonly closeRequest = output<void>();
  readonly newChatRequest = output<void>();
  /** A chat was opened from the history. */
  readonly picked = output<void>();

  protected readonly store = inject(ChatStore);
  protected readonly health = inject(HealthService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  protected readonly editingId = signal<string | null>(null);
  protected readonly confirmId = signal<string | null>(null);
  protected readonly local = isLocalApi(inject(API_CONFIG).apiBaseUrl);
  protected readonly apiLabel = computed(() => API_LABELS[this.health.status()]);
  protected readonly shortcut = /Mac|iPhone|iPad/.test(navigator.userAgent)
    ? '⌘ ⇧ O'
    : 'Ctrl ⇧ O';
  protected readonly looksYoruba = looksYoruba;

  protected open(id: string): void {
    this.store.select(id);
    this.picked.emit();
  }

  protected startRename(id: string): void {
    this.confirmId.set(null);
    this.editingId.set(id);
    this.focusLater(`rename-${id}`, true);
  }

  protected saveRename(id: string, title: string): void {
    this.store.rename(id, title);
    this.editingId.set(null);
    this.focusLater(`chat-${id}`);
  }

  protected cancelRename(id: string, event: Event): void {
    event.stopPropagation();
    this.editingId.set(null);
    this.focusLater(`chat-${id}`);
  }

  protected askDelete(id: string): void {
    this.editingId.set(null);
    this.confirmId.set(id);
    this.focusLater(`cancel-${id}`);
  }

  protected confirmDelete(id: string): void {
    this.store.remove(id);
    this.confirmId.set(null);
    this.focusLater('new-chat');
  }

  protected cancelDelete(id: string, event?: Event): void {
    event?.stopPropagation();
    this.confirmId.set(null);
    this.focusLater(`delete-${id}`);
  }

  private focusLater(id: string, select = false): void {
    afterNextRender(
      () => {
        const element = this.document.getElementById(id) as HTMLInputElement | null;
        element?.focus();
        if (select) {
          element?.select();
        }
      },
      { injector: this.injector },
    );
  }
}

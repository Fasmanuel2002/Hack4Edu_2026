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

/** The first line of the collapsed status row; the second names the model and the search. */
const SUMMARIES = {
  demo: 'Demo mode',
  checking: 'Checking API…',
  online: 'API online',
  offline: 'API offline',
} as const;

/** Accent-insensitive search key: tone marks and dots below are ignored only for matching. */
function searchKey(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Logo],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  /** Below 768px the sidebar is a drawer: its head button closes it instead of collapsing it. */
  readonly drawer = input(false);
  readonly hideRequest = output<void>();
  readonly newChatRequest = output<void>();
  /** A chat was opened from the history. */
  readonly picked = output<void>();

  protected readonly store = inject(ChatStore);
  protected readonly health = inject(HealthService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  protected readonly editingId = signal<string | null>(null);
  protected readonly confirmId = signal<string | null>(null);
  protected readonly query = signal('');
  /** The history filtered by title. Stored and displayed titles are never changed. */
  protected readonly groups = computed(() => {
    const query = searchKey(this.query().trim());
    const groups = this.store.groups();
    return query
      ? groups
          .map((group) => ({
            ...group,
            conversations: group.conversations.filter((c) => searchKey(c.title).includes(query)),
          }))
          .filter((group) => group.conversations.length > 0)
      : groups;
  });
  protected readonly local = isLocalApi(inject(API_CONFIG).apiBaseUrl);
  protected readonly apiLabel = computed(() => API_LABELS[this.health.status()]);
  protected readonly summary = computed(() => SUMMARIES[this.health.status()]);
  protected readonly shortcut = /Mac|iPhone|iPad/.test(navigator.userAgent)
    ? '⌘ ⇧ O'
    : 'Ctrl ⇧ O';
  protected readonly looksYoruba = looksYoruba;

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

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

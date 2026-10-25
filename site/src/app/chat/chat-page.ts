import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  afterRenderEffect,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MediaQueries } from '../core/browser';
import { ChatStore } from '../core/chat-store';
import { clockTime, formatSize, isoTime } from '../core/format';
import { HealthService } from '../core/health.service';
import { Turn } from '../core/models';
import { looksYoruba } from '../core/yoruba';
import { Icon } from '../shared/icon';
import { MenuButtonState, TopBar } from '../shared/top-bar';
import { Answer } from './answer';
import { Composer } from './composer';
import { Sidebar } from './sidebar';
import { StarterList } from './starter-list';
import { Welcome } from './welcome';

/** Within this distance of the bottom, the thread counts as "at the latest message". */
const PIN_DISTANCE = 32;
const UNSCROLL_KEYS = new Set(['ArrowUp', 'PageUp', 'Home']);

/** /chat: sidebar (a drawer below 768px), the thread or the welcome screen, and the composer. */
@Component({
  selector: 'app-chat-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TopBar, Sidebar, Welcome, StarterList, Answer, Composer, Icon],
  templateUrl: './chat-page.html',
  styleUrl: './chat-page.css',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class ChatPage {
  protected readonly store = inject(ChatStore);
  protected readonly media = inject(MediaQueries);
  protected readonly health = inject(HealthService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  /** Desktop: sidebar shown or collapsed. Mobile: drawer open or closed. */
  protected readonly sidebarOpen = signal(true);
  protected readonly drawerOpen = signal(false);
  protected readonly sidebarShown = computed(() =>
    this.media.mobile() ? this.drawerOpen() : this.sidebarOpen(),
  );
  protected readonly menu = computed<MenuButtonState>(() =>
    this.media.mobile()
      ? { label: 'Open sidebar', expanded: this.drawerOpen() }
      : { label: this.sidebarOpen() ? 'Hide sidebar' : 'Show sidebar', expanded: this.sidebarOpen() },
  );

  /** True while the view stays at the latest message and follows new text. */
  protected readonly pinned = signal(true);
  private readonly overflowing = signal(false);
  protected readonly showLatest = computed(
    () => !!this.store.active() && !this.pinned() && this.overflowing(),
  );

  protected readonly looksYoruba = looksYoruba;
  protected readonly clockTime = clockTime;
  protected readonly isoTime = isoTime;

  private readonly composer = viewChild.required(Composer);
  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');
  private readonly dock = viewChild.required<ElementRef<HTMLElement>>('dock');
  private readonly sidebar = viewChild.required<ElementRef<HTMLElement>>('sidebar');
  private lastConversation: string | null = null;
  private lastTurnCount = 0;
  private touchY = 0;
  /** Last time the reader scrolled up; re-pinning waits a moment after it. */
  private upIntentAt = 0;
  /** While a smooth scroll to the bottom runs, its intermediate positions must not unpin. */
  private settlingUntil = 0;

  constructor() {
    this.store.load();
    this.health.start();

    effect(() => {
      if (!this.media.mobile()) {
        this.drawerOpen.set(false);
      }
    });

    // Sending a question or opening a chat goes to the latest message; while pinned, the view
    // follows the answer as it is revealed. Scrolling up stops that (see unpin()).
    afterRenderEffect(() => {
      const conversation = this.store.active();
      this.store.reveals();
      const pinned = this.pinned();
      const scroller = this.scroller().nativeElement;
      if (!conversation) {
        if (this.lastConversation !== null) {
          scroller.scrollTop = 0;
        }
        this.lastConversation = null;
        this.lastTurnCount = 0;
        return;
      }
      const switched = conversation.id !== this.lastConversation;
      const sent = !switched && conversation.turns.length > this.lastTurnCount;
      this.lastConversation = conversation.id;
      this.lastTurnCount = conversation.turns.length;
      if (switched || sent) {
        this.pinned.set(true);
        this.toBottom();
      } else if (pinned) {
        this.toBottom();
      }
      this.measure();
    });

    // Keep the bottom in view when the composer or the thread changes size, and keep
    // scroll-padding equal to the docked composer so scrollIntoView never hides content behind it.
    afterNextRender(() => {
      const scroller = this.scroller().nativeElement;
      const dock = this.dock().nativeElement;
      const observer = new ResizeObserver(() => {
        scroller.style.setProperty('--dock-height', `${dock.offsetHeight}px`);
        if (this.store.active() && this.pinned()) {
          this.toBottom();
        }
        this.measure();
      });
      observer.observe(dock);
      observer.observe(scroller);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected onScroll(): void {
    const scroller = this.scroller().nativeElement;
    const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    if (distance <= PIN_DISTANCE && performance.now() - this.upIntentAt > 300) {
      this.pinned.set(true);
    } else if (distance > 160 && performance.now() > this.settlingUntil) {
      // Scrollbar drags and other moves that are not wheel, touch, or keys.
      this.pinned.set(false);
    }
    this.measure();
  }

  protected onWheel(event: WheelEvent): void {
    if (event.deltaY < 0) {
      this.scrolledUp();
    }
  }

  protected onTouchStart(event: TouchEvent): void {
    this.touchY = event.touches[0]?.clientY ?? 0;
  }

  protected onTouchMove(event: TouchEvent): void {
    // A finger moving down scrolls the thread up, towards older messages.
    if ((event.touches[0]?.clientY ?? 0) > this.touchY + 4) {
      this.scrolledUp();
    }
  }

  protected onKeys(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const editing = target.closest('textarea, input, [contenteditable="true"]');
    if (!editing && UNSCROLL_KEYS.has(event.key)) {
      this.scrolledUp();
    }
  }

  /** The reader moved up. Only counts when the thread can actually scroll up. */
  private scrolledUp(): void {
    if (this.scroller().nativeElement.scrollTop > 0) {
      this.upIntentAt = performance.now();
      this.unpin();
    }
  }

  /** Stop following new text: the reader has moved up (or opened a sources drawer). */
  protected unpin(): void {
    if (this.store.active()) {
      this.settlingUntil = 0;
      this.pinned.set(false);
    }
  }

  protected scrollToLatest(): void {
    this.pinned.set(true);
    const smooth = !this.media.reducedMotion();
    this.settlingUntil = smooth ? performance.now() + 900 : 0;
    this.toBottom(smooth ? 'smooth' : 'auto');
    this.composer().focus();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'o') {
      event.preventDefault();
      this.newChat();
    } else if (event.key === 'Escape' && this.drawerOpen()) {
      event.preventDefault();
      this.closeDrawer(true);
    }
  }

  protected toggleMenu(): void {
    if (this.media.mobile()) {
      this.drawerOpen.set(true);
      this.afterRender(() =>
        this.sidebar().nativeElement.querySelector<HTMLElement>('button, a[href]')?.focus(),
      );
    } else {
      this.sidebarOpen.update((open) => !open);
    }
  }

  protected closeDrawer(restoreFocus: boolean): void {
    if (!this.drawerOpen()) {
      return;
    }
    this.drawerOpen.set(false);
    if (restoreFocus) {
      this.afterRender(() =>
        this.document.querySelector<HTMLElement>('button[aria-controls="sidebar"]')?.focus(),
      );
    }
  }

  protected newChat(): void {
    this.store.newChat();
    this.drawerOpen.set(false);
    this.afterRender(() => this.composer().focus());
  }

  protected onPicked(): void {
    if (this.media.mobile()) {
      this.drawerOpen.set(false);
      this.afterRender(() => this.composer().focus());
    }
  }

  protected askStarter(question: string): void {
    this.store.ask(question);
    this.afterRender(() => this.composer().focus());
  }

  protected attachmentNames(turn: Turn): string {
    return turn.attachments.map((a) => `${a.name} (${formatSize(a.size)})`).join(', ');
  }

  private toBottom(behavior: ScrollBehavior = 'auto'): void {
    const scroller = this.scroller().nativeElement;
    scroller.scrollTo({ top: scroller.scrollHeight, behavior });
  }

  private measure(): void {
    const scroller = this.scroller().nativeElement;
    this.overflowing.set(scroller.scrollHeight > scroller.clientHeight + PIN_DISTANCE);
  }

  private afterRender(action: () => void): void {
    afterNextRender(action, { injector: this.injector });
  }
}

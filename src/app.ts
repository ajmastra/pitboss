import { fadeIn } from './animations/effects';
import { EASE, play } from './animations/motion';
import type { Sfx } from './audio/sfx';
import type { Store } from './storage/store';
import { createHeader } from './ui/components/header';
import { h } from './ui/dom';
import { navigate, parseHash, type Route } from './ui/router';
import type { AppCtx, Screen } from './ui/types';

export type ScreenFactory = (ctx: AppCtx, params: string[]) => Screen;

/**
 * Top-level shell: header, route → screen mounting with transitions,
 * global keyboard routing and toasts.
 */
export class App {
  readonly ctx: AppCtx;
  private screen: Screen | null = null;
  private readonly main: HTMLElement;
  private readonly header: HTMLElement;
  private readonly toasts: HTMLElement;
  private navToken = 0;

  constructor(
    private readonly root: HTMLElement,
    store: Store,
    sfx: Sfx,
    private readonly routes: Record<string, ScreenFactory>,
  ) {
    this.ctx = {
      store,
      sfx,
      go: (path) => navigate(path),
      toast: (msg, tone) => this.toast(msg, tone),
    };
    this.header = createHeader(this.ctx).el;
    this.main = h('main', { id: 'main', class: 'app-main', tabindex: '-1' });
    this.toasts = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    root.append(this.header, this.main, this.toasts);

    window.addEventListener('hashchange', () => void this.route(parseHash()));
    window.addEventListener('keydown', (e) => this.onKey(e));
    void this.route(parseHash());
  }

  private async route(route: Route): Promise<void> {
    const token = ++this.navToken;
    const factory = this.routes[route.name] ?? this.routes.menu;
    if (!factory) return;
    const old = this.screen;
    if (old) {
      old.destroy?.();
      this.screen = null;
      await play(old.el, [{ opacity: 1 }, { opacity: 0, transform: 'translateY(-6px)' }], {
        duration: 120,
        easing: EASE.in,
        fill: 'forwards',
      });
      if (token !== this.navToken) return;
    }
    const screen = factory(this.ctx, route.params);
    this.screen = screen;
    this.root.classList.toggle('is-immersive', screen.immersive === true);
    this.main.replaceChildren(screen.el);
    document.title = screen.title ? `${screen.title} · Pitboss` : 'Pitboss · Hi-Lo Trainer';
    window.scrollTo(0, 0);
    screen.mounted?.();
    void fadeIn(screen.el, 280, 8);
    if (old) this.main.focus({ preventScroll: true });
  }

  private onKey(e: KeyboardEvent): void {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    const typing =
      target?.tagName === 'INPUT' || target?.tagName === 'SELECT' || target?.tagName === 'TEXTAREA';
    if (!typing && this.screen?.onKey?.(e)) {
      e.preventDefault();
      return;
    }
    if (e.key === 'Escape' && parseHash().name !== 'menu') {
      e.preventDefault();
      this.ctx.go('');
    }
  }

  toast(message: string, tone: 'info' | 'gold' = 'info'): void {
    const t = h('div', { class: `toast toast-${tone}` }, message);
    this.toasts.append(t);
    void play(
      t,
      [
        { opacity: 0, transform: 'translateY(16px) scale(0.96)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
      ],
      { duration: 320, easing: EASE.spring },
      'fade-in',
    );
    setTimeout(() => {
      void play(t, [{ opacity: 1 }, { opacity: 0, transform: 'translateY(-8px)' }], {
        duration: 260,
        fill: 'forwards',
      }).then(() => t.remove());
    }, 2600);
  }
}

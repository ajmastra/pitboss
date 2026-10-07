import type { Sfx } from '../audio/sfx';
import type { Store } from '../storage/store';

export interface AppCtx {
  store: Store;
  sfx: Sfx;
  go(path: string): void;
  /** Show a toast message. */
  toast(message: string, tone?: 'info' | 'gold'): void;
}

export interface Screen {
  el: HTMLElement;
  /** Document title suffix. */
  title: string;
  /** Hide chrome (header) for focused play. */
  immersive?: boolean;
  /** Called after the element is attached. */
  mounted?(): void;
  destroy?(): void;
  /** Return true if the key was handled. */
  onKey?(e: KeyboardEvent): boolean;
}

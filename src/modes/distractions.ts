import { flashIn } from '../animations/deal';
import { play } from '../animations/motion';
import { isUnlocked, levelFromXp } from '../logic/progression';
import { RANKS, SUITS, hiLo, makeCard } from '../logic/cards';
import { createCard } from '../ui/components/card';
import { h } from '../ui/dom';
import type { DrillApi } from './drill';

const CHATTER = [
  'Insurance, anyone?',
  'Cocktails?',
  'Hit me!',
  'Nice hand!',
  'Color up?',
  'Dealer busts!',
  'Shuffle soon?',
  'Same again?',
  'Push.',
  'Blackjack!',
];

export interface Distractions {
  /** Called once per dealt card/group. */
  onCard(ms: number): void;
  /** Net Hi-Lo value of peripheral extra cards since the last call. */
  adjust(): number;
  destroy(): void;
}

/**
 * Advanced mode (unlocked at level 5): table chatter, a jittery view,
 * chip noise, and peripheral "extra" cards that still count.
 */
export function createDistractions(
  api: DrillApi,
  stage: HTMLElement,
  opts: { extraCards: boolean },
): Distractions {
  const level = levelFromXp(api.ctx.store.get().xp).level;
  const active = api.settings.distractions && isUnlocked('feature:distractions', level);
  let pending = 0;
  const layer = h('div', { class: 'distract-layer', 'aria-hidden': 'true' });
  if (active) stage.append(layer);

  return {
    onCard(ms) {
      if (!active) return;
      const r = api.rng.next();
      if (opts.extraCards && r < 0.12) {
        const card = makeCard(api.rng.pick(RANKS), api.rng.pick(SUITS));
        pending += hiLo(card);
        const el = createCard(card);
        el.classList.add('sm', 'extra-card');
        el.style.left = `${api.rng.pick([4, 76])}%`;
        el.style.top = `${api.rng.int(8, 60)}%`;
        layer.append(el);
        void flashIn(el, 160, api.rng.range(-15, 15));
        setTimeout(
          () => {
            void play(
              el,
              [{ opacity: 1 }, { opacity: 0 }],
              { duration: 200, fill: 'forwards' },
              'fade-out',
            ).then(() => el.remove());
          },
          Math.max(450, ms * 1.4),
        );
      } else if (r < 0.3) {
        const bubble = h('span', { class: 'chatter' }, api.rng.pick(CHATTER));
        bubble.style.left = `${api.rng.int(6, 60)}%`;
        bubble.style.top = `${api.rng.int(6, 80)}%`;
        layer.append(bubble);
        void play(
          bubble,
          [
            { opacity: 0, transform: 'translateY(8px) scale(0.9)' },
            { opacity: 1, transform: 'translateY(0) scale(1)', offset: 0.15 },
            { opacity: 1, offset: 0.8 },
            { opacity: 0, transform: 'translateY(-10px)' },
          ],
          { duration: 1400, fill: 'forwards' },
          'fade-out',
        ).then(() => bubble.remove());
        api.ctx.sfx.play('click');
      } else if (r < 0.4) {
        void play(
          stage,
          [
            { transform: 'translate(0,0)' },
            { transform: 'translate(3px,-2px) rotate(0.4deg)' },
            { transform: 'translate(-3px,2px) rotate(-0.4deg)' },
            { transform: 'translate(0,0)' },
          ],
          { duration: 260 },
        );
        api.ctx.sfx.play('tick');
      }
    },
    adjust() {
      const v = pending;
      pending = 0;
      return v;
    },
    destroy() {
      layer.remove();
    },
  };
}

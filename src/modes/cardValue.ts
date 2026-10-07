import { dealIn, flashIn } from '../animations/deal';
import { play } from '../animations/motion';
import {
  RANKS,
  SUITS,
  cardLabel,
  formatSigned,
  hiLo,
  makeCard,
  type Card,
  type HiLo,
} from '../logic/cards';
import { msPerCard } from '../logic/difficulty';
import { createCard } from '../ui/components/card';
import { h } from '../ui/dom';
import type { AppCtx, Screen } from '../ui/types';
import { drillScreen, runLoop, type DrillApi, type ModeController } from './drill';

const CHOICES: { value: HiLo; label: string; tone: string; keys: string[] }[] = [
  { value: -1, label: '−1', tone: 'neg', keys: ['ArrowLeft', '1', '-', '_'] },
  { value: 0, label: '0', tone: 'zero', keys: ['ArrowDown', '2', '0'] },
  { value: 1, label: '+1', tone: 'pos', keys: ['ArrowRight', '3', '+', '='] },
];

/** Skill 1: tag each card's Hi-Lo value before its timer runs out. */
function build(api: DrillApi): ModeController {
  const shoe = h(
    'div',
    { class: 'mini-shoe', 'aria-hidden': 'true' },
    createCard(null, { faceUp: false }),
  );
  const slot = h('div', { class: 'card-slot' });
  const ring = h('div', { class: 'card-timer' }, h('div', { class: 'card-timer-fill' }));
  const ringFill = ring.firstElementChild as HTMLElement;
  const stage = h('div', { class: 'stage stage-values' }, shoe, slot, ring);

  const buttons = CHOICES.map((c) =>
    h(
      'button',
      {
        class: `answer-btn tone-${c.tone}`,
        type: 'button',
        'aria-label': `${c.label === '−1' ? 'Minus one' : c.label === '+1' ? 'Plus one' : 'Zero'} (${c.keys[0]?.replace('Arrow', '')} arrow)`,
        onclick: () => choose(c.value),
      },
      h('span', { class: 'num' }, c.label),
    ),
  );
  const controls = h('div', { class: 'answer-row' }, ...buttons);

  let current: { card: Card; el: HTMLElement; resolve: (v: HiLo | null) => void } | null = null;
  let last: Card | null = null;
  let timerAnim: Animation | null = null;

  function choose(v: HiLo) {
    if (!current) return;
    const btn = buttons[CHOICES.findIndex((c) => c.value === v)];
    if (btn)
      void play(btn, [{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 160 });
    current.resolve(v);
  }

  function nextCard(): Card {
    // Avoid exact repeats back-to-back; slightly favour each value equally
    // so 0-cards (only 3 of 13 ranks) appear often enough to learn.
    const group = api.rng.pick([1, 0, -1, 1, -1, 0] as const);
    const ranks = RANKS.filter((r) => hiLo({ rank: r }) === group);
    let card: Card;
    do card = makeCard(api.rng.pick(ranks), api.rng.pick(SUITS));
    while (last && card.rank === last.rank && card.suit === last.suit);
    last = card;
    return card;
  }

  async function loop() {
    while (!api.timeUp()) {
      const card = nextCard();
      const ms = msPerCard(api.difficulty().cps);
      const el = createCard(card, { faceUp: ms > 700 ? false : true });
      el.classList.add('lg');
      slot.replaceChildren(el);
      api.ctx.sfx.play('deal');
      if (ms > 700)
        void dealIn(el, { from: shoe, rotate: api.rng.range(-3, 3), flip: true, duration: 380 });
      else void flashIn(el, ms * 0.35, api.rng.range(-3, 3));
      if (api.settings.srMode) api.status(cardLabel(card));

      const window = ms + (ms > 700 ? 380 : 0);
      timerAnim?.cancel();
      timerAnim = ringFill.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], {
        duration: window,
        easing: 'linear',
        fill: 'forwards',
      });

      const answer = await new Promise<HiLo | null>((resolve) => {
        current = { card, el, resolve };
        api.wait(window).then(
          () => resolve(null),
          () => resolve(null),
        );
      });
      current = null;
      timerAnim.pause();
      if (api.signal.aborted) return;

      const expected = hiLo(card);
      const correct = answer === expected;
      const chip = h(
        'span',
        { class: `value-chip tone-${expected === 1 ? 'pos' : expected === -1 ? 'neg' : 'zero'}` },
        formatSigned(expected),
      );
      el.append(chip);
      void play(
        chip,
        [
          { opacity: 0, transform: 'translate(-50%, 8px) scale(0.7)' },
          { opacity: 1, transform: 'translate(-50%, 0) scale(1)' },
        ],
        { duration: 220, easing: 'cubic-bezier(0.34,1.56,0.64,1)', fill: 'backwards' },
        'fade-in',
      );
      api.answer(correct, {
        anchor: slot,
        say: correct ? undefined : `${cardLabel(card)} is ${formatSigned(expected)}`,
      });
      if (!correct)
        api.status(
          answer === null
            ? `Too slow — ${card.rank} is ${formatSigned(expected)}`
            : `${card.rank} is ${formatSigned(expected)}`,
          'neg',
        );
      else api.status('');
      await api.wait(correct ? Math.min(260, ms * 0.3) : 900);
      void play(
        el,
        [
          { opacity: 1, transform: el.style.transform },
          { opacity: 0, transform: `${el.style.transform} translateX(-40px) rotate(-8deg)` },
        ],
        { duration: 160, fill: 'forwards' },
        'fade-out',
      );
      await api.wait(90);
    }
    api.finish();
  }

  return {
    stage,
    controls,
    start() {
      runLoop(loop());
    },
    onKey(e) {
      const c = CHOICES.find((x) => x.keys.includes(e.key));
      if (c && current) {
        choose(c.value);
        return true;
      }
      return Boolean(c);
    },
    destroy() {
      timerAnim?.cancel();
    },
  };
}

export function cardValueScreen(ctx: AppCtx): Screen {
  return drillScreen(ctx, {
    mode: 'values',
    title: 'Card Values',
    roundMs: 45_000,
    initialCps: 0.5,
    howTo:
      'A card appears. Tag its Hi-Lo value before the bar runs out: 2–6 are +1, 7–9 are 0, 10–A are −1.',
    keys: '← −1   ↓ 0   → +1   (or 1 · 2 · 3)',
    build,
  });
}

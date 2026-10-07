import { flashIn } from '../animations/deal';
import { fadeIn } from '../animations/effects';
import { play } from '../animations/motion';
import { pop } from '../animations/pop';
import { cardLabel, formatSigned, type Card } from '../logic/cards';
import { exactTrueCount, runningCount, trueCount, type TcRounding } from '../logic/count';
import { msPerCard } from '../logic/difficulty';
import { Shoe } from '../logic/shoe';
import { createCard } from '../ui/components/card';
import { createNumpad } from '../ui/components/numpad';
import { announce, h, s } from '../ui/dom';
import type { AppCtx, Screen } from '../ui/types';
import { drillScreen, runLoop, type DrillApi, type ModeController } from './drill';

const ROUNDING_NOTE: Record<TcRounding, string> = {
  truncate: 'rounded toward zero',
  floor: 'rounded down',
  round: 'rounded to nearest',
};

/**
 * A side-on discard tray: a stack of card edges whose height shows how many
 * decks have been played, with a tick per deck so it can be read at a glance.
 */
export function discardTray(totalDecks: number, discarded: number): SVGSVGElement {
  const H = 220;
  const W = 92;
  const top = 10;
  const inner = H - top - 10;
  const perDeck = inner / totalDecks;
  const fillH = discarded * perDeck;
  const edges: SVGElement[] = [];
  for (let y = 0; y < fillH; y += 3) {
    edges.push(
      s('line', { x1: 14, x2: W - 26, y1: H - 10 - y, y2: H - 10 - y, class: 'tray-edge' }),
    );
  }
  const ticks: SVGElement[] = [];
  for (let d = 0; d <= totalDecks; d++) {
    const y = H - 10 - d * perDeck;
    ticks.push(s('line', { x1: W - 22, x2: W - 14, y1: y, y2: y, class: 'tray-tick' }));
    if (d > 0)
      ticks.push(
        s('text', { x: W - 4, y: y + 4, 'text-anchor': 'end', class: 'tray-label' }, String(d)),
      );
  }
  return s(
    'svg',
    {
      viewBox: `0 0 ${W} ${H}`,
      class: 'tray',
      role: 'img',
      'aria-label': `Discard tray: ${discarded} of ${totalDecks} decks played`,
    },
    s('rect', { x: 8, y: top, width: W - 28, height: inner + 4, rx: 6, class: 'tray-box' }),
    s('rect', {
      x: 12,
      y: H - 10 - fillH,
      width: W - 36,
      height: fillH,
      rx: 2,
      class: 'tray-fill',
    }),
    ...edges,
    ...ticks,
  );
}

interface Question {
  decks: number;
  remaining: number;
  rc0: number;
  flash: Card[];
}

function build(api: DrillApi): ModeController {
  const trayHost = h('div', { class: 'tc-tray' });
  const trayCaption = h('p', { class: 'tc-caption' });
  const rcValue = h('span', { class: 'tc-rc-value num' });
  const rcLabel = h('span', { class: 'tc-rc-label' }, 'Running count');
  const rcBox = h('div', { class: 'tc-rc' }, rcLabel, rcValue);
  const flashSlot = h('div', { class: 'tc-flash', 'aria-hidden': 'true' });
  const promptLabel = h('p', { class: 'prompt-label' }, 'True count?');
  const numpad = createNumpad({ onSubmit: (v) => resolveAnswer?.(v) });
  const math = h('p', { class: 'tc-math num' });
  const cont = h(
    'button',
    { class: 'btn btn-primary', type: 'button', hidden: true, onclick: () => resolveContinue?.() },
    'Continue',
  );
  const right = h(
    'div',
    { class: 'tc-main' },
    rcBox,
    flashSlot,
    promptLabel,
    numpad.display,
    math,
    cont,
  );
  const stage = h(
    'div',
    { class: 'stage stage-tc' },
    h('div', { class: 'tc-side' }, trayHost, trayCaption),
    right,
  );

  let resolveAnswer: ((v: number) => void) | null = null;
  let resolveContinue: (() => void) | null = null;
  let asked = 0;

  function makeQuestion(): Question {
    const decks = api.rng.pick([6, 6, 6, 8, 2]);
    const steps = decks * 2 - 1; // 0.5 … decks − 0.5
    const remaining = api.rng.int(1, steps) / 2;
    const target = api.rng.range(-4, 7);
    let rc0 = Math.round(target * remaining);
    if (rc0 === 0) rc0 = api.rng.pick([2, 3, -2, 4]);
    const streak = api.score().streak;
    const combined = asked >= 3 && streak >= 3 && api.rng.chance(0.4);
    let flash: Card[] = [];
    if (combined) {
      const shoe = new Shoe({ decks: 1, rng: api.rng });
      flash = shoe.drawMany(api.rng.int(4, 7));
    }
    return { decks, remaining, rc0, flash };
  }

  async function loop() {
    while (!api.timeUp()) {
      const q = makeQuestion();
      asked++;
      const rounding = api.settings.tcRounding;
      const combined = q.flash.length > 0;
      const hint = api.score().streak < 4 || asked <= 3;

      trayHost.replaceChildren(discardTray(q.decks, q.decks - q.remaining));
      trayCaption.textContent = hint
        ? `${q.remaining} deck${q.remaining === 1 ? '' : 's'} left`
        : `${q.decks}-deck shoe`;
      rcValue.textContent = formatSigned(q.rc0);
      rcValue.dataset.tone = q.rc0 > 0 ? 'pos' : 'neg';
      rcLabel.textContent = combined ? 'Count so far' : 'Running count';
      math.textContent = '';
      cont.hidden = true;
      numpad.reset();
      numpad.setEnabled(false);
      promptLabel.textContent = combined ? 'Watch, update, convert' : 'True count?';
      void fadeIn(stage, 200, 6);
      api.setSpeedLabel(combined ? `${api.difficulty().cps.toFixed(1)}/s` : null);

      if (combined) {
        await api.wait(900);
        for (const c of q.flash) {
          const el = createCard(c);
          el.classList.add('sm');
          flashSlot.replaceChildren(el);
          void flashIn(el, 120, api.rng.range(-5, 5));
          api.ctx.sfx.play('deal');
          if (api.settings.srMode) announce(cardLabel(c));
          await api.wait(msPerCard(api.difficulty().cps));
        }
        flashSlot.replaceChildren();
        promptLabel.textContent = 'True count?';
      }

      const rc = q.rc0 + runningCount(q.flash);
      const expected = trueCount(rc, q.remaining, rounding);
      numpad.setEnabled(true);
      announce(
        `Running count ${formatSigned(q.rc0)}. ${hint ? `${q.remaining} decks left.` : ''} True count?`,
      );
      const given = await new Promise<number>((resolve) => {
        resolveAnswer = resolve;
        api.signal.addEventListener('abort', () => resolve(NaN), { once: true });
      });
      resolveAnswer = null;
      numpad.setEnabled(false);
      if (api.signal.aborted) return;

      const correct = given === expected;
      const exact = exactTrueCount(rc, q.remaining);
      const mathText = `${combined ? `${formatSigned(q.rc0)} ${runningCount(q.flash) >= 0 ? '+' : '−'} ${Math.abs(runningCount(q.flash))} = ${formatSigned(rc)} · ` : ''}${formatSigned(rc)} ÷ ${q.remaining} = ${exact
        .toFixed(2)
        .replace(/\.?0+$/, '')
        .replace('-', '−')} → ${formatSigned(expected)}`;
      api.answer(correct, {
        base: combined ? 30 : 15,
        anchor: numpad.display,
        adapt: combined,
        say: correct ? 'Correct' : `True count was ${formatSigned(expected)}`,
      });
      math.textContent = mathText;
      math.dataset.tone = correct ? 'pos' : 'neg';
      if (correct) {
        void pop(numpad.display, expected > 0 ? 'pos' : expected < 0 ? 'neg' : 'zero');
        await api.wait(900);
      } else {
        api.status(`True count ${formatSigned(expected)} (${ROUNDING_NOTE[rounding]})`, 'neg');
        cont.hidden = false;
        requestAnimationFrame(() => cont.focus({ preventScroll: true }));
        await api.review(new Promise<void>((r) => (resolveContinue = r)));
        resolveContinue = null;
        api.status('');
      }
      await play(
        stage,
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 140, fill: 'forwards' },
        'fade-out',
      );
      stage.getAnimations().forEach((a) => a.cancel());
    }
    api.finish();
  }

  return {
    stage,
    controls: numpad.el,
    start() {
      runLoop(loop());
    },
    onKey(e) {
      if (resolveContinue && (e.key === 'Enter' || e.key === ' ')) {
        resolveContinue();
        return true;
      }
      return numpad.handleKey(e);
    },
  };
}

export function trueCountScreen(ctx: AppCtx): Screen {
  const rounding = ctx.store.get().settings.tcRounding;
  return drillScreen(ctx, {
    mode: 'true',
    title: 'True Count',
    roundMs: 60_000,
    initialCps: 1.5,
    howTo: `True count = running count ÷ decks left, ${ROUNDING_NOTE[rounding]}. Estimate decks left from the discard tray, as you would at a real table. Later rounds flash a few cards first, so update the count before you convert.`,
    keys: 'Type the true count · − for negative · Enter to submit',
    build,
  });
}

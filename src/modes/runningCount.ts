import { fadeIn } from '../animations/effects';
import { flashIn } from '../animations/deal';
import { play } from '../animations/motion';
import { pop } from '../animations/pop';
import { cardLabel, formatSigned, hiLo, type Card } from '../logic/cards';
import { hasCancellingPair, runningCount } from '../logic/count';
import { clampCps, msPerCard } from '../logic/difficulty';
import { dailySeed, utcDateKey } from '../logic/rng';
import { Shoe } from '../logic/shoe';
import { summarize } from '../logic/stats';
import { createCard } from '../ui/components/card';
import { createNumpad } from '../ui/components/numpad';
import { announce, h } from '../ui/dom';
import type { AppCtx, Screen } from '../ui/types';
import { drillScreen, runLoop, type DrillApi, type ModeController } from './drill';
import { createDistractions } from './distractions';

type FlashKind = 'running' | 'pairs' | 'deck' | 'daily';

const DAILY_CHECKPOINTS = [13, 26, 39, 52];

/** Fixed, gently rising pace so every daily attempt is comparable. */
export function dailyCps(cardIndex: number): number {
  return clampCps(Math.min(3, 1.1 + 0.1 * Math.floor(cardIndex / 4)));
}

function formatSec(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function toneOf(v: number): 'pos' | 'neg' | 'zero' {
  return v > 0 ? 'pos' : v < 0 ? 'neg' : 'zero';
}

/**
 * Shared engine for every "cards flash by, then name the count" drill.
 */
function buildFlash(api: DrillApi, kind: FlashKind): ModeController {
  const progressText = h('span', { class: 'flash-progress num' });
  const progressFill = h('span', { class: 'flash-progress-fill' });
  const progress = h(
    'div',
    { class: 'flash-progress-wrap', 'aria-hidden': 'true' },
    progressText,
    h('span', { class: 'flash-progress-track' }, progressFill),
  );
  const pile = h('div', { class: 'pile', 'aria-hidden': 'true' });
  const promptLabel = h('p', { class: 'prompt-label' });
  const promptHint = h('p', { class: 'prompt-hint' });
  const numpad = createNumpad({ onSubmit: (v) => resolveAnswer?.(v) });
  const prompt = h(
    'div',
    { class: 'prompt', hidden: true },
    promptLabel,
    numpad.display,
    promptHint,
  );
  const review = h('div', { class: 'review', hidden: true });
  const stage = h(
    'div',
    { class: `stage stage-flash flash-${kind}` },
    progress,
    pile,
    prompt,
    review,
  );
  const distractions = createDistractions(api, stage, {
    extraCards: kind === 'running' || kind === 'pairs',
  });

  let resolveAnswer: ((v: number) => void) | null = null;
  let resolveContinue: (() => void) | null = null;
  let shoe = new Shoe({ decks: kind === 'deck' || kind === 'daily' ? 1 : 2, rng: api.rng });

  // Full-deck bookkeeping
  let dealMs = 0;
  let checkpointsOk = 0;
  let checkpointsTotal = 0;
  let cleanDeckMs: number | undefined;

  const ensureShoe = (need: number) => {
    if (shoe.remaining < need) shoe = new Shoe({ decks: 2, rng: api.rng });
  };

  function setProgress(done: number, total: number, label: string) {
    progressText.textContent = label;
    progressFill.style.transform = `scaleX(${total ? done / total : 0})`;
  }

  /** Put a group of cards on the pile (singles stack; groups lay side by side). */
  function show(group: Card[], ms: number) {
    const els = group.map((c) => {
      const el = createCard(c);
      el.classList.add(group.length > 1 ? 'md' : 'lg');
      return el;
    });
    if (group.length > 1) {
      pile.replaceChildren(h('div', { class: 'pile-group' }, ...els));
      els.forEach((el, i) => {
        void flashIn(el, ms * 0.3, api.rng.range(-3, 3) + (i - (els.length - 1) / 2) * 3);
      });
    } else {
      const el = els[0] as HTMLElement;
      el.style.setProperty('--ox', `${api.rng.range(-10, 10)}px`);
      el.style.setProperty('--oy', `${api.rng.range(-8, 8)}px`);
      el.classList.add('pile-card');
      pile.append(el);
      while (pile.children.length > 4) pile.firstElementChild?.remove();
      void flashIn(el, ms * 0.3, api.rng.range(-7, 7));
    }
    api.ctx.sfx.play('deal');
    if (api.settings.srMode) announce(group.map(cardLabel).join(', '));
  }

  function clearPile() {
    const kids = [...pile.children] as HTMLElement[];
    if (!kids.length) return;
    void Promise.all(
      kids.map((k) =>
        play(
          k,
          [{ opacity: 1 }, { opacity: 0, transform: 'translateY(-12px) scale(0.96)' }],
          { duration: 160, fill: 'forwards' },
          'fade-out',
        ),
      ),
    ).then(() => kids.forEach((k) => k.remove()));
  }

  async function ask(label: string, hint: string): Promise<number> {
    promptLabel.textContent = label;
    promptHint.textContent = hint;
    numpad.reset();
    prompt.hidden = false;
    review.hidden = true;
    void fadeIn(prompt, 220, 8);
    numpad.setEnabled(true);
    announce(label);
    const v = await new Promise<number>((resolve) => {
      resolveAnswer = resolve;
      api.signal.addEventListener('abort', () => resolve(NaN), { once: true });
    });
    resolveAnswer = null;
    numpad.setEnabled(false);
    return v;
  }

  /** Show the cards with their values and a running total, then wait. */
  async function showReview(groups: Card[][], start: number, expected: number, given: number) {
    let total = start;
    const items = groups.map((g) => {
      const net = runningCount(g);
      total += net;
      const cancels = g.length > 1 && hasCancellingPair(g);
      return h(
        'div',
        { class: `rv-item${cancels ? ' has-cancel' : ''}` },
        h(
          'div',
          { class: 'rv-cards' },
          ...g.map((c) => {
            const v = hiLo(c);
            return h(
              'span',
              { class: `rv-card tone-${toneOf(v)}` },
              h('b', null, c.rank),
              h('i', { class: 'num' }, formatSigned(v)),
            );
          }),
        ),
        h('span', { class: `rv-total num tone-${toneOf(total)}` }, formatSigned(total)),
      );
    });
    const cont = h(
      'button',
      { class: 'btn btn-primary', type: 'button', onclick: () => resolveContinue?.() },
      'Continue',
    );
    review.replaceChildren(
      ...[
        h(
          'p',
          { class: 'rv-head' },
          'Count was ',
          h('b', { class: `num tone-${toneOf(expected)}` }, formatSigned(expected)),
          ' · you said ',
          h('b', { class: 'num' }, formatSigned(given)),
        ),
        start !== 0 ? h('p', { class: 'rv-sub' }, `Starting from ${formatSigned(start)}`) : null,
        h('div', { class: 'rv-list' }, ...items),
        cont,
      ].filter((x) => x !== null),
    );
    prompt.hidden = true;
    review.hidden = false;
    void fadeIn(review, 220, 8);
    requestAnimationFrame(() => cont.focus({ preventScroll: true }));
    const done = new Promise<void>((r) => (resolveContinue = r));
    await api.review(done);
    resolveContinue = null;
    review.hidden = true;
  }

  async function celebrate(expected: number) {
    promptLabel.textContent = 'Correct';
    promptHint.textContent = '';
    void pop(numpad.display, toneOf(expected), 1.25);
    await api.wait(520);
    prompt.hidden = true;
  }

  // ---- Running / pairs: short bursts, count from zero each time ----
  async function burstLoop() {
    const pairs = kind === 'pairs';
    while (!api.timeUp()) {
      const { cps } = api.difficulty();
      const streak = api.score().streak;
      let groups: Card[][];
      if (pairs) {
        const size = cps >= 2.2 ? 3 : cps >= 1.6 ? api.rng.pick([2, 3]) : 2;
        const count = Math.min(8, 3 + Math.floor(streak / 3) + api.rng.int(0, 1));
        ensureShoe(size * count);
        groups = Array.from({ length: count }, () => shoe.drawMany(size));
      } else {
        const n = Math.min(14, 4 + Math.floor(streak / 2) + api.rng.int(0, 2));
        ensureShoe(n);
        groups = shoe.drawMany(n).map((c) => [c]);
      }
      const cards = groups.flat();
      prompt.hidden = true;
      numpad.setEnabled(false);
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i] as Card[];
        const ms = msPerCard(api.difficulty().cps) * g.length;
        setProgress(
          i + 1,
          groups.length,
          pairs ? `Group ${i + 1} of ${groups.length}` : `Card ${i + 1} of ${groups.length}`,
        );
        show(g, ms);
        distractions.onCard(ms);
        await api.wait(ms);
      }
      clearPile();
      const expected = runningCount(cards) + distractions.adjust();
      const given = await ask(
        'Running count?',
        pairs ? 'Tip: +1/−1 pairs cancel. Count what’s left.' : `${cards.length} cards`,
      );
      if (api.signal.aborted) return;
      const correct = given === expected;
      api.answer(correct, {
        base: 6 + cards.length * 2,
        anchor: numpad.display,
        say: correct ? 'Correct' : `The count was ${formatSigned(expected)}`,
      });
      if (correct) await celebrate(expected);
      else await showReview(groups, 0, expected, given);
      setProgress(0, 1, '');
    }
    api.finish();
  }

  // ---- Full deck / daily: one deck, checkpoints, final count ----
  async function deckLoop() {
    const daily = kind === 'daily';
    const cards = shoe.drawMany(52);
    const checkpoints = daily ? DAILY_CHECKPOINTS : [api.rng.int(12, 22), api.rng.int(28, 40), 52];
    let segmentStart = 0;
    let startCount = 0;
    dealMs = 0;
    checkpointsOk = 0;
    checkpointsTotal = 0;
    for (let i = 0; i < 52; i++) {
      const card = cards[i] as Card;
      const cps = daily ? dailyCps(i) : api.difficulty().cps;
      const ms = msPerCard(cps);
      setProgress(i + 1, 52, `${i + 1} / 52`);
      if (daily) api.setSpeedLabel(`${cps.toFixed(1)}/s`);
      show([card], ms);
      distractions.onCard(ms);
      await api.wait(ms);
      dealMs += ms;
      if (checkpoints.includes(i + 1)) {
        clearPile();
        const segment = cards.slice(segmentStart, i + 1);
        const expected = runningCount(cards.slice(0, i + 1));
        const final = i === 51;
        const given = await ask(
          final ? 'Final count?' : `Count after ${i + 1} cards?`,
          final ? 'A full deck always nets to zero.' : 'Keep going after this.',
        );
        if (api.signal.aborted) return;
        const correct = given === expected;
        checkpointsTotal++;
        if (correct) checkpointsOk++;
        api.answer(correct, { base: daily ? 25 : 20, anchor: numpad.display, adapt: !daily });
        if (correct) await celebrate(expected);
        else
          await showReview(
            segment.map((c) => [c]),
            startCount,
            expected,
            given,
          );
        segmentStart = i + 1;
        startCount = expected;
      }
    }
    if (checkpointsOk === checkpointsTotal) cleanDeckMs = Math.round(dealMs);
    api.finish();
  }

  return {
    stage,
    controls: numpad.el,
    start() {
      numpad.setEnabled(false);
      runLoop(kind === 'deck' || kind === 'daily' ? deckLoop() : burstLoop());
    },
    onKey(e) {
      if (resolveContinue && (e.key === 'Enter' || e.key === ' ')) {
        resolveContinue();
        return true;
      }
      return numpad.handleKey(e);
    },
    destroy() {
      distractions.destroy();
    },
    session() {
      return cleanDeckMs !== undefined ? { cleanDeckMs } : {};
    },
    results() {
      if (kind !== 'deck' && kind !== 'daily') return null;
      const clean = cleanDeckMs !== undefined;
      return h(
        'div',
        { class: 'res-sub' },
        h(
          'div',
          { class: 'res-row' },
          h('span', null, 'Checkpoints'),
          h('span', { class: 'num' }, `${checkpointsOk}/${checkpointsTotal}`),
        ),
        h(
          'div',
          { class: 'res-row' },
          h('span', null, 'Deck time'),
          h('span', { class: 'num' }, formatSec(dealMs)),
        ),
        h(
          'div',
          { class: 'res-row' },
          h('span', null, 'Clean deck'),
          h(
            'span',
            { class: 'num', 'data-tone': clean ? 'pos' : 'neg' },
            clean ? 'Yes' : 'Not yet',
          ),
        ),
      );
    },
  };
}

export function runningScreen(ctx: AppCtx): Screen {
  return drillScreen(ctx, {
    mode: 'running',
    title: 'Running Count',
    roundMs: 60_000,
    initialCps: 1,
    howTo:
      'Cards flash by one at a time. Keep a running total of their Hi-Lo values, then enter it.',
    keys: 'Type the count · − for negative · Enter to submit',
    build: (api) => buildFlash(api, 'running'),
  });
}

export function pairsScreen(ctx: AppCtx): Screen {
  return drillScreen(ctx, {
    mode: 'pairs',
    title: 'Pairs & Chunks',
    roundMs: 60_000,
    initialCps: 1.2,
    howTo:
      'Cards arrive in twos and threes. A +1 and a −1 cancel out, so skip them and count only what’s left. Pros count in chunks like this.',
    keys: 'Type the count · − for negative · Enter to submit',
    build: (api) => buildFlash(api, 'pairs'),
  });
}

export function deckScreen(ctx: AppCtx): Screen {
  return drillScreen(ctx, {
    mode: 'deck',
    title: 'Full Deck',
    roundMs: null,
    initialCps: 1,
    howTo:
      'Count all 52 cards. You’ll be checked twice on the way, and a full deck always ends on 0. Get every checkpoint right for a clean deck.',
    keys: 'Type the count · − for negative · Enter to submit',
    build: (api) => buildFlash(api, 'deck'),
  });
}

export function dailyScreen(ctx: AppCtx): Screen {
  const today = utcDateKey();
  const alreadyPlayed = () => Boolean(ctx.store.get().daily[today]);
  const playedAtStart = alreadyPlayed();
  const best = summarize(ctx.store.get().sessions.filter((s) => s.mode === 'daily'));
  return drillScreen(ctx, {
    mode: 'daily',
    title: 'Daily Deck',
    roundMs: null,
    adaptive: false,
    seed: dailySeed(),
    howTo: playedAtStart
      ? 'You’ve played today’s deck. This replay is practice and won’t change your score. A new deck arrives at midnight UTC.'
      : `Everyone gets today’s same 52 cards at the same rising pace. Four checkpoints, one scored attempt.${best.sessions ? ` Your daily best: ${best.byMode.daily?.bestScore ?? 0}.` : ''}`,
    keys: 'Type the count · − for negative · Enter to submit',
    unscored: alreadyPlayed,
    build: (api) => buildFlash(api, 'daily'),
    onRecorded(rec, c) {
      c.store.update((d) => {
        d.daily[today] = {
          score: rec.score,
          correct: rec.correct,
          total: rec.total,
          ...(rec.cleanDeckMs !== undefined ? { cleanDeckMs: rec.cleanDeckMs } : {}),
        };
      });
    },
  });
}

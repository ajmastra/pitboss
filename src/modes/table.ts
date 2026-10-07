import { dealIn } from '../animations/deal';
import { EASE, play } from '../animations/motion';
import { flip } from '../animations/flip';
import { pop } from '../animations/pop';
import { riffle } from '../animations/shuffle';
import { sweep } from '../animations/sweep';
import { cardLabel, formatSigned, type Rank } from '../logic/cards';
import { estimateDecksRemaining, trueCount } from '../logic/count';
import { msPerCard } from '../logic/difficulty';
import { Shoe } from '../logic/shoe';
import {
  countThrough,
  handTotal,
  planQuiz,
  playRound,
  type Outcome,
  type TableEvent,
} from '../logic/table';
import { createCard, markFaceUp } from '../ui/components/card';
import { createNumpad } from '../ui/components/numpad';
import { announce, h } from '../ui/dom';
import type { AppCtx, Screen } from '../ui/types';
import { drillScreen, runLoop, type DrillApi, type ModeController } from './drill';
import { discardTray } from './trueCount';

const DECKS = 6;

const OUTCOME_LABEL: Record<Outcome, string> = {
  blackjack: 'Blackjack',
  win: 'Win',
  push: 'Push',
  lose: 'Lose',
  bust: 'Bust',
};

interface HandView {
  root: HTMLElement;
  cards: HTMLElement;
  total: HTMLElement;
  badge: HTMLElement;
}

function handView(label: string, cls: string): HandView {
  const cards = h('div', { class: 'hand-cards' });
  const total = h('span', { class: 'hand-total num', 'aria-hidden': 'true' });
  const badge = h('span', { class: 'hand-badge', hidden: true });
  const root = h(
    'div',
    { class: `hand ${cls}`, role: 'group', 'aria-label': label },
    cards,
    h('div', { class: 'hand-meta' }, total, badge),
  );
  return { root, cards, total, badge };
}

function build(api: DrillApi): ModeController {
  const seatCount = Math.max(1, Math.min(5, api.settings.tableSeats));
  const shoeEl = h(
    'div',
    { class: 'table-shoe', 'aria-hidden': 'true' },
    createCard(null, { faceUp: false }),
  );
  const trayHost = h('div', { class: 'table-tray', 'aria-hidden': 'true' });
  const dealer = handView('Dealer', 'hand-dealer');
  const seats = Array.from({ length: seatCount }, (_, i) => handView(`Seat ${i + 1}`, 'hand-seat'));
  const seatRow = h('div', { class: `seat-row seats-${seatCount}` }, ...seats.map((s) => s.root));
  const shuffleHost = h('div', { class: 'table-shuffle' });
  const felt = h(
    'div',
    { class: 'felt' },
    h(
      'div',
      { class: 'felt-arc', 'aria-hidden': 'true' },
      h('span', null, 'Blackjack pays 3 to 2'),
      h('small', null, 'Dealer stands on all 17s'),
    ),
    trayHost,
    shoeEl,
    dealer.root,
    seatRow,
    shuffleHost,
  );

  // Quiz sheet
  const quizLabel = h('p', { class: 'prompt-label' });
  const quizHint = h('p', { class: 'prompt-hint' });
  const quizTray = h('div', { class: 'quiz-tray' });
  const numpad = createNumpad({ onSubmit: (v) => resolveAnswer?.(v) });
  const quizResult = h('p', { class: 'quiz-result num' });
  const sheet = h(
    'div',
    { class: 'quiz-sheet', hidden: true, role: 'dialog', 'aria-label': 'Count check' },
    h(
      'div',
      { class: 'quiz-head' },
      quizTray,
      h('div', { class: 'quiz-q' }, quizLabel, numpad.display, quizHint, quizResult),
    ),
    numpad.el,
  );
  const stage = h('div', { class: 'stage stage-table' }, felt, sheet);

  let shoe = new Shoe({ decks: DECKS, rng: api.rng, penetration: 0.72 });
  let resolveAnswer: ((v: number) => void) | null = null;
  let roundsSinceQuiz = 1;

  const updateTray = (dealtBeforeRound: number) => {
    trayHost.replaceChildren(discardTray(DECKS, Math.round((dealtBeforeRound / 52) * 2) / 2));
  };

  function target(e: TableEvent & { kind: 'deal' | 'reveal' }): HandView {
    return e.to === 'dealer' ? dealer : (seats[e.to] as HandView);
  }

  function setTotal(view: HandView, cards: { rank: Rank }[]) {
    const t = handTotal(cards);
    view.total.textContent =
      t.soft && t.total < 21 ? `${t.total - 10}/${t.total}` : String(t.total);
  }

  async function quiz(rc: number, cardsRemaining: number, dealtSoFar: number): Promise<void> {
    const askTrue = shoe.dealt > 52 && api.rng.chance(0.35);
    const decksLeft = estimateDecksRemaining(cardsRemaining);
    const expected = askTrue ? trueCount(rc, decksLeft, api.settings.tcRounding) : rc;
    quizLabel.textContent = askTrue ? 'True count?' : 'Running count?';
    quizHint.textContent = askTrue
      ? `≈ ${decksLeft} decks left in the shoe`
      : 'Everything seen since the shuffle';
    quizTray.replaceChildren(
      askTrue ? discardTray(DECKS, Math.round((dealtSoFar / 52) * 2) / 2) : '',
    );
    quizTray.hidden = !askTrue;
    quizResult.textContent = '';
    numpad.reset();
    sheet.hidden = false;
    api.ctx.sfx.play('tick');
    await play(
      sheet,
      [
        { transform: 'translateY(100%)', opacity: 0.6 },
        { transform: 'translateY(0)', opacity: 1 },
      ],
      { duration: 300, easing: EASE.out },
      'fade-in',
    );
    numpad.setEnabled(true);
    announce(`Pause. ${quizLabel.textContent}`, true);
    const given = await new Promise<number>((resolve) => {
      resolveAnswer = resolve;
      api.signal.addEventListener('abort', () => resolve(NaN), { once: true });
    });
    resolveAnswer = null;
    numpad.setEnabled(false);
    if (api.signal.aborted) return;
    const correct = given === expected;
    api.answer(correct, {
      base: askTrue ? 35 : 25,
      anchor: numpad.display,
      say: correct ? 'Correct' : `It was ${formatSigned(expected)}`,
    });
    quizResult.textContent = correct
      ? 'Correct'
      : askTrue
        ? `It was ${formatSigned(expected)} (RC ${formatSigned(rc)} ÷ ${decksLeft})`
        : `It was ${formatSigned(expected)}`;
    quizResult.dataset.tone = correct ? 'pos' : 'neg';
    if (correct) void pop(numpad.display, 'pos');
    // Hold the sheet briefly with the round clock frozen.
    await api.review(new Promise(() => undefined), correct ? 750 : 1900);
    await play(
      sheet,
      [{ transform: 'translateY(0)' }, { transform: 'translateY(100%)', opacity: 0 }],
      { duration: 220, easing: EASE.in, fill: 'forwards' },
      'fade-out',
    );
    sheet.hidden = true;
    sheet.getAnimations().forEach((a) => a.cancel());
    roundsSinceQuiz = 0;
  }

  async function newShoe() {
    api.status('Shuffling a fresh shoe — count resets to 0', 'zero');
    api.ctx.sfx.play('shuffle');
    announce('New shoe. The count resets to zero.');
    await riffle(shuffleHost, 2);
    shoe = new Shoe({ decks: DECKS, rng: api.rng, penetration: 0.72 });
    updateTray(0);
    api.status('');
  }

  async function loop() {
    updateTray(0);
    while (!api.timeUp()) {
      if (shoe.pastCut) await newShoe();
      const startRc = shoe.runningCount;
      const dealtBefore = shoe.dealt;
      const script = playRound(() => shoe.draw(), seatCount);
      const quizAt = planQuiz(api.rng, script.events, roundsSinceQuiz);
      roundsSinceQuiz++;
      const handCards = new Map<HandView, { rank: Rank }[]>();
      let drawn = 0;

      for (let i = 0; i <= script.events.length; i++) {
        if (i === quizAt) {
          await quiz(
            countThrough(script.events, i, startRc),
            shoe.cards.length - dealtBefore - drawn,
            dealtBefore + drawn,
          );
        }
        const e = script.events[i];
        if (!e) break;
        const ms = msPerCard(api.difficulty().cps);
        if (e.kind === 'deal') {
          drawn++;
          const view = target(e);
          const el = createCard(e.card, { faceUp: false });
          el.classList.add('tcard');
          el.style.setProperty('--i', String(e.index));
          view.cards.append(el);
          view.cards.style.setProperty('--n', String(view.cards.children.length));
          api.ctx.sfx.play('deal');
          void dealIn(el, {
            from: shoeEl,
            rotate: api.rng.range(-3, 3),
            flip: e.faceUp,
            duration: Math.min(420, ms * 0.9),
          }).then(() => {
            if (e.faceUp) markFaceUp(el, e.card);
          });
          if (e.faceUp) {
            const list = handCards.get(view) ?? [];
            list.push(e.card);
            handCards.set(view, list);
            setTotal(view, list);
            if (api.settings.srMode)
              announce(
                `${e.to === 'dealer' ? 'Dealer' : `Seat ${e.to + 1}`}: ${cardLabel(e.card)}`,
              );
          }
          await api.wait(ms);
        } else if (e.kind === 'reveal') {
          const el = dealer.cards.children[e.index] as HTMLElement | undefined;
          if (el) {
            api.ctx.sfx.play('flip');
            void flip(el, true, Math.min(420, ms));
            markFaceUp(el, e.card);
          }
          const list = handCards.get(dealer) ?? [];
          list.push(e.card);
          handCards.set(dealer, list);
          setTotal(dealer, list);
          if (api.settings.srMode) announce(`Dealer reveals ${cardLabel(e.card)}`);
          await api.wait(ms);
        } else {
          const view = seats[e.seat] as HandView;
          view.badge.textContent = OUTCOME_LABEL[e.outcome];
          view.badge.dataset.outcome = e.outcome;
          view.badge.hidden = false;
          void play(
            view.badge,
            [
              { opacity: 0, transform: 'scale(0.6)' },
              { opacity: 1, transform: 'scale(1)' },
            ],
            { duration: 260, easing: EASE.spring },
            'fade-in',
          );
        }
      }
      if (api.signal.aborted) return;
      await api.wait(Math.max(500, msPerCard(api.difficulty().cps)));
      const all = [dealer, ...seats].flatMap((v) => [...v.cards.children] as HTMLElement[]);
      for (const v of [dealer, ...seats]) {
        v.badge.hidden = true;
        v.total.textContent = '';
      }
      await sweep(all, trayHost, 480);
      for (const v of [dealer, ...seats]) v.cards.style.removeProperty('--n');
      updateTray(shoe.dealt);
      await api.wait(200);
    }
    api.finish();
  }

  return {
    stage,
    controls: undefined,
    start() {
      numpad.setEnabled(false);
      runLoop(loop());
    },
    onKey(e) {
      return numpad.handleKey(e);
    },
  };
}

export function tableScreen(ctx: AppCtx): Screen {
  return drillScreen(ctx, {
    mode: 'table',
    title: 'Table Play',
    roundMs: 90_000,
    initialCps: 1,
    howTo:
      'A six-deck game at full pace. Keep the running count as cards hit the felt, including the dealer’s hole card when it flips. The game pauses at random to check your count.',
    keys: 'When asked: type the count · − for negative · Enter',
    build,
  });
}

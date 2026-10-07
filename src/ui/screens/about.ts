import { RANKS, makeCard, hiLo, formatSigned } from '../../logic/cards';
import { createCard } from '../components/card';
import { h } from '../dom';
import type { Screen } from '../types';
import { pageHead } from './page';

export function aboutScreen(): Screen {
  const group = (
    ranks: readonly (typeof RANKS)[number][],
    tone: string,
    value: string,
    label: string,
  ) =>
    h(
      'div',
      { class: `guide-group tone-${tone}` },
      h(
        'div',
        { class: 'guide-cards' },
        ...ranks.map((r) =>
          createCard(makeCard(r, r === 'A' || r === '7' || r === '3' ? 'S' : 'H'), {}),
        ),
      ),
      h('p', { class: 'guide-value num' }, value),
      h('p', { class: 'guide-label' }, label),
    );
  const low = RANKS.filter((r) => hiLo({ rank: r }) === 1);
  const mid = RANKS.filter((r) => hiLo({ rank: r }) === 0);
  const high = RANKS.filter((r) => hiLo({ rank: r }) === -1);

  const el = h(
    'div',
    { class: 'screen page about' },
    pageHead('Hi-Lo, in two minutes'),
    h(
      'section',
      { class: 'panel prose' },
      h('h2', null, 'Why counting works'),
      h(
        'p',
        null,
        'Blackjack is dealt from a shoe that isn’t reshuffled after every hand. When lots of small cards have already been dealt, the remaining cards are rich in tens and aces. That helps the player: more blackjacks (paid 3 to 2), more dealer busts, and better doubles. Card counting is a simple way to track that balance.',
      ),
    ),
    h(
      'section',
      { class: 'panel prose' },
      h('h2', null, '1 · Tag every card'),
      h(
        'div',
        { class: 'guide' },
        group(low, 'pos', formatSigned(1), 'Low cards: 2–6'),
        group(mid, 'zero', '0', 'Neutral: 7–9'),
        group(high, 'neg', formatSigned(-1), 'High cards: 10–A'),
      ),
      h(
        'p',
        null,
        'There are five low ranks and five high ranks, so a complete deck always adds up to exactly zero. Full Deck mode uses that as its benchmark.',
      ),
    ),
    h(
      'section',
      { class: 'panel prose' },
      h('h2', null, '2 · Keep a running count'),
      h(
        'p',
        null,
        'Start at 0 after the shuffle and add each card’s tag as it’s exposed, including the dealer’s hole card when it flips. Say it in your head, not out loud.',
      ),
      h(
        'p',
        { class: 'example num' },
        '5 (+1) · K (−1) · 3 (+1) · 9 (0) · 6 (+1) → ',
        h('b', { class: 'tone-pos' }, '+2'),
      ),
      h(
        'p',
        null,
        'To speed up, count in pairs: a low and a high card cancel, so skip them and only count what’s left.',
      ),
    ),
    h(
      'section',
      { class: 'panel prose' },
      h('h2', null, '3 · Convert to a true count'),
      h(
        'p',
        null,
        'A +6 means much more with one deck left than with five. Divide the running count by the decks still in the shoe, which you can estimate from the discard tray.',
      ),
      h(
        'p',
        { class: 'example num' },
        '+6 running ÷ 2 decks left = ',
        h('b', { class: 'tone-pos' }, '+3 true'),
      ),
      h(
        'p',
        null,
        'The higher the true count, the more the remaining cards favour the player. Counters raise their bets as the true count rises and bet the minimum when it’s low or negative. Pitboss trains the counting itself; it doesn’t teach betting systems.',
      ),
    ),
    h(
      'section',
      { class: 'panel prose' },
      h('h2', null, 'Keyboard'),
      h(
        'ul',
        { class: 'keys-list' },
        h(
          'li',
          null,
          h('kbd', null, '1'),
          '–',
          h('kbd', null, '6'),
          ' open a mode from the menu, ',
          h('kbd', null, 'D'),
          ' the Daily Deck',
        ),
        h(
          'li',
          null,
          h('kbd', null, '←'),
          ' ',
          h('kbd', null, '↓'),
          ' ',
          h('kbd', null, '→'),
          ' tag −1 / 0 / +1 in Card Values',
        ),
        h(
          'li',
          null,
          'Digits, ',
          h('kbd', null, '−'),
          ' and ',
          h('kbd', null, 'Enter'),
          ' to enter a count',
        ),
        h(
          'li',
          null,
          h('kbd', null, 'Enter'),
          ' or ',
          h('kbd', null, 'R'),
          ' to play again, ',
          h('kbd', null, 'Esc'),
          ' to quit, ',
          h('kbd', null, '?'),
          ' for shortcuts',
        ),
      ),
    ),
    h(
      'section',
      { class: 'panel prose notice' },
      h('h2', null, 'Fine print'),
      h(
        'p',
        null,
        'Pitboss is an educational tool, not gambling advice. Counting cards with your own head is legal, but casinos are private businesses and may refuse service, limit bets, or ask counters to leave. Gambling involves risk of loss. Play responsibly.',
      ),
      h(
        'p',
        null,
        'Everything runs in your browser. Progress is stored locally on this device. No accounts, no analytics, no tracking.',
      ),
    ),
  );
  el.querySelectorAll('.guide .card').forEach((c) => c.classList.add('sm'));
  return { el, title: 'About' };
}

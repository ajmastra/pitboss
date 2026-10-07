import { dealIn } from '../../animations/deal';
import { flip } from '../../animations/flip';
import { pop } from '../../animations/pop';
import { burst, streakBreak } from '../../animations/effects';
import { riffle } from '../../animations/shuffle';
import { sweep } from '../../animations/sweep';
import { RANKS, SUITS, makeCard } from '../../logic/cards';
import { createRng } from '../../logic/rng';
import { createBackPreview, createCard } from '../components/card';
import { h } from '../dom';
import type { AppCtx, Screen } from '../types';

/** Dev-only playground for card art and animations. */
export function labScreen(ctx: AppCtx): Screen {
  const rng = createRng();
  const shoe = h('div', { class: 'lab-shoe' }, createCard(null, { faceUp: false }));
  const row = h('div', { class: 'lab-row' });
  const tray = h('div', { class: 'lab-tray' }, 'Discard');
  const counter = h('div', { class: 'lab-count num' }, h('span', { class: 'pulse' }), '0');
  const meter = h('div', { class: 'lab-meter' }, 'x3 Combo');
  const shuffleHost = h('div', { class: 'lab-shuffle' });

  const allFaces = h(
    'div',
    { class: 'lab-grid' },
    ...SUITS.flatMap((s) => RANKS.map((r) => createCard(makeCard(r, s)))),
  );
  allFaces.querySelectorAll('.card').forEach((c) => c.classList.add('sm'));

  const backs = h(
    'div',
    { class: 'lab-grid' },
    ...['back:classic', 'back:deco', 'back:wave', 'back:sunburst', 'back:monogram'].map((b) =>
      createBackPreview(b),
    ),
  );

  const btn = (label: string, fn: () => void) =>
    h('button', { class: 'btn', type: 'button', onclick: fn }, label);

  const el = h(
    'div',
    { class: 'screen lab' },
    h('h1', null, 'Animation lab'),
    h(
      'div',
      { class: 'lab-controls' },
      btn('Deal', () => {
        const c = createCard(makeCard(rng.pick(RANKS), rng.pick(SUITS)), { faceUp: false });
        row.append(c);
        ctx.sfx.play('deal');
        void dealIn(c, {
          from: shoe,
          rotate: rng.range(-4, 4),
          offsetY: rng.range(-6, 6),
          flip: true,
        });
      }),
      btn('Flip last', () => {
        const c = row.lastElementChild as HTMLElement | null;
        if (c) void flip(c, c.classList.contains('is-down'));
      }),
      btn('Sweep', () => void sweep([...row.children] as HTMLElement[], tray)),
      btn('Shuffle', () => {
        ctx.sfx.play('shuffle');
        void riffle(shuffleHost);
      }),
      btn('Pop +', () => void pop(counter, 'pos')),
      btn('Pop −', () => void pop(counter, 'neg')),
      btn('Spark', () => void burst(meter, 'spark')),
      btn('Break', () => void streakBreak(meter)),
    ),
    h('div', { class: 'lab-stage' }, shoe, row, tray),
    h('div', { class: 'lab-stage' }, counter, meter, shuffleHost),
    h('h2', null, 'Faces'),
    allFaces,
    h('h2', null, 'Backs'),
    backs,
  );
  return { el, title: 'Lab' };
}

import { cardLabel, isRed, type Card, type Rank, type Suit } from '../../logic/cards';
import { h, s } from '../dom';

/**
 * Cards are drawn entirely in SVG (viewBox 250×350). Each rank+suit face is
 * built once, cached, and cloned — no per-card parsing at deal time.
 */
const W = 250;
const H = 350;
const L = 86;
const C = 125;
const R = 164;

type Pip = [x: number, y: number];

const PIPS: Partial<Record<Rank, Pip[]>> = {
  '2': [
    [C, 88],
    [C, 262],
  ],
  '3': [
    [C, 88],
    [C, 175],
    [C, 262],
  ],
  '4': [
    [L, 88],
    [R, 88],
    [L, 262],
    [R, 262],
  ],
  '5': [
    [L, 88],
    [R, 88],
    [C, 175],
    [L, 262],
    [R, 262],
  ],
  '6': [
    [L, 88],
    [R, 88],
    [L, 175],
    [R, 175],
    [L, 262],
    [R, 262],
  ],
  '7': [
    [L, 88],
    [R, 88],
    [C, 131],
    [L, 175],
    [R, 175],
    [L, 262],
    [R, 262],
  ],
  '8': [
    [L, 88],
    [R, 88],
    [C, 131],
    [L, 175],
    [R, 175],
    [C, 219],
    [L, 262],
    [R, 262],
  ],
  '9': [
    [L, 88],
    [R, 88],
    [L, 146],
    [R, 146],
    [C, 175],
    [L, 204],
    [R, 204],
    [L, 262],
    [R, 262],
  ],
  '10': [
    [L, 88],
    [R, 88],
    [C, 117],
    [L, 146],
    [R, 146],
    [L, 204],
    [R, 204],
    [C, 233],
    [L, 262],
    [R, 262],
  ],
};

const PIP = 42;

function suitUse(suit: Suit, x: number, y: number, size: number, flip = false) {
  return s('use', {
    href: `#suit-${suit}`,
    x: x - size / 2,
    y: y - size / 2,
    width: size,
    height: size,
    transform: flip ? `rotate(180 ${x} ${y})` : undefined,
  });
}

function corner(rank: Rank) {
  const text = rank;
  return s(
    'g',
    { class: 'idx' },
    s(
      'text',
      {
        x: 31,
        y: 54,
        'text-anchor': 'middle',
        'font-size': text === '10' ? 40 : 46,
        'letter-spacing': text === '10' ? -3 : 0,
      },
      text,
    ),
  );
}

const CROWN: Partial<Record<Rank, string>> = {
  K: 'M93 132l8-34 16 18 8-24 8 24 16-18 8 34z M92 138h66v8H92z',
  Q: 'M96 138c3-20 13-30 29-38 16 8 26 18 29 38z M92 140h66v6H92z M125 88a6 6 0 1 1 0 .1z',
  J: 'M103 140l22-46 22 46-22-12z',
};

function courtArt(rank: Rank, suit: Suit) {
  const ornament = 'var(--court-gold, #a9822f)';
  return s(
    'g',
    null,
    s('rect', { x: 58, y: 66, width: 134, height: 218, rx: 10, class: 'court-panel' }),
    s('rect', {
      x: 64,
      y: 72,
      width: 122,
      height: 206,
      rx: 7,
      fill: 'none',
      stroke: ornament,
      'stroke-width': 1.5,
    }),
    s('path', { d: CROWN[rank] ?? '', fill: ornament }),
    s(
      'text',
      { x: W / 2, y: 228, 'text-anchor': 'middle', 'font-size': 92, class: 'court-letter' },
      rank,
    ),
    s('path', { d: 'M84 246h28M138 246h28', stroke: ornament, 'stroke-width': 1.5 }),
    suitUse(suit, W / 2, 248, 22),
  );
}

function aceArt(suit: Suit) {
  return s(
    'g',
    null,
    s('circle', {
      cx: W / 2,
      cy: H / 2,
      r: 70,
      fill: 'none',
      stroke: 'currentColor',
      'stroke-opacity': 0.15,
      'stroke-width': 2,
    }),
    suitUse(suit, W / 2, H / 2, 96),
  );
}

function buildFace(rank: Rank, suit: Suit): SVGSVGElement {
  const red = isRed(suit);
  const pips = PIPS[rank];
  const art =
    rank === 'A'
      ? aceArt(suit)
      : pips
        ? s('g', null, ...pips.map(([x, y]) => suitUse(suit, x, y, PIP, y > H / 2 + 1)))
        : courtArt(rank, suit);
  return s(
    'svg',
    {
      viewBox: `0 0 ${W} ${H}`,
      class: `face ${red ? 'red' : 'black'}`,
      'aria-hidden': 'true',
      focusable: 'false',
    },
    s('rect', { x: 0.5, y: 0.5, width: W - 1, height: H - 1, rx: 18, class: 'face-bg' }),
    s('g', null, corner(rank), suitUse(suit, 31, 82, 30)),
    s('g', { transform: `rotate(180 ${W / 2} ${H / 2})` }, corner(rank), suitUse(suit, 31, 82, 30)),
    art,
  );
}

function buildBack(design: string): SVGSVGElement {
  const id = design.replace('back:', '');
  const patternId =
    id === 'sunburst'
      ? null
      : `pat-${id === 'classic' || id === 'deco' || id === 'wave' || id === 'monogram' ? id : 'classic'}`;
  const inner = patternId
    ? s('rect', { x: 14, y: 14, width: W - 28, height: H - 28, rx: 10, fill: `url(#${patternId})` })
    : s(
        'g',
        null,
        s('rect', { x: 14, y: 14, width: W - 28, height: H - 28, rx: 10, fill: '#121212' }),
        ...Array.from({ length: 36 }, (_, i) => {
          const a = (i / 36) * Math.PI * 2;
          const x2 = W / 2 + Math.cos(a) * 260;
          const y2 = H / 2 + Math.sin(a) * 260;
          return s('line', {
            x1: W / 2,
            y1: H / 2,
            x2,
            y2,
            stroke: 'var(--accent-400)',
            'stroke-opacity': i % 2 ? 0.25 : 0.6,
            'stroke-width': i % 2 ? 1 : 2,
          });
        }),
      );
  const emblem =
    id === 'monogram'
      ? s(
          'g',
          null,
          s('circle', { cx: W / 2, cy: H / 2, r: 44, fill: '#0e3a2a' }),
          s('circle', {
            cx: W / 2,
            cy: H / 2,
            r: 38,
            fill: 'none',
            stroke: 'var(--accent-400)',
            'stroke-width': 2,
          }),
          s(
            'text',
            {
              x: W / 2,
              y: H / 2 + 14,
              'text-anchor': 'middle',
              'font-size': 40,
              class: 'monogram',
            },
            'CI',
          ),
        )
      : s(
          'g',
          null,
          s('rect', {
            x: W / 2 - 26,
            y: H / 2 - 26,
            width: 52,
            height: 52,
            transform: `rotate(45 ${W / 2} ${H / 2})`,
            fill: 'rgba(0,0,0,.35)',
            stroke: 'var(--accent-400)',
            'stroke-width': 2,
          }),
          s(
            'text',
            { x: W / 2, y: H / 2 + 9, 'text-anchor': 'middle', 'font-size': 26, class: 'monogram' },
            '±',
          ),
        );
  const clip = `clip-${id}`;
  return s(
    'svg',
    { viewBox: `0 0 ${W} ${H}`, class: 'back', 'aria-hidden': 'true', focusable: 'false' },
    s(
      'defs',
      null,
      s(
        'clipPath',
        { id: clip },
        s('rect', { x: 14, y: 14, width: W - 28, height: H - 28, rx: 10 }),
      ),
    ),
    s('rect', { x: 0.5, y: 0.5, width: W - 1, height: H - 1, rx: 18, fill: '#f8f4ea' }),
    s('g', { 'clip-path': `url(#${clip})` }, inner),
    s('rect', {
      x: 14,
      y: 14,
      width: W - 28,
      height: H - 28,
      rx: 10,
      fill: 'none',
      stroke: 'var(--accent-400)',
      'stroke-width': 3,
    }),
    s('rect', {
      x: 22,
      y: 22,
      width: W - 44,
      height: H - 44,
      rx: 6,
      fill: 'none',
      stroke: 'var(--accent-400)',
      'stroke-opacity': 0.5,
      'stroke-width': 1,
    }),
    emblem,
  );
}

const faceCache = new Map<string, SVGSVGElement>();
const backCache = new Map<string, SVGSVGElement>();

function face(rank: Rank, suit: Suit): SVGSVGElement {
  const key = rank + suit;
  let tpl = faceCache.get(key);
  if (!tpl) faceCache.set(key, (tpl = buildFace(rank, suit)));
  return tpl.cloneNode(true) as SVGSVGElement;
}

function back(design: string): SVGSVGElement {
  let tpl = backCache.get(design);
  if (!tpl) backCache.set(design, (tpl = buildBack(design)));
  return tpl.cloneNode(true) as SVGSVGElement;
}

let currentBack = 'back:classic';
export function setCardBack(design: string): void {
  currentBack = design;
}

export interface CardOptions {
  faceUp?: boolean;
  backDesign?: string;
  /** Show a Hi-Lo hint chip (learning aid). */
  label?: boolean;
}

/**
 * A card element: .card > .card-inner > (.card-front, .card-back).
 * Flipping animates .card-inner's rotateY; position animates .card.
 */
export function createCard(card: Card | null, opts: CardOptions = {}): HTMLDivElement {
  const faceUp = opts.faceUp ?? true;
  const front = card ? face(card.rank, card.suit) : null;
  const el = h(
    'div',
    {
      class: `card${faceUp ? '' : ' is-down'}`,
      role: 'img',
      'aria-label': card && faceUp ? cardLabel(card) : 'Face-down card',
      dataset: card ? { id: card.id } : undefined,
    },
    h(
      'div',
      { class: 'card-inner' },
      h('div', { class: 'card-face card-front' }, front),
      h('div', { class: 'card-face card-back' }, back(opts.backDesign ?? currentBack)),
    ),
  );
  return el;
}

/** Update label after a reveal. */
export function markFaceUp(el: HTMLElement, card: Card): void {
  el.classList.remove('is-down');
  el.setAttribute('aria-label', cardLabel(card));
}

/** Standalone back preview (unlock gallery). */
export function createBackPreview(design: string): HTMLDivElement {
  return h(
    'div',
    { class: 'card is-down card-static', role: 'img', 'aria-label': 'Card back design' },
    h('div', { class: 'card-inner' }, h('div', { class: 'card-face card-back' }, back(design))),
  );
}

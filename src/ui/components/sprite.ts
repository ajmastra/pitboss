import { s } from '../dom';

/**
 * One hidden SVG holding suit symbols and card-back patterns. Every card
 * references these via <use>, so faces stay tiny and cloning is cheap.
 */
const SUIT_PATHS: Record<string, string[]> = {
  H: [
    'M50 90C22 68 4 51 4 31 4 16 15 6 29 6c9 0 17 5 21 14 4-9 12-14 21-14 14 0 25 10 25 25 0 20-18 37-46 59z',
  ],
  D: ['M50 3C61 22 74 37 92 50 74 63 61 78 50 97 39 78 26 63 8 50 26 37 39 22 50 3z'],
  S: [
    'M50 4C60 22 96 38 96 62c0 14-10 23-22 23-9 0-16-4-20-11 1 10 5 17 13 23H33c8-6 12-13 13-23-4 7-11 11-20 11C14 85 4 76 4 62 4 38 40 22 50 4z',
  ],
};

let mounted = false;

export function mountSprite(): void {
  if (mounted) return;
  mounted = true;
  const symbols = Object.entries(SUIT_PATHS).map(([suit, paths]) =>
    s(
      'symbol',
      { id: `suit-${suit}`, viewBox: '0 0 100 100' },
      ...paths.map((d) => s('path', { d })),
    ),
  );
  symbols.push(
    s(
      'symbol',
      { id: 'suit-C', viewBox: '0 0 100 100' },
      s('circle', { cx: 50, cy: 28, r: 20 }),
      s('circle', { cx: 27, cy: 58, r: 20 }),
      s('circle', { cx: 73, cy: 58, r: 20 }),
      s('rect', { x: 40, y: 38, width: 20, height: 24 }),
      s('path', { d: 'M46 58c0 16-5 28-14 38h36c-9-10-14-22-14-38z' }),
    ),
  );

  const gold = 'var(--accent-400)';
  const patterns = [
    // Classic lattice
    s(
      'pattern',
      {
        id: 'pat-classic',
        width: 20,
        height: 20,
        patternUnits: 'userSpaceOnUse',
        patternTransform: 'rotate(45)',
      },
      s('rect', { width: 20, height: 20, fill: '#7d1a28' }),
      s('path', {
        d: 'M0 10h20M10 0v20',
        stroke: '#f3e6d0',
        'stroke-opacity': 0.35,
        'stroke-width': 1.4,
      }),
      s('circle', { cx: 10, cy: 10, r: 2.2, fill: '#f3e6d0', 'fill-opacity': 0.55 }),
    ),
    // Art deco fans
    s(
      'pattern',
      { id: 'pat-deco', width: 40, height: 22, patternUnits: 'userSpaceOnUse' },
      s('rect', { width: 40, height: 22, fill: '#0f1d38' }),
      ...[18, 13, 8].map((r) =>
        s('path', {
          d: `M${20 - r} 22a${r} ${r} 0 0 1 ${2 * r} 0`,
          fill: 'none',
          stroke: gold,
          'stroke-width': 1.3,
          'stroke-opacity': 0.75,
        }),
      ),
      ...[18, 13, 8].map((r) =>
        s('path', {
          d: `M${-r} 11a${r} ${r} 0 0 1 ${2 * r} 0M${40 - r} 11a${r} ${r} 0 0 1 ${2 * r} 0`,
          fill: 'none',
          stroke: gold,
          'stroke-width': 1.3,
          'stroke-opacity': 0.75,
        }),
      ),
    ),
    // Guilloché wave
    s(
      'pattern',
      { id: 'pat-wave', width: 36, height: 12, patternUnits: 'userSpaceOnUse' },
      s('rect', { width: 36, height: 12, fill: '#0c3b2c' }),
      s('path', {
        d: 'M0 6c6-6 12-6 18 0s12 6 18 0',
        fill: 'none',
        stroke: gold,
        'stroke-width': 1.1,
        'stroke-opacity': 0.7,
      }),
      s('path', {
        d: 'M0 0c6 6 12 6 18 0s12-6 18 0M0 12c6-6 12-6 18 0s12 6 18 0',
        fill: 'none',
        stroke: '#e9f2ec',
        'stroke-width': 0.7,
        'stroke-opacity': 0.35,
      }),
    ),
    // Monogram dots
    s(
      'pattern',
      { id: 'pat-monogram', width: 14, height: 14, patternUnits: 'userSpaceOnUse' },
      s('rect', { width: 14, height: 14, fill: '#f4ecdc' }),
      s('circle', { cx: 7, cy: 7, r: 1.4, fill: '#0e3a2a', 'fill-opacity': 0.35 }),
    ),
  ];

  const svg = s(
    'svg',
    {
      'aria-hidden': 'true',
      focusable: 'false',
      style: 'position:absolute;width:0;height:0;overflow:hidden',
    },
    s('defs', null, ...symbols, ...patterns),
  );
  document.body.prepend(svg);
}

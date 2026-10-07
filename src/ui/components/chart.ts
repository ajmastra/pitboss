import { h, s } from '../dom';

export interface ChartPoint {
  label: string;
  value: number | null;
}

export interface LineChartOptions {
  title: string;
  points: ChartPoint[];
  min: number;
  max: number;
  format(v: number): string;
  /** Gridline values. */
  ticks: number[];
}

/**
 * Single-series line chart (SVG). Thin 2px line, ≥8px markers on real
 * data, gaps for missing days, recessive grid, and a crosshair + tooltip
 * on hover/touch/keyboard.
 */
export function lineChart(opts: LineChartOptions): HTMLElement {
  const tip = h('div', { class: 'ch-tip', hidden: true });
  const empty = opts.points.every((p) => p.value === null);
  const plot = h(
    'div',
    {
      class: 'chart-plot',
      tabindex: empty ? undefined : '0',
      role: 'img',
      'aria-label': `${opts.title}. Use arrow keys to inspect days.`,
    },
    tip,
    empty ? h('p', { class: 'ch-empty' }, 'Play a few rounds to see your trend.') : null,
  );
  let api: {
    show(i: number): void;
    hide(): void;
    fromX(clientX: number): void;
    idx(): number;
  } | null = null;
  const n = opts.points.length;

  const draw = (width: number) => {
    plot.querySelector('svg')?.remove();
    api = drawInto(width);
  };

  if (!empty) {
    plot.addEventListener('pointermove', (e) => api?.fromX(e.clientX));
    plot.addEventListener('pointerdown', (e) => api?.fromX(e.clientX));
    plot.addEventListener('pointerleave', () => api?.hide());
    plot.addEventListener('blur', () => api?.hide());
    plot.addEventListener('keydown', (e) => {
      if (!api || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
      e.preventDefault();
      e.stopPropagation();
      const cur = api.idx();
      const next = cur < 0 ? n - 1 : cur + (e.key === 'ArrowRight' ? 1 : -1);
      api.show(Math.max(0, Math.min(n - 1, next)));
    });
  }
  new ResizeObserver((entries) => {
    const w = Math.round(entries[0]?.contentRect.width ?? 0);
    if (w > 0) draw(w);
  }).observe(plot);

  return h(
    'figure',
    { class: 'chart' },
    h('figcaption', { class: 'chart-title' }, opts.title),
    plot,
  );

  function drawInto(W: number) {
    const H = 180;
    const pad = { l: 40, r: 12, t: 12, b: 26 };
    const iw = W - pad.l - pad.r;
    const ih = H - pad.t - pad.b;
    const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
    const y = (v: number) => pad.t + ih - ((v - opts.min) / (opts.max - opts.min || 1)) * ih;

    const grid = opts.ticks.map((t) =>
      s(
        'g',
        null,
        s('line', { x1: pad.l, x2: W - pad.r, y1: y(t), y2: y(t), class: 'ch-grid' }),
        s(
          'text',
          { x: pad.l - 8, y: y(t) + 4, 'text-anchor': 'end', class: 'ch-axis' },
          opts.format(t),
        ),
      ),
    );

    // Line segments break across null gaps.
    const segments: string[] = [];
    let cur = '';
    opts.points.forEach((p, i) => {
      if (p.value === null) {
        if (cur) segments.push(cur);
        cur = '';
        return;
      }
      cur += `${cur ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`;
    });
    if (cur) segments.push(cur);

    // Markers only where they won't bury the line: sparse charts, isolated
    // days (no line to show), and the latest point.
    const spacing = n > 1 ? iw / (n - 1) : iw;
    const lastIdx = opts.points.map((p) => p.value !== null).lastIndexOf(true);
    const dots = opts.points.flatMap((p, i) => {
      if (p.value === null) return [];
      const isolated = opts.points[i - 1]?.value == null && opts.points[i + 1]?.value == null;
      if (spacing < 18 && !isolated && i !== lastIdx) return [];
      return [s('circle', { cx: x(i), cy: y(p.value), r: 4, class: 'ch-dot' })];
    });

    const first = opts.points[0]?.label ?? '';
    const last = opts.points[n - 1]?.label ?? '';
    const xLabels = [
      s('text', { x: pad.l, y: H - 6, class: 'ch-axis' }, first),
      s('text', { x: W - pad.r, y: H - 6, 'text-anchor': 'end', class: 'ch-axis' }, last),
    ];

    const cross = s('line', { y1: pad.t, y2: pad.t + ih, class: 'ch-cross', visibility: 'hidden' });
    const focusDot = s('circle', { r: 6, class: 'ch-focus', visibility: 'hidden' });
    const svg = s(
      'svg',
      { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'chart-svg', 'aria-hidden': 'true' },
      ...grid,
      ...segments.map((d) => s('path', { d, class: 'ch-line' })),
      ...dots,
      cross,
      focusDot,
      ...xLabels,
    );
    plot.prepend(svg);

    let idx = -1;
    const show = (i: number) => {
      const p = opts.points[i];
      if (!p) return;
      idx = i;
      const cx = x(i);
      cross.setAttribute('x1', String(cx));
      cross.setAttribute('x2', String(cx));
      cross.setAttribute('visibility', 'visible');
      if (p.value !== null) {
        focusDot.setAttribute('cx', String(cx));
        focusDot.setAttribute('cy', String(y(p.value)));
        focusDot.setAttribute('visibility', 'visible');
      } else focusDot.setAttribute('visibility', 'hidden');
      tip.hidden = false;
      tip.replaceChildren(
        h('span', { class: 'ch-tip-label' }, p.label),
        h('b', { class: 'num' }, p.value === null ? 'No play' : opts.format(p.value)),
      );
      tip.style.left = `${(cx / W) * 100}%`;
      plot.setAttribute(
        'aria-label',
        `${p.label}: ${p.value === null ? 'no play' : opts.format(p.value)}`,
      );
    };
    const hide = () => {
      idx = -1;
      tip.hidden = true;
      cross.setAttribute('visibility', 'hidden');
      focusDot.setAttribute('visibility', 'hidden');
    };
    const fromEvent = (clientX: number) => {
      const r = svg.getBoundingClientRect();
      const px = ((clientX - r.left) / r.width) * W;
      const i = Math.round(((px - pad.l) / iw) * (n - 1));
      show(Math.max(0, Math.min(n - 1, i)));
    };
    return { show, hide, fromX: fromEvent, idx: () => idx };
  }
}

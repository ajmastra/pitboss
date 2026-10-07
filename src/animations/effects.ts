import { EASE, play, reducedMotion } from './motion';

/**
 * Burst of shards from the center of `el` — used when a streak breaks
 * (gold shards falling) or a combo tier is reached (sparks rising).
 */
export function burst(
  el: HTMLElement,
  kind: 'shatter' | 'spark' = 'spark',
  count = 14,
): Promise<void> {
  if (reducedMotion()) {
    return play(el, [{ opacity: 0.4 }, { opacity: 1 }], { duration: 200 }, 'fade-in');
  }
  const layer = document.createElement('div');
  layer.className = `burst burst-${kind}`;
  layer.setAttribute('aria-hidden', 'true');
  el.append(layer);
  const tasks: Promise<void>[] = [];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    layer.append(p);
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 40 + Math.random() * 50;
    const dx = Math.cos(a) * dist;
    const dy = Math.sin(a) * dist + (kind === 'shatter' ? 50 : -10);
    const r = (Math.random() - 0.5) * 540;
    tasks.push(
      play(
        p,
        [
          { transform: 'translate(-50%, -50%) rotate(0deg) scale(1)', opacity: 1 },
          {
            transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${r}deg) scale(${kind === 'shatter' ? 0.7 : 0.2})`,
            opacity: 0,
          },
        ],
        {
          duration: 650 + Math.random() * 300,
          easing: kind === 'shatter' ? EASE.in : EASE.out,
          fill: 'forwards',
        },
      ),
    );
  }
  return Promise.all(tasks).then(() => layer.remove());
}

/** Streak-broken effect: shake + shatter + dim. */
export async function streakBreak(meter: HTMLElement): Promise<void> {
  await Promise.all([
    burst(meter, 'shatter', 16),
    play(
      meter,
      [
        { transform: 'translateX(0) scale(1)', opacity: 1 },
        { transform: 'translateX(-6px) scale(0.96)', offset: 0.15 },
        { transform: 'translateX(6px) scale(0.96)', offset: 0.3 },
        { transform: 'translateX(-3px) scale(0.98)', offset: 0.45 },
        { transform: 'translateX(0) scale(1)', opacity: 1 },
      ],
      { duration: 480, easing: 'ease-out' },
      'fade-in',
    ),
  ]);
}

export function fadeIn(el: Element, duration = 260, y = 10): Promise<void> {
  return play(
    el,
    [
      { opacity: 0, transform: `translateY(${y}px)` },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { duration, easing: EASE.out, fill: 'backwards' },
    'fade-in',
  );
}

/** Staggered entrance for a list of elements. */
export function stagger(els: Iterable<Element>, step = 45, duration = 360): Promise<void> {
  return Promise.all(
    [...els].map((el, i) =>
      play(
        el,
        [
          { opacity: 0, transform: 'translateY(14px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration, delay: i * step, easing: EASE.out, fill: 'backwards' },
        'fade-in',
      ),
    ),
  ).then(() => undefined);
}

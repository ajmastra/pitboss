import { EASE, play, reducedMotion } from './motion';

/**
 * Gather cards into a stack, then slide them off toward `to` (discard tray)
 * with a light stagger, and remove them from the DOM.
 */
export async function sweep(
  cards: HTMLElement[],
  to?: Element | null,
  duration = 520,
): Promise<void> {
  if (cards.length === 0) return;
  if (reducedMotion() || !to) {
    await Promise.all(
      cards.map((c) =>
        play(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' }, 'fade-out'),
      ),
    );
    cards.forEach((c) => c.remove());
    return;
  }
  // Read all rects first, then write — no interleaved layout.
  const target = to.getBoundingClientRect();
  const rects = cards.map((c) => c.getBoundingClientRect());
  const tx = target.left + target.width / 2;
  const ty = target.top + target.height / 2;
  await Promise.all(
    cards.map((c, i) => {
      const r = rects[i] as DOMRect;
      const dx = tx - (r.left + r.width / 2);
      const dy = ty - (r.top + r.height / 2);
      const base = c.style.transform || 'none';
      c.classList.add('in-flight');
      return play(
        c,
        [
          { transform: base, opacity: 1 },
          {
            transform: `${base} translate(${dx * 0.08}px, ${dy * 0.08 - 8}px)`,
            opacity: 1,
            offset: 0.25,
          },
          {
            transform: `translate(${dx}px, ${dy}px) rotate(${80 + i * 3}deg) scale(0.6)`,
            opacity: 0,
          },
        ],
        { duration, delay: i * 35, easing: EASE.in, fill: 'forwards' },
      );
    }),
  );
  cards.forEach((c) => c.remove());
}

/** Fan cards in a hand outward from a stack. */
export function fan(cards: HTMLElement[], spread = 18, duration = 360): Promise<void> {
  const mid = (cards.length - 1) / 2;
  return Promise.all(
    cards.map((c, i) => {
      const rot = (i - mid) * (spread / Math.max(1, cards.length));
      const x = (i - mid) * 22;
      const rest = `translate(${x}px, ${Math.abs(i - mid) * 3}px) rotate(${rot}deg)`;
      const from = c.style.transform || 'none';
      c.style.transform = rest;
      return play(
        c,
        [{ transform: from }, { transform: rest }],
        { duration, easing: EASE.out },
        'none',
      );
    }),
  ).then(() => undefined);
}

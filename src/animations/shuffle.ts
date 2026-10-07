import { createCard } from '../ui/components/card';
import { h } from '../ui/dom';
import { EASE, play, reducedMotion } from './motion';

/**
 * Riffle shuffle: the stack splits into two halves that tilt apart, cards
 * cascade alternately into the middle, then the deck squares up. Runs in
 * `host` and cleans up after itself.
 */
export async function riffle(host: HTMLElement, rounds = 2): Promise<void> {
  const stage = h('div', { class: 'shuffle-stage', 'aria-hidden': 'true' });
  host.append(stage);
  const n = 14;
  const cards = Array.from({ length: n }, (_, i) => {
    const c = createCard(null, { faceUp: false });
    c.classList.add('shuffle-card');
    c.style.zIndex = String(i);
    stage.append(c);
    return c;
  });

  if (reducedMotion()) {
    await play(
      stage,
      [{ opacity: 0 }, { opacity: 1 }, { opacity: 1 }, { opacity: 0 }],
      { duration: 700 },
      'fade-in',
    );
    stage.remove();
    return;
  }

  const half = n / 2;
  for (let round = 0; round < rounds; round++) {
    // Split
    await Promise.all(
      cards.map((c, i) => {
        const left = i < half;
        const k = left ? i : i - half;
        const x = left ? -58 : 58;
        return play(
          c,
          [
            { transform: `translate(0, ${-i * 0.6}px) rotate(0deg)` },
            { transform: `translate(${x}%, ${-k * 0.8}px) rotate(${left ? -7 : 7}deg)` },
          ],
          { duration: 300, easing: EASE.out, fill: 'forwards', delay: round === 0 ? 0 : 40 },
        );
      }),
    );
    // Cascade alternately from the bottom of each half into the center.
    const order: number[] = [];
    for (let k = 0; k < half; k++) order.push(k, k + half);
    await Promise.all(
      order.map((idx, j) => {
        const c = cards[idx] as HTMLElement;
        const left = idx < half;
        c.style.zIndex = String(100 + j);
        const k = left ? idx : idx - half;
        return play(
          c,
          [
            {
              transform: `translate(${left ? -58 : 58}%, ${-k * 0.8}px) rotate(${left ? -7 : 7}deg)`,
            },
            {
              transform: `translate(${left ? -24 : 24}%, ${-j * 0.6 - 10}px) rotate(${left ? -3 : 3}deg)`,
              offset: 0.5,
            },
            { transform: `translate(0, ${-j * 0.6}px) rotate(${(Math.random() - 0.5) * 2}deg)` },
          ],
          { duration: 220, delay: j * 26, easing: EASE.inOut, fill: 'forwards' },
        );
      }),
    );
  }
  // Square up
  await play(
    stage,
    [
      { transform: 'scale(1)' },
      { transform: 'scale(1.04) translateY(-4px)' },
      { transform: 'scale(1)' },
    ],
    { duration: 260, easing: EASE.spring },
  );
  await play(stage, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
  stage.remove();
}

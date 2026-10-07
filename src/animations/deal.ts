import { EASE, play, reducedMotion } from './motion';

export interface DealOptions {
  /** Element the card flies from (the shoe). */
  from?: Element | null;
  /** Resting rotation in degrees. */
  rotate?: number;
  /** Resting offset in px. */
  offsetX?: number;
  offsetY?: number;
  duration?: number;
  delay?: number;
  /** Flip face up during flight. */
  flip?: boolean;
}

/**
 * Animate a card (already placed at its final position in the DOM) flying
 * in from the shoe. One layout read per card, then transform-only motion.
 */
export async function dealIn(card: HTMLElement, opts: DealOptions = {}): Promise<void> {
  const rot = opts.rotate ?? 0;
  const ox = opts.offsetX ?? 0;
  const oy = opts.offsetY ?? 0;
  const rest = `translate(${ox}px, ${oy}px) rotate(${rot}deg)`;
  card.style.transform = rest;
  const duration = opts.duration ?? 420;
  const delay = opts.delay ?? 0;

  if (reducedMotion() || !opts.from) {
    await play(
      card,
      [
        { opacity: 0, transform: `${rest} scale(0.96)` },
        { opacity: 1, transform: rest },
      ],
      { duration: Math.min(duration, 220), delay, easing: EASE.out, fill: 'backwards' },
      'fade-in',
    );
    return;
  }

  const a = card.getBoundingClientRect();
  const b = opts.from.getBoundingClientRect();
  const dx = b.left + b.width / 2 - (a.left + a.width / 2) - ox;
  const dy = b.top + b.height / 2 - (a.top + a.height / 2) - oy;
  const startRot = rot - 14 + Math.random() * 8;

  card.classList.add('in-flight');
  const inner = card.querySelector<HTMLElement>('.card-inner');
  const moves: Promise<void>[] = [
    play(
      card,
      [
        {
          transform: `translate(${dx}px, ${dy}px) rotate(${startRot}deg) scale(0.86)`,
          opacity: 0.6,
        },
        { opacity: 1, offset: 0.25 },
        {
          transform: `translate(${ox}px, ${oy - 6}px) rotate(${rot}deg) scale(1.03)`,
          offset: 0.82,
        },
        { transform: rest, opacity: 1 },
      ],
      { duration, delay, easing: EASE.out, fill: 'backwards' },
    ),
  ];
  if (opts.flip && inner) {
    card.classList.remove('is-down');
    moves.push(
      play(
        inner,
        [
          { transform: 'rotateY(180deg)' },
          { transform: 'rotateY(180deg)', offset: 0.25 },
          { transform: 'rotateY(0deg)' },
        ],
        { duration, delay, easing: EASE.inOut, fill: 'backwards' },
      ),
    );
  }
  await Promise.all(moves);
  card.classList.remove('in-flight');
}

/** Quick "flash" appearance used by high-speed drills. */
export function flashIn(card: HTMLElement, durationMs: number, rotate = 0): Promise<void> {
  const rest = `rotate(${rotate}deg)`;
  card.style.transform = rest;
  const d = Math.max(60, Math.min(260, durationMs));
  return play(
    card,
    [
      { opacity: 0, transform: `translate(26px, -14px) rotate(${rotate + 6}deg) scale(0.94)` },
      { opacity: 1, transform: rest },
    ],
    { duration: d, easing: EASE.out, fill: 'backwards' },
    'fade-in',
  );
}

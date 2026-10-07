import { EASE, play, reducedMotion } from './motion';

export type Tone = 'pos' | 'neg' | 'zero';

/** Number pop + color pulse. Color is set by class; motion is transform/opacity. */
export function pop(el: HTMLElement, tone: Tone = 'zero', scale = 1.22): Promise<void> {
  el.dataset.tone = tone;
  const glow = el.querySelector<HTMLElement>('.pulse');
  const tasks = [
    play(
      el,
      [
        { transform: 'scale(1)' },
        { transform: `scale(${scale})`, offset: 0.3 },
        { transform: 'scale(1)' },
      ],
      { duration: 360, easing: EASE.spring },
    ),
  ];
  if (glow) {
    tasks.push(
      play(
        glow,
        [
          { opacity: 0.85, transform: 'scale(0.6)' },
          { opacity: 0, transform: 'scale(1.6)' },
        ],
        { duration: reducedMotion() ? 200 : 520, easing: EASE.out },
        'fade-out',
      ),
    );
  }
  return Promise.all(tasks).then(() => undefined);
}

/** Small horizontal shake for wrong answers. */
export function shake(el: HTMLElement): Promise<void> {
  return play(
    el,
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-9px)' },
      { transform: 'translateX(8px)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(3px)' },
      { transform: 'translateX(0)' },
    ],
    { duration: 380, easing: 'ease-out' },
  );
}

/** Floating "+30" style score text rising from an element. */
export function floatText(anchor: HTMLElement, text: string, tone: Tone = 'pos'): void {
  const span = document.createElement('span');
  span.className = 'float-text num';
  span.dataset.tone = tone;
  span.textContent = text;
  anchor.append(span);
  void play(
    span,
    [
      { opacity: 0, transform: 'translate(-50%, 6px) scale(0.9)' },
      { opacity: 1, transform: 'translate(-50%, -12px) scale(1.05)', offset: 0.25 },
      { opacity: 0, transform: 'translate(-50%, -46px) scale(1)' },
    ],
    { duration: 900, easing: EASE.out, fill: 'forwards' },
    'fade-out',
  ).then(() => span.remove());
}

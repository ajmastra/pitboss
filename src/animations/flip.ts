import { EASE, play } from './motion';

/** 3D flip a card face up (or down). Updates the resting class. */
export async function flip(card: HTMLElement, faceUp = true, duration = 420): Promise<void> {
  const inner = card.querySelector<HTMLElement>('.card-inner');
  if (!inner) return;
  const from = faceUp ? 180 : 0;
  const to = faceUp ? 0 : 180;
  card.classList.toggle('is-down', !faceUp);
  card.classList.add('in-flight');
  await Promise.all([
    play(
      inner,
      [{ transform: `rotateY(${from}deg)` }, { transform: `rotateY(${to}deg)` }],
      { duration, easing: EASE.inOut },
      'fade-in',
    ),
    play(
      card,
      [
        { transform: `${card.style.transform} translateY(0) scale(1)` },
        { transform: `${card.style.transform} translateY(-10px) scale(1.06)`, offset: 0.5 },
        { transform: `${card.style.transform} translateY(0) scale(1)` },
      ],
      { duration, easing: EASE.out },
    ),
  ]);
  card.classList.remove('in-flight');
  if (faceUp) {
    card.classList.add('is-revealing');
    setTimeout(() => card.classList.remove('is-revealing'), 700);
  }
}

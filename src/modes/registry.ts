import type { ModeId } from '../logic/stats';

export interface ModeMeta {
  id: ModeId;
  step: number;
  title: string;
  blurb: string;
  /** Short label for the speed/benchmark stat shown on the menu tile. */
  metric: 'cps' | 'score' | 'deck';
}

export const MODES: readonly ModeMeta[] = [
  {
    id: 'values',
    step: 1,
    title: 'Card Values',
    blurb: 'Instantly tag each card +1, 0 or −1.',
    metric: 'cps',
  },
  {
    id: 'running',
    step: 2,
    title: 'Running Count',
    blurb: 'Cards flash by. Keep the count. Call it.',
    metric: 'cps',
  },
  {
    id: 'pairs',
    step: 3,
    title: 'Pairs & Chunks',
    blurb: 'See cards in groups. Cancel pairs. Go faster.',
    metric: 'cps',
  },
  {
    id: 'deck',
    step: 4,
    title: 'Full Deck',
    blurb: 'Count all 52. A clean deck ends on zero.',
    metric: 'deck',
  },
  {
    id: 'true',
    step: 5,
    title: 'True Count',
    blurb: 'Divide by decks left. The number that matters.',
    metric: 'score',
  },
  {
    id: 'table',
    step: 6,
    title: 'Table Play',
    blurb: 'A live six-deck table. Count in the background.',
    metric: 'score',
  },
];

export function modeMeta(id: string): ModeMeta | undefined {
  return MODES.find((m) => m.id === id);
}

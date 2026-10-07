import type { Settings } from '../storage/store';
import { setCardBack } from './components/card';

const FELT_META: Record<string, string> = {
  emerald: '#0a2a1e',
  navy: '#0a1730',
  burgundy: '#2a0b14',
  charcoal: '#121417',
  teal: '#062831',
};

export function applyTheme(settings: Settings): void {
  const root = document.documentElement;
  const felt = settings.felt.replace('felt:', '');
  root.dataset.felt = felt;
  root.dataset.accent = settings.accent.replace('accent:', '');
  if (settings.motion === 'system') delete root.dataset.motion;
  else root.dataset.motion = settings.motion;
  setCardBack(settings.cardBack);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', FELT_META[felt] ?? '#0a2a1e');
}

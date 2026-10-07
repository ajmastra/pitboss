import '@fontsource-variable/inter/wght.css';
import '@fontsource/fraunces/latin-600.css';
import '@fontsource/fraunces/latin-700.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/cards.css';
import './styles/drill.css';
import './styles/table.css';

import { App, type ScreenFactory } from './app';
import { Sfx } from './audio/sfx';
import { Store } from './storage/store';
import { mountSprite } from './ui/components/sprite';
import { menuScreen } from './ui/screens/menu';
import { cardValueScreen } from './modes/cardValue';
import { trueCountScreen } from './modes/trueCount';
import { dailyScreen, deckScreen, pairsScreen, runningScreen } from './modes/runningCount';
import { applyTheme } from './ui/theme';

mountSprite();
const store = new Store();
const sfx = new Sfx();
applyTheme(store.get().settings);
sfx.enabled = store.get().settings.sound;
store.subscribe((d) => applyTheme(d.settings));

const PLAY: Record<string, ScreenFactory> = {
  values: cardValueScreen,
  running: runningScreen,
  pairs: pairsScreen,
  deck: deckScreen,
  daily: dailyScreen,
  true: trueCountScreen,
};

const routes: Record<string, ScreenFactory> = {
  menu: menuScreen,
  play: (ctx, params) => {
    const factory = PLAY[params[0] ?? ''];
    return factory ? factory(ctx, params.slice(1)) : menuScreen(ctx);
  },
};

if (import.meta.env.DEV) {
  const { labScreen } = await import('./ui/screens/lab');
  routes.lab = labScreen;
}

const root = document.getElementById('app');
if (root) new App(root, store, sfx, routes);

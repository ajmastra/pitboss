import { levelFromXp } from '../../logic/progression';
import { h, s } from '../dom';
import type { AppCtx } from '../types';

function soundIcon(on: boolean) {
  return s(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: 22,
      height: 22,
      'aria-hidden': 'true',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 1.8,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    s('path', { d: 'M4 9.5v5h3.5L12 19V5L7.5 9.5H4z', fill: 'currentColor', stroke: 'none' }),
    on
      ? s('path', { d: 'M15.5 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12' })
      : s('path', { d: 'M16 9.5l5 5M21 9.5l-5 5' }),
  );
}

function gearIcon() {
  return s(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: 22,
      height: 22,
      'aria-hidden': 'true',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 1.8,
    },
    s('circle', { cx: 12, cy: 12, r: 3.2 }),
    s('path', {
      d: 'M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7',
      'stroke-linecap': 'round',
    }),
  );
}

export function createHeader(ctx: AppCtx): { el: HTMLElement; update(): void } {
  const lvlNum = h('span', { class: 'lvl-num num' });
  const ring = s('circle', { cx: 18, cy: 18, r: 15.5, class: 'lvl-ring-fg', pathLength: 100 });
  const lvl = h(
    'button',
    { class: 'lvl-chip', type: 'button', onclick: () => ctx.go('unlocks') },
    s(
      'svg',
      { viewBox: '0 0 36 36', class: 'lvl-ring', 'aria-hidden': 'true' },
      s('circle', { cx: 18, cy: 18, r: 15.5, class: 'lvl-ring-bg' }),
      ring,
    ),
    lvlNum,
  );
  const sound = h('button', {
    class: 'icon-btn',
    type: 'button',
    onclick: () => {
      ctx.store.update((d) => {
        d.settings.sound = !d.settings.sound;
      });
      ctx.sfx.setEnabled(ctx.store.get().settings.sound);
      ctx.sfx.play('click');
    },
  });
  const settings = h(
    'button',
    {
      class: 'icon-btn',
      type: 'button',
      'aria-label': 'Settings',
      onclick: () => ctx.go('settings'),
    },
    gearIcon(),
  );

  const el = h(
    'header',
    { class: 'app-header' },
    h(
      'a',
      { class: 'brand', href: '#/', 'aria-label': 'Count It — home' },
      h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, '+1'),
      h('span', { class: 'brand-name' }, 'Count It'),
    ),
    h('nav', { class: 'header-actions', 'aria-label': 'Quick settings' }, lvl, sound, settings),
  );

  function update() {
    const d = ctx.store.get();
    const info = levelFromXp(d.xp);
    lvlNum.textContent = String(info.level);
    ring.style.strokeDasharray = `${Math.max(0.5, info.progress * 100)} 100`;
    lvl.setAttribute(
      'aria-label',
      `Level ${info.level}, ${Math.round(info.progress * 100)}% to next. View unlocks`,
    );
    sound.replaceChildren(soundIcon(d.settings.sound));
    sound.setAttribute('aria-pressed', String(d.settings.sound));
    sound.setAttribute('aria-label', d.settings.sound ? 'Sound on' : 'Sound off');
  }
  update();
  ctx.store.subscribe(update);
  return { el, update };
}

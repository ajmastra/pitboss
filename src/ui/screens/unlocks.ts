import { stagger } from '../../animations/effects';
import { burst } from '../../animations/effects';
import { UNLOCKS, levelFromXp, type Unlock } from '../../logic/progression';
import type { Settings } from '../../storage/store';
import { createBackPreview } from '../components/card';
import { h, s } from '../dom';
import type { AppCtx, Screen } from '../types';
import { pageHead } from './page';

const FELT_SWATCH: Record<string, string> = {
  'felt:emerald': '#134b37',
  'felt:navy': '#152d57',
  'felt:burgundy': '#4c1626',
  'felt:teal': '#0f4855',
  'felt:charcoal': '#23272c',
};
const ACCENT_SWATCH: Record<string, string> = {
  'accent:gold': '#d4a95f',
  'accent:platinum': '#aab3c2',
  'accent:rose': '#dd8a72',
  'accent:jade': '#5cc697',
};

const KIND_KEY: Record<Exclude<Unlock['kind'], 'feature'>, keyof Settings> = {
  back: 'cardBack',
  felt: 'felt',
  accent: 'accent',
};

export function unlocksScreen(ctx: AppCtx): Screen {
  const el = h('div', { class: 'screen page unlocks' });

  function render() {
    const data = ctx.store.get();
    const info = levelFromXp(data.xp);
    const progress = h(
      'section',
      { class: 'panel level-panel' },
      h('div', { class: 'level-badge num' }, String(info.level)),
      h(
        'div',
        { class: 'level-body' },
        h('p', { class: 'level-title' }, `Level ${info.level}`),
        h(
          'div',
          { class: 'xp-track' },
          h('div', { class: 'xp-fill', style: { transform: `scaleX(${info.progress})` } }),
        ),
        h(
          'p',
          { class: 'level-sub num' },
          `${info.into} / ${info.needed} XP to level ${info.level + 1}`,
        ),
      ),
    );

    const group = (kind: Unlock['kind'], title: string) => {
      const items = UNLOCKS.filter((u) => u.kind === kind).map((u) => {
        const locked = u.level > info.level;
        const key = kind === 'feature' ? null : KIND_KEY[kind];
        const equipped = key
          ? data.settings[key] === u.id
          : kind === 'feature' && data.settings.distractions;
        let preview: HTMLElement;
        if (kind === 'back') preview = createBackPreview(u.id);
        else if (kind === 'felt')
          preview = h('span', {
            class: 'swatch swatch-felt',
            style: {
              background: `radial-gradient(circle at 40% 35%, ${FELT_SWATCH[u.id] ?? '#134b37'}, #050505 130%)`,
            },
          });
        else if (kind === 'accent')
          preview = h('span', {
            class: 'swatch',
            style: {
              background: `linear-gradient(160deg, #fff6, ${ACCENT_SWATCH[u.id] ?? '#d4a95f'} 45%, #0006)`,
            },
          });
        else
          preview = h(
            'span',
            { class: 'swatch swatch-feature', 'aria-hidden': 'true' },
            s(
              'svg',
              { viewBox: '0 0 24 24', width: 28, height: 28 },
              s('path', { d: 'M13 2L4 14h7l-1 8 9-12h-7z', fill: 'currentColor' }),
            ),
          );
        const btn = h(
          'button',
          {
            class: `unlock${locked ? ' is-locked' : ''}${equipped ? ' is-equipped' : ''}`,
            type: 'button',
            disabled: locked,
            'aria-pressed': locked ? undefined : String(Boolean(equipped)),
            onclick: () => {
              if (locked) return;
              ctx.sfx.play('click');
              ctx.store.update((d) => {
                if (key) (d.settings as unknown as Record<string, unknown>)[key] = u.id;
                else d.settings.distractions = !d.settings.distractions;
              });
              void burst(btn, 'spark', 10);
              render();
            },
          },
          h('span', { class: 'unlock-preview' }, preview),
          h('span', { class: 'unlock-name' }, u.name),
          h(
            'span',
            { class: 'unlock-meta' },
            locked
              ? `Level ${u.level}`
              : equipped
                ? kind === 'feature'
                  ? 'On'
                  : 'Equipped'
                : kind === 'feature'
                  ? 'Off · tap to enable'
                  : 'Tap to equip',
          ),
        );
        return btn;
      });
      return h(
        'section',
        { class: 'unlock-group' },
        h('h2', { class: 'section-title' }, title),
        h('div', { class: `unlock-grid unlock-${kind}` }, ...items),
      );
    };

    el.replaceChildren(
      pageHead('Unlocks', 'Earn XP in any mode to unlock new looks.'),
      progress,
      group('back', 'Card backs'),
      group('felt', 'Table felt'),
      group('accent', 'Accent'),
      group('feature', 'Advanced'),
    );
  }
  render();
  return {
    el,
    title: 'Unlocks',
    mounted() {
      void stagger(el.querySelectorAll('.unlock'), 25);
    },
  };
}

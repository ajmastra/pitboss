import { isUnlocked, levelFromXp } from '../../logic/progression';
import type { Settings } from '../../storage/store';
import { h } from '../dom';
import type { AppCtx, Screen } from '../types';
import { pageHead } from './page';

export function settingsScreen(ctx: AppCtx): Screen {
  const el = h('div', { class: 'screen page settings' });
  let confirmReset = false;

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    ctx.store.update((d) => {
      d.settings[key] = value;
    });
    if (key === 'sound') ctx.sfx.setEnabled(Boolean(value));
    ctx.sfx.play('click');
    render();
  };

  function toggle(
    label: string,
    desc: string,
    key: 'sound' | 'srMode' | 'distractions',
    disabled = false,
  ) {
    const on = ctx.store.get().settings[key];
    const id = `set-${key}`;
    return h(
      'div',
      { class: `setting${disabled ? ' is-disabled' : ''}` },
      h(
        'div',
        { class: 'setting-text' },
        h('label', { class: 'setting-label', for: id }, label),
        h('p', { class: 'setting-desc', id: `${id}-d` }, desc),
      ),
      h(
        'button',
        {
          id,
          class: 'switch',
          type: 'button',
          role: 'switch',
          'aria-checked': String(on),
          'aria-describedby': `${id}-d`,
          disabled,
          onclick: () => set(key, !on),
        },
        h('span', { class: 'switch-thumb' }),
      ),
    );
  }

  function segmented<K extends keyof Settings>(
    label: string,
    desc: string,
    key: K,
    options: [Settings[K], string][],
  ) {
    const cur = ctx.store.get().settings[key];
    return h(
      'div',
      { class: 'setting setting-col' },
      h(
        'div',
        { class: 'setting-text' },
        h('span', { class: 'setting-label', id: `seg-${String(key)}` }, label),
        h('p', { class: 'setting-desc' }, desc),
      ),
      h(
        'div',
        { class: 'segmented', role: 'radiogroup', 'aria-labelledby': `seg-${String(key)}` },
        ...options.map(([v, text]) =>
          h(
            'button',
            {
              type: 'button',
              role: 'radio',
              'aria-checked': String(cur === v),
              class: 'seg',
              onclick: () => set(key, v),
            },
            text,
          ),
        ),
      ),
    );
  }

  function render() {
    const level = levelFromXp(ctx.store.get().xp).level;
    const distractionsOpen = isUnlocked('feature:distractions', level);
    const resetBtn = h(
      'button',
      {
        class: `btn ${confirmReset ? 'btn-danger' : 'btn-ghost'}`,
        type: 'button',
        onclick: () => {
          if (!confirmReset) {
            confirmReset = true;
            render();
            (el.querySelector('.btn-danger') as HTMLElement | null)?.focus();
            return;
          }
          ctx.store.reset();
          confirmReset = false;
          ctx.toast('Progress reset');
          render();
        },
      },
      confirmReset ? 'Tap again to erase everything' : 'Reset all progress',
    );
    el.replaceChildren(
      pageHead('Settings'),
      h(
        'section',
        { class: 'panel settings-list' },
        toggle('Sound effects', 'Small synthesized clicks and chimes. Off by default.', 'sound'),
        segmented('Motion', 'Reduced swaps big card motion for quick fades.', 'motion', [
          ['system', 'System'],
          ['reduced', 'Reduced'],
          ['full', 'Full'],
        ]),
        toggle(
          'Screen-reader mode',
          'Announces every card as it is dealt and starts drills at a gentler pace.',
          'srMode',
        ),
      ),
      h(
        'section',
        { class: 'panel settings-list' },
        segmented(
          'True count rounding',
          'How a fractional true count becomes a whole number. Toward zero: +2.8 → +2, −2.8 → −2. Floor: −2.8 → −3.',
          'tcRounding',
          [
            ['truncate', 'Toward zero'],
            ['floor', 'Floor'],
            ['round', 'Nearest'],
          ],
        ),
        segmented(
          'Table seats',
          'Players at the Table Play table, besides the dealer.',
          'tableSeats',
          [
            [2, '2'],
            [3, '3'],
            [4, '4'],
            [5, '5'],
          ],
        ),
        toggle(
          'Distractions',
          distractionsOpen
            ? 'Table chatter, a jittery view and extra cards on the edges (which still count) in the flash drills.'
            : 'Unlocks at level 5.',
          'distractions',
          !distractionsOpen,
        ),
      ),
      h(
        'section',
        { class: 'panel settings-list' },
        h(
          'div',
          { class: 'setting setting-col' },
          h(
            'div',
            { class: 'setting-text' },
            h('span', { class: 'setting-label' }, 'Your data'),
            h(
              'p',
              { class: 'setting-desc' },
              'Progress lives in this browser’s local storage. No account, no tracking, nothing leaves your device.',
            ),
          ),
          resetBtn,
        ),
      ),
    );
  }
  render();
  return { el, title: 'Settings' };
}

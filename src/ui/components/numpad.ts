import { play } from '../../animations/motion';
import { formatSigned } from '../../logic/cards';
import { h } from '../dom';

export interface Numpad {
  el: HTMLElement;
  /** Large readout (place it wherever the prompt lives). */
  display: HTMLElement;
  reset(): void;
  setEnabled(on: boolean): void;
  readonly enabled: boolean;
  handleKey(e: KeyboardEvent): boolean;
}

const MAX = 99;

/**
 * Signed-integer entry for counts. Works with taps (± toggles sign) and
 * keys (digits, −/+, Backspace, Enter).
 */
export function createNumpad(opts: { onSubmit(value: number): void; onInput?(): void }): Numpad {
  let digits = '';
  let negative = false;
  let enabled = false;

  const display = h('output', {
    class: 'count-readout num',
    'aria-live': 'polite',
    'aria-label': 'Your count',
  });
  const render = () => {
    if (!digits) {
      display.textContent = negative ? '−' : '?';
      display.dataset.empty = 'true';
      display.dataset.tone = '';
      return;
    }
    const v = value();
    display.textContent = v === 0 && negative ? '−0' : formatSigned(v);
    display.dataset.empty = 'false';
    display.dataset.tone = v > 0 ? 'pos' : v < 0 ? 'neg' : 'zero';
  };
  const value = () => (negative ? -1 : 1) * Number(digits || '0');

  const press = (btn: HTMLElement | undefined) => {
    if (btn)
      void play(btn, [{ transform: 'scale(0.92)' }, { transform: 'scale(1)' }], { duration: 140 });
  };

  const typeDigit = (d: string) => {
    if (!enabled) return;
    const next = digits === '0' ? d : digits + d;
    if (Number(next) > MAX) return;
    digits = next;
    render();
    opts.onInput?.();
  };
  const toggleSign = (force?: boolean) => {
    if (!enabled) return;
    negative = force ?? !negative;
    render();
  };
  const backspace = () => {
    if (!enabled) return;
    if (digits) digits = digits.slice(0, -1);
    else negative = false;
    render();
  };
  const submit = () => {
    if (!enabled || !digits) {
      if (enabled)
        void play(
          display,
          [
            { transform: 'translateX(-4px)' },
            { transform: 'translateX(4px)' },
            { transform: 'translateX(0)' },
          ],
          { duration: 180 },
        );
      return;
    }
    opts.onSubmit(value());
  };

  const keyBtns = new Map<string, HTMLElement>();
  const mk = (label: string, key: string, action: () => void, cls = '', aria?: string) => {
    const b = h(
      'button',
      {
        class: `np-key ${cls}`,
        type: 'button',
        'aria-label': aria ?? label,
        onclick: () => (press(b), action()),
      },
      label,
    );
    keyBtns.set(key, b);
    return b;
  };

  const grid = h(
    'div',
    { class: 'np-grid' },
    ...['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) =>
      mk(d, d, () => typeDigit(d), 'num'),
    ),
    mk('±', '-', () => toggleSign(), 'np-sign', 'Toggle sign'),
    mk('0', '0', () => typeDigit('0'), 'num'),
    mk('⌫', 'Backspace', backspace, 'np-back', 'Delete'),
  );
  const submitBtn = mk('Enter', 'Enter', submit, 'np-submit');
  const el = h(
    'div',
    { class: 'numpad', role: 'group', 'aria-label': 'Count entry' },
    grid,
    submitBtn,
  );

  render();

  return {
    el,
    display,
    get enabled() {
      return enabled;
    },
    reset() {
      digits = '';
      negative = false;
      render();
    },
    setEnabled(on) {
      enabled = on;
      el.classList.toggle('is-disabled', !on);
      for (const b of keyBtns.values()) (b as HTMLButtonElement).disabled = !on;
    },
    handleKey(e) {
      if (!enabled) return false;
      const k = e.key;
      if (/^[0-9]$/.test(k)) {
        typeDigit(k);
        press(keyBtns.get(k));
      } else if (k === '-' || k === '_' || k === 'ArrowLeft') {
        toggleSign(k === 'ArrowLeft' ? true : undefined);
        press(keyBtns.get('-'));
      } else if (k === '+' || k === '=' || k === 'ArrowRight') {
        toggleSign(false);
        press(keyBtns.get('-'));
      } else if (k === 'Backspace' || k === 'Delete') {
        backspace();
        press(keyBtns.get('Backspace'));
      } else if (k === 'Enter') {
        submit();
        press(submitBtn);
      } else return false;
      return true;
    },
  };
}

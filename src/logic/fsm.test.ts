import { describe, expect, it, vi } from 'vitest';
import { createMachine } from './fsm';

describe('createMachine', () => {
  const make = () =>
    createMachine<'menu' | 'drill' | 'results', 'start' | 'finish' | 'restart' | 'quit'>({
      initial: 'menu',
      states: {
        menu: { on: { start: 'drill' } },
        drill: { on: { finish: 'results', quit: 'menu' } },
        results: { on: { restart: 'drill', quit: 'menu' } },
      },
    });

  it('follows declared transitions and ignores others', () => {
    const m = make();
    expect(m.send('finish')).toBe(false);
    expect(m.state).toBe('menu');
    expect(m.send('start')).toBe(true);
    expect(m.state).toBe('drill');
    expect(m.can('restart')).toBe(false);
    m.send('finish');
    m.send('restart');
    expect(m.state).toBe('drill');
  });

  it('notifies subscribers and supports unsubscribe', () => {
    const m = make();
    const fn = vi.fn();
    const off = m.subscribe(fn);
    m.send('start');
    expect(fn).toHaveBeenCalledWith('drill', 'menu', 'start');
    off();
    m.send('quit');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

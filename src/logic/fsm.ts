/**
 * A tiny typed finite-state machine. Transitions not listed for the current
 * state are ignored, which makes stray key presses harmless.
 */
export type MachineConfig<S extends string, E extends string> = {
  initial: S;
  states: Record<S, { on?: Partial<Record<E, S>> }>;
};

export interface Machine<S extends string, E extends string> {
  readonly state: S;
  send(event: E): boolean;
  can(event: E): boolean;
  subscribe(fn: (state: S, prev: S, event: E) => void): () => void;
}

export function createMachine<S extends string, E extends string>(
  config: MachineConfig<S, E>,
): Machine<S, E> {
  let state = config.initial;
  const listeners = new Set<(state: S, prev: S, event: E) => void>();
  return {
    get state() {
      return state;
    },
    can(event) {
      return config.states[state].on?.[event] !== undefined;
    },
    send(event) {
      const target = config.states[state].on?.[event];
      if (target === undefined) return false;
      const prev = state;
      state = target;
      for (const fn of listeners) fn(state, prev, event);
      return true;
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

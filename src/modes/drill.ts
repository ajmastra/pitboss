import { burst, stagger, streakBreak } from '../animations/effects';
import { EASE, play, reducedMotion } from '../animations/motion';
import { floatText, pop, shake } from '../animations/pop';
import { formatSigned } from '../logic/cards';
import { initialDifficulty, updateDifficulty, type Difficulty } from '../logic/difficulty';
import { createMachine } from '../logic/fsm';
import { levelFromXp, newlyUnlocked } from '../logic/progression';
import { createRng, type Rng } from '../logic/rng';
import {
  accuracy,
  applyAnswer,
  initialScore,
  nextComboThreshold,
  xpForRun,
  type AnswerResult,
  type ScoreState,
} from '../logic/scoring';
import { summarize, type ModeId, type SessionRecord } from '../logic/stats';
import type { Settings } from '../storage/store';
import { announce, h } from '../ui/dom';
import type { AppCtx, Screen } from '../ui/types';

export interface AnswerOptions {
  base?: number;
  /** Adjust adaptive speed from this answer (default true). */
  adapt?: boolean;
  /** Element to float "+points" text from. */
  anchor?: HTMLElement;
  /** Text read to screen readers after the answer. */
  say?: string;
}

/** What the drill shell gives each mode. */
export interface DrillApi {
  readonly rng: Rng;
  readonly settings: Settings;
  readonly ctx: AppCtx;
  /** Aborted when the drill is left or restarted. */
  readonly signal: AbortSignal;
  difficulty(): Difficulty;
  score(): ScoreState;
  answer(correct: boolean, opts?: AnswerOptions): AnswerResult;
  /** True once the round timer has run out. */
  timeUp(): boolean;
  /** Game-clock milliseconds since play began (pauses with the tab). */
  elapsed(): number;
  /** Abortable, pause-aware delay. Rejects with AbortError on exit. */
  wait(ms: number): Promise<void>;
  /** End the round now and show results. */
  finish(): void;
  /**
   * Freeze the round clock while the player studies feedback. Resolves on
   * `done` (or after `maxMs` real time, if given).
   */
  review(done: Promise<unknown>, maxMs?: number): Promise<void>;
  /** Set a short status line under the HUD. */
  status(text: string, tone?: 'pos' | 'neg' | 'zero' | ''): void;
  setSpeedLabel(text: string | null): void;
}

export interface ModeController {
  stage: HTMLElement;
  controls?: HTMLElement;
  /** Begin play (called after the countdown). */
  start(): void;
  onKey?(e: KeyboardEvent): boolean;
  destroy?(): void;
  /** Extra fields saved with the session. */
  session?(): Partial<SessionRecord>;
  /** Extra rows for the results panel. */
  results?(): HTMLElement | null;
}

export interface DrillConfig {
  mode: ModeId;
  title: string;
  /** Round length; null when the mode ends itself. */
  roundMs: number | null;
  /** Starting speed for brand-new players. */
  initialCps?: number;
  howTo: string;
  keys: string;
  seed?: string;
  /** Don't record / award (daily practice replays). */
  unscored?: () => boolean;
  /** Use a separate skill bucket (daily uses a fixed pace). */
  adaptive?: boolean;
  build(api: DrillApi): ModeController;
  /** Called with the saved record, e.g. for daily bookkeeping. */
  onRecorded?(rec: SessionRecord, ctx: AppCtx): void;
}

class AbortError extends Error {
  constructor() {
    super('aborted');
    this.name = 'AbortError';
  }
}

export function isAbort(e: unknown): boolean {
  return e instanceof Error && e.name === 'AbortError';
}

/** Swallow AbortError from a mode's async loop; rethrow anything else. */
export function runLoop(p: Promise<unknown>): void {
  p.catch((e: unknown) => {
    if (!isAbort(e)) console.error(e);
  });
}

function closeIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML =
    '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
  return svg;
}

/**
 * The shared drill screen: HUD, countdown, game clock, scoring feedback
 * and the results panel. Each mode plugs in via `build()`.
 */
export function drillScreen(ctx: AppCtx, config: DrillConfig): Screen {
  const machine = createMachine<
    'intro' | 'countdown' | 'play' | 'results',
    'start' | 'go' | 'finish' | 'restart'
  >({
    initial: 'intro',
    states: {
      intro: { on: { start: 'countdown' } },
      countdown: { on: { go: 'play', restart: 'countdown' } },
      play: { on: { finish: 'results', restart: 'countdown' } },
      results: { on: { restart: 'countdown' } },
    },
  });

  // ---- HUD ----
  const timerFill = h('div', { class: 'timer-fill' });
  const timer = h('div', { class: 'timer', role: 'presentation' }, timerFill);
  const scoreNum = h('span', { class: 'hud-value num' }, '0');
  const scoreBox = h(
    'div',
    { class: 'hud-stat hud-score' },
    h('span', { class: 'hud-label' }, 'Score'),
    scoreNum,
  );
  const comboMult = h('span', { class: 'combo-mult num' }, '×1');
  const comboFill = h('span', { class: 'combo-fill' });
  const streakNum = h('span', { class: 'num' }, '0');
  const combo = h(
    'div',
    { class: 'combo', 'data-mult': '1' },
    comboMult,
    h(
      'span',
      { class: 'combo-body' },
      h('span', { class: 'combo-label' }, 'Streak ', streakNum),
      h('span', { class: 'combo-track' }, comboFill),
    ),
  );
  const speed = h(
    'div',
    { class: 'hud-stat hud-speed' },
    h('span', { class: 'hud-label' }, 'Speed'),
    h('span', { class: 'hud-value num' }, '—'),
  );
  const speedVal = speed.querySelector('.hud-value') as HTMLElement;
  const statusLine = h('p', { class: 'drill-status', 'aria-live': 'polite' });
  const close = h(
    'a',
    { class: 'icon-btn drill-close', href: '#/', 'aria-label': 'Quit to menu (Esc)' },
    closeIcon(),
  );
  const hud = h(
    'div',
    { class: 'hud' },
    h('div', { class: 'hud-top' }, close, h('span', { class: 'hud-title' }, config.title), timer),
    h('div', { class: 'hud-row' }, scoreBox, combo, speed),
  );

  const arena = h('section', { class: 'arena', 'aria-label': config.title });
  const controlsSlot = h('div', { class: 'controls-slot' });
  const overlay = h('div', { class: 'drill-overlay' });
  const flash = h('div', { class: 'arena-flash', 'aria-hidden': 'true' });
  const el = h(
    'div',
    { class: `screen drill mode-${config.mode}` },
    hud,
    statusLine,
    h('div', { class: 'arena-wrap' }, arena, flash, overlay),
    controlsSlot,
  );

  // ---- State ----
  const store = ctx.store;
  let controller: ModeController | null = null;
  let abort = new AbortController();
  let score = initialScore();
  let diff: Difficulty = initialDifficulty(config.initialCps ?? 1);
  let rng = createRng(config.seed);
  let clock = 0; // game ms
  let lastFrame = 0;
  let raf = 0;
  let paused = false;
  let frozen = false;
  let waits: { at: number; resolve: () => void; reject: (e: Error) => void }[] = [];
  let finished = false;

  const loadDifficulty = () => {
    const saved = store.get().skill[config.mode];
    const base = saved ?? initialDifficulty(config.initialCps ?? 1);
    // srMode: start a touch slower so announcements keep up.
    return store.get().settings.srMode ? { ...base, cps: Math.min(base.cps, 1) } : base;
  };

  function tick(now: number) {
    if (!paused && !frozen && lastFrame && machine.state === 'play')
      clock += Math.min(100, now - lastFrame);
    lastFrame = now;
    if (config.roundMs) {
      const p = Math.max(0, 1 - clock / config.roundMs);
      timerFill.style.transform = `scaleX(${p})`;
      timer.classList.toggle('is-low', p < 0.17);
    }
    if (waits.length) {
      const due = waits.filter((w) => w.at <= clock);
      if (due.length) {
        waits = waits.filter((w) => w.at > clock);
        for (const w of due) w.resolve();
      }
    }
    raf = requestAnimationFrame(tick);
  }

  const onVisibility = () => {
    paused = document.hidden;
    lastFrame = 0;
    // Freeze in-flight visuals (timers, deals) along with the game clock.
    for (const a of el.getAnimations({ subtree: true })) {
      if (paused && a.playState === 'running') a.pause();
      else if (!paused && a.playState === 'paused') a.play();
    }
  };

  function updateHud() {
    scoreNum.textContent = score.score.toLocaleString();
    streakNum.textContent = String(score.streak);
    const mult = score.streak >= 20 ? 4 : score.streak >= 10 ? 3 : score.streak >= 5 ? 2 : 1;
    comboMult.textContent = `×${mult}`;
    combo.dataset.mult = String(mult);
    const next = nextComboThreshold(score.streak);
    const prevT = mult === 1 ? 0 : mult === 2 ? 5 : mult === 3 ? 10 : 20;
    const prog = next === null ? 1 : (score.streak - prevT) / (next - prevT);
    comboFill.style.transform = `scaleX(${Math.max(0, Math.min(1, prog))})`;
    if (config.adaptive !== false) speedVal.textContent = `${diff.cps.toFixed(1)}/s`;
  }

  function flashArena(tone: 'pos' | 'neg') {
    flash.dataset.tone = tone;
    void play(
      flash,
      [{ opacity: 0.0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }],
      { duration: 420, easing: 'ease-out' },
      'none',
    );
  }

  const api: DrillApi = {
    get rng() {
      return rng;
    },
    get settings() {
      return store.get().settings;
    },
    ctx,
    get signal() {
      return abort.signal;
    },
    difficulty: () => diff,
    score: () => score,
    timeUp: () => config.roundMs !== null && clock >= config.roundMs,
    elapsed: () => clock,
    wait(ms) {
      const signal = abort.signal;
      if (signal.aborted) return Promise.reject(new AbortError());
      return new Promise<void>((resolve, reject) => {
        const entry = { at: clock + ms, resolve, reject };
        waits.push(entry);
        signal.addEventListener('abort', () => reject(new AbortError()), { once: true });
      });
    },
    finish: () => endRound(),
    async review(done, maxMs) {
      const signal = abort.signal;
      frozen = true;
      try {
        await new Promise<void>((resolve, reject) => {
          const t = maxMs ? setTimeout(resolve, maxMs) : 0;
          done.then(
            () => resolve(),
            () => resolve(),
          );
          signal.addEventListener('abort', () => (clearTimeout(t), reject(new AbortError())), {
            once: true,
          });
        });
      } finally {
        frozen = false;
      }
    },
    status(text, tone = '') {
      statusLine.textContent = text;
      statusLine.dataset.tone = tone;
    },
    setSpeedLabel(text) {
      speed.hidden = text === null;
      if (text !== null) speedVal.textContent = text;
    },
    answer(correct, opts = {}) {
      const prev = score;
      const res = applyAnswer(prev, correct, {
        base: opts.base,
        cps: config.adaptive === false ? 1.5 : diff.cps,
      });
      score = res.state;
      if (opts.adapt !== false && config.adaptive !== false) diff = updateDifficulty(diff, correct);
      updateHud();
      const sfx = ctx.sfx;
      if (correct) {
        sfx.play('correct');
        flashArena('pos');
        void pop(scoreNum, 'pos', 1.15);
        if (opts.anchor) floatText(opts.anchor, `+${res.points}`, 'pos');
        if (res.tierUp) {
          sfx.play('combo');
          void burst(combo, 'spark', 16);
          void pop(comboMult, 'pos', 1.5);
          announce(`Combo ×${res.multiplier}`);
        }
      } else {
        sfx.play('wrong');
        flashArena('neg');
        void shake(arena);
        if (res.brokenStreak >= 3) {
          sfx.play('break');
          void streakBreak(combo);
          api.status(`Streak of ${res.brokenStreak} broken`, 'neg');
        }
      }
      if (opts.say) announce(opts.say);
      return res;
    },
  };

  function mountController() {
    controller?.destroy?.();
    arena.replaceChildren();
    controlsSlot.replaceChildren();
    controller = config.build(api);
    arena.append(controller.stage);
    if (controller.controls) controlsSlot.append(controller.controls);
  }

  function reset() {
    abort.abort();
    for (const w of waits) w.reject(new AbortError());
    waits = [];
    abort = new AbortController();
    score = initialScore();
    diff = loadDifficulty();
    rng = createRng(config.seed);
    clock = 0;
    frozen = false;
    finished = false;
    statusLine.textContent = '';
    timerFill.style.transform = 'scaleX(1)';
    timer.hidden = config.roundMs === null;
    updateHud();
    mountController();
  }

  // ---- Intro / countdown ----
  function showIntro() {
    overlay.hidden = false;
    const startBtn = h(
      'button',
      { class: 'btn btn-primary btn-lg', type: 'button', onclick: () => begin() },
      'Start',
    );
    const card = h(
      'div',
      { class: 'intro-card' },
      h('h1', { class: 'intro-title' }, config.title),
      h('p', { class: 'intro-how' }, config.howTo),
      h('p', { class: 'intro-keys' }, config.keys),
      startBtn,
      h(
        'p',
        { class: 'intro-hint' },
        h('kbd', null, 'Enter'),
        ' to start · ',
        h('kbd', null, 'Esc'),
        ' to quit',
      ),
    );
    overlay.replaceChildren(card);
    void stagger(card.children, 50);
    requestAnimationFrame(() => startBtn.focus({ preventScroll: true }));
  }

  function begin() {
    if (!machine.send('start') && !machine.send('restart')) return;
  }

  async function runCountdown() {
    reset();
    overlay.hidden = false;
    const n = h('div', { class: 'countdown num', 'aria-live': 'assertive' });
    overlay.replaceChildren(n);
    const signal = abort.signal;
    const steps = reducedMotion() ? ['Go'] : ['3', '2', '1'];
    for (const s of steps) {
      if (signal.aborted) return;
      n.textContent = s;
      ctx.sfx.play('tick');
      await play(
        n,
        [
          { opacity: 0, transform: 'scale(1.6)' },
          { opacity: 1, transform: 'scale(1)', offset: 0.35 },
          { opacity: 1, transform: 'scale(0.96)', offset: 0.8 },
          { opacity: 0, transform: 'scale(0.8)' },
        ],
        { duration: 520, easing: EASE.out },
        'fade-in',
      );
    }
    if (signal.aborted) return;
    overlay.hidden = true;
    overlay.replaceChildren();
    machine.send('go');
  }

  function endRound() {
    if (finished) return;
    finished = true;
    machine.send('finish');
  }

  // ---- Results ----
  function showResults() {
    statusLine.textContent = '';
    abort.abort();
    for (const w of waits) w.reject(new AbortError());
    waits = [];
    const data = store.get();
    const unscored = config.unscored?.() ?? false;
    const extra = controller?.session?.() ?? {};
    const rec: SessionRecord = {
      mode: config.mode,
      at: Date.now(),
      correct: score.correct,
      total: score.total,
      score: score.score,
      bestStreak: score.bestStreak,
      cps: diff.cps,
      durationMs: Math.round(clock),
      ...extra,
    };
    const before = summarize(data.sessions.filter((s) => s.mode === config.mode)).byMode[
      config.mode
    ];
    const prevBestScore = before?.bestScore ?? 0;
    const xp = unscored || score.total === 0 ? 0 : xpForRun(score);
    const lvlBefore = levelFromXp(data.xp);
    const lvlAfter = levelFromXp(data.xp + xp);

    if (score.total > 0) {
      store.update((d) => {
        if (!unscored) {
          d.sessions.push(rec);
          d.xp += xp;
        }
        if (config.adaptive !== false) d.skill[config.mode] = diff;
      });
      if (!unscored) config.onRecorded?.(rec, ctx);
    }

    const acc = accuracy(score);
    const isBest = !unscored && score.score > prevBestScore && prevBestScore > 0;
    const scoreEl = h('div', { class: 'res-score num' }, '0');
    const xpFill = h('div', { class: 'xp-fill' });
    const row = (label: string, value: string, tone = '') =>
      h(
        'div',
        { class: 'res-row' },
        h('span', null, label),
        h('span', { class: 'num', 'data-tone': tone || undefined }, value),
      );

    const verdict =
      score.total === 0
        ? 'No answers this round.'
        : acc >= 0.95
          ? 'Flawless counting.'
          : acc >= 0.85
            ? 'Sharp. Push the speed.'
            : acc >= 0.65
              ? 'Solid. Accuracy first, then speed.'
              : 'Slow it down and lock in the values.';

    const playAgain = h(
      'button',
      { class: 'btn btn-primary btn-lg', type: 'button', onclick: () => machine.send('restart') },
      'Play again',
    );
    const panel = h(
      'div',
      { class: 'results' },
      h('p', { class: 'eyebrow' }, unscored ? `${config.title} · practice` : config.title),
      isBest ? h('span', { class: 'badge res-best' }, 'New best') : null,
      scoreEl,
      h('p', { class: 'res-verdict' }, verdict),
      h(
        'div',
        { class: 'res-grid' },
        row(
          'Accuracy',
          score.total ? `${Math.round(acc * 100)}%` : '—',
          acc >= 0.85 ? 'pos' : acc < 0.6 ? 'neg' : '',
        ),
        row('Correct', `${score.correct}/${score.total}`),
        row('Best streak', String(score.bestStreak)),
        config.adaptive !== false ? row('Speed reached', `${diff.cps.toFixed(1)} cards/s`) : null,
        controller?.results?.() ?? null,
      ),
      xp > 0
        ? h(
            'div',
            { class: 'xp' },
            h(
              'div',
              { class: 'xp-head' },
              h('span', null, `Level ${lvlAfter.level}`),
              h('span', { class: 'num' }, `+${xp} XP`),
            ),
            h('div', { class: 'xp-track' }, xpFill),
          )
        : null,
      h(
        'div',
        { class: 'res-actions' },
        playAgain,
        h('a', { class: 'btn btn-ghost btn-lg', href: '#/' }, 'Menu'),
      ),
      h(
        'p',
        { class: 'intro-hint' },
        h('kbd', null, 'Enter'),
        ' play again · ',
        h('kbd', null, 'Esc'),
        ' menu',
      ),
    );
    overlay.hidden = false;
    overlay.replaceChildren(panel);
    void stagger(panel.children, 45);
    requestAnimationFrame(() => playAgain.focus({ preventScroll: true }));
    announce(`Round over. Score ${score.score}. ${score.correct} of ${score.total} correct.`, true);

    // Count-up score
    const target = score.score;
    const t0 = performance.now();
    const dur = reducedMotion() ? 0 : Math.min(900, 300 + target / 4);
    const step = (now: number) => {
      const p = dur ? Math.min(1, (now - t0) / dur) : 1;
      scoreEl.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);

    // XP bar fills from the old progress; if we level up, it fills then resets.
    if (xp > 0) {
      const from = lvlAfter.level > lvlBefore.level ? 0 : lvlBefore.progress;
      xpFill.style.transform = `scaleX(${from})`;
      void play(
        xpFill,
        [{ transform: `scaleX(${from})` }, { transform: `scaleX(${lvlAfter.progress})` }],
        {
          duration: 900,
          delay: 350,
          easing: EASE.out,
          fill: 'forwards',
        },
      );
      if (lvlAfter.level > lvlBefore.level) {
        setTimeout(() => {
          ctx.sfx.play('level');
          ctx.toast(`Level ${lvlAfter.level} reached`, 'gold');
          for (const u of newlyUnlocked(lvlBefore.level, lvlAfter.level))
            ctx.toast(`Unlocked: ${u.name}`, 'gold');
        }, 700);
      }
    }
  }

  el.dataset.state = machine.state;
  machine.subscribe((state) => {
    el.dataset.state = state;
    if (state === 'countdown') void runCountdown();
    else if (state === 'play') controller?.start();
    else if (state === 'results') showResults();
  });

  return {
    el,
    title: config.title,
    immersive: true,
    mounted() {
      document.addEventListener('visibilitychange', onVisibility);
      raf = requestAnimationFrame(tick);
      reset();
      showIntro();
    },
    destroy() {
      abort.abort();
      for (const w of waits) w.reject(new AbortError());
      waits = [];
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      controller?.destroy?.();
    },
    onKey(e) {
      const state = machine.state;
      if (state === 'intro' && (e.key === 'Enter' || e.key === ' ')) {
        begin();
        return true;
      }
      if (state === 'results' && (e.key === 'Enter' || e.key === 'r' || e.key === 'R')) {
        machine.send('restart');
        return true;
      }
      if (state === 'play') {
        if (controller?.onKey?.(e)) return true;
      }
      return false;
    },
  };
}

/** Shared helper: format an answer for feedback lines. */
export function signed(n: number): string {
  return formatSigned(n);
}

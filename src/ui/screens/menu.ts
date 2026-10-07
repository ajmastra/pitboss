import { stagger } from '../../animations/effects';
import { utcDateKey } from '../../logic/rng';
import { dayStreak, summarize } from '../../logic/stats';
import { MODES } from '../../modes/registry';
import { h } from '../dom';
import type { AppCtx, Screen } from '../types';

function formatMs(ms: number): string {
  const s = ms / 1000;
  return s < 60
    ? `${s.toFixed(1)}s`
    : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
}

export function menuScreen(ctx: AppCtx): Screen {
  const data = ctx.store.get();
  const summary = summarize(data.sessions);
  const today = utcDateKey();
  const daily = data.daily[today];
  const streak = dayStreak(Object.keys(data.daily));
  const prettyDate = new Date(`${today}T12:00:00Z`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

  // Suggest the first step the player hasn't got comfortable with yet.
  const recommended =
    MODES.find((m) => {
      const s = summary.byMode[m.id];
      return !s || s.sessions < 2 || s.accuracy < 0.85;
    })?.id ?? 'table';

  const tiles = MODES.map((m) => {
    const s = summary.byMode[m.id];
    const skill = data.skill[m.id];
    let stat = 'New';
    if (s) {
      if (m.metric === 'cps') stat = `${(skill?.cps ?? s.topCps).toFixed(1)} cards/s`;
      else if (m.metric === 'deck')
        stat = summary.fastestCleanDeckMs
          ? `Best ${formatMs(summary.fastestCleanDeckMs)}`
          : `${s.sessions} played`;
      else stat = `Best ${s.bestScore.toLocaleString()}`;
    }
    return h(
      'a',
      { class: `mode-tile${m.id === recommended ? ' is-next' : ''}`, href: `#/play/${m.id}` },
      h('span', { class: 'mode-step num', 'aria-hidden': 'true' }, String(m.step)),
      h(
        'span',
        { class: 'mode-body' },
        h(
          'span',
          { class: 'mode-title' },
          m.title,
          m.id === recommended ? h('span', { class: 'badge' }, 'Up next') : null,
        ),
        h('span', { class: 'mode-blurb' }, m.blurb),
      ),
      h('span', { class: 'mode-stat num' }, stat),
    );
  });

  const dailyCard = h(
    'a',
    { class: `daily-card${daily ? ' is-done' : ''}`, href: '#/play/daily' },
    h(
      'span',
      { class: 'daily-head' },
      h('span', { class: 'eyebrow' }, `Daily Deck · ${prettyDate}`),
      streak > 0
        ? h('span', { class: 'daily-streak num', title: 'Daily streak' }, `${streak}-day streak`)
        : null,
    ),
    h('span', { class: 'daily-title' }, daily ? 'Done for today' : 'Today’s shoe is ready'),
    h(
      'span',
      { class: 'daily-sub' },
      daily
        ? `${daily.score.toLocaleString()} pts · ${daily.correct}/${daily.total} checkpoints · replay for practice`
        : 'Same 52 cards for everyone, worldwide. One scored attempt.',
    ),
    h('span', { class: 'daily-cta' }, daily ? 'Practice again →' : 'Play →'),
  );

  const el = h(
    'div',
    { class: 'screen menu' },
    h(
      'section',
      { class: 'hero' },
      h('h1', { class: 'hero-title' }, 'Count It'),
      h('p', { class: 'hero-sub' }, 'Learn Hi-Lo card counting, one quick round at a time.'),
      h(
        'div',
        {
          class: 'hilo-strip',
          role: 'img',
          'aria-label':
            'Hi-Lo values: 2 through 6 are plus one, 7 through 9 are zero, 10 through Ace are minus one',
        },
        h('span', { class: 'hilo pos' }, h('b', null, '2–6'), h('i', { class: 'num' }, '+1')),
        h('span', { class: 'hilo zero' }, h('b', null, '7–9'), h('i', { class: 'num' }, '0')),
        h('span', { class: 'hilo neg' }, h('b', null, '10–A'), h('i', { class: 'num' }, '−1')),
      ),
    ),
    dailyCard,
    h('h2', { class: 'section-title' }, 'Training path'),
    h('nav', { class: 'mode-grid', 'aria-label': 'Training modes' }, tiles),
    h(
      'nav',
      { class: 'menu-links', 'aria-label': 'More' },
      h('a', { href: '#/stats' }, 'Stats'),
      h('a', { href: '#/unlocks' }, 'Unlocks'),
      h('a', { href: '#/settings' }, 'Settings'),
      h('a', { href: '#/about' }, 'About & Hi-Lo guide'),
    ),
    h(
      'p',
      { class: 'legal' },
      'Educational tool, not gambling advice. Card counting is legal, but casinos may refuse service to players they suspect of counting.',
    ),
  );

  return {
    el,
    title: '',
    mounted() {
      void stagger(el.querySelectorAll('.daily-card, .mode-tile'), 40);
    },
    onKey(e) {
      const n = Number(e.key);
      const mode = MODES.find((m) => m.step === n);
      if (mode) {
        ctx.go(`play/${mode.id}`);
        return true;
      }
      if (e.key === 'd' || e.key === 'D') {
        ctx.go('play/daily');
        return true;
      }
      return false;
    },
  };
}

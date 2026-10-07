import { stagger } from '../../animations/effects';
import { utcDateKey } from '../../logic/rng';
import { dailySeries, dayStreak, summarize } from '../../logic/stats';
import { levelFromXp } from '../../logic/progression';
import { MODES } from '../../modes/registry';
import { lineChart } from '../components/chart';
import { h } from '../dom';
import type { AppCtx, Screen } from '../types';
import { pageHead } from './page';

function fmtDuration(ms: number): string {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function statsScreen(ctx: AppCtx): Screen {
  const data = ctx.store.get();
  const sum = summarize(data.sessions);
  const lvl = levelFromXp(data.xp);
  const series = dailySeries(data.sessions, 30);
  const shortDate = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });

  const tile = (label: string, value: string, sub?: string) =>
    h(
      'div',
      { class: 'stat-tile' },
      h('span', { class: 'stat-label' }, label),
      h('span', { class: 'stat-value num' }, value),
      sub ? h('span', { class: 'stat-sub' }, sub) : null,
    );

  const tiles = h(
    'div',
    { class: 'stat-tiles' },
    tile(
      'Accuracy',
      sum.total ? `${Math.round(sum.accuracy * 100)}%` : '—',
      `${sum.correct.toLocaleString()} of ${sum.total.toLocaleString()} answers`,
    ),
    tile('Best streak', String(sum.bestStreak)),
    tile(
      'Fastest clean deck',
      sum.fastestCleanDeckMs ? `${(sum.fastestCleanDeckMs / 1000).toFixed(1)}s` : '—',
      'Full Deck, every checkpoint right',
    ),
    tile('Level', String(lvl.level), `${data.xp.toLocaleString()} XP total`),
    tile('Daily streak', `${dayStreak(Object.keys(data.daily))}`, 'days in a row'),
    tile('Time trained', fmtDuration(sum.totalMs), `${sum.sessions} rounds`),
  );

  const accChart = lineChart({
    title: 'Accuracy · last 30 days',
    points: series.map((p) => ({
      label: shortDate(p.date),
      value: p.accuracy === null ? null : Math.round(p.accuracy * 100),
    })),
    min: 0,
    max: 100,
    ticks: [0, 50, 100],
    format: (v) => `${v}%`,
  });
  const topCps = Math.max(2, ...series.map((p) => p.topCps ?? 0));
  const cpsMax = Math.ceil(topCps);
  const speedChart = lineChart({
    title: 'Top speed · cards per second',
    points: series.map((p) => ({ label: shortDate(p.date), value: p.topCps })),
    min: 0,
    max: cpsMax,
    ticks: [0, cpsMax / 2, cpsMax],
    format: (v) => `${Number.isInteger(v) ? v : v.toFixed(1)}/s`,
  });

  const rows = MODES.map((m) => {
    const s = sum.byMode[m.id];
    return h(
      'tr',
      null,
      h('th', { scope: 'row' }, m.title),
      h('td', { class: 'num col-rounds' }, s ? String(s.sessions) : '0'),
      h('td', { class: 'num' }, s && s.total ? `${Math.round(s.accuracy * 100)}%` : '—'),
      h('td', { class: 'num' }, s ? s.bestScore.toLocaleString() : '—'),
      h('td', { class: 'num' }, s && s.topCps ? `${s.topCps.toFixed(1)}/s` : '—'),
    );
  });
  const table = h(
    'div',
    { class: 'table-wrap' },
    h(
      'table',
      { class: 'data-table' },
      h('caption', { class: 'sr-only' }, 'Results by mode'),
      h(
        'thead',
        null,
        h(
          'tr',
          null,
          ...['Mode', 'Rounds', 'Accuracy', 'Best', 'Top speed'].map((t) =>
            h('th', { scope: 'col', class: t === 'Rounds' ? 'col-rounds' : undefined }, t),
          ),
        ),
      ),
      h('tbody', null, ...rows),
    ),
  );

  const recentDaily = Object.entries(data.daily)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, 7)
    .map(([date, r]) =>
      h(
        'li',
        null,
        h('span', null, date === utcDateKey() ? 'Today' : shortDate(date)),
        h('span', { class: 'num' }, `${r.score} pts · ${r.correct}/${r.total}`),
      ),
    );

  const el = h(
    'div',
    { class: 'screen page stats' },
    pageHead('Stats', 'All stored on this device only.'),
    tiles,
    h('section', { class: 'panel' }, accChart),
    h('section', { class: 'panel' }, speedChart),
    h('section', { class: 'panel' }, h('h2', { class: 'panel-title' }, 'By mode'), table),
    recentDaily.length
      ? h(
          'section',
          { class: 'panel' },
          h('h2', { class: 'panel-title' }, 'Daily Deck history'),
          h('ul', { class: 'daily-list' }, ...recentDaily),
        )
      : null,
  );
  return {
    el,
    title: 'Stats',
    mounted() {
      void stagger(el.querySelectorAll('.stat-tile, .panel'), 35);
    },
  };
}

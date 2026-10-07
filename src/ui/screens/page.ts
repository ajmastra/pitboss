import { h } from '../dom';

/** Standard page header with a back link. */
export function pageHead(title: string, sub?: string): HTMLElement {
  return h(
    'header',
    { class: 'page-head' },
    h('a', { class: 'back-link', href: '#/', 'aria-label': 'Back to menu' }, '←'),
    h('div', null, h('h1', null, title), sub ? h('p', { class: 'page-sub' }, sub) : null),
  );
}

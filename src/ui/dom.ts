type Child = Node | string | number | null | undefined | false;
type Children = (Child | Child[])[];
type Props = Record<string, unknown>;

const SVG_NS = 'http://www.w3.org/2000/svg';

function applyProps(el: Element, props: Props | undefined): void {
  if (!props) return;
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (key === 'class') {
      el.setAttribute('class', String(value));
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign((el as HTMLElement).style, value);
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.assign((el as HTMLElement).dataset, value);
    } else if (value === true) {
      el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(value));
    }
  }
}

function appendChildren(el: Element, children: Children): void {
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
}

/** Tiny hyperscript helper for HTML elements. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props | null,
  ...children: Children
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  applyProps(el, props ?? undefined);
  appendChildren(el, children);
  return el;
}

/** Same as h() but in the SVG namespace. */
export function s<K extends keyof SVGElementTagNameMap>(
  tag: K,
  props?: Props | null,
  ...children: Children
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  applyProps(el, props ?? undefined);
  appendChildren(el, children);
  return el;
}

/** Push a message to a screen-reader live region (re-announces repeats). */
export function announce(message: string, assertive = false): void {
  const region = document.getElementById(assertive ? 'sr-alert' : 'sr-live');
  if (!region) return;
  region.textContent = '';
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

export function clear(el: Element): void {
  el.replaceChildren();
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Resolves on the next animation frame. */
export const nextFrame = () => new Promise<number>((r) => requestAnimationFrame(r));

/**
 * Reduced-motion-aware wrapper around the Web Animations API. Every effect
 * in the app goes through here so a single switch downgrades big motion to
 * quick fades.
 */
export const EASE = {
  out: 'cubic-bezier(0.22, 1, 0.36, 1)',
  inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  in: 'cubic-bezier(0.55, 0, 1, 0.45)',
} as const;

const media =
  typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

export function reducedMotion(): boolean {
  const pref = document.documentElement.dataset.motion;
  if (pref === 'reduced') return true;
  if (pref === 'full') return false;
  return media?.matches ?? false;
}

export type Fallback = 'fade-in' | 'fade-out' | 'none';

/**
 * Run `keyframes` on `el`. Under reduced motion, runs a short opacity fade
 * (or nothing) instead. Always resolves — cancellations are swallowed.
 */
export function play(
  el: Element,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
  fallback: Fallback = 'none',
): Promise<void> {
  let anim: Animation;
  if (reducedMotion()) {
    if (fallback === 'none') return Promise.resolve();
    anim = el.animate(
      fallback === 'fade-in' ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }],
      { duration: 150, easing: 'linear', fill: options.fill ?? 'none' },
    );
  } else {
    anim = el.animate(keyframes, options);
  }
  return anim.finished.then(
    () => undefined,
    () => undefined,
  );
}

/** Cancel every running WAAPI animation on an element and its subtree. */
export function cancelAll(root: Element): void {
  for (const a of root.getAnimations({ subtree: true })) a.cancel();
}

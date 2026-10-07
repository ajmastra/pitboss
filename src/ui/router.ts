export interface Route {
  name: string;
  params: string[];
}

export function parseHash(hash: string = location.hash): Route {
  const path = hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  const parts = path.split('/').filter(Boolean);
  return { name: parts[0] ?? 'menu', params: parts.slice(1) };
}

export function navigate(path: string): void {
  const target = `#/${path.replace(/^\//, '')}`;
  if (location.hash === target) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = target;
}

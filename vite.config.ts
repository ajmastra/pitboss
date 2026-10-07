/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// GitHub Pages serves project sites from /<repo>/. The deploy workflow sets
// VITE_BASE accordingly; locally we default to '/'.
function resolveBase(): string {
  const raw = process.env.VITE_BASE ?? '/';
  const withLead = raw.startsWith('/') ? raw : `/${raw}`;
  return withLead.endsWith('/') ? withLead : `${withLead}/`;
}

export default defineConfig({
  base: resolveBase(),
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
  },
});

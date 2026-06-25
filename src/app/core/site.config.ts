/**
 * The canonical public origin of the landing site (apex domain, no trailing
 * slash). Single source of truth for canonical/OG URLs, hreflang, JSON-LD, the
 * sitemap and robots.txt — used by both the Angular bundle and the Express
 * server (src/server.ts).
 *
 * Override per environment with the SITE_URL env var, read during SSR/prerender.
 * The browser bundle has no process.env, so it falls back to the literal below
 * (which the SEO service then keeps in sync with whatever was prerendered).
 */
export const SITE_URL = (
  (typeof process !== 'undefined' && process.env?.['SITE_URL']) || 'https://salut.rocks'
).replace(/\/$/, '');

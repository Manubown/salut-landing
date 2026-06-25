import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { umamiOrigin } from './app/core/analytics/analytics.config';
import { EVENTS_API } from './app/core/events/events.config';
import { SITE_URL } from './app/core/site.config';

const browserDistFolder = join(import.meta.dirname, '../browser');

// The waitlist lives in the Salut backend (api.salut.rocks). The browser talks
// to this same-origin Express endpoint (no CORS); we forward server-to-server
// to the API. Override per environment with WAITLIST_API_URL.
const waitlistApiUrl = (
  process.env['WAITLIST_API_URL'] || 'https://api.salut.rocks'
).replace(/\/$/, '');
// The Salut app backend. Early-access pre-registration is proxied here
// server-to-server so the browser only ever talks to this same origin (DSGVO:
// no cross-origin request fired from the page). Override with SALUT_API_URL.
const salutApiUrl = (
  process.env['SALUT_API_URL'] || 'https://api.salut.rocks'
).replace(/\/$/, '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UPSTREAM_TIMEOUT_MS = 8000;

const app = express();

// SSR runs behind a TLS-terminating reverse proxy (the X-Forwarded-Server header
// is an Apache/Traefik signature). Angular's SSR engine (v20+) hardens against
// SSRF by (a) rejecting any Host / X-Forwarded-Host that isn't allow-listed and
// (b) refusing to trust X-Forwarded-* headers it wasn't told about — in both
// cases silently falling back to client-side rendering (a hard 400 in a future
// major). So we must allow our own domains AND trust the forwarding headers the
// proxy actually sets. Note: `trustProxyHeaders: true` only covers the five
// standard X-Forwarded-* headers and would still de-opt on the non-standard
// X-Forwarded-Server, so we pass an explicit list. This is safe against host
// spoofing because allowedHosts still gates the (forwarded) Host value.
// Override the domains per environment with NG_ALLOWED_HOSTS (comma-separated).
// `localhost` keeps direct hits working (health checks, running the prod build
// locally on :4000) — without it those now hard-400 since allowedHosts is set.
const allowedHosts = (process.env['NG_ALLOWED_HOSTS'] || 'salut.rocks,www.salut.rocks,localhost')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

const angularApp = new AngularNodeAppEngine({
  allowedHosts,
  trustProxyHeaders: [
    'x-forwarded-host',
    'x-forwarded-proto',
    'x-forwarded-port',
    'x-forwarded-for',
    'x-forwarded-prefix',
    'x-forwarded-server',
  ],
});

// Security + privacy headers on every response. The CSP is self-only apart
// from the self-hosted Umami origin (no third-party trackers/CDNs — see DSGVO
// stance): scripts/styles allow 'unsafe-inline' because Angular SSR + hydration
// (withEventReplay) injects an inline bootstrap script and inlines component
// <style> blocks. Tightening script-src to a per-request nonce is the follow-up
// for a perfect Best-Practices score. Permissions-Policy also opts out of
// FLoC/Topics. When Umami is configured, its origin is allowed to serve the
// tracker (script-src) and receive the cookieless beacon (connect-src).
const analyticsOrigin = umamiOrigin();
const scriptSrc = ["'self'", "'unsafe-inline'", analyticsOrigin].filter(Boolean).join(' ');
// The browser reads the public events API directly (first-party data, no PII),
// so its origin must be allowed for fetch/XHR. Event cover/gallery images can be
// hosted anywhere in the curated set, so img-src allows any https origin.
const connectSrc = ["'self'", analyticsOrigin, EVENTS_API].filter(Boolean).join(' ');
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `script-src ${scriptSrc}`,
  `connect-src ${connectSrc}`,
  'upgrade-insecure-requests',
].join('; ');

app.use((_req, res, next) => {
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()',
  );
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains',
  );
  next();
});

// Liveness/readiness probe for Coolify (and uptime monitors). It's a plain
// Express route, so it never reaches Angular's SSRF host check: a probe that
// hits the container by IP or service name (i.e. a Host that isn't in
// allowedHosts) still gets 200 instead of the 400 that would mark the container
// unhealthy and stop Traefik from routing to it. Point Coolify's health-check
// path at /healthz.
app.get('/healthz', (_req, res) => {
  res.status(200).type('text/plain').send('ok');
});

app.use(express.json({ limit: '8kb' }));

async function callApi(
  path: string,
  init: RequestInit,
  base: string = waitlistApiUrl,
): Promise<{ status: number; body: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const resp = await fetch(`${base}${path}`, {
      ...init,
      signal: controller.signal,
    });
    const body = await resp.json().catch(() => null);
    return { status: resp.status, body };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Waitlist sign-up. Fast-fails obviously invalid emails, then proxies to the
 * API (POST /waitlist), forwarding the user-agent. The API de-duplicates and
 * returns the subscriber's position.
 */
app.post('/api/subscribe', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    res.status(400).json({ ok: false, error: 'invalid_email' });
    return;
  }

  const payload: Record<string, string> = { email };
  if (typeof req.body?.ref === 'string') {
    payload['ref'] = req.body.ref.slice(0, 64);
  }
  if (typeof req.body?.locale === 'string') {
    payload['locale'] = req.body.locale.slice(0, 10);
  }

  try {
    const { status, body } = await callApi('/waitlist', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': (req.headers['user-agent'] ?? '').toString().slice(0, 256),
      },
      body: JSON.stringify(payload),
    });
    res.status(status).json(body ?? { ok: false, error: 'bad_upstream' });
  } catch {
    res.status(502).json({ ok: false, error: 'upstream_unreachable' });
  }
});

/** Lightweight count, for any "N people waiting" UI. */
app.get('/api/subscribe/count', async (_req, res) => {
  try {
    const { body } = await callApi('/waitlist/count', { method: 'GET' });
    const count =
      body && typeof (body as { count?: unknown }).count === 'number'
        ? (body as { count: number }).count
        : 0;
    res.json({ ok: true, count });
  } catch {
    res.json({ ok: true, count: 0 });
  }
});

/**
 * Early-access pre-registration. Validates input, then proxies server-to-server
 * to the Salut backend (POST /public/api/preregister).
 */
app.post('/api/preregister', async (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const username = String(req.body?.username ?? '').trim();
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const age = Number(req.body?.age);

  if (!name || !username || !EMAIL_RE.test(email) || email.length > 254) {
    res.status(400).json({ ok: false, error: 'invalid' });
    return;
  }
  if (!Number.isFinite(age) || age < 18 || age > 120) {
    res.status(400).json({ ok: false, error: 'age' });
    return;
  }

  try {
    const { status, body } = await callApi(
      '/public/api/preregister',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.slice(0, 80),
          username: username.slice(0, 40),
          email,
          age,
          source: 'landing',
        }),
      },
      salutApiUrl,
    );
    res.status(status).json(body ?? { ok: false, error: 'bad_upstream' });
  } catch {
    res.status(502).json({ ok: false, error: 'upstream_unreachable' });
  }
});

// robots.txt + sitemap.xml are generated from SITE_URL so the canonical origin
// lives in exactly one place (DRY with the in-app canonical/OG/hreflang tags).
// A static .txt/.xml can't read an env var, so we serve them here — registered
// before express.static and the Angular catch-all so these win.
app.get('/robots.txt', (_req, res) => {
  res
    .type('text/plain')
    .send(
      [
        'User-agent: *',
        'Allow: /',
        '',
        '# Legal pages are noindex via meta tags (crawlers must still fetch',
        '# them) — intentionally not disallowed here.',
        '',
        `Sitemap: ${SITE_URL}/sitemap.xml`,
        '',
      ].join('\n'),
    );
});

// Public, indexable routes with their de/en hreflang pairs (x-default → en).
const SITEMAP_ENTRIES: ReadonlyArray<{
  path: string;
  de: string;
  en: string;
  lastmod: string;
  priority: string;
}> = [
  { path: '/', de: '/', en: '/en', lastmod: '2026-06-06', priority: '1.0' },
  { path: '/en', de: '/', en: '/en', lastmod: '2026-06-06', priority: '0.9' },
  { path: '/early-access', de: '/early-access', en: '/en/early-access', lastmod: '2026-06-08', priority: '0.8' },
  { path: '/en/early-access', de: '/early-access', en: '/en/early-access', lastmod: '2026-06-08', priority: '0.8' },
];

app.get('/sitemap.xml', (_req, res) => {
  const urls = SITEMAP_ENTRIES.map((e) =>
    [
      '  <url>',
      `    <loc>${SITE_URL}${e.path}</loc>`,
      `    <xhtml:link rel="alternate" hreflang="de" href="${SITE_URL}${e.de}"/>`,
      `    <xhtml:link rel="alternate" hreflang="en" href="${SITE_URL}${e.en}"/>`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${e.en}"/>`,
      `    <lastmod>${e.lastmod}</lastmod>`,
      '    <changefreq>weekly</changefreq>',
      `    <priority>${e.priority}</priority>`,
      '  </url>',
    ].join('\n'),
  ).join('\n');
  res
    .type('application/xml')
    .send(
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
        `        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
        `${urls}\n` +
        `</urlset>\n`,
    );
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

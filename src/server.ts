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

const browserDistFolder = join(import.meta.dirname, '../browser');

// The waitlist now lives in the salut-api service (NestJS + Postgres). The
// browser still talks to this same-origin Express endpoint (no CORS); we
// forward server-to-server to the API. Staging api.salut.bown.at, launch
// api.salut.com — override per environment with WAITLIST_API_URL.
const waitlistApiUrl = (
  process.env['WAITLIST_API_URL'] || 'https://api.salut.bown.at'
).replace(/\/$/, '');
// The Salut app backend (Go). Early-access pre-registration is proxied here
// server-to-server so the browser only ever talks to this same origin (DSGVO:
// no cross-origin request fired from the page). Override with SALUT_API_URL.
const salutApiUrl = (
  process.env['SALUT_API_URL'] || 'https://salut-api.bressler.at'
).replace(/\/$/, '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UPSTREAM_TIMEOUT_MS = 8000;

const app = express();
const angularApp = new AngularNodeAppEngine();

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

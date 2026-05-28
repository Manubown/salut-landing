import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

// The waitlist now lives in the salut-api service (NestJS + Postgres). The
// browser still talks to this same-origin Express endpoint (no CORS); we
// forward server-to-server to the API. Staging api.salut.bown.at, launch
// api.salut.com — override per environment with WAITLIST_API_URL.
const waitlistApiUrl = (
  process.env['WAITLIST_API_URL'] || 'https://api.salut.bown.at'
).replace(/\/$/, '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UPSTREAM_TIMEOUT_MS = 8000;

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.json({ limit: '8kb' }));

async function callApi(
  path: string,
  init: RequestInit,
): Promise<{ status: number; body: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const resp = await fetch(`${waitlistApiUrl}${path}`, {
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

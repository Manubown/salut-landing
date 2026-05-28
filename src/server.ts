import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

// Where confirmed waitlist emails land. On Coolify this points at a
// persistent volume (DATA_DIR=/data); locally it falls back to ./.data so
// dev never writes outside the project. Replaced by Postgres in the
// backend phase — the API contract (POST /api/subscribe) stays the same.
const dataDir = process.env['DATA_DIR'] || join(process.cwd(), '.data');
const subscribersFile = join(dataDir, 'subscribers.jsonl');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readEmails(): string[] {
  if (!existsSync(subscribersFile)) {
    return [];
  }
  return readFileSync(subscribersFile, 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      try {
        return String(JSON.parse(line).email ?? '').toLowerCase();
      } catch {
        return '';
      }
    })
    .filter(Boolean);
}

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.json({ limit: '8kb' }));

/**
 * Waitlist sign-up. Validates, de-duplicates and appends to a JSONL file
 * on the persistent data volume, returning the subscriber's position.
 */
app.post('/api/subscribe', (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    res.status(400).json({ ok: false, error: 'invalid_email' });
    return;
  }

  try {
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    const existing = readEmails();
    const already = existing.indexOf(email);
    if (already !== -1) {
      res.json({ ok: true, position: already + 1, alreadySubscribed: true });
      return;
    }

    const record = {
      email,
      ts: new Date().toISOString(),
      ref: typeof req.body?.ref === 'string' ? req.body.ref.slice(0, 64) : '',
      ua: (req.headers['user-agent'] ?? '').toString().slice(0, 256),
    };
    appendFileSync(subscribersFile, JSON.stringify(record) + '\n', 'utf8');
    res.json({ ok: true, position: existing.length + 1 });
  } catch {
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

/** Lightweight count, for any "N people waiting" UI. */
app.get('/api/subscribe/count', (_req, res) => {
  try {
    res.json({ ok: true, count: readEmails().length });
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

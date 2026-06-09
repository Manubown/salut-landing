/**
 * The public Salut backend (the Go `salut-backend`) that serves the curated,
 * unauthenticated events read API — `GET /public/api/events` and
 * `GET /public/api/events/:id`. The landing reads it directly (CORS is `*` and
 * the data carries no PII), so this origin must be allowed in the server CSP's
 * `connect-src` (see src/server.ts).
 *
 * Single change-point for launch (→ api.salut.com). Mirrors the SITE_URL/APP_URL
 * constant convention used elsewhere in the landing.
 */
export const EVENTS_API = 'https://salut-api.bressler.at';

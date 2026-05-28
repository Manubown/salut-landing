# salut-landing

The growth surface for **Salut** — a marketing + onboarding site built to be
fast, SEO-indexable, and to convert visitors into a launch **waitlist**.

Salut helps people have better nights out: **cocktail recipes worth trying**,
the **hottest events in your region**, and a way to **group up with friends**
to go together. (Drink-tracking, leaderboards and party games carry over from
the original app as heritage features.)

This repo is one of two:

| Repo | What it is | Rendering | Indexed? |
|---|---|---|---|
| **salut-landing** (here) | Marketing + waitlist onboarding | Angular **SSR + prerender** | Yes — SEO-first |
| **salut-app** (sibling) | The authenticated product | Angular **SPA** | No (`noindex`) |

## Stack

- **Angular 21** — standalone components, signals, native control flow (`@if`/`@for`)
- **SSR + static prerender** via `@angular/ssr` (Express server in `src/server.ts`)
- **SCSS design tokens** (`src/styles/_tokens.scss`) — the "Tactile & Gamified" system
- **Self-hosted fonts** (`@fontsource/space-grotesk`) — no Google Fonts request (DSGVO)
- Waitlist persistence: proxied server-to-server to the **salut-api** service
  (NestJS + Postgres). The browser stays same-origin; no local data volume.

## Quickstart

```bash
npm ci                 # install (Node 22 — see .nvmrc)
npm start              # dev server at http://localhost:4200
npm run build          # production build -> dist/salut-landing
npm run serve:ssr:salut-landing   # run the built SSR server (port 4000)
```

Verify SSR is actually rendering tags server-side:

```bash
npm run build && npm run serve:ssr:salut-landing
curl -s localhost:4000 | grep -i "<title>"   # should show the rendered title
```

## Docker

```bash
docker build -t salut-landing .
docker run --rm -p 8080:4000 -e WAITLIST_API_URL=https://api.salut.bown.at salut-landing
# -> http://localhost:8080  (waitlist sign-ups proxy to salut-api)
```

The image runs the SSR Node server on port 4000 as a non-root user. Waitlist
sign-ups are proxied server-to-server to `WAITLIST_API_URL` (the salut-api
service); there is no local data volume.

## Project layout

```
src/
  index.html                       static <head>: title, OG, canonical, theme-color
  server.ts                        Express SSR entry + POST /api/subscribe (waitlist)
  styles.scss                      global styles (resets, .btn, .legal prose)
  styles/_tokens.scss              design tokens (color/space/radius/type/shadow/motion)
  app/
    app.config.ts                  providers: router, client hydration, http
    app.routes.ts                  '', 'impressum', 'datenschutz' (all lazy)
    app.routes.server.ts           prerender config
    core/seo/seo.service.ts        Title/Meta/canonical/JSON-LD — SITE_URL lives here
    core/api/subscribe.service.ts  POST /api/subscribe client
    components/notify-form/        the email-capture form (reactive, signals)
    pages/home/                    the landing page (hero, features, CTA, footer)
    pages/legal/                   Impressum + Datenschutz (Austrian legal pages)
public/                            robots.txt, sitemap.xml, favicon
Dockerfile  docker-compose.yml     Coolify deploy (Dockerfile app, expose :4000)
.devcontainer/                     Coder / VS Code dev container (Node 22)
```

## Domains

| | Now (staging) | At launch |
|---|---|---|
| Landing | `https://salut.bown.at` | `https://salut.com` |
| App | `https://app.salut.bown.at` | `https://app.salut.com` |
| API | `https://api.salut.bown.at` | `https://api.salut.com` |

The public origin is centralised in **`src/app/core/seo/seo.service.ts`**
(`SITE_URL`). Switching to production is that constant plus the static files
listed in [`continue.md`](./continue.md).

Infrastructure: **Coolify** at `coolify.bown.at`, **Coder** workspaces at
`coder.bown.at`.

## The docs

| Doc | Purpose |
|---|---|
| [scope.md](./scope.md) | What we're building and why; success metrics; page/funnel inventory |
| [plan.md](./plan.md) | Phased roadmap, architecture, deployment & cutover |
| [instructions.md](./instructions.md) | Dev setup + conventions (Angular, SEO, i18n, a11y, deploy) |
| [guide.md](./guide.md) | The design system & brand guide ("Tactile & Gamified") |
| [todo.md](./todo.md) | Actionable checklist for the current phase |
| [continue.md](./continue.md) | "Resume here" — current state, what's done, what's next |

Sibling repo: **`../salut-app`**. Master plan: `Server/`-level planning notes.

# Instructions — salut-landing

How to develop, what conventions to follow, and how to deploy. Read alongside
[guide.md](./guide.md) (design) and [plan.md](./plan.md) (architecture).

## Dev setup

### In a Coder workspace (preferred)
Workspaces live at **`coder.bown.at`**. This repo ships a `.devcontainer`
(`mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm`) so the
toolchain is reproducible.

```bash
npm ci
npm start          # ng serve -> http://localhost:4200 (port 4200 is forwarded)
```

### Local
- **Node 22** (see `.nvmrc`; `nvm use`).
- `npm ci && npm start`.

### Useful scripts
| Command | Does |
|---|---|
| `npm start` | dev server (HMR) at :4200 |
| `npm run build` | production build → `dist/salut-landing/{browser,server}` |
| `npm run serve:ssr:salut-landing` | run the built SSR server (:4000) |
| `npm test` | unit tests (Vitest) |

## Angular conventions
- **Standalone components only** — no NgModules. Set `imports` on each component.
- **Signals** for component state; `input()` / `output()` for IO. Avoid
  `@Input`/`@Output` decorators in new code.
- **Native control flow** — `@if`, `@for` (with `track`), `@switch`. Not
  `*ngIf`/`*ngFor`.
- **`ChangeDetectionStrategy.OnPush`** on every component.
- **Lazy routes** — `loadComponent` in `app.routes.ts`. Keeps the initial bundle
  small and each route prerendered to its own chunk.
- **SCSS + tokens** — never hardcode a color/size; use the custom properties from
  `styles/_tokens.scss` (e.g. `var(--primary)`, `var(--s-4)`, `var(--r-lg)`).
  Component styles stay under the budget (warn 8 kB / error 16 kB); shared prose
  (like the legal pages) lives in global `styles.scss`.
- **`DOCUMENT`** is imported from `@angular/core` (not `@angular/common`) in v21.
- **`@` in templates** must be written `&#64;` — a bare `@` starts a control-flow
  block and will break the parser (matters for email addresses in legal pages).

## SEO rules (this is an SEO-first site)
- Every **indexable** route sets its tags via `SeoService.apply({...})` in
  `ngOnInit`, so they render during SSR/prerender. Never set meta only in the
  browser.
- Pass a **`path`** (e.g. `'/'`, `'/impressum'`) — `SeoService` composes the
  absolute URL from `SITE_URL`. Don't hardcode the origin in pages.
- **Canonical** is set automatically by `apply()`. One per page.
- **JSON-LD** via `seo.setJsonLd({...})` for structured data (Organization /
  WebSite on home).
- **Legal pages** are `robots: 'noindex, follow'` — present for users + crawlers,
  but kept out of the index.
- Keep `public/robots.txt` and `public/sitemap.xml` in sync with the routes.
- After changes, verify: `npm run build && curl -s localhost:4000 | grep '<title>'`.

## i18n (DE + EN)
- Launch market is German-speaking (AT). Copy must exist in **DE and EN**.
- Use Angular i18n (`@angular/localize`) or a lightweight runtime dictionary —
  decide before adding a second locale (tracked in [todo.md](./todo.md)). Either
  way, keep marketing copy out of component logic so it's translatable.
- Legal pages (Impressum/Datenschutz) are **German** by law/locale and stay
  German.

## Accessibility (WCAG AA)
- Semantic landmarks (`header`/`main`/`footer`/`nav`), one `<h1>` per page.
- Skip-link to main content (already on home).
- Visible focus states (use `--ring`); never remove outlines without a replacement.
- Color contrast ≥ AA — verify any new color pairing against the tokens.
- Honor `prefers-reduced-motion` (global rule already disables transitions).
- Forms: labelled inputs, errors announced (the notify-form uses `aria-live`).

## Privacy / DSGVO (non-negotiable)
- **No third-party runtime requests.** Fonts are self-hosted via `@fontsource`.
  Do **not** add Google Fonts, a CDN script, or an external embed — that
  transfers visitor IPs to a third country and breaks our no-banner posture.
- **No cookies, no trackers** by default. Any analytics must be cookieless and
  self-hosted; if that changes, a consent banner becomes mandatory.
- **Waitlist** stores email + timestamp + truncated UA + referrer — **no IP**.
  It is explicit consent (Art. 6(1)(a)) and withdrawable (see Datenschutz §04).
- If you add any data collection, update `pages/legal/datenschutz.html`.

## Testing
- **Unit** (Vitest): SeoService URL composition, SubscribeService, notify-form
  validation/states.
- **Server**: `POST /api/subscribe` — valid, invalid, duplicate, oversize.
- **Lighthouse**: target ≥ 95 Performance/SEO/Best-Practices/Accessibility
  (run against the built SSR server, not the dev server).
- **(Later) Playwright**: the funnel — load home, submit email, see "#N in line".

## Deploy (Coolify on Hetzner)
1. Push to `main`. Coolify builds the `Dockerfile` and deploys.
2. App uses **`expose: 80`**; Traefik terminates TLS at the domain.
3. Mount a **persistent volume at `/data`** (the waitlist file). It must survive
   redeploys — verify after the first deploy.
4. Set domain: **`salut.bown.at`** (staging) now. At launch, see the domain
   cutover steps in [plan.md](./plan.md) / [continue.md](./continue.md).
5. Env: `PORT` (Coolify/Traefik), `DATA_DIR=/data`. See `.env.example`.

### Docker locally
```bash
docker build -t salut-landing .
docker run --rm -p 8080:80 -v salut-landing-data:/data salut-landing
```

## The waitlist endpoint (contract)
`POST /api/subscribe` `{ "email": "x@y.z", "ref"?: "..." }`
→ `200 { ok: true, position: N }` (or `{ ...alreadySubscribed: true }`)
→ `400 { ok: false, error: "invalid_email" }`
`GET /api/subscribe/count` → `{ ok: true, count: N }`

This contract is frozen — Phase 2 swaps JSONL for Postgres behind it without
touching `SubscribeService` or the form.

# Plan — salut-landing

Repo-specific roadmap, architecture, and deployment. For the product itself see
the sibling **`../salut-app`**; for the cross-repo master plan see the
`Server/`-level planning notes.

## Where this fits
Two independently deployable properties:
- **salut-landing** (this repo) — SEO-first SSR marketing + waitlist.
- **salut-app** — the authenticated SPA product.

Split so the public growth surface and the product have independent uptime,
risk and release cadence.

## Architecture

```
Browser ──► Coolify / Traefik (TLS) ──► salut-landing container (Node, :80)
                                              │
                          ┌───────────────────┴───────────────────┐
                          │ Angular SSR (renders HTML, hydrates)   │
                          │ Express (src/server.ts)                │
                          │   GET  *              → SSR/prerender  │
                          │   POST /api/subscribe → waitlist JSONL │
                          │   GET  /api/subscribe/count            │
                          └───────────────────┬───────────────────┘
                                              ▼
                                   /data volume (subscribers.jsonl)
```

Key decisions:
- **SSR + static prerender** (`@angular/ssr`, `RenderMode.Prerender` on `**`).
  Static marketing routes are prerendered at build; the Node server serves them
  and handles the waitlist API. Best of SEO (fully rendered HTML) and dynamic
  (a real endpoint) without a separate backend.
- **Standalone + signals + native control flow** — no NgModules.
- **Waitlist = JSONL on a volume**, not a database. The landing stays a single
  self-contained Dockerfile app, deployable today. The `POST /api/subscribe`
  contract is the migration seam to Postgres in Phase 2.
- **No third-party runtime assets.** Fonts self-hosted via `@fontsource`. This
  keeps us DSGVO-clean and removes a render-blocking dependency.
- **One source of truth for the public origin**: `SITE_URL` in
  `core/seo/seo.service.ts`.

## Phased roadmap

### Phase 0 — Scaffold ✅ (done)
Angular SSR skeleton, design tokens, Dockerfile, devcontainer, the 7 docs.

### Phase 1 — Landing + onboarding (current)
- [x] Tactile & Gamified design system (tokens + global styles)
- [x] Home page (hero, three pillars, CTA, footer)
- [x] Email waitlist (form + `/api/subscribe` + JSONL persistence)
- [x] SEO baseline (SeoService, JSON-LD, robots.txt, sitemap.xml)
- [x] Legal: Impressum + Datenschutz (Austrian, DSGVO)
- [x] Self-hosted fonts
- [ ] Real content + final copy polish, OG image asset
- [ ] DE + EN i18n wired up
- [ ] Lighthouse ≥ 95 across the board; indexing verified in Search Console
- [ ] Deploy to `salut.bown.at` via Coolify
- [ ] *(stretch)* double opt-in confirmation email

See [todo.md](./todo.md) for the granular checklist.

### Phase 2 — Backend/API + auth (in salut-app's plan)
NestJS + Postgres + Prisma; own auth. The waitlist migrates from JSONL to
Postgres behind the **same** `POST /api/subscribe` contract — at most a small
change to `src/server.ts` (or the endpoint moves to the API and the landing
proxies it).

### Phase 3 — App parity (in salut-app)
Rebuild product features against the new API.

## Deployment plan (Coolify on Hetzner)

- One Coolify **Dockerfile application**, auto-deploy on push to `main`.
- Use **`expose`** (not host `ports`); Coolify's Traefik terminates TLS at the
  domain. `restart: unless-stopped`. (`docker-compose.yml` here is the reference
  shape; Coolify can also build the Dockerfile directly.)
- **Persistent volume** mounted at `/data` for `subscribers.jsonl` — must
  survive redeploys. This is the one piece of state; back it up.
- Health: container serves `GET /` (SSR) on `:80`.

| Environment | URL | Notes |
|---|---|---|
| Staging (now) | `https://salut.bown.at` | active test domain |
| Production (launch) | `https://salut.com` | flip `SITE_URL` + static files |

Infra: Coolify `coolify.bown.at`, Coder `coder.bown.at`.

## Domain cutover (staging → production)
When `salut.com` is live, change the public origin in these places (kept
deliberately few):
1. `src/app/core/seo/seo.service.ts` → `SITE_URL`
2. `src/index.html` → canonical + `og:url` + `og:image`
3. `public/robots.txt` → `Sitemap:` line
4. `public/sitemap.xml` → `<loc>`
5. `src/app/pages/legal/impressum.html` → the "Web" link
6. Coolify: point the production domain at the app, keep the `/data` volume.

(See [continue.md](./continue.md) for the exact line references.)

## Risks & mitigations
- **Waitlist volume not persisted** → emails lost on redeploy. *Mitigation:*
  named/persistent volume at `/data`; verify after first deploy; back up.
- **SEO regressions** (client-only meta) → *Mitigation:* set all meta via
  `SeoService` in `ngOnInit` so it renders during prerender; CI Lighthouse check.
- **DSGVO drift** (someone adds a CDN font / analytics) → *Mitigation:* documented
  ban in [instructions.md](./instructions.md); review network tab in CI/manually.
- **Token drift between the two repos** → *Mitigation:* tokens duplicated for
  now; if drift bites, extract a shared `@salut/ui` package (noted in the master
  plan).

# TODO — salut-landing

Current phase: **Phase 1 — Landing + onboarding.** Checklist for getting a
deploy-ready, indexable, converting landing live on `salut.bown.at`.

## Finalisation workflow (in order)
The path to a *finalised* landing — deployed, indexed, converting, hardened.
Each milestone is a cluster of the checkboxes below.

1. **M1 · Ship it (deploy).** Finish the in-progress Coolify deploy: deploy
   **salut-api** first (as a *Docker Compose* resource), then the landing with
   Domains `https://salut.bown.at` (with scheme) + Ports Exposes `4000`.
   Smoke-test: home renders, form submits, count increments. → *Deploy*.
2. **M2 · Content & brand.** Final DE/EN hero + marketing copy, real
   cocktail/event imagery (replace the emoji placeholders), `og-image.png`,
   favicons. → *Content & polish*.
3. **M3 · i18n.** Wire DE + EN. → *Content & polish* (i18n line).
4. **M4 · SEO & performance.** Add `Organization` JSON-LD, hit Lighthouse ≥ 95
   on all four, submit the sitemap to Search Console, confirm home indexed.
   → *SEO & performance*.
5. **M5 · Harden & a11y.** Rate-limit + honeypot on the waitlist; keyboard /
   screen-reader / contrast passes. → *Waitlist hardening* + *Accessibility*.
6. **M6 · (stretch) Double opt-in email.** Needs an email provider — deferred
   until you want it.

After M5 the landing is "finalised". *Launch cutover* (→ `salut.com`) is a
separate, later milestone (bottom of this file).

## Done (Phase 0 + early Phase 1)
- [x] Angular 21 SSR scaffold (standalone, signals, prerender)
- [x] Design tokens (`_tokens.scss`) + global styles (Tactile & Gamified)
- [x] Home page: hero, three pillars, CTA, footer
- [x] Email waitlist: notify-form + `POST /api/subscribe` → proxy to salut-api
- [x] SeoService (title/meta/canonical/JSON-LD); `SITE_URL` centralised
- [x] `robots.txt` + `sitemap.xml`
- [x] Legal: Impressum (§5 ECG) + Datenschutz (DSGVO/DSG), both `noindex`
- [x] Self-hosted Space Grotesk (`@fontsource`) — no Google Fonts
- [x] Dockerfile + docker-compose (Coolify) + devcontainer (Coder)
- [x] Domains pointed at `salut.bown.at` (staging)
- [x] Build verified green (3 routes prerendered, `server.mjs` emitted)

## Content & polish (M2 + M3)
- [ ] Final hero/marketing copy (DE + EN) — replace placeholder lines
- [ ] Real cocktail + event imagery / illustrations (replace emoji placeholders)
- [ ] `og-image.png` (1200×630) for social sharing
- [ ] Favicon / app icons set
- [ ] Wire **i18n** (DE + EN). *Recommended:* `@angular/localize` (build-time —
  localized prerendered URLs + `hreflang`), the SEO-correct fit for an
  SSR/prerendered landing. (The app may instead use a runtime dictionary —
  different constraints; see `../salut-app/continue.md`.)

## SEO & performance (M4)
Done 2026-05-29 (build-verified, rendered server-side in prerendered HTML):
- [x] JSON-LD: `Organization` + `WebSite` `@graph` (publisher cross-ref) on home
- [x] Expanded OG/Twitter meta (`og:locale`, `og:image:type/width/height/alt`,
  `twitter:title/description/image/image:alt`)
- [x] `noindex` 404 page + `**` route (kills soft-404 indexing risk)
- [x] `<lastmod>` on sitemap
- [x] Security/privacy headers in `server.ts` (CSP, HSTS, X-Content-Type-Options,
  X-Frame-Options, Referrer-Policy, Permissions-Policy incl. FLoC/Topics opt-out)

Remaining — needs assets or your account:
- [ ] **Assets:** `og-image.png` (1200×630), favicons / `apple-touch-icon`,
  **`icon-512.png`** (the Organization `logo` JSON-LD points to it), web manifest
  — then wire the `<link>`s. (Binaries — can't be generated in-repo.)
- [ ] **German content + `lang="de"` + i18n (DE/EN)** — biggest ranking lever for
  the AT market; content is English today. `@angular/localize` → localized URLs +
  `hreflang`. (This is M3.)
- [ ] Google Search Console + Bing: verify domain (add the verification meta tag),
  submit sitemap, request indexing
- [ ] Lighthouse ≥ 95 (Perf / SEO / Best-Practices / A11y) against built SSR
- [ ] Follow-ups: real HTTP 404 status (currently `noindex` soft-404), tighten CSP
  `script-src` to a per-request nonce, font `preload` + `font-display`

## Waitlist hardening (M5)
- [ ] Rate-limit `/api/subscribe` (basic IP/"leaky bucket" in-memory or Traefik)
- [ ] Honeypot field / simple spam guard on the form
- [ ] (Stretch, M6) double opt-in confirmation email — needs an SMTP/email provider
- [ ] Admin: read/export the list (lives in salut-api now — SQL/export script)

## Accessibility (M5)
- [ ] Keyboard pass: tab order, focus visible, skip-link works
- [ ] Screen-reader pass on the form success/error states
- [ ] Contrast audit of final colors against tokens

## Deploy (M1 — active)
- [ ] Deploy **salut-api** first (as a *Docker Compose* resource) so sign-ups
  have a backend (see `../salut-api/instructions.md`)
- [ ] Create/confirm the Coolify app: Domains `https://salut.bown.at` (with the
  `https://` scheme — an empty FQDN is the cause of the 404), Ports Exposes `4000`
- [ ] Set env: `WAITLIST_API_URL` (defaults to `https://api.salut.bown.at`) + `PORT` if needed
- [ ] First deploy smoke test: home renders, form submits, count increments
- [ ] (waitlist backup now lives with salut-api / its Postgres)

## Analytics (Umami — cookieless, self-hosted, DSGVO-clean)
Code is **wired** (2026-05-29): `core/analytics` (`AnalyticsService` injects the
tracker browser-only via `afterNextRender`; `track()` for events), the
`waitlist-signup` conversion event fires on form success, the CSP in `server.ts`
allows the Umami origin, and the Datenschutz page discloses it. It's a **no-op
until configured** — safe to ship now. To go live:
- [ ] Deploy **Umami** in Coolify (its built-in *Umami* service provisions Umami
  + its Postgres); give it a domain (e.g. `umami.bown.at`)
- [ ] In the Umami dashboard, add the **"salut" website** → copy its **website ID**
- [ ] Set both values in `src/app/core/analytics/analytics.config.ts`
  (`UMAMI.host` + `UMAMI.websiteId`), redeploy the landing
- [ ] Smoke-test: a page view appears in Umami; submitting the form fires the
  `waitlist-signup` event
- [ ] (View registered emails via `npx prisma studio` in salut-api — no admin
  endpoint by decision)

## Launch cutover (when `salut.com` is ready)
- [ ] Flip `SITE_URL` in `core/seo/seo.service.ts`
- [ ] Update `index.html` (canonical, og:url, og:image)
- [ ] Update `public/robots.txt` + `public/sitemap.xml`
- [ ] Update Impressum "Web" link
- [ ] Point production domain in Coolify (no volume to carry over)
- [ ] Re-submit sitemap for the new domain; set up 301s if staging was indexed

## Later (not this phase)
- [ ] Extract shared `@salut/ui` tokens package if drift with salut-app appears

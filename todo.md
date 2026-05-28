# TODO — salut-landing

Current phase: **Phase 1 — Landing + onboarding.** Checklist for getting a
deploy-ready, indexable, converting landing live on `salut.bown.at`.

## Done (Phase 0 + early Phase 1)
- [x] Angular 21 SSR scaffold (standalone, signals, prerender)
- [x] Design tokens (`_tokens.scss`) + global styles (Tactile & Gamified)
- [x] Home page: hero, three pillars, CTA, footer
- [x] Email waitlist: notify-form + `POST /api/subscribe` + JSONL on `/data`
- [x] SeoService (title/meta/canonical/JSON-LD); `SITE_URL` centralised
- [x] `robots.txt` + `sitemap.xml`
- [x] Legal: Impressum (§5 ECG) + Datenschutz (DSGVO/DSG), both `noindex`
- [x] Self-hosted Space Grotesk (`@fontsource`) — no Google Fonts
- [x] Dockerfile + docker-compose (Coolify) + devcontainer (Coder)
- [x] Domains pointed at `salut.bown.at` (staging)
- [x] Build verified green (3 routes prerendered, `server.mjs` emitted)

## Content & polish
- [ ] Final hero/marketing copy (DE + EN) — replace placeholder lines
- [ ] Real cocktail + event imagery / illustrations (replace emoji placeholders)
- [ ] `og-image.png` (1200×630) for social sharing
- [ ] Favicon / app icons set
- [ ] Decide & wire **i18n** (DE + EN) — `@angular/localize` vs runtime dict

## SEO & performance
- [ ] Lighthouse ≥ 95 (Perf / SEO / Best-Practices / A11y) against built SSR
- [ ] JSON-LD: add `Organization` schema alongside `WebSite`
- [ ] Verify SSR meta with `curl … | grep '<title>'` after copy changes
- [ ] Submit sitemap in Google Search Console; confirm home indexed

## Waitlist hardening
- [ ] Rate-limit `/api/subscribe` (basic IP/"leaky bucket" in-memory or Traefik)
- [ ] Honeypot field / simple spam guard on the form
- [ ] (Stretch) double opt-in confirmation email — needs an SMTP/email provider
- [ ] Admin: simple way to read the list (count endpoint exists; export script?)

## Accessibility
- [ ] Keyboard pass: tab order, focus visible, skip-link works
- [ ] Screen-reader pass on the form success/error states
- [ ] Contrast audit of final colors against tokens

## Deploy
- [ ] Create Coolify app (Dockerfile), set domain `salut.bown.at`
- [ ] Mount persistent volume at `/data`; **verify it survives a redeploy**
- [ ] Set env: `DATA_DIR=/data` (and `PORT` if Traefik needs it)
- [ ] First deploy smoke test: home renders, form submits, count increments
- [ ] Back up `subscribers.jsonl`

## Launch cutover (when `salut.com` is ready)
- [ ] Flip `SITE_URL` in `core/seo/seo.service.ts`
- [ ] Update `index.html` (canonical, og:url, og:image)
- [ ] Update `public/robots.txt` + `public/sitemap.xml`
- [ ] Update Impressum "Web" link
- [ ] Point production domain in Coolify, carry over the `/data` volume
- [ ] Re-submit sitemap for the new domain; set up 301s if staging was indexed

## Later (not this phase)
- [ ] Cookieless/self-hosted analytics (only if it stays consent-free)
- [ ] Extract shared `@salut/ui` tokens package if drift with salut-app appears

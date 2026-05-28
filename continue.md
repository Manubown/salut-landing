# Continue — salut-landing

Living "resume here" handoff. Update this as work proceeds.

_Last updated: 2026-05-28._

## Current state
A **buildable, functional** Angular 21 SSR landing with a working email
waitlist, SEO baseline, and Austrian legal pages. Both `npm run build` and the
Docker image are green. **Not yet deployed.**

Build (verified 2026-05-28): 3 static routes prerendered, `server.mjs` emitted,
initial ~285 kB raw / ~79 kB transfer, no budget errors.

## What's done
- SSR scaffold, design tokens, global styles ("Tactile & Gamified")
- Home page (hero + three pillars: cocktails / events / group-up + CTA + footer)
- Email waitlist end-to-end: `notify-form` → `SubscribeService` →
  `POST /api/subscribe` in `src/server.ts` → append-only `subscribers.jsonl`
- SEO: `SeoService` (title/meta/canonical/JSON-LD), `robots.txt`, `sitemap.xml`
- Legal: `pages/legal/impressum.*` + `datenschutz.*` (DSGVO, `noindex`)
- Self-hosted Space Grotesk via `@fontsource` (no Google Fonts — DSGVO)
- Deploy: `Dockerfile`, `docker-compose.yml`, `.devcontainer`, `.env.example`
- **Domains pointed at staging `salut.bown.at`** (see below)

## Domain config (where the origin lives)
Public origin is centralised. **Staging = `https://salut.bown.at`**, launch =
`https://salut.com`. To switch at launch, change:
1. `src/app/core/seo/seo.service.ts` — `SITE_URL` (the one constant)
2. `src/index.html` — canonical, `og:url`, `og:image`
3. `public/robots.txt` — `Sitemap:` line
4. `public/sitemap.xml` — `<loc>`
5. `src/app/pages/legal/impressum.html` — the "Web" link
6. Coolify — point the production domain, keep the `/data` volume

API base (for the future backend) is `api.salut.bown.at` → `api.salut.com`.
Infra: Coolify `coolify.bown.at`, Coder `coder.bown.at`.

## What's next (see todo.md for the full list)
1. **Deploy to Coolify** at `salut.bown.at` with a persistent `/data` volume;
   smoke-test the form; confirm the volume survives a redeploy.
2. **Lighthouse ≥ 95** + submit sitemap to Search Console; confirm indexing.
3. **Content**: final DE/EN copy, real imagery, `og-image.png`, favicons.
4. **i18n** decision (DE + EN) and wiring.
5. **Waitlist hardening**: rate-limit + honeypot; (stretch) double opt-in email.

## Open questions
- Email provider for double opt-in / launch announcement (SMTP? a service)?
- i18n approach: `@angular/localize` (build-time) vs a runtime dictionary?
- Analytics at all? If yes, must be cookieless/self-hosted to keep the
  no-consent-banner posture.
- When does `salut.com` become available (drives the cutover)?

## Watch-outs / gotchas
- **DSGVO**: do not add any third-party runtime request (fonts, CDN, embeds,
  trackers). Fonts are self-hosted on purpose.
- **`@` in templates** → write `&#64;` (bare `@` is Angular control flow).
- `DOCUMENT` imports from `@angular/core` in v21 (not `@angular/common`).
- The `/data` volume is the **only** state — waitlist emails live there.
- Don't touch the original Flutter app in `../Salut/` (read-only reference).

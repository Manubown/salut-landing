# Scope — salut-landing

## The product, in one line
Salut helps people have better nights out: **discover cocktail recipes worth
trying**, **find the hottest events in your region**, and **group up with
friends to go together**.

## What this repo is for
The landing site is the **growth engine**. Its job is to explain Salut, rank in
search, and convert visitors into a **launch waitlist** (email capture). It is
intentionally separate from the product (`salut-app`) so the public marketing
surface and the authenticated app have independent uptime, risk and release
cadence.

## Target users
- **Night-out planners** — people who decide where the group goes, and want to
  know what's actually happening tonight nearby.
- **Cocktail-curious** — people who want recipes worth trying, at home or to
  order out.
- **Social groups / friend circles** — the unit that actually goes out together.

Geographic focus at launch: German-speaking (AT first), so the site ships
**DE + EN**.

## In scope (this phase: Landing + onboarding)
- SSR + prerendered marketing pages (hero, the three pillars, social proof, CTA).
- **Email waitlist** capture with validation, de-dupe and a "you're #N in line"
  confirmation. Persisted as JSONL on a `/data` volume.
- **SEO baseline**: server-rendered `<title>`/meta/canonical, Open Graph, JSON-LD,
  `robots.txt`, `sitemap.xml`.
- **Legal pages** required in Austria: **Impressum** (§ 5 ECG) and
  **Datenschutzerklärung** (DSGVO/DSG). Both `noindex`.
- **DSGVO-clean** by construction: self-hosted fonts (no Google Fonts), no
  cookies, no third-party trackers, consent-based email capture, no IP stored.
- Responsive, mobile-first, WCAG AA, `prefers-reduced-motion` respected.
- Deploy-ready: Dockerfile + Coolify config; Coder devcontainer.

## Out of scope (deferred to later phases)
- The authenticated product experience → lives in `salut-app`.
- Real backend / database / auth → **Phase 2** (NestJS + Postgres + Prisma).
  The waitlist's `POST /api/subscribe` contract is the seam; JSONL → Postgres
  later without changing the client.
- Double opt-in email confirmation + transactional email sending (planned; see
  [todo.md](./todo.md)).
- Real cocktail/event content (CMS or API-driven) — marketing copy only for now.
- Analytics — if added, must be cookieless/self-hosted to preserve the
  no-consent-banner posture (see [plan.md](./plan.md)).

## Page & section inventory
**Home (`/`)** — `index, follow`
- Sticky header: wordmark + "Join waitlist" CTA
- Hero: headline (cocktails + events), sub-copy, the email form, floating tactile
  cards (recipe card / event card / BAC gauge motif)
- Three pillars: 🍸 Cocktails worth trying · 📍 Hottest events near you · 🥂 Group up & go
- Social-proof / "what you'll get" band
- Closing CTA (email form again)
- Footer: legal links (Impressum, Datenschutz), language, sibling-app link

**Impressum (`/impressum`)** — `noindex, follow`
**Datenschutz (`/datenschutz`)** — `noindex, follow`

## Onboarding funnel (the conversion path)
1. Land on `/` (from search / social / direct).
2. Read the value prop (cocktails + events + group-up).
3. Enter email → `POST /api/subscribe` → "You're #N in line."
4. *(Phase 2)* Confirmation email (double opt-in) → at launch, invite to
   `salut-app` to finish the profile (username, and BAC inputs:
   age/weight/height/gender) that the product needs.

The richer profile collection deliberately lives in the **app**, not the
landing — the landing's only ask is the email, to keep conversion friction near
zero.

## Success metrics
| Goal | Metric | Target (initial) |
|---|---|---|
| Get indexed | Home indexed in Google Search Console | ✔ within days of launch |
| Be fast | Lighthouse Performance / SEO / Best-Practices / A11y | ≥ 95 each |
| Convert | Visitor → waitlist email submit rate | establish baseline, then improve |
| Grow the list | Total confirmed waitlist emails | grow week-over-week |
| Stay compliant | Zero third-party requests on load; legal pages present | ✔ continuously |

Post-launch retention metrics (D1/D7/D30) are owned by **salut-app**, not the
landing — the landing's KPI is **indexed + converting**.

## Non-negotiable constraints
- **Austrian legal**: Impressum + Datenschutz must be present and accurate.
- **DSGVO**: no third-party asset requests, no cookies/trackers without consent,
  no IP logging for the waitlist; email capture is explicit consent
  (Art. 6(1)(a)) and withdrawable.
- **SEO**: every indexable route must render its tags server-side (no
  client-only meta).

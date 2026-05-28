# Design Guide — Salut

The brand + design system for Salut. This is the **fresh rebrand** (name stays
"Salut", identity is new) and the **"Tactile & Gamified"** language. Tokens here
are the source of truth; they live as CSS custom properties in
`src/styles/_tokens.scss` (duplicated in `salut-app` — keep them in sync).

## Brand idea
Salut is about **nights out** — cocktails worth trying, the hottest local
events, and the friends you go with. The visual world is **a dimly lit room with
vivid drinks in it**: dark by default, warm and saturated accents, real depth.
It should feel like a physical, playful object — not a flat SaaS dashboard.

Wordmark: **"Salut"** set in the display face (Space Grotesk), bold, tight
tracking. A "cheers"/clink motif is the recurring brand gesture.

## Design principles
1. **Tactile depth.** Chunky rounded surfaces, real layered shadows, satisfying
   press states. Components look like things you could pick up.
2. **Gamified & live.** Leaderboards, streaks, badges, a "tap-to-pour"
   interaction, "N people in line" — these are hero elements, not decoration.
   They serve the growth/retention goal.
3. **Real drink art** over abstract gradients. Warm, vivid, confident.
4. **Motion with intent.** Springy micro-interactions, scroll-reveal — always
   honoring `prefers-reduced-motion`.
5. **Dark-first.** The default theme is nightlife dark; a light theme exists in
   tokens for later.

## The anti-pattern list (the "AI look" we refuse)
- ❌ Centered single-column hero with **purple-gradient** headline text
- ❌ Glassmorphism everywhere / frosted blur as a crutch
- ❌ Default **Inter** + stock shadcn cards
- ❌ "✨ AI-powered" badges and sparkle emoji as design
- ❌ Stocky, evenly-spaced 3-column feature grids with tiny line icons
- ❌ Flat cards with a 1px border and no real depth

If a screen starts looking like the above, stop and re-read principles 1–3.

## Color

### Brand palette
| Token | Hex | Use |
|---|---|---|
| `--c-punch` | `#ff2e63` | **Primary** — coral/magenta "punch" |
| `--c-punch-600` / `-300` | `#e01e51` / `#ff6f93` | press / hover variants |
| `--c-citrus` | `#ffd23f` | highlights, badges, accent |
| `--c-mint` | `#7be0ad` | success, "live" dots |
| `--c-grape` | `#6c2bd9` | depth, used sparingly |
| `--c-night` | `#160f24` | background ("lights down") |
| `--c-ink` | `#1c1430` | raised surfaces |

Plus a neutral ramp `--c-0 … --c-900`.

### Semantic tokens (use these, not raw hex)
`--bg`, `--bg-elevated`, `--surface`, `--surface-2`, `--text`, `--text-muted`,
`--text-subtle`, `--border`, `--border-strong`, `--primary` (+ `-hover`,
`-press`), `--on-primary`, `--accent`, `--on-accent`, `--success`, `--danger`.
Defaults are **dark**; `:root[data-theme='light']` overrides them.

### BAC gauge (functional only — NOT brand)
`--bac-0 … --bac-9` runs **blue → red**. This is the sober → over-the-limit
meter from the product's drink-tracking heritage. **Never** use the blue→red
spectrum as a brand/marketing color — it carries functional meaning only.

## Typography
- **Display:** `--font-display` = **Space Grotesk** (self-hosted via
  `@fontsource`). Wordmark, headlines.
- **Text:** `--font-text` = system UI stack. Body, UI. Fast, no extra request.
- **Fluid scale:** `--fs-100` (13px) → `--fs-800` (`clamp(...)` up to 5rem).
  Use `--fs-700`/`800` for hero, `--fs-300` (16px) as body base.
- Line heights `--lh-tight / -snug / -normal`; headline tracking
  `--tracking-tight` (`-0.02em`).

⚠️ **No Google Fonts link.** Fonts are bundled at build time (DSGVO — see
[instructions.md](./instructions.md)).

## Space, radius, depth
- **Spacing** — 4px base: `--s-1` (4px) … `--s-9` (96px).
- **Radius** — chunky: `--r-sm` 10px, `--r-md` 14px, `--r-lg` 20px, `--r-xl`
  28px, `--r-pill` 999px.
- **Shadows** — real & layered: `--shadow-1/2/3` (rising elevation),
  `--shadow-press` (inset, for pressed states), `--ring` (focus), `--glow-punch`
  (primary glow). Depth is how things feel tactile — use `--shadow-2`/`3` on
  cards, not 1px borders alone.

## Motion
- Easings: `--ease-spring` (`cubic-bezier(.2,.9,.2,1.12)` — the signature
  springy overshoot) and `--ease-out`.
- Durations: `--dur-1` 120ms (taps), `--dur-2` 220ms (most), `--dur-3` 420ms
  (entrances).
- Buttons translate up on hover and **press down** (translateY + `--shadow-press`)
  for a physical click.
- **Always** wrap non-essential motion so `prefers-reduced-motion: reduce`
  disables it (global rule already does this).

## Components (patterns)
- **Buttons** — `.btn`, `.btn--primary`, `.btn--lg`, `.btn--block`. Chunky
  radius, depth, springy hover, inset press. Primary uses `--glow-punch`.
- **Cards** — rounded (`--r-lg`/`--r-xl`), `--surface`, real shadow, slight
  layering/rotation for the "floating" hero cards (recipe / event / BAC gauge).
- **Notify form** — single email input + primary button; success swaps to a
  badge-style "You're #N in line" (gamified confirmation). Uses `aria-live`.
- **Legal prose** — `.legal`, `.legal-header`, `.legal__toc`, `dl` — global in
  `styles.scss` so the legal pages need no component styles (and no budget hit).

## Responsive
- **Mobile-first** (the product is phone-native). Design for ~360px up.
- Containers: `--container` 1140px, `--container-narrow` 720px (legal/prose).
- The hero is **asymmetric** (copy + floating cards), collapsing to a single
  stack on small screens — deliberately not the centered single-column cliché.

## Accessibility
- WCAG **AA** contrast minimum; verify new color pairs against the tokens.
- Visible focus via `--ring`; keep outlines.
- Semantic landmarks + one `<h1>`; skip-link present.
- Respect reduced motion. Don't encode meaning in color alone (the BAC gauge
  also has numeric/textual state).

## Keeping tokens in sync
`salut-landing` and `salut-app` each carry a copy of `_tokens.scss`. When you
change a token, change both. If they drift painfully, extract a shared
`@salut/ui` package (noted in the master plan) — until then, duplication keeps
the two-repo split simple.

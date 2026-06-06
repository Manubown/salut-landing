# Keynote landing — immersive scroll

The home page (`src/app/pages/home`) is an Apple-keynote-style one-pager: a
cinematic hero, two **scroll-scrub** acts (the BAC gauge and the home-screen
install), and CSS scroll-driven acts in between (cocktails, the crew,
party games), closing on the Events waitlist.

## How the scroll-scrub works

`<salut-scrub-stage>` (`src/app/keynote/scrub-stage.component.ts`) pins a
full-viewport `<canvas>` and advances it **frame-by-frame** as you scroll, via
GSAP ScrollTrigger.

We scrub an **image sequence**, not a `<video>` — iOS Safari can't seek video
smoothly, which is exactly why Apple's product pages use frame sequences too.

It is **SSR-safe** (all browser work is in `afterNextRender`; GSAP is
dynamically imported so it never enters the server bundle) and honors
`prefers-reduced-motion` (paints one static frame, no pin/scrub).

Until a real recording is wired in, the stage draws **on-brand synthetic
placeholder frames** (`motion="bar" | "spin" | "fly"`), so the mechanic is fully
demoable today.

## Adding a real recording (3 steps)

1. **Record** the clip per the shot-list (portrait, ≥1080px wide, 60fps, steady,
   dark theme, one clean take). Drop it in `public/recordings/` —
   e.g. `public/recordings/bac.mp4`.
2. **Extract frames** (needs `ffmpeg` + `ffprobe` on PATH):
   ```bash
   npm run frames                 # processes every clip in public/recordings/
   npm run frames -- bac.mp4 --frames 90 --width 1080
   ```
   This writes `public/seq/bac/frame-0001.webp …`, a `poster.webp`, and a
   `manifest.json` listing the frame URLs.
3. **Wire it into the act** in `home.html` — pass the manifest's `frames` array
   and poster to the stage, which switches from synthetic to real automatically:
   ```html
   <salut-scrub-stage [frames]="bacFrames" poster="seq/bac/poster.webp" …>
   ```
   (Load the array from the manifest, or paste it into `home.ts`.)

## Act map

| Act | Section | Tech | Asset |
|---|---|---|---|
| Hero | `.hero` | CSS + pointer-tilt | CSS phone mock |
| 1 · BAC | `<salut-scrub-stage motion="bar">` | GSAP scrub | `seq/bac` *(todo)* |
| 2 · Cocktails | `.act--cocktails` | CSS `view()` reveal | gradient cards |
| 3 · Crew | `.act--crew` | CSS reveal + parallax | leaderboard mock |
| 4 · Games | `.act--games` | CSS `view()` scroll-spin | conic wheel |
| 5 · Home screen | `<salut-scrub-stage motion="fly">` | GSAP scrub | `seq/install` *(todo)* |
| Outro | `.cta` | CSS reveal | waitlist form |

## Recording shot-list

| Clip name | Capture | ~Length |
|---|---|---|
| `bac` | Log a drink → gauge climbs → "time till sober" updates | 4–5s |
| `install` | Add-to-Home-Screen → icon on grid → launch full-screen | 5–6s |
| `cocktails` *(optional)* | Scroll recipe list, open one recipe | 3–4s |
| `games` *(optional)* | Lucky Wheel spin | 3–4s |

## Guardrails

- **Native CSS scroll-driven animations** (`animation-timeline: view()/scroll()`)
  power the cheap reveals/parallax — no JS, and they no-op gracefully where
  unsupported (the 0s animation resolves to its end state = visible).
- Keep frame sequences lean: ~80–120 frames, WebP/AVIF, ≤1080px wide.
- Always test on a real mid-range iPhone before shipping.

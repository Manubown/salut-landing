/**
 * Events genre taxonomy + theming (T5 — see docs/EVENTS.md in salut-web). Two
 * levels: a **category** (family) groups leaf **genres** and carries the palette
 * that themes the events UI. An event's theme is **layered**: the primary
 * category's palette, with the event's own `color` overriding the accent (and
 * re-deriving the gradient) when it carries one.
 *
 * Ported from salut-web's `core/events.ts` — the two repos duplicate this small
 * source of truth by design (same stance as the design tokens; extract into a
 * shared package only if drift becomes a real problem).
 */

export interface EventGenre {
  id: string;
  label: string;
}
export interface EventCategory {
  id: string;
  label: string;
  /** Primary accent colour. */
  color: string;
  /** Two-stop gradient for themed surfaces (cards, hero). */
  gradient: [string, string];
  genres: EventGenre[];
}

function g(id: string, label?: string): EventGenre {
  return { id, label: label ?? cap(id) };
}
function cap(s: string): string {
  return s.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

export const EVENT_CATEGORIES: EventCategory[] = [
  { id: 'electronic', label: 'Electronic', color: '#7C5CFF', gradient: ['#7C5CFF', '#311a78'],
    genres: [g('techno'), g('house'), g('dnb', 'Drum & Bass'), g('trance'), g('hardstyle'), g('electro'), g('disco')] },
  { id: 'urban', label: 'Hip-Hop & Urban', color: '#0A84FF', gradient: ['#0A84FF', '#062f63'],
    genres: [g('hiphop', 'Hip-Hop'), g('rnb', 'R&B'), g('trap'), g('afrobeats')] },
  { id: 'pop', label: 'Pop', color: '#FF375F', gradient: ['#FF6F5E', '#b01e54'],
    genres: [g('pop'), g('charts'), g('schlager')] },
  { id: 'rock', label: 'Rock & Indie', color: '#FF9F0A', gradient: ['#FFB340', '#a3380a'],
    genres: [g('rock'), g('indie'), g('metal'), g('punk'), g('alternative')] },
  { id: 'latin', label: 'Latin', color: '#FF453A', gradient: ['#FF6A3D', '#991512'],
    genres: [g('latin'), g('reggaeton')] },
  { id: 'live', label: 'Live & Concerts', color: '#30D158', gradient: ['#34e07a', '#0c6a3a'],
    genres: [g('live'), g('concert'), g('dj-set', 'DJ Set')] },
  { id: 'scene', label: 'Scene & Vibe', color: '#64D2FF', gradient: ['#64D2FF', '#235874'],
    genres: [g('student'), g('lgbtq', 'LGBTQ+'), g('bar'), g('cocktail'), g('afterhour')] },
];

// ── lookups ─────────────────────────────────────────────────────────────────
const CAT_BY_ID = new Map<string, EventCategory>();
const CAT_BY_GENRE = new Map<string, EventCategory>();
const GENRE_LABEL = new Map<string, string>();
for (const c of EVENT_CATEGORIES) {
  CAT_BY_ID.set(c.id, c);
  for (const gen of c.genres) {
    CAT_BY_GENRE.set(gen.id, c);
    GENRE_LABEL.set(gen.id, gen.label);
  }
}

export function categoryOf(genre: string): EventCategory | undefined {
  return CAT_BY_GENRE.get(genre);
}
export function categoryLabel(id: string): string {
  return CAT_BY_ID.get(id)?.label ?? cap(id);
}
export function genreLabel(id: string): string {
  return GENRE_LABEL.get(id) ?? cap(id);
}
/** Category colour for a genre **or** category id. */
export function genreColor(id: string): string {
  return (CAT_BY_GENRE.get(id) ?? CAT_BY_ID.get(id))?.color ?? '#7C5CFF';
}

export interface EventTheme {
  accent: string;
  gradient: [string, string];
}

/**
 * Layered theme for an event: start from the primary category's palette; if the
 * event carries its own `color`, that overrides the accent and seeds the gradient.
 */
export function eventTheme(ev: { categories?: string[] | null; genres?: string[] | null; color?: string | null }): EventTheme {
  const catId = ev.categories?.[0] ?? (ev.genres?.[0] ? categoryOf(ev.genres[0])?.id : undefined);
  const base = (catId ? CAT_BY_ID.get(catId) : undefined) ?? CAT_BY_ID.get('electronic')!;
  const color = (ev.color || '').trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(color)) {
    return { accent: color, gradient: [color, darken(color, 0.5)] };
  }
  return { accent: base.color, gradient: base.gradient };
}

/** Darken a hex colour toward black by `amt` (0..1) — used to seed an event-colour gradient. */
function darken(hex: string, amt: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - amt));
  const gn = Math.round(parseInt(h.slice(2, 4), 16) * (1 - amt));
  const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - amt));
  return '#' + [r, gn, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

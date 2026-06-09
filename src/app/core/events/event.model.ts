/** RSVP status for an event (app-only; null on the public landing). */
export type Rsvp = 'going' | 'interested';

/**
 * An event, mirroring the backend `EventResponse` field-for-field (docs/EVENTS.md
 * in salut-web). The landing reads the **public** surface, so `my_rsvp` is always
 * null/absent — RSVP happens in the app. Named `SalutEvent` to avoid colliding with
 * the DOM `Event` type.
 */
export interface SalutEvent {
  id: string;
  name: string;
  desc: string;
  image: string;
  images: string[];
  timestamp: string; // RFC3339
  end_timestamp: string | null;
  club_name: string;
  club_address: string;
  city: string;
  lat: number;
  lng: number;
  genres: string[];
  categories: string[];
  price: string;
  ticket_url: string;
  lineup: string[];
  color: string; // optional per-event accent (theming)
  going_count: number;
  interested_count: number;
  my_rsvp?: Rsvp | null;
}

export interface EventFilters {
  city?: string;
  category?: string; // comma-separated category ids
  genre?: string; // comma-separated genre ids
  when?: 'tonight' | 'week' | 'upcoming';
}

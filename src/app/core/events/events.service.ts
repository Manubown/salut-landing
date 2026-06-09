import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EVENTS_API } from './events.config';
import { EventFilters, SalutEvent } from './event.model';

/**
 * Reads the **public** curated events API on `salut-backend`
 * (`GET /public/api/events*`). Unauthenticated and PII-free, so the landing
 * calls it directly (absolute URL → works the same during SSR and in the
 * browser; `withFetch()` caches the GET in TransferState so the client doesn't
 * re-fetch after hydration). RSVP / "rally a crew" are app-only and deep-link
 * into the PWA — the landing is read-only.
 */
@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly http = inject(HttpClient);

  getEvents(filters: EventFilters = {}): Observable<SalutEvent[]> {
    const q = new URLSearchParams();
    if (filters.city) q.set('city', filters.city);
    if (filters.category) q.set('category', filters.category);
    if (filters.genre) q.set('genre', filters.genre);
    if (filters.when) q.set('when', filters.when);
    const qs = q.toString();
    return this.http
      .get<{ events: SalutEvent[] | null }>(`${EVENTS_API}/public/api/events${qs ? '?' + qs : ''}`)
      .pipe(map((r) => r?.events ?? []));
  }

  getEvent(id: string): Observable<SalutEvent> {
    return this.http.get<SalutEvent>(`${EVENTS_API}/public/api/events/${encodeURIComponent(id)}`);
  }
}

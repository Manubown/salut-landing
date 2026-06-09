import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EventService } from './events.service';
import { SalutEvent } from './event.model';

/**
 * Resolvers run **before** the route's component on both server and client, and
 * SSR blocks on them — so the rendered HTML a crawler receives already contains
 * the event data (the whole point of the SEO surface). A failed upstream resolves
 * to a safe empty value (the component renders an empty/not-found state) rather
 * than tearing down navigation.
 */

export const eventsResolver: ResolveFn<SalutEvent[]> = (): Observable<SalutEvent[]> =>
  inject(EventService)
    .getEvents({ city: 'Vienna' })
    .pipe(catchError(() => of([] as SalutEvent[])));

export const eventResolver: ResolveFn<SalutEvent | null> = (
  route: ActivatedRouteSnapshot,
): Observable<SalutEvent | null> =>
  inject(EventService)
    .getEvent(route.paramMap.get('id') ?? '')
    .pipe(catchError(() => of(null)));

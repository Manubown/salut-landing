import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface SubscribeResponse {
  ok: boolean;
  position?: number;
  alreadySubscribed?: boolean;
}

/**
 * Talks to the landing's own same-origin Express endpoint (see src/server.ts),
 * which proxies server-to-server to the waitlist API (api.salut.bown.at, later
 * api.salut.com) where the email is stored in Postgres. Same-origin keeps the
 * browser free of CORS.
 */
@Injectable({ providedIn: 'root' })
export class SubscribeService {
  private readonly http = inject(HttpClient);

  subscribe(email: string): Observable<SubscribeResponse> {
    return this.http.post<SubscribeResponse>('/api/subscribe', { email });
  }
}

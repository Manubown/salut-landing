import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface SubscribeResponse {
  ok: boolean;
  position?: number;
  alreadySubscribed?: boolean;
}

/**
 * Talks to the landing's own Express endpoint (see src/server.ts), which
 * appends confirmed emails to a JSONL file on the persistent /data volume.
 * Swapped for the real API (api.salut.bown.at, later api.salut.com) in the
 * backend phase.
 */
@Injectable({ providedIn: 'root' })
export class SubscribeService {
  private readonly http = inject(HttpClient);

  subscribe(email: string): Observable<SubscribeResponse> {
    return this.http.post<SubscribeResponse>('/api/subscribe', { email });
  }
}

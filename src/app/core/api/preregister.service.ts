import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface PreRegisterPayload {
  name: string;
  username: string;
  email: string;
  age: number;
}

/**
 * Early-access pre-registration. Posts to the landing's own same-origin Express
 * endpoint (/api/preregister), which forwards server-to-server to the Salut
 * backend — so the browser never fires a cross-origin request (DSGVO stance).
 */
@Injectable({ providedIn: 'root' })
export class PreregisterService {
  private readonly http = inject(HttpClient);

  submit(payload: PreRegisterPayload): Observable<{ ok?: boolean; already?: boolean }> {
    return this.http.post<{ ok?: boolean; already?: boolean }>('/api/preregister', payload);
  }
}

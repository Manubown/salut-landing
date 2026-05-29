import { DOCUMENT, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { UMAMI, umamiEnabled, umamiScriptUrl } from './analytics.config';

interface UmamiTracker {
  track(event: string, data?: Record<string, unknown>): void;
}

/**
 * Loads the cookieless Umami tracker and records custom events. Browser-only:
 * every method is a no-op during SSR/prerender and while Umami is unconfigured,
 * so it is always safe to call.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private injected = false;

  /** Inject the tracker once. Umami auto-tracks the first view and SPA route changes. */
  init(): void {
    if (!this.isBrowser || this.injected || !umamiEnabled()) {
      return;
    }
    this.injected = true;
    const script = this.doc.createElement('script');
    script.async = true;
    script.defer = true;
    script.src = umamiScriptUrl();
    script.setAttribute('data-website-id', UMAMI.websiteId);
    this.doc.head.appendChild(script);
  }

  /** Record a custom event (e.g. a completed waitlist sign-up). */
  track(event: string, data?: Record<string, unknown>): void {
    if (!this.isBrowser) {
      return;
    }
    const tracker = (this.doc.defaultView as unknown as { umami?: UmamiTracker } | null)?.umami;
    tracker?.track(event, data);
  }
}

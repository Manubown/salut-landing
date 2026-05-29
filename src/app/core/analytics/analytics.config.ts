/**
 * Self-hosted Umami — cookieless, first-party web analytics.
 *
 * DSGVO posture: no cookies (no consent banner needed), no raw IP stored, no
 * cross-site tracking, runs on our own EU server. Disclosed in the
 * Datenschutz page. This is the single source of truth for the tracker config;
 * it is imported by both the browser AnalyticsService and the SSR server
 * (server.ts) so the Content-Security-Policy and the script stay in sync.
 *
 * Fill both values once Umami is deployed (Coolify → Umami service) and the
 * "salut" website is created in its dashboard. While either is empty the
 * tracker is a no-op and the CSP stays self-only — safe to ship as-is.
 *   - host:      Umami instance origin, no trailing slash (e.g. 'https://umami.bown.at')
 *   - websiteId: the UUID Umami assigns to the site
 */
export const UMAMI: { host: string; websiteId: string } = {
  host: 'https://umami.bown.at',
  websiteId: '73af99a9-8ad6-4bb1-8cb7-a465bd45cd33',
};

/** Umami origin with any trailing slash stripped, or '' when unconfigured. */
export function umamiOrigin(): string {
  return UMAMI.host ? UMAMI.host.replace(/\/+$/, '') : '';
}

/** URL of the tracker script, or '' when unconfigured. */
export function umamiScriptUrl(): string {
  const origin = umamiOrigin();
  return origin ? `${origin}/script.js` : '';
}

/** True only when both host and websiteId are set. */
export function umamiEnabled(): boolean {
  return Boolean(UMAMI.host && UMAMI.websiteId);
}

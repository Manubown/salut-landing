import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SeoService, SITE_URL } from '../../core/seo/seo.service';
import { APP_URL } from '../../core/app-links';
import { EVENTS_API } from '../../core/events/events.config';
import { SalutEvent } from '../../core/events/event.model';
import { EventTheme, eventTheme, genreColor, genreLabel } from '../../core/events/events.taxonomy';

const TZ = 'Europe/Vienna';
const FULL_FMT = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ,
});
const TIME_FMT = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });

/**
 * Public `/events/:id` detail — server-rendered off the public API (see
 * eventResolver) so it's a fully-formed, indexable, shareable page: OpenGraph +
 * Twitter cards and a JSON-LD `Event` schema for rich Google results. RSVP and
 * "rally a crew" are app-only and deep-link into the PWA.
 */
@Component({
  selector: 'salut-event-detail',
  imports: [RouterLink],
  templateUrl: './event-detail.html',
  styleUrl: './event-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetail implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);

  protected readonly appUrl = APP_URL;
  protected readonly year = new Date().getFullYear();
  protected readonly genreLabel = genreLabel;
  protected readonly genreColor = genreColor;

  // Resolved on the server (SSR), reused via TransferState — see eventResolver.
  protected readonly event: SalutEvent | null =
    (this.route.snapshot.data['event'] as SalutEvent | null) ?? null;

  protected readonly theme: EventTheme | null = this.event ? eventTheme(this.event) : null;
  protected readonly heroBg = this.theme
    ? `linear-gradient(160deg, ${this.theme.gradient[0]}, ${this.theme.gradient[1]})`
    : '';
  protected readonly cover = this.event ? absUrl(this.event.image) : '';
  protected readonly gallery = this.event ? buildGallery(this.event) : [];
  protected readonly dateLine = this.event ? safeFmt(FULL_FMT, this.event.timestamp) : '';
  protected readonly endLine = this.event?.end_timestamp ? safeFmt(TIME_FMT, this.event.end_timestamp) : '';
  protected readonly mapUrl = this.event ? mapsUrl(this.event) : '';
  protected readonly deepLink = this.event ? `${APP_URL}/events/${this.event.id}` : APP_URL;

  ngOnInit(): void {
    const e = this.event;
    if (!e) {
      this.seo.apply({
        title: 'Event not found — Salut',
        description: 'This event isn’t available. Browse what’s on in Vienna on Salut.',
        path: '/events',
        robots: 'noindex, follow',
      });
      return;
    }
    this.seo.apply({
      title: `${e.name}${e.club_name ? ' · ' + e.club_name : ''} — ${e.city || 'Vienna'} | Salut`,
      description: metaDesc(e),
      path: `/events/${e.id}`,
      image: this.cover || undefined,
      type: 'article',
    });
    this.seo.setJsonLd(eventSchema(e, this.cover, metaDesc(e)), 'ld-event');
  }
}

// ── pure helpers (SSR-safe) ─────────────────────────────────────────────────
function safeFmt(fmt: Intl.DateTimeFormat, iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : fmt.format(d);
}

/** Resolve a possibly-relative backend image path to an absolute URL. */
function absUrl(src: string): string {
  if (!src) return '';
  if (/^https?:\/\//i.test(src)) return src;
  return `${EVENTS_API}${src.startsWith('/') ? '' : '/'}${src}`;
}

function buildGallery(e: SalutEvent): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [e.image, ...(e.images ?? [])]) {
    const u = absUrl(raw);
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

function mapsUrl(e: SalutEvent): string {
  if (e.lat && e.lng) return `https://www.google.com/maps/search/?api=1&query=${e.lat},${e.lng}`;
  const q = [e.club_name, e.club_address, e.city].filter(Boolean).join(', ');
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : '';
}

function metaDesc(e: SalutEvent): string {
  const base = (e.desc || '').replace(/\s+/g, ' ').trim();
  if (base) return base.length > 200 ? base.slice(0, 197) + '…' : base;
  const where = [e.club_name, e.city || 'Vienna'].filter(Boolean).join(', ');
  return `${e.name}${where ? ' at ' + where : ''}. Browse the lineup and rally your crew on Salut.`;
}

function priceValue(price: string): string | undefined {
  const p = (price || '').toLowerCase();
  if (!p) return undefined;
  if (p.includes('free') || p.includes('gratis')) return '0';
  const m = p.match(/\d+([.,]\d+)?/);
  return m ? m[0].replace(',', '.') : undefined;
}

function eventSchema(e: SalutEvent, image: string, description: string): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.name,
    startDate: e.timestamp,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: e.club_name || e.city || 'Vienna',
      address: [e.club_address, e.city].filter(Boolean).join(', ') || 'Vienna, Austria',
    },
    description,
    url: `${SITE_URL}/events/${e.id}`,
    organizer: { '@type': 'Organization', name: 'Salut', url: SITE_URL },
  };
  if (e.end_timestamp) schema['endDate'] = e.end_timestamp;
  if (image) schema['image'] = [image];
  if (e.lineup?.length) schema['performer'] = e.lineup.map((n) => ({ '@type': 'PerformingGroup', name: n }));
  const price = priceValue(e.price);
  if (price !== undefined) {
    schema['offers'] = {
      '@type': 'Offer',
      price,
      priceCurrency: 'EUR',
      url: e.ticket_url || `${SITE_URL}/events/${e.id}`,
      availability: 'https://schema.org/InStock',
    };
  }
  return schema;
}

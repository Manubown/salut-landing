import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SeoService, SITE_URL } from '../../core/seo/seo.service';
import { APP_URL } from '../../core/app-links';
import { SalutEvent } from '../../core/events/event.model';
import {
  EVENT_CATEGORIES,
  EventTheme,
  categoryLabel,
  eventTheme,
  genreColor,
  genreLabel,
} from '../../core/events/events.taxonomy';

/** A loaded event plus the derived bits the template renders. */
interface EventVM extends SalutEvent {
  theme: EventTheme;
  start: Date;
  dateLabel: string;
  timeLabel: string;
}
interface Section {
  key: string;
  title: string;
  events: EventVM[];
}

// Events are Vienna-only; pin the timezone so the server (UTC) and the browser
// format identical, correct local times — no hydration mismatch, no "9pm shows as
// 7pm" for a UTC server.
const TZ = 'Europe/Vienna';
const DATE_FMT = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ });
const TIME_FMT = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
const DAY_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

/**
 * Public `/events` list — server-rendered off the curated public API (see
 * eventsResolver) so it's indexable and shareable. Category filtering + section
 * grouping are pure client enhancements over the SSR'd full list; RSVP / crew are
 * app-only and deep-link into the PWA.
 */
@Component({
  selector: 'salut-events',
  imports: [RouterLink],
  templateUrl: './events.html',
  styleUrl: './events.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Events implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);

  protected readonly appUrl = APP_URL;
  protected readonly year = new Date().getFullYear();

  // Resolved on the server (SSR) and reused via TransferState — see eventsResolver.
  private readonly all = signal<EventVM[]>(
    ((this.route.snapshot.data['events'] as SalutEvent[] | undefined) ?? []).map(toVM),
  );

  protected readonly selectedCategory = signal<string | null>(null);

  /** Only surface category chips that actually match something in the loaded set. */
  protected readonly activeCategories = computed(() => {
    const present = new Set<string>();
    for (const e of this.all()) for (const c of e.categories ?? []) present.add(c);
    return EVENT_CATEGORIES.filter((c) => present.has(c.id));
  });

  protected readonly sections = computed<Section[]>(() => {
    const cat = this.selectedCategory();
    const list = cat ? this.all().filter((e) => (e.categories ?? []).includes(cat)) : this.all();
    return groupByWhen(list);
  });

  protected readonly isEmpty = computed(() => this.all().length === 0);

  protected readonly catLabel = categoryLabel;
  protected readonly genreLabel = genreLabel;
  protected readonly genreColor = genreColor;

  toggleCategory(id: string): void {
    this.selectedCategory.update((c) => (c === id ? null : id));
  }

  ngOnInit(): void {
    this.seo.apply({
      title: 'Events in Vienna — club nights & concerts | Salut',
      description:
        "What's on in Vienna tonight and this week — techno, house, hip-hop, live shows and more. Browse the lineup, then RSVP and rally your crew in the Salut app.",
      path: '/events',
    });
    this.seo.setJsonLd(
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Events in Vienna',
        itemListElement: this.all()
          .slice(0, 25)
          .map((e, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/events/${e.id}`, name: e.name })),
      },
      'ld-events',
    );
  }
}

// ── pure helpers (SSR-safe: no window/document) ──────────────────────────────
function toVM(e: SalutEvent): EventVM {
  const start = new Date(e.timestamp);
  const valid = !isNaN(start.getTime());
  return {
    ...e,
    theme: eventTheme(e),
    start,
    dateLabel: valid ? DATE_FMT.format(start) : '',
    timeLabel: valid ? TIME_FMT.format(start) : '',
  };
}

function groupByWhen(list: EventVM[]): Section[] {
  const now = new Date();
  const today = DAY_FMT.format(now);
  const weekEnd = now.getTime() + 7 * 24 * 3600 * 1000;
  const tonight: EventVM[] = [];
  const week: EventVM[] = [];
  const later: EventVM[] = [];
  for (const e of list) {
    const t = e.start.getTime();
    if (!isNaN(t) && DAY_FMT.format(e.start) === today) tonight.push(e);
    else if (!isNaN(t) && t < weekEnd) week.push(e);
    else later.push(e);
  }
  const out: Section[] = [];
  if (tonight.length) out.push({ key: 'tonight', title: 'Tonight', events: tonight });
  if (week.length) out.push({ key: 'week', title: 'This week', events: week });
  if (later.length) out.push({ key: 'upcoming', title: 'Upcoming', events: later });
  return out;
}

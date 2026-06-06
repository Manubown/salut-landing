import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { HTML_LANG, Locale, OG_LOCALE } from '../i18n/locale';

export interface HreflangAlternate {
  hreflang: string;
  href: string;
}

export interface SeoData {
  title: string;
  description: string;
  /** Path relative to the site root, e.g. '/' or '/impressum'. */
  path?: string;
  image?: string;
  type?: string;
  robots?: string;
  /** Content language of the page (sets <html lang>, og:locale, hreflang). */
  locale?: Locale;
  /** hreflang alternates, including x-default. */
  alternates?: HreflangAlternate[];
}

/**
 * The canonical public origin. Override at build via SITE_URL env if it ever
 * moves (e.g. to salut.at) — this is the single source of truth.
 *   - now:    https://salut.bown.at
 */
export const SITE_URL = (
  (typeof process !== 'undefined' && process.env?.['SITE_URL']) || 'https://salut.bown.at'
).replace(/\/$/, '');

/**
 * Centralises page-level SEO: <title>, meta description, Open Graph / Twitter
 * tags, canonical, hreflang alternates, the page language and JSON-LD. Runs on
 * the server during SSR/prerender so crawlers see fully-rendered tags.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);

  apply(data: SeoData): void {
    const url = `${SITE_URL}${data.path ?? '/'}`;
    const image = data.image ?? `${SITE_URL}/og-image.png`;
    const type = data.type ?? 'website';

    this.title.setTitle(data.title);
    this.meta.updateTag({ name: 'description', content: data.description });
    this.meta.updateTag({ name: 'robots', content: data.robots ?? 'index, follow' });

    this.meta.updateTag({ property: 'og:title', content: data.title });
    this.meta.updateTag({ property: 'og:description', content: data.description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:type', content: type });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });

    if (data.locale) {
      const other: Locale = data.locale === 'de' ? 'en' : 'de';
      this.doc.documentElement.lang = HTML_LANG[data.locale];
      this.meta.updateTag({ property: 'og:locale', content: OG_LOCALE[data.locale] });
      this.meta.updateTag({ property: 'og:locale:alternate', content: OG_LOCALE[other] });
    }

    this.setCanonical(url);
    this.setHreflang(data.alternates ?? []);
  }

  setJsonLd(schema: Record<string, unknown>, id = 'ld-default'): void {
    let script = this.doc.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = this.doc.createElement('script');
      script.id = id;
      script.setAttribute('type', 'application/ld+json');
      this.doc.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema);
  }

  private setCanonical(url: string): void {
    let link = this.doc.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private setHreflang(alternates: HreflangAlternate[]): void {
    // Clear any from a previous navigation, then re-emit.
    Array.from(
      this.doc.querySelectorAll('link[rel="alternate"][hreflang]'),
    ).forEach((el) => el.remove());
    for (const alt of alternates) {
      const link = this.doc.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', alt.hreflang);
      link.setAttribute('href', alt.href);
      this.doc.head.appendChild(link);
    }
  }
}

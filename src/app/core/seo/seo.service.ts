import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface SeoData {
  title: string;
  description: string;
  /** Path relative to the site root, e.g. '/' or '/impressum'. */
  path?: string;
  image?: string;
  type?: string;
  robots?: string;
}

/**
 * The canonical public origin. Test/staging today; flips to the production
 * domain at launch — this is the single place to change it.
 *   - now:    https://salut.bown.at   (Coolify staging)
 *   - launch: https://salut.com
 */
export const SITE_URL = 'https://salut.bown.at';

/**
 * Centralises page-level SEO: <title>, meta description, Open Graph /
 * Twitter tags, the canonical link and JSON-LD structured data. Runs on
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

    this.setCanonical(url);
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
}

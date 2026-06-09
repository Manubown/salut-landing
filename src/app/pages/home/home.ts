import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  afterNextRender,
  inject,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ScrubStage } from '../../keynote/scrub-stage.component';
import { DrinkGlass, GlassType } from '../../keynote/drink-glass.component';
import { ClickPopDirective } from '../../keynote/click-pop.directive';
import { SeoService, SITE_URL } from '../../core/seo/seo.service';
import { DEFAULT_LOCALE, Locale, homePath } from '../../core/i18n/locale';
import { HOME_COPY, HomeCopy } from './home.content';
import { APP_URL } from '../../core/app-links';
import { EVENT_CATEGORIES } from '../../core/events/events.taxonomy';

interface Cocktail {
  name: string;
  base: string;
  glass: GlassType;
  /** Liquid tint for the glass illustration. */
  color: string;
}

@Component({
  selector: 'salut-home',
  imports: [RouterLink, ScrubStage, DrinkGlass, ClickPopDirective],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly route = inject(ActivatedRoute);

  protected readonly year = new Date().getFullYear();
  protected readonly appUrl = APP_URL;

  /** Genre families for the Events teaser → /events (themed pills). */
  protected readonly eventCats = EVENT_CATEGORIES;

  /** Resolved from route data (de at '/', en at '/en'). */
  protected readonly locale: Locale =
    (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly c: HomeCopy = HOME_COPY[this.locale];
  protected readonly otherLocale: Locale = this.locale === 'de' ? 'en' : 'de';
  protected readonly otherPath = homePath(this.otherLocale);
  protected readonly otherLabel = this.otherLocale.toUpperCase();

  /** Bidirectional hreflang set (same on both language pages). */
  private readonly alternates = [
    { hreflang: 'de', href: `${SITE_URL}/` },
    { hreflang: 'en', href: `${SITE_URL}/en` },
    { hreflang: 'x-default', href: `${SITE_URL}/en` },
  ];

  /** A taste of the recipe library (names + glasses from the app). */
  protected readonly cocktails: Cocktail[] = [
    { name: 'Negroni', base: 'Gin', glass: 'Rocks', color: '#E0533C' },
    { name: 'Aperol Spritz', base: 'Aperitivo', glass: 'Wine', color: '#FF8A3D' },
    { name: 'Margarita', base: 'Tequila', glass: 'Coupe', color: '#E8CF5A' },
    { name: 'Espresso Martini', base: 'Vodka', glass: 'Coupe', color: '#5A3A24' },
    { name: 'Mojito', base: 'Rum', glass: 'Highball', color: '#7FC56A' },
    { name: 'Cosmopolitan', base: 'Vodka', glass: 'Coupe', color: '#F0537A' },
  ];

  protected readonly ranks = [
    { pos: 1, name: 'Mara', pts: 1340 },
    { pos: 2, name: 'Jonas', pts: 1295 },
    { pos: 3, name: 'You', pts: 1280, you: true },
    { pos: 4, name: 'Lena', pts: 1110 },
  ];

  constructor() {
    // Premium pointer/gyro tilt on the hero device. Browser-only, motion-safe.
    afterNextRender(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const root = this.host.nativeElement as HTMLElement;
      const device = root.querySelector<HTMLElement>('.hero__device');
      const scene = root.querySelector<HTMLElement>('.hero__art');
      if (!device || !scene) return;

      const onMove = (e: PointerEvent) => {
        const r = scene.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        device.style.setProperty('--rx', `${(-dy * 6).toFixed(2)}deg`);
        device.style.setProperty('--ry', `${(dx * 8).toFixed(2)}deg`);
      };
      const reset = () => {
        device.style.setProperty('--rx', '0deg');
        device.style.setProperty('--ry', '0deg');
      };
      scene.addEventListener('pointermove', onMove);
      scene.addEventListener('pointerleave', reset);
    });
  }

  ngOnInit(): void {
    this.seo.apply({
      title: this.c.seoTitle,
      description: this.c.seoDescription,
      path: homePath(this.locale),
      locale: this.locale,
      alternates: this.alternates,
    });

    // Organization + WebSite + WebApplication graph, cross-linked via @id.
    this.seo.setJsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${SITE_URL}/#organization`,
          name: 'Salut',
          url: `${SITE_URL}/`,
          logo: `${SITE_URL}/icon-512.png`,
          description: this.c.seoDescription,
        },
        {
          '@type': 'WebSite',
          '@id': `${SITE_URL}/#website`,
          name: 'Salut',
          url: `${SITE_URL}/`,
          inLanguage: this.locale,
          publisher: { '@id': `${SITE_URL}/#organization` },
          description: this.c.seoDescription,
        },
        {
          '@type': 'WebApplication',
          '@id': `${SITE_URL}/#webapp`,
          name: 'Salut',
          url: APP_URL,
          applicationCategory: 'LifestyleApplication',
          operatingSystem: 'iOS, Android, Web',
          browserRequirements: 'Requires a modern browser. Installable to the home screen.',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
          publisher: { '@id': `${SITE_URL}/#organization` },
        },
      ],
    });

    // FAQ structured data — high-value for the long-tail "Promille" queries.
    this.seo.setJsonLd(
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        '@id': `${SITE_URL}${homePath(this.locale)}#faq`,
        inLanguage: this.locale,
        mainEntity: this.c.faq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      'ld-faq',
    );
  }
}

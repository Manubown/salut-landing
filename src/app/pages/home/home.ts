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
import { MagneticDirective } from '../../keynote/magnetic.directive';
import { HeroStage } from '../../components/hero-stage/hero-stage';
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

/** Full intro plays once per browser session; later visits get a quick rise. */
const INTRO_SEEN_KEY = 'salut:intro';

@Component({
  selector: 'salut-home',
  imports: [RouterLink, ScrubStage, DrinkGlass, ClickPopDirective, MagneticDirective, HeroStage],
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

  /** Letters of the preloader wordmark (the dot is punch-coloured via CSS). */
  protected readonly introLetters = ['S', 'A', 'L', 'U', 'T', '.'];

  constructor() {
    // Intro preloader + hero entrance choreography. Browser-only.
    afterNextRender(() => void this.choreograph());
  }

  /**
   * One GSAP timeline runs the whole opening: wordmark reveal → overlay
   * wipe → hero copy rise. The overlay markup ships in the SSR HTML (it
   * doubles as a splash while the app hydrates); reduced-motion and any
   * GSAP failure tear it down immediately so content is never trapped.
   */
  private async choreograph(): Promise<void> {
    const root = this.host.nativeElement as HTMLElement;
    const intro = root.querySelector<HTMLElement>('.intro');
    const finish = () => intro?.remove();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }

    let seen = false;
    try {
      seen = sessionStorage.getItem(INTRO_SEEN_KEY) === '1';
      sessionStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      /* storage blocked — treat as first visit */
    }

    try {
      const { gsap } = await import('gsap');
      const lines = root.querySelectorAll('[data-anim="line"]');
      const rises = root.querySelectorAll('[data-anim="rise"]');
      const chrome = root.querySelectorAll('[data-anim="chrome"]');

      const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: finish });
      gsap.set(lines, { yPercent: 110 });
      gsap.set(rises, { autoAlpha: 0, y: 36 });
      gsap.set(chrome, { autoAlpha: 0, y: -16 });

      if (intro && !seen) {
        const letters = intro.querySelectorAll('.intro__letter');
        const line = intro.querySelector('.intro__line');
        const tag = intro.querySelector('.intro__tag');
        const mark = intro.querySelector('.intro__mark');

        tl.to(mark, { autoAlpha: 0, duration: 0.25, ease: 'power1.out' }, 0)
          // fromTo: the CSS translateY(110%) is read back as a baked px
          // matrix — reset y and let yPercent own the slide.
          .fromTo(
            letters,
            { y: 0, yPercent: 110 },
            { yPercent: 0, duration: 0.9, stagger: 0.07 },
            0.15,
          )
          .fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'expo.inOut' }, 0.35)
          .fromTo(tag, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.8)
          .to({}, { duration: 0.45 }) // hold the wordmark
          .to(letters, { yPercent: -110, duration: 0.55, stagger: 0.045, ease: 'expo.in' })
          .to([line, tag], { autoAlpha: 0, duration: 0.3 }, '<')
          .to(intro, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, '-=0.1');
      } else if (intro) {
        tl.to(intro, { autoAlpha: 0, duration: 0.45, ease: 'power2.out' }, 0);
      }

      // Hero entrance overlaps the tail of the wipe.
      tl.to(lines, { yPercent: 0, duration: 1.1, stagger: 0.12 }, intro && !seen ? '-=0.55' : 0.1)
        .to(chrome, { autoAlpha: 1, y: 0, duration: 0.7 }, '-=0.9')
        .to(rises, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08 }, '-=0.85');
    } catch {
      finish(); // GSAP chunk failed — show everything as-is
    }
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

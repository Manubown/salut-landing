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
import { IntroBus } from '../../core/intro/intro.bus';
import { INTRO_WORDS } from './intro-letters';

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
  private readonly intro = inject(IntroBus);

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

  /**
   * Handwriting word outlines for the drawn intro (generated from a script
   * font into intro-letters.ts). Each self-draws on via stroke-dashoffset,
   * then "Salut" stays as the wordmark — "Salut" literally means "hi", so the
   * greeting becomes the brand.
   */
  protected readonly greetWords = INTRO_WORDS.filter((w) => w.key !== 'salut');
  protected readonly brandWordData = INTRO_WORDS.find((w) => w.key === 'salut')!;

  constructor() {
    // Intro preloader + hero entrance choreography. Browser-only.
    afterNextRender(() => void this.choreograph());
  }

  /**
   * One GSAP timeline runs the whole opening: greetings morph into the
   * wordmark → curtain lifts → hero copy rises. The overlay markup ships in
   * the SSR HTML (it doubles as a splash while the app hydrates).
   *
   * `intro.lift()` fires the instant the curtain starts rising, so the hero's
   * auto-reveal plays as the curtain lifts (not hidden behind it). Every exit
   * path — reduced-motion, returning visit, GSAP failure — calls it, so the
   * hero is never left waiting and content is never trapped.
   */
  private async choreograph(): Promise<void> {
    const root = this.host.nativeElement as HTMLElement;
    const intro = root.querySelector<HTMLElement>('.intro');
    const finish = () => intro?.remove();
    const lift = () => this.intro.lift();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      lift();
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
      // Wait briefly for the display font so the greeting morph renders in the
      // final typeface instead of swapping mid-animation. Capped so a slow or
      // absent font never holds the opening hostage.
      await Promise.race([
        document.fonts?.ready ?? Promise.resolve(),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]).catch(() => {});

      const lines = root.querySelectorAll('[data-anim="line"]');
      const rises = root.querySelectorAll('[data-anim="rise"]');
      const chrome = root.querySelectorAll('[data-anim="chrome"]');

      const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: finish });
      gsap.set(lines, { yPercent: 110 });
      gsap.set(rises, { autoAlpha: 0, y: 36 });
      gsap.set(chrome, { autoAlpha: 0, y: -16 });

      if (intro && !seen) {
        const greets = Array.from(intro.querySelectorAll<SVGElement>('.intro__word > .intro__draw'));
        const brandSvg = intro.querySelector<SVGElement>('.intro__brand .intro__draw');
        const greetPaths = greets.map((g) => Array.from(g.querySelectorAll<SVGPathElement>('path')));
        const brandPaths = brandSvg ? Array.from(brandSvg.querySelectorAll<SVGPathElement>('path')) : [];
        const dot = intro.querySelector('.intro__dot');
        const line = intro.querySelector('.intro__line');
        const tag = intro.querySelector('.intro__tag');
        const mark = intro.querySelector('.intro__mark');

        // every glyph starts undrawn (stroke hidden)
        gsap.set([...greetPaths.flat(), ...brandPaths], { strokeDashoffset: 1 });
        gsap.set(greets, { autoAlpha: 1 });
        gsap.set(dot, { scale: 0, autoAlpha: 0 });

        tl.to(mark, { autoAlpha: 0, duration: 0.3, ease: 'power1.out' }, 0);

        // each greeting is written letter by letter — the pen follows the line —
        // holds a beat, then fades as the next is written (fluid, no border).
        const WRITE = 0.66;
        const HOLD = 0.3;
        const FADE = 0.3;
        const STEP = WRITE + HOLD;
        greets.forEach((svg, i) => {
          const paths = greetPaths[i];
          const at = 0.25 + i * STEP;
          const per = WRITE / Math.max(1, paths.length);
          paths.forEach((path, j) => {
            tl.to(
              path,
              { strokeDashoffset: 0, duration: per * 1.7, ease: 'power1.inOut' },
              at + j * per * 0.9,
            );
          });
          tl.to(svg, { autoAlpha: 0, duration: FADE, ease: 'power1.in' }, at + WRITE + HOLD);
        });

        // …settle on "Salut": written letter by letter, then it stays — the red
        // dot pops and the underline draws, signature-style, as the curtain lifts.
        const brandAt = 0.25 + greets.length * STEP + 0.05;
        const BRAND_WRITE = 0.82;
        const bper = BRAND_WRITE / Math.max(1, brandPaths.length);
        brandPaths.forEach((path, j) => {
          tl.to(
            path,
            { strokeDashoffset: 0, duration: bper * 1.8, ease: 'power1.inOut' },
            brandAt + j * bper * 0.9,
          );
        });
        const brandEnd = brandAt + BRAND_WRITE + 0.1;
        tl.fromTo(
          dot,
          { scale: 0, autoAlpha: 0 },
          { scale: 1, autoAlpha: 1, duration: 0.4, ease: 'back.out(3)' },
          brandEnd,
        )
          .fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'expo.inOut' }, brandEnd - 0.3)
          .fromTo(tag, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.5 }, brandEnd + 0.05)
          .to({}, { duration: 0.4 }) // brief hold on the wordmark
          .call(lift) // hero auto-reveal begins as the curtain rises
          .to(intro, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' });
      } else if (intro) {
        // returning visit — "Salut" already written, quick fade
        gsap.set(intro.querySelectorAll('.intro__word > .intro__draw'), { autoAlpha: 0 });
        gsap.set(intro.querySelectorAll('.intro__brand .intro__draw path'), { strokeDashoffset: 0 });
        gsap.set(intro.querySelector('.intro__dot'), { scale: 1, autoAlpha: 1 });
        gsap.set(intro.querySelector('.intro__line'), { scaleX: 1 });
        tl.call(lift).to(intro, { autoAlpha: 0, duration: 0.45, ease: 'power2.out' }, 0);
      } else {
        lift();
      }

      // Hero entrance overlaps the tail of the wipe.
      tl.to(lines, { yPercent: 0, duration: 1.1, stagger: 0.12 }, intro && !seen ? '-=0.55' : 0.1)
        .to(chrome, { autoAlpha: 1, y: 0, duration: 0.7 }, '-=0.9')
        .to(rises, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08 }, '-=0.85');
    } catch {
      lift();
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

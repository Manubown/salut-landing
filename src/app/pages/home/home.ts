import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  afterNextRender,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotifyForm } from '../../components/notify-form/notify-form';
import { ScrubStage } from '../../keynote/scrub-stage.component';
import { DrinkGlass, GlassType } from '../../keynote/drink-glass.component';
import { ClickPopDirective } from '../../keynote/click-pop.directive';
import { SeoService, SITE_URL } from '../../core/seo/seo.service';

interface Cocktail {
  name: string;
  base: string;
  glass: GlassType;
  /** Liquid tint for the glass illustration. */
  color: string;
  /** Short description that floats above the card. */
  blurb: string;
}

interface Chip {
  icon: string;
  label: string;
}

/**
 * The live web app (an installable PWA). The app owns the install prompt;
 * the landing sends people there. Single place to change if the domain moves.
 */
export const APP_URL = 'https://salut-web.bressler.at';

@Component({
  selector: 'salut-home',
  imports: [NotifyForm, RouterLink, ScrubStage, DrinkGlass, ClickPopDirective],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly year = new Date().getFullYear();
  protected readonly appUrl = APP_URL;

  /** A taste of the recipe library (real names + glasses from the app). */
  protected readonly cocktails: Cocktail[] = [
    { name: 'Negroni', base: 'Gin', glass: 'Rocks', color: '#E0533C', blurb: 'Italian classic' },
    { name: 'Aperol Spritz', base: 'Aperitivo', glass: 'Wine', color: '#FF8A3D', blurb: 'Bright & bubbly' },
    { name: 'Margarita', base: 'Tequila', glass: 'Coupe', color: '#E8CF5A', blurb: 'Salt & lime' },
    { name: 'Espresso Martini', base: 'Vodka', glass: 'Coupe', color: '#5A3A24', blurb: 'Velvety, rich' },
    { name: 'Mojito', base: 'Rum', glass: 'Highball', color: '#7FC56A', blurb: 'Mint & lime' },
    { name: 'Cosmopolitan', base: 'Vodka', glass: 'Coupe', color: '#F0537A', blurb: 'Tart & pink' },
  ];

  /** Leaderboard mock rows for the "crew" act. */
  protected readonly ranks = [
    { pos: 1, name: 'Mara', pts: 1340 },
    { pos: 2, name: 'Jonas', pts: 1295 },
    { pos: 3, name: 'You', pts: 1280, you: true },
    { pos: 4, name: 'Lena', pts: 1110 },
  ];

  /** Everything else that's already in the app. */
  protected readonly chips: Chip[] = [
    { icon: '👥', label: 'Friends by code' },
    { icon: '📰', label: 'Live drink feed' },
    { icon: '📊', label: 'Session history & stats' },
    { icon: '🎯', label: 'Impostor party game' },
  ];

  constructor() {
    // Premium pointer/gyro tilt on the hero device. Browser-only and
    // motion-safe; falls back to a flat, perfectly fine card otherwise.
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
      title: 'Salut — Track your night out. Right from your home screen.',
      description:
        'Salut is live in your browser: track your drinks and BAC, browse 15 cocktail recipes, climb the leaderboard, add friends and play party games. Free, and it installs straight to your home screen.',
      path: '/',
    });
    // Organization + WebSite + WebApplication as one @graph, cross-linked via
    // @id. The structured-data pattern Google prefers for a brand site.
    this.seo.setJsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${SITE_URL}/#organization`,
          name: 'Salut',
          url: `${SITE_URL}/`,
          logo: `${SITE_URL}/icon-512.png`,
          description:
            'Salut helps you have a better night out: track your drinks and BAC, browse cocktail recipes, climb the leaderboard, add friends and play party games.',
        },
        {
          '@type': 'WebSite',
          '@id': `${SITE_URL}/#website`,
          name: 'Salut',
          url: `${SITE_URL}/`,
          inLanguage: 'en',
          publisher: { '@id': `${SITE_URL}/#organization` },
          description:
            'Track your drinks and BAC, browse cocktail recipes, climb the leaderboard and play party games — installable straight to your home screen.',
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
  }
}

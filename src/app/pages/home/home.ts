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
import { SeoService, SITE_URL } from '../../core/seo/seo.service';

interface Feature {
  icon: string;
  title: string;
  body: string;
}

interface Step {
  n: string;
  title: string;
  body: string;
}

interface Benefit {
  icon: string;
  text: string;
}

/**
 * The live web app (an installable PWA). The app itself handles the one-tap
 * install prompt; the landing just sends people there. Single place to change
 * if the app domain moves.
 */
export const APP_URL = 'https://salut-web.bressler.at';

@Component({
  selector: 'salut-home',
  imports: [NotifyForm, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly year = new Date().getFullYear();
  protected readonly appUrl = APP_URL;

  /** The nightly core loop — what the app is actually for. */
  protected readonly loop: Step[] = [
    {
      n: '1',
      title: 'Log the round',
      body: 'Tap ＋ and add what you’re drinking. A beer, a shot, that third Negroni — it all counts.',
    },
    {
      n: '2',
      title: 'Watch your limit',
      body: 'Your blood-alcohol gauge rises and falls in real time, with a countdown to when you’ll be sober again.',
    },
    {
      n: '3',
      title: 'Climb & compare',
      body: 'Every drink banks points. Rank up the global leaderboard and see what your crew is pouring in the feed.',
    },
  ];

  /** Everything already shipped in the live app today. */
  protected readonly features: Feature[] = [
    {
      icon: '📈',
      title: 'Live BAC tracking',
      body: 'Watch your blood-alcohol level climb and fade on a live gauge — the same Widmark math the pros use — with a time-till-sober countdown.',
    },
    {
      icon: '🍸',
      title: '15 cocktails to try',
      body: 'A built-in recipe book from Negroni to Espresso Martini. Filter by spirit or by taste, then follow the ingredients and steps.',
    },
    {
      icon: '📰',
      title: 'A live drink feed',
      body: 'See what your crew is pouring tonight, upvote the good ones, and add any drink to your own tracker in a single tap.',
    },
    {
      icon: '🏆',
      title: 'Points & leaderboard',
      body: 'Every drink scores. Climb the server-ranked leaderboard and settle, once and for all, who really runs the night.',
    },
    {
      icon: '👥',
      title: 'Friends by code',
      body: 'Share a friend code, build your crew, accept requests, and keep the whole night connected.',
    },
    {
      icon: '🎲',
      title: 'Party games built in',
      body: 'Impostor and the Lucky Wheel ship with the app. Pass the phone around and let the table decide the rest.',
    },
  ];

  /** Why the home-screen install is worth it (the app offers the prompt). */
  protected readonly benefits: Benefit[] = [
    { icon: '⚡', text: 'Installs in seconds — no app store, no download' },
    { icon: '🖥️', text: 'Opens full-screen with its own icon, like a native app' },
    { icon: '🔄', text: 'Always the latest version — nothing to update' },
  ];

  constructor() {
    // Fluid scroll-reveal. Browser-only (afterNextRender never runs on the
    // server), so SSR ships fully-visible markup and there's no FOUC: the
    // hidden start-state is gated behind the `reveal-ready` class we add here.
    afterNextRender(() => {
      const root = this.host.nativeElement as HTMLElement;
      const items = Array.from(root.querySelectorAll<HTMLElement>('.reveal'));
      if (!items.length) return;

      if (!('IntersectionObserver' in window)) {
        items.forEach((el) => el.classList.add('in'));
        return;
      }

      root.classList.add('reveal-ready');
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('in');
              io.unobserve(entry.target);
            }
          }
        },
        { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
      );
      items.forEach((el) => io.observe(el));
    });
  }

  ngOnInit(): void {
    this.seo.apply({
      title: 'Salut — Track your night out. Right from your home screen.',
      description:
        'Salut is live in your browser: track your drinks and BAC, browse 15 cocktail recipes, climb the leaderboard, add friends and play party games. Free, and it installs straight to your home screen.',
      path: '/',
    });
    // Organization + WebSite as one @graph, cross-linked via @id (publisher).
    // This is the structured-data pattern Google prefers for a brand site and
    // is what surfaces the knowledge-panel / logo. inLanguage tracks the
    // current content language (English today; per-locale once i18n lands).
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
          // The product itself — a free, installable web application.
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

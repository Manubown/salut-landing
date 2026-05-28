import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotifyForm } from '../../components/notify-form/notify-form';
import { SeoService, SITE_URL } from '../../core/seo/seo.service';

interface Feature {
  icon: string;
  title: string;
  body: string;
}

@Component({
  selector: 'salut-home',
  imports: [NotifyForm, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  private readonly seo = inject(SeoService);

  protected readonly year = new Date().getFullYear();

  protected readonly features: Feature[] = [
    {
      icon: '🍸',
      title: 'Cocktails worth trying',
      body: 'A hand-built library of recipes — from the classics to the off-menu. Save favourites, scale servings and find your next pour.',
    },
    {
      icon: '📍',
      title: 'The hottest events near you',
      body: 'See what is actually happening tonight in your region. Trending bars, parties and pop-ups, ranked by the people going.',
    },
    {
      icon: '🥂',
      title: 'Group up & go together',
      body: 'Found an event? Rally your crew, lock in who is coming and get a nudge before it kicks off. Nobody goes alone.',
    },
  ];

  ngOnInit(): void {
    this.seo.apply({
      title: 'Salut — Cocktails to try & the hottest events near you',
      description:
        'Salut is your companion for great nights out: discover cocktail recipes worth trying, find the hottest events in your region, and group up with friends to go together. Join the waitlist.',
      path: '/',
    });
    this.seo.setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Salut',
      url: `${SITE_URL}/`,
      description:
        'Discover cocktail recipes and the hottest local events, then group up with friends to go together.',
    });
  }
}

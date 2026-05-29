import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';

@Component({
  selector: 'salut-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="notfound">
      <p class="notfound__code">404</p>
      <h1 class="notfound__title">This page poured out.</h1>
      <p class="notfound__body">
        The page you were after doesn’t exist (or moved). Let’s get you back to
        the good stuff.
      </p>
      <a routerLink="/" class="notfound__home">Back to Salut</a>
    </main>
  `,
  styles: `
    .notfound {
      min-height: 70vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-3, 0.75rem);
      text-align: center;
      padding: var(--space-6, 2rem) var(--space-4, 1rem);
    }
    .notfound__code {
      font-size: clamp(3rem, 12vw, 6rem);
      font-weight: 700;
      line-height: 1;
      margin: 0;
      opacity: 0.6;
    }
    .notfound__title {
      margin: 0;
      font-size: clamp(1.5rem, 5vw, 2.25rem);
    }
    .notfound__body {
      margin: 0;
      max-width: 38ch;
      opacity: 0.8;
    }
    .notfound__home {
      margin-top: var(--space-3, 0.75rem);
      display: inline-block;
    }
  `,
})
export class NotFound implements OnInit {
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.apply({
      title: 'Page not found — Salut',
      description: 'The page you were looking for doesn’t exist.',
      robots: 'noindex, follow',
    });
  }
}

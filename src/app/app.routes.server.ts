import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Events are data-driven and change without a rebuild — render them on the
  // server per request (fresh + indexable) rather than prerendering at build
  // time. Arbitrary :id values are handled too (prerender would need every id
  // enumerated up-front). The static marketing/legal pages stay prerendered.
  { path: 'events', renderMode: RenderMode.Server },
  { path: 'events/:id', renderMode: RenderMode.Server },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];

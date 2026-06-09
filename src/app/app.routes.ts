import { Routes } from '@angular/router';
import { eventResolver, eventsResolver } from './core/events/events.resolver';

export const routes: Routes = [
  {
    // German (default, Austria-first) at the root.
    path: '',
    data: { locale: 'de' },
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
    title: 'Salut — Ausgeh-App: Promille-Rechner, Cocktails & Trinkspiele',
  },
  {
    // English at /en.
    path: 'en',
    data: { locale: 'en' },
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
    title: 'Salut — Night-out app: BAC tracker, cocktails & drinking games',
  },
  {
    path: 'events',
    loadComponent: () => import('./pages/events/events').then((m) => m.Events),
    resolve: { events: eventsResolver },
    title: 'Events in Vienna — club nights & concerts | Salut',
  },
  {
    path: 'events/:id',
    loadComponent: () => import('./pages/event-detail/event-detail').then((m) => m.EventDetail),
    resolve: { event: eventResolver },
    // <title> is set per-event by SeoService in the component.
  },
  {
    path: 'impressum',
    loadComponent: () => import('./pages/legal/impressum').then((m) => m.Impressum),
    title: 'Impressum — Salut',
  },
  {
    path: 'datenschutz',
    loadComponent: () => import('./pages/legal/datenschutz').then((m) => m.Datenschutz),
    title: 'Datenschutzerklärung — Salut',
  },
  {
    path: 'early-access',
    data: { locale: 'de' },
    loadComponent: () => import('./pages/register/register').then((m) => m.Register),
    title: 'Early Access — Salut',
  },
  {
    path: 'en/early-access',
    data: { locale: 'en' },
    loadComponent: () => import('./pages/register/register').then((m) => m.Register),
    title: 'Early access — Salut',
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
    title: 'Page not found — Salut',
  },
];

import { Routes } from '@angular/router';

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
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
    title: 'Page not found — Salut',
  },
];

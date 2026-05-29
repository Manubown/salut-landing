import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
    title: 'Salut — Cocktails to try & the hottest events near you',
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

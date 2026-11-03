import { Routes } from '@angular/router';
import { ChatPage } from './chat/chat-page';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Twins for Change · A bilingual Yorùbá–English AI tutor',
    loadComponent: () => import('./site/landing-page').then((m) => m.LandingPage),
  },
  // The landing page links here; the tutor itself stays at /chat.
  { path: 'app', pathMatch: 'full', redirectTo: 'chat' },
  {
    path: 'mapa',
    title: 'Language map · Twins for Change',
    loadComponent: () => import('./site/map-page').then((m) => m.MapPage),
  },
  {
    path: 'chat',
    title: 'Chat · Twins for Change',
    // The default route is in the main bundle: a lazy chunk would add a round trip before the first paint.
    component: ChatPage,
  },
  {
    path: 'practice',
    title: 'Practice · Twins for Change',
    loadComponent: () => import('./practice/practice-page').then((m) => m.PracticePage),
  },
  {
    path: 'architecture',
    title: 'How it works · Twins for Change',
    loadComponent: () => import('./architecture/architecture-page').then((m) => m.ArchitecturePage),
  },
  {
    path: 'difference',
    title: 'What sets us apart · Twins for Change',
    loadComponent: () => import('./difference/difference-page').then((m) => m.DifferencePage),
  },
  {
    path: 'crm',
    title: 'Partner CRM · Twins for Change',
    loadComponent: () => import('./crm/crm-page').then((m) => m.CrmPage),
  },
  { path: '**', redirectTo: 'chat' },
];

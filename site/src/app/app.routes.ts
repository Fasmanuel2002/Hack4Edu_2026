import { Routes } from '@angular/router';
import { ChatPage } from './chat/chat-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'chat' },
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
  { path: '**', redirectTo: 'chat' },
];

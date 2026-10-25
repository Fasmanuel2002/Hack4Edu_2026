import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'chat' },
  {
    path: 'chat',
    title: 'Chat · Twins for Change',
    loadComponent: () => import('./chat/chat-page').then((m) => m.ChatPage),
  },
  {
    path: 'architecture',
    title: 'How it works · Twins for Change',
    loadComponent: () => import('./architecture/architecture-page').then((m) => m.ArchitecturePage),
  },
  { path: '**', redirectTo: 'chat' },
];

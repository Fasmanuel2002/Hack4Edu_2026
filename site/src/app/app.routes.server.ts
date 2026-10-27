import { RenderMode, ServerRoute } from '@angular/ssr';

// Static output only (angular.json "outputMode": "static"):
// /architecture is prerendered to HTML at build time; everything else, including /chat (it reads
// localStorage) and /practice, renders in the browser from the app shell (index.csr.html).
export const serverRoutes: ServerRoute[] = [
  { path: 'architecture', renderMode: RenderMode.Prerender },
  { path: 'practice', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Client },
];

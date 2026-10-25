# Twins for Change: web frontend

Angular 22 chat workspace for Twins for Change, the offline-first bilingual Yorùbá–English
AI tutor (Hack4Edu 2026). It calls the FastAPI backend in `../src/modules/app/`, or shows
labelled demo data when `useMock` is on (the default).

Full details, decisions, and open items: `../docs/build-summary.md`.

## Commands (run in this folder)

| Task | Command |
|---|---|
| Install | `npm install` |
| Dev server (port 4200) | `ng serve` |
| Production build (static files in `dist/site/browser`) | `ng build --configuration production` |
| Serve the production build (port 4300, SPA fallback) | `npm run serve:dist` |
| Unit tests | `ng test --watch=false` |
| Regenerate demo data from `../dataset_rag.csv` | `npm run generate:demo-data` |

## Mock mode and the real backend

`src/environments/environment.development.ts` (used by `ng serve`) and
`src/environments/environment.ts` (production build) each set `apiBaseUrl` and `useMock`.
To use a backend, set `useMock: false` and, for production, replace the `<pod-id>`
placeholder with the RunPod pod ID. Keep production on `https://`.

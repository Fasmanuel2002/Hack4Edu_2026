# Build summary: Twins for Change frontend

Step 1 (developer build) and the redesign pass requested by the author, 2026-10-25. The app lives
in `site/`. It runs in mock mode by default (`useMock: true` in both environment files) and works
with no backend and no internet.

## External packages and assets

Nothing loads from the internet at runtime: no CDN, web fonts, analytics, remote images, UI
component library, icon library, or third-party script. The only network calls go to
`apiBaseUrl`, and only when `useMock` is `false`.

### npm packages (`site/package.json`)

| Package | Version | Shipped to the browser? | Why |
|---|---|---|---|
| `@angular/core`, `common`, `compiler`, `platform-browser`, `router` | 22.2.3 | Yes | The framework required by CLAUDE.md (latest stable Angular, standalone components, Signals). |
| `rxjs` | 7.8.2 | Yes (via Angular) | Required peer dependency of Angular. The app code does not use it directly. |
| `tslib` | 2.8.1 | Yes | TypeScript runtime helpers (Angular CLI default). |
| `marked` | 18.1.1 | Yes, only in the lazy `/chat` chunk | The small Markdown renderer CLAUDE.md allows, for Gemma's answers. Raw HTML is shown as text, images are never rendered (no remote loads), only `http(s):`/`mailto:` links are kept (with `rel="noopener noreferrer"`), and Angular's sanitizer runs on the result (`[innerHTML]`). |
| `@angular/ssr`, `@angular/platform-server` | 22.2.4, 22.2.3 | No (build time only) | Prerender `/architecture` to static HTML (`outputMode: "static"`). No Node server at runtime, no Express. |
| `@angular/build`, `@angular/cli`, `@angular/compiler-cli`, `typescript` | 22.2.4, 22.2.4, 22.2.3, 6.0.3 | No | Build toolchain. |
| `vitest`, `jsdom` | 5.0.5, 30.1.3 | No | Unit tests (Angular 22's default runner and DOM environment). |
| `prettier` | 3.9.10 | No | Formatter from the Angular CLI template; not used by the build. |

`@angular/forms` came with the CLI template; it was unused, so I uninstalled it.

### Assets (`site/public/`)

| Asset | Why |
|---|---|
| `brand/twins-for-change-mark.png` | The logo's mark only (the two figures and the open book), cropped from `assets/brand/twins-for-change-logo.png` as CLAUDE.md now requires: a 558 × 449 crop at offset (6, 4), which keeps a 20 px margin of the original's own white background. Nothing was redrawn, recolored or stretched, and the original in `assets/` is unchanged (checksum verified). Used as the fallback image. |
| `brand/twins-for-change-mark-96.webp`, `-256.webp` | The same crop downscaled proportionally (`cwebp`, quality 92; 3 and 8 KB), served through `<picture>`/`srcset`. |
| `favicon.ico` | The mark, padded with white to a square, at 64, 48, 32 and 16 px. It replaces the custom favicon from the first build. |

Now unused (kept, not deleted, as instructed): `brand/twins-for-change-logo.png` and its six
downscaled copies `brand/twins-for-change-logo-{320,480,960}.{png,webp}` (the full logo with the
wordmark, no longer shown), and `favicon.svg` (the first build's custom mark). They are still
copied into `dist/` but nothing references them. The author can delete them.

### Other files

| File | Why |
|---|---|
| `site/vercel.json` | Needed for routing: in static output mode `/chat` has no HTML file, so a direct visit or reload would 404 on Vercel. The rules send `/architecture` to its prerendered page and every other path that is not a real file to the app shell `index.csr.html`. Vercel serves existing files before rewrites. |
| `site/scripts/serve-dist.mjs` | Local preview of the production build with the same fallback rules and brotli/gzip compression like Vercel. Node built-ins only, works offline. |
| `site/scripts/generate-demo-data.py` | Python standard library only. Regenerates `src/app/core/starters.ts` and `src/app/core/demo-data.ts` from `CLAUDE.md` and `dataset_rag.csv` (read only), so Yorùbá text is copied, never retyped. |

Tools used only for my own checks, installed in a temporary folder outside the repository:
Playwright 1.64 (with the installed Chrome), Lighthouse 13.5, axe-core.

## needs_review

### Backend gaps and removed features

1. **Token streaming.** The backend returns the full answer at once; the UI reveals it word by
   word on the client, with a blinking cursor and a Stop button.
2. **Retrieved sources.** `/ask/rag` returns only `{"answer"}`. In mock mode the "Verified sources
   (top 3)" drawer shows real corpus rows labelled "Demo data"; with the real backend it says the
   API does not return sources yet. Suggested backend change (backend team's call): also return
   `sources: [{source_dataset, search_context, pedagogical_answer}]` in rank order. If scores are
   added, keep showing ranks, not percentages.
3. **Subject filter: removed.** At the author's request the "Subjects" section (heading, five
   pills, "Preview only" note, its state and CSS) was removed from the sidebar, and the corpus
   counts it used were dropped from the code. Search always covered all 15,791 rows anyway. It
   could come back once the backend supports filtering, for example a `source_dataset` filter on
   `/ask/rag`.
4. **File uploads.** No upload endpoint. Attachments get chips, validation messages and a "not
   sent" notice; the sent question records them as "Not sent". My choices: a 10 MB limit per file,
   and `.jpeg` accepted along with `.jpg`.
5. **Health of Ollama and Qdrant.** `/health/health` only shows that the API process is up.

### Deployment and configuration

6. **RunPod URL missing.** `site/src/environments/environment.ts` uses the marked placeholder
   `https://<pod-id>-8000.proxy.runpod.net` with `useMock: true`, so the Vercel build runs in demo
   mode. Replace `<pod-id>` and set `useMock: false` once the pod exists (always `https://`).
7. **`.gitignore` and `site/`.** When this build started, line 170 of the repository's
   `.gitignore` (`/site`, from the mkdocs part of the Python template) excluded the Angular project
   from Git, so Vercel would not have seen it. During the build that line was removed from outside
   this task (I never edited the file). `site/` is now visible to Git as untracked; please confirm
   that change. `site/.gitignore` still keeps `node_modules/`, `dist/` and `.angular/cache/` out.
8. **Angular 22 with a global CLI 21.** Built with Angular 22.2 (latest stable on npm). Inside
   `site/` the global `ng` delegates to the local CLI 22. Angular 22 needs Node ^22.22.3, ^24.15.0
   or >= 26: choose Node 22.x or 24.x in Vercel.
9. npm 11 on this laptop skipped the install scripts of `fsevents`, `lmdb` and `msgpackr-extract`
   (optional native helpers). The build and the tests work without them.

### Backend code compared with CLAUDE.md

The API contract matches (`POST /ask/rag` and `/ask/plain` with `{"question": string}` →
`{"answer": string}`; `GET /health/health` → `{"status": "healty"}`; CORS allows all origins). The
frontend accepts "healty" and "healthy". Observations, none changed:

10. Root `main.py` starts uvicorn on `127.0.0.1:8502` by default, while CLAUDE.md's command and the
    development `apiBaseUrl` use port 8000.
11. The backend prompt calls the context "100% ... verified"; the UI never makes that claim.
12. `docker-compose.yml` at the repository root contains agent instructions for a different
    project, not a Compose file.
13. 668 of the 15,791 corpus rows are not in Unicode NFC (for example a Belebele row used as a demo
    source). The UI shows rows exactly as stored; BM25 matching on them may suffer.

### Demo data and other decisions for the author

14. **Demo answers** for the four starters are composed from their corpus rows (Yorùbá copied by
    the generator; English headings, the row's English summary and simple arithmetic added). They
    are not Gemma output and are labelled "Demo data".
15. **Plain Gemma in demo mode** shows a labelled placeholder instead of an invented answer.
    Suggestion: capture real `/ask/rag` and `/ask/plain` answers for the four starters on the RTX
    4090 run and add them to the generator.
16. **Demo sources 2 and 3** are real rows I picked by topic, not hybrid-search results; the drawer
    says so. Other questions in demo mode get a labelled "No demo answer" message.
17. **Fonts.** Helvetica Neue comes first: on Apple devices the default system font (SF Pro) places
    the acute and grave off-centre over ẹ and ọ (checked in screenshots). Then Segoe UI, Noto Sans,
    Roboto.
18. **URL strings in the bundle that are never requested:** XML namespaces (`www.w3.org`), Angular's
    router URL-parsing base `http://fake`, Angular's sanitizer documentation link, marked's "please
    report" GitHub link, the `http://` prefix marked adds to bare `www.` links, and the `apiBaseUrl`
    placeholder. In the browser no request goes to any host except the local server.
19. **Timeouts.** The client waits up to 5 minutes per answer (minimum required: 120 s). For a
    non-local API, a dropped connection after 90 s or more, or HTTP 504/524, is reported as the
    RunPod proxy timeout (about 100 s).
20. **Compare columns** sit side by side when the thread is at least 640 px wide and stack below
    that (always below 768 px; also at 768 px while the sidebar is open, where each column would be
    under 240 px wide). Hiding the sidebar shows them side by side at 768 px.
21. Compare mode resets on reload; theme and chat history are saved.
22. Copy falls back to `execCommand('copy')` where the Clipboard API is unavailable (plain-http
    school LANs).
23. **The author's feedback overrides the first build's visual rules.** The atmosphere rules of the
    first `.claude/agents/developer.md` (layered gradients, patterns, textures, sky-blue heading
    highlight) were replaced by the minimal direction; developer.md, CLAUDE.md (Brand: mark only)
    and the reviewer file were updated by the coordinator to match.

## Design choices

The author asked for a minimalist tool like ChatGPT and Gemini. The interface is a quiet chat tool
built for reading long Yorùbá and English answers and comparing two answers quickly.

- **Flat surfaces.** No gradients, patterns, textures, glows, or decorative lines. Light theme:
  white page and white sidebar, gray-blue `#D6DEEA` borders, navy text, brand blue only for the
  send button, links and pressed chips. Dark theme: flat navy, white text, sky blue accents, light
  navy for the composer surface and the selected row. Areas are separated by spacing and a few thin
  borders. Only the composer (and the mobile drawer) has a very soft shadow, in the light theme.
- **Welcome screen.** Vertically centred: the small mark, one modest heading "Báwo ni! How can we
  learn together today?" (28–32 px, medium weight, no colour, wraps instead of clipping), the
  composer right under it, and the four starter questions as quiet rows (line icon, the Yorùbá
  line, the English line muted underneath). Demo mode is one small muted line with a pill. A short
  fade is the only motion. After the first message the composer docks at the bottom.
- **Sidebar.** Plain rows with line icons and a subtle hover: the mark and name, New chat (with the
  shortcut hint), small muted section labels, history grouped by date with rename and delete on
  hover or focus, and a compact four-line status footer.
- **Composer.** One rounded box: "+" on the left, the text box, then small chips for Compare and
  Tone marks (accent outline when on) and a round send button that becomes a square Stop. The tone
  mark bar and the attachment list are slim rows inside the box. On narrow screens the text box
  takes the first line and the controls the second.
- **Messages.** The user's question is a light bubble on the right with a small avatar, "You" and
  the time. Answers have no bubble: a small avatar, a small plain label, a "Demo data" pill, the
  time, the Markdown, and icon-only Copy and Regenerate buttons (named for screen readers, with
  tooltips). Yorùbá blocks keep one thin rule at their start (meaningful: it keeps the two
  languages distinct; a small legend explains it).
- **Compare mode.** Two equal columns under the question, the same typography as normal answers,
  one thin divider, each with its own label ("Twins for Change (Gemma + RAG)", "Plain Gemma (no
  RAG)"), loading line and actions; the sources drawer only under the RAG column. Told apart by
  label and position, never by colour.
- **Logo.** Only the mark, on white: directly on the white surfaces in the light theme, on a small
  white rounded tile in the dark theme. Used in the sidebar header, above the greeting, in the top
  bar when the sidebar is hidden, and as the favicon. Alt text "Twins for Change".
- **Typography.** System fonts tested for Yorùbá (item 17); body 16 px, one modest heading size,
  muted secondary text; line height at least 1.6, 1.7 for `[lang="yo"]`, 1.75 for Yorùbá in
  answers; Yorùbá text is never uppercased or put in a fixed-height box with hidden overflow;
  monospace for code and `source_dataset` badges.
- **Contrast.** Text pairs from the palette only: navy/white 13.3, blue/white 6.5, white/navy 13.3,
  sky/navy 8.6, pale/navy 10.5; muted text is navy at 78% (6.8:1). Input boundaries are 3:1 or more
  (navy at 55% on white, pale blue at 50% on navy). The dark-theme send button is sky blue with a
  navy arrow (8.6:1). Focus rings: brand blue on white, sky blue on navy. Sky on white and blue on
  navy are never used for text, icons or focus rings.
- **Motion.** The word-by-word reveal and the sources drawer (0.2 s) are the main motion, plus the
  short welcome fade. Under `prefers-reduced-motion`, animations stop and answers appear in full at
  once.

## Scrolling: bugs found and fixed (redesign pass)

Reproduced with Playwright in Chrome at 1440×900, 1280×800, 768×1024 and 375×740 in both themes,
with seeded long answers, compare mode and 40+ chats, before and after the fix.

| Bug found | Fix |
|---|---|
| The page itself could scroll on desktop and tablet (the document was 1,007 px taller than a 1440×900 window; `window.scrollTo` or a `scrollIntoView` moved the whole app and left blank space). | The chat shell is now `position: fixed; inset: 0`, so the document never scrolls (height = viewport, `scrollTo` has no effect). |
| The sidebar history did not scroll on its own at 768 px and wider with many chats. | The grid row is `minmax(0, 1fr)` and the whole sidebar is one scroll container (sticky header and status footer, `overscroll-behavior: contain`), so the wheel works anywhere over it. |
| The wheel did nothing over the composer or the top bar (the thread was a separate box). | One scroll container holds the sticky top bar, the thread and the sticky docked composer, so the wheel over any of them scrolls the thread. |
| Nothing followed the answer while it was revealed, and there was no way back to the latest message. | While the view is at the bottom it follows the reveal. Scrolling up (wheel, touch, Arrow Up, Page Up, Home, or dragging the scrollbar) stops following without pulling the reader back, and a round "Scroll to latest message" button appears above the composer. |
| After sending at 768 and 375 px the new question was not in view. | Sending always goes to the latest message. |
| Opening a chat landed in the middle of the thread. | Opening a chat starts at the latest message. |
| A sources drawer opening near the bottom could end up behind the composer. | Opening a drawer stops following, and `scroll-padding` equals the measured height of the docked composer (ResizeObserver), so `scrollIntoView` keeps it visible. |

Checked and fine before and after: no nested scroll areas in compare columns, no horizontal scroll,
and the page behind the mobile drawer does not move (the thread is also locked while the drawer is
open).

## What was built

- **Routes.** `/chat` (default; rendered in the browser) and `/architecture` (prerendered). `/` and
  unknown paths go to `/chat`. Titles "Chat · Twins for Change" and "How it works · Twins for
  Change". One `h1` per route.
- **Sidebar** (`aside` with `nav`): New chat with Ctrl/Cmd + Shift + O; history in `localStorage`
  grouped by Today, Yesterday, Previous 7 days, Previous 30 days and Older, with rename and delete
  (inline confirmation); status footer (`LLM: gemma3:4b (Ollama)`, `Search: Qdrant hybrid (bge-m3 +
  BM25, RRF)`, `API: Demo mode / online / offline` from polling `/health/health` every 30 s, and
  `Backend: local, no internet needed after setup` or `Backend: RunPod (cloud)`). Below 768 px it
  is a drawer (focus moves in, the page behind is inert and locked, Escape closes it).
- **Welcome screen, messages, compare mode, composer:** as described in Design choices. Starter
  rows send their Yorùbá question at once. Copy, Regenerate, Stop (`AbortController` or freezing the
  reveal), Markdown with numbered steps, code blocks and tables; `lang="yo"` on Yorùbá text.
- **Verified sources (top 3)** under each Twins for Change answer: rank, monospace `source_dataset`
  badge, subject, the matched `search_context` (Yorùbá, then English muted), and the full
  `pedagogical_answer` with its corpus labels styled and options split.
- **Composer details.** Text box up to 200 px (Enter sends, Shift + Enter adds a line); tone mark
  bar (one tab stop, arrow keys between the 19 characters, inserts the whole sequence at the cursor
  and puts the cursor after it); attachments by "+" or drag and drop anywhere, with chips, previews,
  validation in an `aria-live` region and the "not sent" notice.
- **Errors.** 422, 500, network failure, proxy timeout, client timeout and unexpected responses each
  show a message with Retry; an offline API shows one muted line with "Check again".
- **Theme.** Light and dark; follows `prefers-color-scheme` until the user toggles it (saved, and
  applied before the first paint).
- **`/architecture`.** Flat page: the five-step pipeline as a numbered list, the compare baseline,
  pipeline settings, deployment (cloud and local mode), corpus table, API table, and what the
  backend does not do yet.

## How to run with `ng serve`

```bash
cd site
npm install
ng serve          # http://localhost:4200, mock mode (no backend needed)
```

Other commands: `ng test --watch=false` (unit tests) and `npm run generate:demo-data`.

## How to serve the production build locally

```bash
cd site
ng build --configuration production
npm run serve:dist                # same as: node scripts/serve-dist.mjs
```

It serves `dist/site/browser` at **http://localhost:4300** (another port: `PORT=4301 npm run
serve:dist`). Stop it with Ctrl + C. It needs no packages and no internet. Routing matches
`vercel.json`: existing files are served as they are (JS, CSS, images, and `architecture/index.html`
for `/architecture`); every other path, such as `/`, `/chat` or `/any/unknown/path`, returns the
app shell `index.csr.html` with status 200, and the Angular router shows `/chat` (redirecting `/`
and unknown paths there). Text files are compressed (brotli or gzip) like on Vercel.

## How to switch from mock mode to the real backend

Only the two environment files change.

- **Stage 2, everything local.** Start Qdrant, Ollama and the backend with the commands in CLAUDE.md
  (uvicorn on port 8000; see item 10). In `site/src/environments/environment.development.ts` set
  `useMock: false` (keep `apiBaseUrl: 'http://localhost:8000'`) and run `ng serve`. The sidebar
  shows "API: online" and "Backend: local, no internet needed after setup".
- **Stage 3, RunPod + Vercel.** In `site/src/environments/environment.ts` set `apiBaseUrl` to
  `https://<real-pod-id>-8000.proxy.runpod.net` and `useMock: false`. Never use `http://` there
  (mixed content). Rebuild and deploy.

## Vercel settings and deploy steps

| Setting | Value |
|---|---|
| Root directory | `site` |
| Build command | `ng build --configuration production` |
| Output directory | `dist/site/browser` (from `angular.json`) |
| Install command | default (`npm install`; `package-lock.json` is in the project) |
| Node.js version | 22.x or 24.x (Angular 22 requirement) |
| Base href | `/` (set in `src/index.html`) |

Steps for the author (agents do not deploy): confirm the `.gitignore` change (item 7); commit
`site/` and `docs/`; import the repository in Vercel with the settings above; deploy; check a
reload on `/chat` and a direct visit to `/architecture`. Until the RunPod URL exists the site runs
in demo mode, with every mock answer labelled "Demo data".

## Verification of this build

- **Production build:** succeeds with no warnings and no budget warnings. Initial bundle 285.27 kB
  raw (about 80 kB transferred); lazy chunks `/chat` 134.42 kB (about 34 kB) and `/architecture`
  15.24 kB (about 4 kB). One route prerendered.
- **Unit tests** (`ng test --watch=false`): 7 files, 56 tests, all passing: the API service in mock
  and real mode (exact POST body and URL, 422/500, network failure, missing answer, timeout of at
  least 120 s, user stop, health incl. "healty"); tone mark insertion at the cursor (function and
  composer DOM); chat history storage (save, load, corrupt data, reload while pending, date groups,
  rename, delete, no history sent, compare calls both endpoints, stop); the Compare chip; Markdown
  safety and heading levels; corpus label parsing; demo-data integrity; the live region.
- **External URL grep** of `dist/`: only the strings in item 18 plus licence text in
  `3rdpartylicenses.txt`.
- **Browser checks** (Playwright + Chrome on the production build): the scroll checks above at four
  sizes in both themes; follow, unpin and "Scroll to latest" with a long answer from a local
  stand-in backend (same routes as `src/modules/app`; a scratch build with `useMock: false`,
  environment file restored right after) at 1280×800, 1440×900 in compare mode, and 375×740; no
  console errors; no request to any host but the local server.
- **axe-core** (WCAG 2.1 A/AA + best practices): 0 violations on the welcome screen, a long answer
  with sources open, and compare mode, in light and dark at 1280 px; welcome and compare at 375 px;
  and `/architecture` in dark.
- **Lighthouse 13.5** (mobile, local server with compression): `/chat` 94 / 100 / 100 and
  `/architecture` 100 / 100 / 100 (performance / accessibility / best practices).

## Main files

- `site/src/app/core/`: API service and mock mode, configuration token, chat state and reveal,
  history storage, health polling, theme, media queries and live announcer, Markdown, corpus label
  parsing, corpus facts, Yorùbá helpers and tone marks, generated starters and demo data.
- `site/src/app/chat/`: chat page (layout and scrolling), sidebar, welcome heading, starter list,
  answer, sources drawer, composer.
- `site/src/app/architecture/`: the prerendered architecture page.
- `site/src/app/shared/`: top bar, logo mark, icons.
- `site/src/styles.css`: palette tokens, themes, focus rings, buttons, Markdown styles.
- `site/src/environments/`: `apiBaseUrl` and `useMock` for development and production.

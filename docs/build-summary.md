# Build summary: Twins for Change frontend

Passes so far: the first build and the redesign (2026-10-25), the quality-and-gamification pass
(2026-10-26), the **product pass (2026-10-27)**: the gamification is gone, the sources drawer
shows the real sources that `POST /ask/rag` now returns, and the interface got its own identity
(self-hosted fonts, a navy colour story, a few deliberate motion moments), and the **reference-UI
restyle (2026-10-29)**, a visual and markup pass described in "Design update: reference-UI
restyle" below. The app lives in `site/`.

Both environment files have `useMock: false`, set by the author on purpose; this pass did not
touch them. Mock mode still exists, is covered by the unit tests, and comes back by setting
`useMock: true` (see needs_review item 10).

## Landing page and language map merged in (2026-11-01)

Merged from the team's second Angular project (`~/Downloads/Twins_for_Change_Angular_FastAPI/frontend`)
by adding routes only. `/chat`, `/practice`, `/architecture`, the chat store, composer, API service
and backend are unchanged.

- `/` is the new landing page (`site/src/app/site/landing-page.*`, lazy). The old `/` -> `/chat`
  redirect is gone; `/app` is a redirect to `/chat`, and the landing CTA "Open the tutor" links to `/app`.
- `/mapa` is the language map (`map-page.*`, lazy): search, region filter, approximate pins over a
  reference map image, a country list, and a detail panel with the researchers' caveats and source
  links. One quiet line says the tutor supports only Yorùbá and English. Pins are mouse-only
  (`tabindex="-1"`, `aria-hidden`); the list is the keyboard and screen-reader path.
- Both are client-rendered (the `**` server route); direct visits work through `index.csr.html`
  (`serve-dist.mjs`, FastAPI fallback). Nothing in `app.routes.server.ts` changed.
- Shared files touched: `shared/top-bar.html` (one "Home" link in the main nav), `shared/icon.ts`
  (a `home` icon), `tsconfig.json` (`resolveJsonModule`), `app.routes.ts` (three routes).
- The Spanish landing text was rewritten in English. Removed or softened: the "millions of people lack
  access" claim, the fake chat mock-up, "designed to integrate with the existing tutor", the CRM card,
  and the project-stats bar. Product claims now come only from CLAUDE.md.
- Spanish data shown in English: country names (from the ISO code with `Intl.DisplayNames`), region
  names, and the four result categories are mapped in `research.ts`; the six data caveats are English
  renderings of the snapshot's `limitations`. The `peoples` text stays Spanish (`lang="es"`).

Assets and data (all bundled, none fetched at runtime):

| File | Provenance |
|---|---|
| `site/src/app/site/research.json` | The reference `src/app/data/research.json` (analysis date 2026-10-20) without `seedOrganizations` (outreach contacts, not needed) and `offlineEstimate`. |
| `site/public/site/hero.webp` | `public/assets/hero-blue.png` of the reference, resized to 1280 px wide and converted to WebP. Labelled "Illustrative image." |
| `site/public/site/map-africa.webp` | `public/assets/map-africa.png`, resized to 900 px wide, WebP. |
| `site/public/site/flags/*.png` | 57 flag PNGs copied unchanged from the reference. |

needs_review for this merge:
- **CRM is public and browser-local (2026-11-01, author's decision).** `/crm` has no login and no server:
  anyone can open it, and edits live only in that browser's `localStorage`. A CRM shared between people or
  devices would need a backend (accounts, storage, access control); the backend CRM code is unwired and
  `docs/crm-backend.md` describes it. Do not enter personal contact data in a public page without a decision
  on privacy. The seed has only 6 organization names, country and status.
- **Licence and provenance of `hero.webp` and the flags are not documented in the reference.** The
  hero image looks like a generated or stock picture of children; confirm the right to use it and
  whether to keep it (children's photo, consent).
- **Source links in the data.** The JS bundle contains https URLs from the research data (World Bank,
  GitHub factbook, Hugging Face, OIF, IRB). They are only `<a href>` links opened by the user, never
  fetched. A grep for `http` in the build shows them next to `apiBaseUrl`.
- The map data is a static snapshot; the Spanish `peoples` field is not translated.
- Not checked: Lighthouse and screen reader runs on the two new pages; dark theme was not
  inspected visually.

## External packages and assets

Nothing loads from the internet at runtime: no CDN, remote fonts, analytics, remote images, UI
component library, icon library or third-party script. Fonts are files in `site/public/fonts/`,
served by the app itself. The only network calls go to `apiBaseUrl`, and only when `useMock` is
`false`. **The 2026-10-27 pass added three font files and their two licence texts, and no npm
package. The 2026-10-29 restyle added no package, font, image or other asset.**

### Fonts (new in this pass)

| File | Font | Licence | Why |
|---|---|---|---|
| `fonts/twins-sans-regular.woff2` (74.8 KB), `fonts/twins-sans-bold.woff2` (74.3 KB) | **Andika 6.101** by SIL International, subset and renamed **"Twins Sans"** (see needs_review item 5) | SIL Open Font License 1.1, `fonts/OFL-Andika.txt` | Body and UI text, Yorùbá included. SIL designed Andika for literacy and for African-language diacritics: clear letter shapes for readers, and mark positioning (`mark`, `mkmk`) that centres a tone mark over a dot-below letter. It is rarely seen, so it gives the product a voice that is not Inter, Roboto or a system font. |
| `fonts/literata-display.woff2` (41.1 KB) | **Literata 3.103** (The Literata Project Authors, designed by TypeTogether), the variable font instanced at optical size 72 and weight 400, then subset | SIL Open Font License 1.1, `fonts/OFL-Literata.txt` (no Reserved Font Name) | The one display face: the welcome greeting and each page title. At its largest optical size it is a characterful book serif that echoes the open book of the logo. English display text only (see item 6). |

How the files were made (fontTools 4.68.0, from the TTFs in `google/fonts` `ofl/andika/` and
`ofl/literata/`, downloaded once outside the repository):

```bash
U='U+0000-024F,U+0300-036F,U+1E00-1EFF,U+2000-206F,U+20A6,U+20AC,U+2190-21FF,U+2212,U+2022,U+2026'
# Literata: pin the optical size and weight, then subset like the others.
fonttools varLib.instancer 'Literata[opsz,wght].ttf' opsz=72 wght=400 -o literata-72.ttf
# One woff2 per style, never unicode-range splits: a letter and its combining marks are always
# shaped by the same file. All layout features and all name records are kept.
pyftsubset Andika-Regular.ttf --flavor=woff2 --layout-features='*' --name-IDs='*' --notdef-outline \
  --unicodes="$U" --output-file=twins-sans-regular.woff2      # same for Bold and literata-72.ttf
# Andika only: name IDs 1, 2, 3, 4 and 6 become "Twins Sans", "Regular"/"Bold",
# "TwinsSans-Regular;Twins for Change", "Twins Sans [Bold]", "TwinsSans-Regular"; IDs 16, 17, 21
# and 22 are removed; ID 10 says: "Subset of Andika 6.101 by SIL International, made for Twins for
# Change. A Modified Version under the SIL Open Font License 1.1, renamed because "Andika" and "SIL"
# are Reserved Font Names." Copyright (0), trademark (7) and licence (13, 14) records are unchanged.
```

A self-check in the build script asserted, for each file: ẹ, ọ, ṣ, ń, ǹ, the combining grave,
acute and dot below, á, ×, ÷ and ₦ are present, the `mark` feature exists (and `mkmk` for
Andika), and the Andika files carry no "Andika" in their names. U+20A6 (₦) was added to the
range the author gave, because Gemma's arithmetic can use naira amounts.

`styles.css` declares them with `@font-face` and `font-display: swap`, and `index.html` preloads
the regular body face and the display face (same URLs, `crossorigin`). System fonts remain as
fallbacks: `'Twins Sans', 'Helvetica Neue', 'Segoe UI', 'Noto Sans', Roboto, Ubuntu, Arial,
sans-serif` and `'Literata Display', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif`.
The monospace stack is unchanged (code, `source_dataset` badges, the YO/EN tags, ranks).

### npm packages (`site/package.json`, unchanged in this pass)

| Package | Version | Shipped to the browser? | Why |
|---|---|---|---|
| `@angular/core`, `common`, `compiler`, `platform-browser`, `router` | 22.2.3 | Yes | The framework required by CLAUDE.md (latest stable Angular, standalone components, Signals). |
| `rxjs` | 7.8.2 | Yes (via Angular) | Required peer dependency of Angular. The app code does not use it directly. |
| `tslib` | 2.8.1 | Yes | TypeScript runtime helpers (Angular CLI default). |
| `marked` | 18.1.1 | Yes, in the chat code | The small Markdown renderer CLAUDE.md allows, for Gemma's answers. Raw HTML is shown as text, images are never rendered (no remote loads), only `http(s):`/`mailto:` links are kept (with `rel="noopener noreferrer"`), and Angular's sanitizer runs on the result (`[innerHTML]`). |
| `@angular/ssr`, `@angular/platform-server` | 22.2.4, 22.2.3 | No (build time only) | Prerender `/architecture` to static HTML (`outputMode: "static"`). No Node server at runtime. |
| `@angular/build`, `@angular/cli`, `@angular/compiler-cli`, `typescript` | 22.2.4, 22.2.4, 22.2.3, 6.0.3 | No | Build toolchain. |
| `vitest`, `jsdom` | 5.0.5, 30.1.3 | No | Unit tests (Angular 22's default runner and DOM environment). |
| `prettier` | 3.9.10 | No | Formatter from the Angular CLI template; not used by the build. |

### Other assets (`site/public/`)

| Asset | Why |
|---|---|
| `brand/twins-for-change-mark.png` | The logo's mark only (the two figures and the open book), cropped from `assets/brand/twins-for-change-logo.png`: a 558 × 449 crop at offset (6, 4) that keeps a 20 px margin of the original's own white background. Nothing redrawn, recoloured or stretched; the original in `assets/` is unchanged. Fallback image. |
| `brand/twins-for-change-mark-96.webp`, `-256.webp` | The same crop downscaled proportionally (3 and 8 KB), served through `<picture>`/`srcset`. |
| `favicon.ico` | The mark, padded with white to a square. **Changed in this pass:** now only the 32 and 16 px frames (2.9 KB), downscaled from the previous file's own 64 px frame; it was 32 KB with 48 and 64 px frames, which sat in the critical path of a mobile first load (item 9). |

Unused (kept, not deleted): `brand/twins-for-change-logo.png` and its six downscaled copies
(`twins-for-change-logo-{320,480,960}.{png,webp}`, the full logo with the wordmark), and
`favicon.svg` (the first build's custom mark). They are copied into `dist/` but nothing references
them. The author can delete them.

### Other files

| File | Why |
|---|---|
| `site/vercel.json` | Left over from an earlier plan to host on Vercel. Production runs on a VPS, where the FastAPI app does this routing (`src/modules/app/main.py`), so the file is not used and can be deleted. |
| `site/scripts/serve-dist.mjs` | Local preview of the production build with the same fallback rules as the FastAPI server and brotli/gzip compression. Node built-ins only, offline. **This pass** added the `font/woff2` content type. |
| `site/scripts/generate-demo-data.py` | Python standard library only. Regenerates `starters.ts`, `demo-data.ts` and `quiz-bank.ts` (in `src/app/core/`) from `CLAUDE.md` and `dataset_rag.csv` (read only), so Yorùbá text is copied, never retyped. Unchanged in this pass. |

Tools used only for checks, outside the repository: headless Chrome over the DevTools protocol (a
copy of the coordinator's `cdp.mjs` whose fake `/ask/rag` now also returns `sources`, copied
from real `dataset_rag.csv` rows), Lighthouse 12.8.2 (through `npx`), fontTools 4.68.0 (through
`uv`) and Pillow (screenshot montages, the favicon downscale).

## needs_review

### Backend gaps (CLAUDE.md, "Not supported by the backend yet")

1. **Token streaming.** The backend returns the full answer at once; the UI reveals it word by
   word with a blinking cursor and a Stop button.
2. **Subject filter: removed** at the author's request. It could come back once the backend
   supports filtering, for example a `source_dataset` filter on `/ask/rag`.
3. **Health of Ollama and Qdrant.** `/health/health` only shows that the API process is up.

**File uploads (now supported).** Attachments are `.pdf`, `.docx` and `.txt`, up to 10 MB. Each
chat has a `sessionId` (`crypto.randomUUID()`, saved with the chat in localStorage). Files upload
when the user sends: `POST /upload/file?session_id=...` runs first for each file, and a failed
upload shows the backend's `detail` message on the chip and does not send the question. Once a
chat has uploaded files, `/ask/rag` also sends `session_id`; `/ask/plain` never does. In the
sources drawer, `user_upload` rows show as "Your file: <name>" with the chunk text and a note that
they are not verified corpus data. In mock mode nothing is uploaded: the chips and the sent
message say "Demo data". Note: CLAUDE.md still says the backend cannot receive files and lists
`.csv/.md/.png/.jpg/.webp`; it needs the author's update.

"Retrieved sources" is no longer a gap: the drawer shows the backend's `sources` (see "What
changed").

### Fonts and licences

5. **Andika's licence reserves its name.** The OFL lists "Andika" and "SIL" as Reserved Font
   Names, and the OFL FAQ (2.5) and its page "Webfonts and Reserved Font Names" say a subset is a
   Modified Version that must not use them. So the subset files, their internal names and the CSS
   family are **"Twins Sans"**, with the origin stated in the font's description record and the
   full licence in `fonts/OFL-Andika.txt`. Options if you prefer the real name: ask SIL for an RFN
   permission, or ship SIL's own unmodified WOFF2 files (no rename needed, but the full character
   set makes them several times larger, which would cost the mobile Lighthouse score).
6. **Literata has no precomposed ǹ (U+01F9)** and no mark-to-mark feature. Chrome and Firefox
   still draw ǹ correctly by decomposing it, but Safari may fall back to another font for that
   letter. So Literata is used only for English display text: the greeting (its Yorùbá part is
   "Báwo ni!", plain Latin-1) and the page titles. Every Yorùbá text, including the
   "Àlàyé ní Èdè Yorùbá" heading inside answers, is set in Twins Sans. A future page title in
   Yorùbá should use Twins Sans too.
7. **No italic file.** Nothing in the interface uses italics; Markdown emphasis from Gemma gets the
   browser's synthesized oblique. Andika Italic would add 79 KB.
8. **Hinting kept.** Dropping TrueType hinting saves 18 KB per Andika file, but it did not move the
   Lighthouse score, and hinting helps on Windows school PCs.

### Performance decisions (mobile Lighthouse)

9. With the three fonts, `/chat` first scored **77 to 85** for mobile performance (accessibility
   and best practices 100). I measured each possible cause on a copy of the build (two Lighthouse
   runs each) and kept the changes that helped without hurting the design:
   - **`/chat` is in the main bundle** (it is the default route), which removes one network round
     trip before the first paint: +3 to 4 points. The initial bundle is now 440 kB raw (120 kB
     transferred; the warning budget is 500 kB). `/practice` and `/architecture` stay lazy.
   - **The welcome screen needs no bold face.** The sidebar and top bar use regular weight, like
     ChatGPT, with hierarchy from surface, colour and size; visually hidden headings are regular
     too (hidden text still makes the browser download a font). The bold file loads with the first
     answer; on a cold load, bold words show a synthesized bold for a moment, then swap.
   - **The favicon** shrank from 32 KB to 2.9 KB.
   - **Literata is preloaded** with the body face, so the greeting never swaps fonts after the
     first paint (score neutral, but no visible flash).
   - Tested and not kept: removing the welcome stagger (no change), dropping hinting (no change),
     preloading the bold face too (worse: it competes with the JavaScript).

   Result: `/chat` 93 to 94, `/practice` 93, `/architecture` 91 to 93 on mobile; 100 for all three
   on desktop; accessibility and best practices 100 everywhere (table under "Verification").
   Without any web font, `/chat` mobile measured 92 to 94, so the type now costs almost nothing.

### Deployment and configuration

10. **Production is same-origin.** `environment.ts` has an empty `apiBaseUrl` and `useMock: false`, because the FastAPI app on the VPS serves the site and the API. (An earlier plan used a RunPod URL; it is no longer used.)
11. **Angular 22 with a global CLI 21.** Inside `site/` the global `ng` delegates to the local CLI
    22. Angular 22 needs Node ^22.22.3, ^24.15.0 or >= 26; the Dockerfile builds the site with Node 22 (`node:22-slim`).
12. npm 11 on this laptop skipped the install scripts of `fsevents`, `lmdb` and
    `msgpackr-extract` (optional native helpers). The build and the tests work without them.

### Backend code compared with CLAUDE.md

13. **The contract matches**, including the new field: `POST /ask/rag` returns
    `{"answer": string, "sources": [{"source_dataset", "search_context", "pedagogical_answer"}]}`,
    best first, no scores (`src/modules/app/src/ask_rag.py`; `search_context` is the Qdrant
    `page_content`, which is the CSV's `search_context` column). `/ask/plain` returns
    `{"answer": string}`; `GET /health/health` returns `{"status": "healty"}`; CORS allows all
    origins. The frontend validates `sources`: a missing or malformed list counts as none, and a
    malformed item is skipped without shifting the other ranks.
14. **Three MAFAND rows contain " | " inside their own text** (data rows 2000, 3121 and 4916,
    counted from 0 as pandas does), so their `search_context` cannot be split into Yorùbá and
    English safely; the drawer shows them whole. Every other row splits as expected (AfriMMLU into
    3 parts with the subject, GSM8K not at all). Row 3343 has "tẹ́|ẹ̀rí" without spaces and
    splits correctly.
15. Root `main.py` starts uvicorn on `127.0.0.1:8502` unless `PORT` is set; `docker-compose.yml`
    sets `PORT=8000`, which matches CLAUDE.md and the development `apiBaseUrl`.
16. The tutor prompt tells Gemma that verified answers are always correct; the UI never makes an
    accuracy claim (the composer says "Twins for Change can make mistakes. Check the verified
    sources.").
17. 668 of the 15,791 corpus rows are not in Unicode NFC. The UI shows rows exactly as stored.
18. **The answer polish depends on the tutor prompt's shape** (`src/modules/rag/prompts/
    rag_prompt.py`): section headings that contain "Yorùbá" or "English", final lines that start
    with `**Ìdáhùn` or `**Answer`, and the fallback sentence "…not in our verified database yet."
    If the prompt changes these, answers still render as normal Markdown, only without the language
    blocks, the answer callout or the calm note.

### Gamification removal and Practice

19. **Gone completely** (XP, levels, streak, badges, daily challenge, header chip, XP chips, badge
    toast, celebration, Reset progress); `core/progress.ts`, `core/progress.spec.ts` and
    `shared/toast.ts` were deleted with the author's approval. Browsers that ran the previous build
    still hold the `localStorage` key `tfc.progress.v1`; nothing reads or writes it any more. It is
    harmless; clearing it would take one line if you want that.
20. **Practice** starts at question 1 of the 25 every visit and stores nothing. The quiz bank, its
    generator and its tests are unchanged.

### Demo data and other decisions

21. **Demo answers** (mock mode) follow the real prompt's shape; headings and final-answer labels
    are copied by the generator from CLAUDE.md, the Yorùbá body from the starter's own corpus row.
    They are not Gemma output and stay labelled "Demo data". **Plain Gemma in demo mode** shows a
    labelled placeholder instead of an invented answer. Suggestion: capture real `/ask/rag` and
    `/ask/plain` answers for the four starters on the RTX 4090 run and add them to the generator.
22. **Demo sources 2 and 3** are real rows picked by topic, not hybrid-search results; the drawer
    says so ("picked by hand. No search runs in demo mode.").
23. **URL strings in the build output that are never requested:** XML namespaces (`www.w3.org`),
    Angular's router URL-parsing base `http://fake`, Angular's sanitizer documentation link,
    marked's "please report" GitHub link, the `apiBaseUrl` placeholder, and, new, the URLs inside
    the two licence texts `fonts/OFL-*.txt`.
24. **Timeouts.** The client waits up to 5 minutes per answer (minimum required: 120 s). For a
    non-local API, a dropped connection after 90 s or more, or HTTP 504/524, is reported as the
    RunPod proxy timeout.
25. **Compare columns** sit side by side when the thread is at least 640 px wide and stack below
    that (always below 768 px; also at 768 px while the sidebar is open).
26. Copy falls back to `execCommand('copy')` where the Clipboard API is unavailable.
27. Left as they were (not mine to remove): the unused `image` icon in `shared/icon.ts` and the
    unused brand files listed above.

### Open review findings (2026-10-27, all low; see docs/qa-report.md)

QA and the a11y/design review found no high or medium issues, so no revision pass was run.
These low items are left for the author:

28. QA #65: the production build's "Could not reach the API" message shows the `<pod-id>` placeholder
    URL. Goes away once the RunPod URL is set.
29. QA #42: the Compare chip's visible label is "Compare"; the full "Compare with plain Gemma" is only
    in its accessible name and tooltip.
30. QA #34: the sources list is not capped at 3 if a future backend returns more.
31. QA #49: the old `tfc.progress.v1` localStorage key from the gamified build is never removed.
32. A11y: "Skip to main content" does nothing while the mobile drawer is open (`app.ts` `skipToMain`).
33. A11y: on `/chat` the sidebar headings come before the h1 in page order (no level is skipped).
34. A11y: hidden "Rank" labels can let the outer frame scroll on `scrollIntoView`. Fix: add
    `position: relative` to `.rank` in `sources.css`.
35. A11y: in the dark theme, the backdrop behind the mobile drawer barely dims the page.
36. A11y: `/chat` and `/practice` have no page-level footer.
37. A11y: at 375 px the open tone-mark bar wraps to 3 rows, so the docked composer covers about 45%
    of the screen.
38. A11y: the 96 px logo file is 96 × 78 instead of 96 × 77 (about 1%, invisible at 28 px).

### Open decisions from the reference-UI restyle (2026-10-29)

39. **Elapsed time ("4.2 s") shows only for answers requested in the open page.** The chat store
    drops `requestedAt` when an answer arrives, and this pass did not change the store, so the
    answer component remembers it while the request runs. One line in `chat-store.ts` (keep
    `requestedAt` in the finished slot) would show it for saved chats too.
40. **The bold face now loads on the first paint**: the format asks for semibold labels (tile
    subjects, history groups, the sidebar name), and the fonts have only 400 and 700. Lighthouse
    was not re-run in this pass. If mobile performance drops below 90, set those labels to 400.
41. **History titles are one line with an ellipsis** (the reference format). The clip box has
    vertical padding so no tone mark or dot below is cut, the ellipsis falls between letters (a
    letter and its marks are one cluster), and the full title is in the tooltip and the
    accessible name. Starter tiles, bubbles, answers and sources always wrap.

## Design update: reference-UI restyle (2026-10-29)

**Where the format comes from.** The author's two vanilla JS/CSS apps: the chat UI
(`2.7.3_generador_codigo/.../llm_chatbot/web`) for the shell, sidebar, top bar, composer, messages
and the sources track, and the issue portal (`3.8.4_generador_codigo_pipeline/.../issue_portal/web`)
for the Practice and How it works pages (hero, card, tag, outcome, stat and table patterns). Only
the structure, spacing and motion were taken: no colours, brand marks, strings, Google Fonts or
toasts. Behaviour, data flow, services and stores are unchanged.

**What changed.**
- **Shell.** Grid `[268px sidebar | main]` fixed to the viewport; collapsing animates the column
  (0.35 s, `cubic-bezier(.22, 1, .36, 1)`) and hides the sidebar once closed. Below 768 px the
  sidebar is a drawer (max 86vw) over a deep-navy scrim. Main is `[56px top bar | stage]`; the
  top bar's bottom line fades in once the stage (or, on Practice and How it works, the window) is
  scrolled.
- **Sidebar.** 56px head (mark tile, name, Hide/Close button), New chat (the shortcut hint fades
  in on hover and keyboard focus), **Search chats** (new: filters history titles; matching ignores
  case, tone marks and dots below, and never changes stored or displayed text), date groups with
  12px bold labels, one-line titles, and rename/delete icons on hover, focus and touch. Rename
  and the inline delete confirmation are unchanged. The status footer keeps the four lines.
- **Top bar.** Open-sidebar button and mark (when the sidebar is hidden), the three route links
  as 36px pills (`aria-current`), an **API status pill** on every route (dot plus "Online",
  "Offline", "Demo mode" or "Checking…"; when offline it is a button that checks again; polling
  starts from the top bar too), New chat (sidebar hidden), and the theme toggle drawn as a
  sliding sun/moon pill (one `aria-pressed` button, 0.3 s thumb).
- **Welcome.** Mark on a white tile, the Literata greeting at the display size, one muted line,
  the composer, then the four starters as **tiles in a 2-column grid** (1 column below 768 px:
  subject label, Yorùbá question, English muted), and one 12px line under them (demo-mode
  version: "Answers are demo data built from real corpus rows…"; real mode: "Answers come from
  retrieved corpus rows and can still contain mistakes…"). Staggered rise: mark 50 ms, title
  100 ms, line 140 ms, composer 180 ms, tiles 240–390 ms, line 440 ms, 0.6 s each.
- **Thread.** 46rem column, 28px between messages, fade-up for new turns. User message: a
  right-aligned bubble; under it a Copy button (new, on hover, focus, touch and narrow screens),
  the avatar, "You" and the time. Answer: a grid with the logo mark on a white 28px tile, a label
  line (label, "Demo data" pill, time), then the **sources track** above the answer (while
  pending: spinner and "Searching the corpus…" or "Preparing the demo answer…", plus seconds
  after 5 s; when done: search icon, "Verified sources (top 3)", "3 documents" or "Demo data", a
  rotating chevron), the drawer (0fr→1fr, 0.3 s) with one card per ranked source, the Markdown,
  an error card (alert icon, bold title, message, Retry pill), and a row of 30px actions (Copy
  with an in-button check, Regenerate, a "Stopped" tag or the elapsed time). The action row is
  always visible on touch and below 768 px. Compare mode: two outlined columns (1fr 1fr, 16px
  gap) with the CLAUDE.md labels and their own loading states, stacked when the thread is
  narrower than 640 px; only the RAG column has the track.
- **Composer.** One 24px-radius box (mid-strength border, soft shadow; the border turns the focus
  colour while typing): attachment chips on top (extension badge, name, size, upload status,
  remove), the tone-mark strip as one slim row (it scrolls sideways on phones instead of
  wrapping to 3 rows), the text box (52–200px), then "+", the Compare and Tone marks chips, the
  "Enter to send · Shift + Enter new line" hint (on focus, wide boxes only; also the text box's
  description) and the round Send/Stop button in brand blue (sky on navy). Docked on a solid
  canvas strip with no gradient fade. Drag and drop shows a full-window overlay with a dashed box
  and "PDF, DOCX or TXT, up to 10 MB each."
- **Practice.** Centred title and line, "Question N of 25" with the subject as an accent tag, a
  bordered question card, four option rows with 28px letter badges, and after an answer an
  outcome card: round icon, "Correct" or "Not quite", "Verified answer (AfriMMLU): …", then
  "Ask Twins for Change to explain" (primary) and "Next question" (quiet). Right and wrong are
  marked with icon, words and a 2px border.
- **How it works.** The pipeline as five step cards with 40px accent-tint icon badges and a
  chevron between them; the compare baseline and the settings in bordered panels; deployment as
  two panels (cloud chain, local list); three stat tiles (15,791 / 8,318 / 7,473) above the
  corpus table. Same facts, still prerendered, one h1.

**Token mapping (reference → ours).** `--bg`→`--bg`; `--sidebar`→`--side-bg` (navy, deep navy
in the dark theme); `--panel`→`--raised` (white / navy-2); `--panel-2`, `--panel-3`→ new
`--raised-2`, `--raised-3` (grey-blue tints #F3F5F9 and #E6EBF2 in the light theme, navy-2 tints
#1B4281 and #234B87 in the dark theme and on the sidebar); `--hover`/`--active`→`--hover`/
`--selected`; `--line`→`--border`; `--line-strong`→ new `--border-mid` (24% navy on white, 28%
pale on navy) for the composer, chips and soft card hovers; `--ink`→`--text`;
`--ink-2/3`→`--text-muted` (never anything lighter: the reference's `--ink-4` is not used);
`--user-bubble`→`--bubble`; `--accent`→ brand blue on white, sky on navy; `--shadow`→ soft
navy shadows on the composer, the jump button and the drop box only. Not copied: the radial
tint, the gradient above the dock, the shimmer, the progress sweep, backdrop blur, the green,
amber and red status colours and the per-role hues. Status, errors and right/wrong use icon,
words and border weight in navy, blue and sky tints. New measured pairs: pale on navy-2 8.7:1,
pale on #1B4281 7.7:1, pale on #234B87 6.8:1, muted #415B86 on #E6EBF2 5.5:1, sky on its tint
over navy-2 5.2:1, blue on its tint over white 5.6:1.

**Deviations from developer.md that the author's newer instruction overrides** (key decisions):
the starter questions are light tiles in a 2-column grid (developer.md: quiet rows); the display
size is `clamp(2rem, 1.6rem + 1.2vw, 2.5rem)`, up to 40px, for the greeting and page titles
(developer.md: about 28–32px); the route links live in the top bar next to the theme pill.
Everything else in developer.md still applies.

**Other decisions.** The Tone marks chip keeps `aria-expanded` and `aria-controls`, not
`aria-pressed`: it opens a region, and one button should not carry both states; it looks the same
as a pressed chip. Copy moved into a shared `CopyButton` so the user bubble and the answers use
the same clipboard code (with the `execCommand` fallback); feedback is the check icon and one
announcement, no toast. The welcome tiles drop the subject icons, so the `calculator`, `chart`
and `file` icons were removed, along with the old icon names that the reference shapes replaced
(`panel`, `close`, `send`, `regenerate`, `newChat`, `chevron`, `warning`). The `--avatar-*` and
`--ease-out` tokens went with them. `.rank` got `position: relative` (open a11y item 34). The
drawer scrim is a deep navy shade, so it also dims the navy canvas (open a11y item 35).

**Checks run (2026-10-29).** `ng build --configuration production`: succeeds with no warnings
(initial 453 kB raw, 123 kB transferred; two component stylesheets were brought back under the
4 kB warning budget by moving the shared status dot and chip styles to `styles.css`).
`ng test --watch=false`: 8 files, 76 tests pass, no spec changed (the markup keeps the selectors
they use). The build output's URL strings are the same as in item 23. `site/src` has no
`gradient(`, blur or glow. Headless Chrome on a temporary mock-mode build (the environment file
was restored right after): welcome, pending, answer, sources open, compare and the collapsed
sidebar at 1280 px in the light theme, no horizontal overflow and no console errors. This pass
did not capture the other widths, the dark theme, Practice or How it works, and did not re-run
Lighthouse.

## What changed in this pass (2026-10-27)

**1. Gamification removed.** All code and UI listed in item 19, every import and call site (app
shell, chat store, answer, chat page, starter list, top bar, Practice), the `.xp-chip` styles,
`hasToneMarks` (only the badge used it) and six icons that only the badges used (flame, globe,
scale, search, bulb, tone). `LETTERS` moved to `core/quiz.ts`.

**2. Real sources from the backend.** `ApiService` reads `sources` from `/ask/rag` (never from
`/ask/plain`) through `readSources()`: anything that is not a list counts as none, items without
the three strings are skipped, and the rank is the item's position in the backend's list (1 =
best match). Sources are saved with the answer in the chat history, and saved items that are
malformed are dropped on load, so they can never break the drawer. The drawer shows, per source:
the rank in a small circle, the `source_dataset` badge in monospace and its subject; "Matched
text", the `search_context` split into its Yorùbá line (`lang="yo"`) and the muted English line
(AfriMMLU's subject id as a badge); "Verified content", the full `pedagogical_answer` in a tinted
inset with the corpus labels as small bold labels and options as chips. The caption says "Found by
hybrid search over the corpus, best match first." (real) or that the rows are demo data. If no
sources come back (an older backend), the drawer is replaced by one quiet line: "No sources came
back with this answer." Splitting uses a spaced pipe and the part count each dataset should have
(item 14).

**3. A real product feel.** New type, colour and motion (next section), and copy that reads like a
shipped tool: the assistant is "Twins for Change" (the CLAUDE.md labels with "(Gemma + RAG)" and
"(no RAG)" appear only in compare mode, and announcements follow the same rule); the disclaimer
under the composer is "Twins for Change can make mistakes. Check the verified sources."; the
starter list lost its "Try a question from the corpus" label (a hidden "Suggested questions"
heading keeps the structure); the empty history says "Your chats will appear here. They stay in
this browser."; the sidebar status is a two-line row. The architecture page now shows the
`/ask/rag` response with `sources` and no longer lists retrieved sources as a gap.

## Design choices

(From the 2026-10-27 pass. Where they differ, "Design update: reference-UI restyle" above
replaces them: starter tiles, display size, sidebar rows, composer focus, motion timings.)

The author wants a quiet, ChatGPT-like structure with its own identity, solid surfaces, no
gradients, patterns or textures, and nothing that looks like a hackathon demo.

- **Type.** Twins Sans (Andika) at 16 px for everything people read, with line height 1.6 (1.7
  for Yorùbá, 1.75 inside answers and quiz text), so marks above and below never touch or clip.
  Literata Display at one size only (`clamp(1.625rem, …, 2rem)`, 26 px on phones, 32 px on
  desktop) for the greeting and the page titles. Two weights in the body face: regular for the
  interface, bold for structure inside answers (labels, step names, headings, the final answer).
  Monospace for code, dataset badges, ranks and the YO/EN tags.
- **One colour story.** Navy (adire indigo) is the dominant colour: the sidebar is a solid navy
  surface in both themes (a deeper shade, #08214A, in the dark theme so it still reads as its own
  surface next to the navy canvas). Sky blue is the one sharp accent and lives on navy only: the
  open chat's edge, the online dot, focus rings, the assistant avatar's marks, and every accent in
  the dark theme. On white, brand blue drives the few actions (send, primary buttons, the pressed
  Compare chip). The answer callout uses a light tint of pale blue (light theme) or light navy
  (dark theme). No other hues. All text pairs were measured: navy/white 13.3, muted #415B86 on
  white 6.9 and on the grey-blue tint 5.9, blue/white 6.5, white/navy 13.3, pale/navy 10.5,
  sky/navy 8.6, white on #08214A 15.8, sky on the pressed-chip tint 5.2 (dark) and blue on its
  tint 5.6 (light). Sky on white and blue on navy are never used for text, icons or focus rings.
- **Sidebar.** Brand lockup (the mark on its small white tile, then the name), an outlined New
  chat row with its shortcut, a small "Chats" label, date groups, and the open chat as a lighter
  navy row with a sky edge. The status footer is one two-line row ("API online" over "gemma3:4b ·
  Qdrant hybrid", with a state dot) that opens upwards to LLM, Search, API and Backend.
- **Welcome.** Mark (56 px, on white), the greeting, the composer and four quiet starter rows
  (subject icon, the Yorùbá question, the English muted underneath), centred vertically.
- **Thread.** User messages in a soft grey-blue bubble with a "tail" corner; answers flat on the
  canvas with a small avatar, a bold label and the time. The YO/EN blocks keep their thin rule and
  now carry outlined monospace tags; the final-answer line is a tinted callout band. Arithmetic
  keeps tabular figures. Compare mode: two equal columns with one thin divider, the same
  typography, told apart by label and position.
- **Composer.** One rounded box with a soft shadow; its border keeps 3.4:1 against the page as an
  input boundary. "+", the text box, the Compare and Tone marks chips, and one round button that
  is Send, disabled, or Stop.
- **Practice.** The display-face title, one line of explanation, then one question at a time:
  "Question N of 25 · Subject", the Yorùbá question large with the English muted, four outlined
  option rows, and after an answer an icon plus words ("Correct" / "Not quite", "Your answer",
  "Verified answer"), never colour alone.
- **Motion (CSS only).** One orchestrated welcome load: mark 0 ms, greeting 70 ms, composer
  140 ms, starter rows 210, 280, 350 and 420 ms, each fading and rising 8 px over 400 ms with an
  ease-out curve. New messages ease in (350 ms). The progressive answer keeps its blinking cursor.
  The sources drawer opens by animating its grid row from 0fr to 1fr (280 ms) while its content
  fades in. The send button changes colour in place (200 ms) and its icon swaps with a short scale.
  The fill mode is `backwards`, so nothing keeps a transform after it moves. With
  `prefers-reduced-motion`, every animation and transition is instant and answers appear in full at
  once.

## Quiz bank (generated)

`npm run generate:demo-data` (or `python3 site/scripts/generate-demo-data.py`) writes
`site/src/app/core/quiz-bank.ts` from the AfriMMLU rows of `dataset_rag.csv`, read only, with no
randomness:

- **Parsing.** Options from the `- Options (Yorùbá): A) … | B) …` and `- Options (English): …`
  lines (the "A) " prefix dropped, the rest copied), the letter from `- Verified Answer (English):
  X) …`. Each item keeps the row's `source_dataset`, its subject id and an id made of the dataset
  and the row's position in the CSV.
- **Skipped rows**: not exactly four options A–D in both languages; a verified answer that does
  not match the option it names; the same option twice in one language; different numbers in the
  Yorùbá and English text; invisible U+200C characters where tone marks should be; spreadsheet
  artifacts such as "18-Jan"; questions that point to a table, figure or passage the row does not
  include; "I and II only" style options; options longer than 56 characters or questions longer
  than 220; duplicates; and the two AfriMMLU starter questions (kept fresh for the A/B demo).
- **Selection.** For each of the five subjects, the item in the middle of each fifth of the valid
  rows, in corpus order: 5 per subject, 25 in total, interleaved by subject so "Next question"
  moves from subject to subject. The items are copied exactly, including some weak Yorùbá
  translations; a Yorùbá speaker should review the list.

## Scrolling (redesign pass, still valid)

The chat shell is fixed to the viewport, so the page never scrolls; the sidebar's history and the
stage (thread and sticky docked composer, under the fixed 56px top bar row since 2026-10-29) are
the only scroll containers. While at the
bottom the view follows the revealed answer; scrolling up stops that and shows a round "Scroll to
latest message" button. Sending and opening a chat go to the latest message, and opening a
sources drawer stops following, with `scroll-padding` equal to the docked composer's height.

## What was built

- **Routes.** `/chat` (default; rendered in the browser, in the main bundle), `/practice`
  (rendered in the browser, lazy) and `/architecture` (prerendered, lazy). `/` and unknown paths go
  to `/chat`. Titles "Chat · Twins for Change", "Practice · Twins for Change" and "How it works ·
  Twins for Change". One `h1` per route.
- **Sidebar** (`aside` with `nav`): New chat with Ctrl/Cmd + Shift + O; history in `localStorage`
  grouped by date, with rename and delete; the status row. Below 768 px it is a drawer (focus moves
  in, the page behind is inert, Escape closes it).
- **Chat**: welcome screen with the four starters, messages with avatars, times, Copy and
  Regenerate, progressive display with Stop, compare mode, the sources drawer, Markdown with the
  answer polish (language blocks, answer callout, equations, the calm out-of-database note), error
  messages with Retry, and the composer (tone mark bar, attachments that upload on send, Enter and
  Shift + Enter). One polite live region announces each finished answer once.
- **Practice**: the plain quiz described above. **How it works**: pipeline, settings, deployment,
  corpus table, API and the remaining backend gaps.
- **Theme**: light and dark, following `prefers-color-scheme` until the toggle saves a choice.

## How to run with `ng serve`

```bash
cd site
npm install
ng serve          # http://localhost:4200
```

With `useMock: false` (the current setting), start the backend first (CLAUDE.md, Commands);
otherwise the chat shows "API: offline". Other commands: `ng test --watch=false` (unit tests) and
`npm run generate:demo-data` (regenerates starters, demo answers and the quiz bank).

## How to serve the production build locally

```bash
cd site
ng build --configuration production
npm run serve:dist                # same as: node scripts/serve-dist.mjs
```

It serves `dist/site/browser` at **http://localhost:4300** (another port: `PORT=4301 npm run
serve:dist`). Stop it with Ctrl + C. Routing matches the FastAPI server: existing files are served as
they are (including `architecture/index.html` and the fonts); every other path, such as `/`,
`/chat`, `/practice` or `/any/unknown/path`, returns the app shell `index.csr.html` with status
200, and the Angular router shows the right page (redirecting `/` and unknown paths to `/chat`).

## How to switch between mock mode and the real backend

Only the two environment files change.

- **Mock mode (no backend needed):** set `useMock: true` in
  `site/src/environments/environment.development.ts` (for `ng serve`) and/or `environment.ts` (for
  the production build). Answers to the four starters are demo data built from their corpus rows,
  with demo sources labelled "Demo data".
- **Stage 2, everything local:** start Qdrant, Ollama and the backend with the commands in CLAUDE.md
  (uvicorn on port 8000), keep `apiBaseUrl: 'http://localhost:8000'` and `useMock: false` in
  `environment.development.ts`, and run `ng serve`. The status row shows "API online" and, opened,
  "Backend: local, no internet needed after setup". The drawer then shows the real top 3 sources.
- **Stage 3, the VPS:** the production build calls its own origin (`apiBaseUrl: ''`, `useMock: false`). The Dockerfile builds the site and the FastAPI app serves it (see below).

## Deployment on the VPS

The author deploys (agents do not). `docker-compose.yml` runs Qdrant, Ollama, the FastAPI app and
Caddy. The Dockerfile builds the Angular app (`ng build --configuration production`, Node 22) and
copies `dist/site/browser` into the image. The FastAPI app serves those files, the prerendered
`/architecture` page, and the app shell `index.csr.html` for client-rendered routes such as `/chat`
(`src/modules/app/main.py`). Caddy gives HTTPS at `twinsforchange.com` and waits up to 420 seconds
for an answer. After a deploy, check a reload on `/chat` and `/practice`, a direct visit to
`/architecture`, and that `/fonts/twins-sans-regular.woff2` loads.

## Verification of this pass (2026-10-27)

- **Production build:** succeeds with no warnings. Initial 439.95 kB raw (120.30 kB transferred);
  lazy `/practice` 24.31 kB (6.61 kB, includes the quiz bank) and `/architecture` 14.73 kB
  (4.32 kB). One route prerendered.
- **Unit tests** (`ng test --watch=false`): 8 files, 76 tests, all passing. New or changed in this
  pass: the API service in real mode returns ranked sources exactly as sent, treats a missing,
  non-list or null `sources` as none, skips a malformed item without shifting ranks, and never
  reads sources from `/ask/plain`; history keeps an answer's sources and drops a malformed saved
  one; `splitSearchContext` keeps a row whole when its own text contains " | " and splits only on
  a spaced pipe; the quiz-bank tests no longer test the daily challenge. Still covered: mock mode
  offline with 3 ranked demo sources, tone mark insertion at the cursor (with combining marks),
  chat history storage, compare mode, Stop, the live region and the Markdown polish.
- **Gamification grep** (`xp`, `streak`, `badge`, `level`, `toast`, `daily`, `progress`) over
  `site/src`: only unrelated words remain ("source_dataset badges", "Income levels" in a corpus row,
  Markdown heading levels, "progressive display").
- **External URL grep** of `dist/site/browser`: only the strings in item 23.
- **Lighthouse 12.8.2** on the production build (`serve-dist.mjs`), performance / accessibility /
  best practices:

  | Route | Mobile (2 runs) | Desktop |
  |---|---|---|
  | `/chat` | 93–94 / 100 / 100 (FCP 1.8 s, LCP 2.6 s, TBT 170–190 ms, CLS 0) | 100 / 100 / 100 |
  | `/practice` | 93 / 100 / 100 | 100 / 100 / 100 |
  | `/architecture` | 91–93 / 100 / 100 | 100 / 100 / 100 |

- **Fonts in real renders:** the four starter questions and "ẹ́ ọ̀ ṣ ń ǹ Ẹ́ Ọ̀" in NFC and in NFD
  (for example e + U+0323 + U+0301), in the shipped Twins Sans regular and bold and Literata
  Display files, at 17 and 56 px: every tone mark sits centred over its dot-below letter and
  nothing clips. In the app, the four starters were sent as NFD questions: the bubbles keep the NFD
  text (checked in the DOM) and render like NFC, and an NFD answer renders correctly.
- **Browser checks** (headless Chrome, fake backend at `localhost:8000` returning 3 real CSV rows
  as `sources`) at 1440 px light and dark, 768 px and 375 px light and dark: welcome, pending, an
  answer, the sources drawer open, compare pending and done, and Practice before and after an
  answer. Also: the older-backend line (no `sources`), the status footer open in both themes,
  rename and delete on navy, the tone mark bar, the mobile drawer in both themes, `/architecture`
  at 1440 (light and dark) and 375 px, and reduced motion (stagger delays 0, answer shown in full at
  once). No horizontal scroll at any width, no console errors or exceptions; the welcome screen
  loads only the regular and display faces. The stagger was read from the computed styles: 0, 70,
  140, 210, 280, 350 and 420 ms, 400 ms each.

## Landing page rebuild (2026-11-01)

The `/` landing page was rebuilt to follow the author's reference HTML (`TWINS_FOR_CHANGE_ABRIR_AQUI.html`) in layout and
rhythm: sticky header, full-bleed hero, facts strip, mission, tutor, map workspace, research table, collaborate band,
CRM preview, method, footer. It is plain Angular components and plain CSS, with real links into the app.

- **New asset and provenance.** `site/public/site/classroom.webp` (1200 px) and `classroom-640.webp` come from the
  mission photo (1672 x 941 JPEG) embedded in the reference file; decoded, resized and converted with `cwebp -q 78`.
  The reference's hero photo, map image and logo were already bundled (`hero.webp` is a brand-tinted version, so it was kept;
  the map is identical; the full logo with wordmark is not used, `app-logo` shows only the mark). Nothing else from the
  reference is shipped: no iframe, no `srcdoc`, no base64, no video, no remote URLs, no Inter.
- **New packages.** None. `angular.json`: the `anyComponentStyle` budget went from 4/8 kB to 10/12 kB because the landing
  stylesheet is about 9.4 kB (the CRM stylesheet is also above the old warning level).
- **Palette and style.** The reference's teal-navy colors were not copied; sections use the brand tokens (navy, brand
  blue, sky). Its gradients, glows, tilted demo window and heavy shadows were left out (flat-surface rule). The tutor and CRM
  sections are navy in both themes (`surface-navy`), the collaborate band is brand blue with white text, the others follow
  the light or dark theme. Display headings use Literata Display, body uses Twins Sans.
- **Chat mechanism.** The four starters on `/` reuse the exact mechanism of Practice's "Ask Twins for Change to explain":
  `ChatStore.queueQuestion(yo)` then `router.navigateByUrl('/chat')`; `ChatPage` takes the queued question and starts a new
  chat. No chat code was edited. They are buttons, not links, so a middle-click cannot leave a queued question behind.
- **Map.** `africa-explorer` was restyled as a workspace (map card with search, region filter, metric switch and legend,
  plus a country profile card with a country picker). The metric switch uses data already in the snapshot: documentation in
  the sample (`unknownCount`) or internet use. Pin meaning is carried by shape (filled, hollow, diamond), not by color alone.
  "Open in CRM" links to `/crm?country=<English name>` (for example `Nigeria`); the CRM must read `country` and match
  English names. Country names inside the research data are Spanish (for example `Kenia`), so a mismatch is possible.
- **Research table.** New `research-table` component: 185 rows, search, country and result filters, 12 rows per page, caveat
  text. Labels are described as what a desk review found, not tested ability. Both the map and the table load with
  `@defer (on viewport)`.
- **CRM preview.** Read-only table of the six rows in `crm/seed-organizations.json` (imported directly, no CRM store, no API).
  Follow-up counts show only if some seed row has a follow-up date (none do today). Text says the CRM is public and saved only
  in each visitor's browser.
- **Claims removed or softened from the reference.** "54 + 1 countries / 148 languages / 1 mission" strip replaced by
  corpus facts from CLAUDE.md (15,791 rows, 5 source datasets, 2 languages); the reference's "Imaginamos... en lenguas
  locales" tutor copy (implied more languages) now says the tutor supports only Yorùbá and English; the fake scripted chat demo
  ("Modo local (concepto)", number and word exercises) was dropped and replaced by the four real starters; "miles de voces"
  became "many languages"; "Más lenguas. Más oportunidades." float card dropped; the hero video, scroll cue and vertical
  label were not carried over; the CRM "live" dot and embed controls were dropped. No accuracy figures, testimonials or partner
  names exist on the page.
- **Header.** Anchors: Mission, Tutor, Map, Research, Collaborate, Method; route links: Practice, How it works, CRM
  (boxed), and "Open the tutor" (`/app`, which redirects to `/chat`). There is no separate "CRM" scroll anchor in the header
  (the section is reached by scrolling or from the CRM link). Below 72rem the menu is a panel opened by a button
  (`aria-expanded`, Escape closes it and returns focus). The old shared TopBar is not used on `/`; `/mapa` still uses it.
- **Verified.** `tsc --noEmit` for the app config; the site specs (routes, helpers, landing: one h1, four starters queue
  the Yorùbá question, six CRM rows) pass. One production build succeeds. Headless Chrome: no horizontal overflow and one
  h1 at 375, 768 and 1280 px in light and dark; screenshots at 1280 px (light) and 375 px (dark, menu open) were looked at.
- **Not verified.** The CRM spec currently fails one test and `tsc` on the spec config reports errors in `src/app/crm/`;
  those files belong to the parallel CRM work. Not run: Lighthouse, a screen reader, a keyboard walk-through (focus order was
  not checked beyond the code), measured contrast (token pairs are from the brand table), 768 px screenshots, the reduced
  motion path, and the `/mapa` page after the restyle (build passes). The `research.json` chunk (about 19 kB gzip) loads with
  the landing because the page reads the record counts from it.

## Main files

- `site/public/fonts/`: the three woff2 files and `OFL-Andika.txt`, `OFL-Literata.txt` (new).
- `site/src/styles.css`: `@font-face`, palette tokens, the `.surface-navy` token set, the `rise`
  motion, Markdown and answer polish styles.
- `site/src/index.html`: the two font preloads and the favicon sizes.
- `site/src/app/core/`: `api.service.ts` (`readSources`), `history.ts` (saved sources checked),
  `pedagogical.ts` (search-context split), `chat-store.ts` and `corpus.ts` (mode-aware labels),
  `quiz.ts` (letters and subject names); specs updated.
- `site/src/app/chat/`: sidebar, welcome, starter list, composer (one Send/Stop button), answer,
  sources drawer, chat page.
- `site/src/app/practice/`: the plain quiz. `site/src/app/architecture/`: API table and gaps.
- `site/src/app/shared/`: top bar (no progress chip), icons (badge icons removed).
- `site/src/app/app.routes.ts`: `/chat` in the main bundle.

## CRM, public and browser-local (2026-11-01)
- `/crm` is a lazy, client-rendered route with no guard and no login. `CrmStore` (`crm/crm-store.ts`) holds the
  organizations in a Signal, starts from the 6 organizations in `crm/seed-organizations.json` (copied from
  `src/modules/crm/seed_organizations.json`; names, country and status only) and saves every edit to
  `localStorage` (key `tfc.crm.organizations`). Storage is browser-only (`isPlatformBrowser`) and wrapped in
  try/catch: if it throws or holds bad JSON, the page works in memory or from the seed.
- The page shows "Saved only in this browser. Not shared with other people or devices." and a two-step
  "Reset to the 6 starting organizations" button. Search, filters, add/edit, two-step delete, follow-ups,
  CSV export (formula-safe) and validation limits are unchanged. No call to `/api` anywhere in the CRM.
- Landing card: "Partner CRM, Open to everyone, saved in your browser."
- Unreferenced files, awaiting the author's approval to delete (not deleted): `site/src/app/crm/login-page.ts`,
  `crm/auth-guard.ts`, `crm/crm-service.ts`, `crm/crm-service.spec.ts` (still compiles and passes, tests only the
  old HTTP service). `site/proxy.conf.json` and the `proxyConfig` entry in `angular.json` are no longer needed
  by the CRM and were left in place; removing them is safe.

### CRM rebuild: rich browser-local version (2026-11-01, later pass; supersedes the storage key above)
- **Features.** `/crm` now has eight sections in a side navigation (links with `aria-current`; a wrapped row on
  narrow screens): Overview (stat tiles computed from the data, next follow-ups, recent activity, pipeline by stage,
  profiles by region), Countries (55 profiles from `site/research.ts`, search and region filter, country drawer),
  Map (the existing `app-africa-explorer`, imported unchanged inside `@defer`), Organizations (search, region,
  country, status and priority filters, sort by name, update or follow-up date, list or board by stage, add/edit
  dialog with an activity history editor, two-step delete), Contacts, Follow-ups (overdue, today, upcoming; paused
  and discarded excluded), Activity (timeline across organizations) and Sources (links and the caveat that the data
  describe corpus and model coverage, not tested proficiency). Also JSON export and import (validated: 2 MB, 500
  organizations, text cut to the field limits, unknown countries skipped, result announced), CSV export of the shown
  organizations (formula-safe), and a two-step Reset (also clears country notes).
- **URL state.** `?view=<overview|countries|map|orgs|contacts|followups|activities|sources>` and `?country=<English
  name>` (case-insensitive). A valid country opens that country's drawer on any view; without `?view=` it opens
  Countries. Example for the landing page: `/crm?country=Nigeria`.
- **Dialogs.** The org form and the country drawer are native `<dialog>` elements opened with `showModal()`: focus is
  trapped, Escape closes, focus returns to the opener. "Add organization in this country" opens the form with the
  country preselected, on top of the drawer.
- **Storage.** Key `tfc.crm.v2` holds `{ version: 2, organizations, countryNotes }`. On first load it migrates the
  old `tfc.crm.organizations` array (each record gets `activities: []`; the retired status "Propuesta enviada" becomes
  "En conversación"); the old key is left untouched. Stages now follow the reference CRM: Identificada, Contactada,
  En conversación, Colaboración, Pausada, Descartada. Import merges by `id` (same id replaces) and adds new rows.
  Activities are `{date, text}` (text up to 300 characters, up to 100 per organization). The seed rows stay Spanish
  data (`lang="es"`); no organizations, people or contacts were invented, and empty contact fields stay empty.
- **Files.** `crm/crm-logic.ts`, `crm-store.ts`, `crm-page.{ts,html,css}`, `crm-org-dialog.*`, `crm-country-drawer.*`,
  `crm.spec.ts`, `crm-store.spec.ts`. No edits to `site/src/app/site/*`, `shared/icon.ts` or any other page.
- **Skipped on purpose.** Country CSV export and CSV import (JSON only), a map-metric selector (the existing explorer
  is reused as is). The Download icon does not exist in
  `shared/icon.ts`, so the arrow-down icon is used.
- **Needs a backend.** Sharing the CRM between people or devices, accounts, audit trail and any server-side backup.
  Today the only backup is the JSON export; clearing browser data deletes the CRM.
- **Not verified.** Dark-theme screenshots of /crm (contrast relies on the theme tokens), 375px and 768px layouts in a
  real browser (headless Chrome clamps the window to about 500px), keyboard walk-through of the dialogs, screen
  reader output, Lighthouse for /crm, and component-level tests of the page (only logic and store are unit-tested).
  `crm-page.css` is about 7.9 kB, close to the 8 kB component-style error budget.

## CRM dataset load, 2026-11-01 (61 organizations)

- **Provenance**: bundle `Twins_for_Change_CRM_BASE_DATOS_CSV_SQLITE` (downloaded 2026-11-01), derived from `Twins_for_Change_CRM_Datos_ONG_Investigacion.json`, sha256 `0cce4a69894aeb9da4c73b886e63be3e529054b90f1b0f2b1582106eb2e62856` (from its `validacion.json`).
- **Counts**: 61 organizations in 55 countries/territories (6 recovered from the original CRM, all in Nigeria, ids `seed-1`..`seed-6`; 55 from documentary research on 2026-11-01, ids `public-*`, including `public-NG-leap`); 60 with a source URL, 15 with an email, 1 with a phone; no contact person, follow-up or collaboration state (all `Identificada` / `Media`). AFECO (Nigeria) keeps its "identity pending verification" status, shown on the record.
- **Earlier list of 64**: it could not be fully recovered. The 61 rows are a separate recovered + researched set, not that directory. The CRM Sources view says so.
- **Generator**: `site/scripts/generate-crm-data.mjs [bundleDir]` writes `site/src/app/crm/seed-organizations.json` from `ongs_por_pais.csv` (country name from ISO2, same method as `research.ts`) and adds `offlineEstimate` to `site/src/app/site/research.json` from `paises.csv`. Nothing is retyped.
- **Model**: `Org` gains optional read-only `sourceUrl`, `orgType`, `researchStatus`, `origin`, `researchDate`, `iso2`. They show in the organization dialog ("About this record"; source link is https only, `rel="noopener noreferrer"`, new tab).
- **Existing visitors**: storage key and version stay `tfc.crm.v2`. The stored object gets a `seedSet` marker; when it is missing, the seed rows whose id the visitor lacks are added once (`addMissingSeeds`). Existing rows (and their edits) are never overwritten or removed, there are no duplicates, and a seed the visitor deletes later is not brought back. Old `seed-1`..`seed-6` rows keep their old text and do not get the new provenance fields.
- **Cross-check of `paises.csv` and `lenguas_y_modelos_IA.csv` against `research.json`**: 55 countries and 185 language rows match on every compared field (names, region, population, year, internet %, internet year, both indicator source URLs, coordinates, language lists, counts, `is_territory`, connectivity qualifier, Factbook/OIF/published-statistics JSON, model statuses, conclusions, notes, source URLs). Only difference: `estimated_offline_population` was missing in `research.json` (24 countries have a value; the other 31 are empty on purpose). It is now `offlineEstimate`, shown in the country drawer with the indicator years and source links, as an orientative estimate. `estimated_speakers` is empty in all 185 rows, so nothing to add.
- **Landing page**: counts use all 61 rows; the preview table shows the first 8 ("Showing 8 of 61").
- **Intentionally not done** (author decision: the CRM stays public, browser-local, no auth, no DB): no backend, FastAPI endpoints, SQLite, Alembic, login or roles from the bundle's `PROMPT_CLAUDE.md`. Sharing the list between people still needs a backend.
- Contact details come from public sources and were not re-verified; the CRM says so in the Organizations, Contacts and Sources views.

## Reference-look pass (2026-11-01, visual only)

The author asked for the app to look much closer to `TWINS_FOR_CHANGE_ABRIR_AQUI.html`. This overrides the earlier choice not to copy its colours and gradients. No logic changed: chat, chat store, composer, API service, CRM data logic and backend are untouched. Iterated with headless Chrome screenshots (reference and app side by side, 1280 / 1024 / 768 / 500 px, light and dark).

- **Palette tokens (`src/styles.css`).** `--navy #052d4b`, `--navy-2 #0b3d63` (raised on navy), `--navy-deep #04273f`, `--blue #125cd4`, `--sky #40d9e9` (the reference aqua, on navy only), `--pale #b8d6e3`, `--grey-blue #e2edf3` (lines), `--ink #183b50` (text), `--light #f3f9fd`, `--amber #eda34b`, `--teal #0b5f86`, `--card-shadow`, and `--section-alt` (light blue-white in light, deep navy in dark). Muted text is `#5b7483`, not the reference `#617987` (4.31:1 on `#f3f9fd` fails). The collaborate band is `#0b5f86`, not `#0e729d` (its pale text was 4.3:1). Measured pairs: ink on light 11.1, muted on white 4.9 and on light 4.6, white on blue 6.0, blue on light 5.6, white on navy 14.2, aqua on navy 8.3, aqua on navy-2 6.6, white on the teal band 7.0, pale aqua on it 5.4, warn pill `#8a5f1f`/`#fff1dc` 5.1, good pill `#1d6f53`/`#e6f7f0` 5.5. The dark theme uses the same tokens: navy canvas, navy-2 cards, aqua accent.
- **Typography.** Headings now use Twins Sans Bold with tight tracking, the closest bundled match for the reference's heavy sans. Inter is not used. Literata Display is no longer referenced: its `@font-face` and preload were removed, and `public/fonts/literata-display.woff2` plus its licence are still on disk (not deleted, awaiting approval). Buttons have 9px corners and heavy labels.
- **Landing.** Sticky white header with the mark and a two-line name. Photo hero with the reference navy gradient veil (an even veil below 64rem so text stays readable), kicker pill, aqua `em`, scroll cue, and a side card plus vertical label (decorative, `aria-hidden`). Mission photo with a quote card. Navy tutor band with the starters inside a light "app window" (dots bar, 1 degree tilt on desktop, caption chip) and a link-styled input to `/app`. Map workspace with teal and amber pins: the gap pin is hollow, so shape also carries the meaning, and both colours are at least 3.3:1 against the white ring. Country profile card. Research table with result pills and "Source" chips. Centred teal collaborate band with icon cards. CRM hub with a radial-gradient background, KPIs, quick links to `/crm?view=countries|map|orgs|followups` and a browser-style shell around the preview table. Light transparency section. Deep navy three-column footer with the mark on a white tile.
- **CRM.** Gradient navy sidebar with a "Coordination space" label, blue active item and an info card with "Back to the website". Eyebrow and `Partner CRM.` title (accent `#00798c`, 4.8:1; aqua in dark). Stat cards with the reference corner circle, a teal-edged callout, rounded cards with soft shadows, gradient bars, tinted badges, and a table card. Dialog and drawer have 18px corners, the reference shadows and backdrops.
- **Shared.** Top-bar links are bold, and the current route uses the accent tint. `/mapa` has the reference heading and a light section background. `/chat`, `/practice` and `/architecture` keep their layouts and pick up the new tokens and heading style.
- **New assets.** `public/site/hero-photo.webp` (1280 px, 66 KB) and `hero-photo-768.webp` (31 KB), encoded with `cwebp -q 72/70` from the reference's embedded hero JPEG (1280 × 720, the untinted original). The older brand-tinted `hero.webp` is no longer referenced but was kept (not deleted). `arrowUpRight` was added to `shared/icon.ts`.
- **Budget.** The `anyComponentStyle` budget went from 10/12 kB to 18/20 kB. The landing stylesheet is about 16 kB and `crm-page.css` is about 10 kB.
- **Fixes found on the way.** Visually hidden link text inside the scrollable tables widened the page at 500 px, so the scroll containers are now `position: relative`. The CRM table at 768 px and the country tiles at 1024 px overflowed: headers can now wrap and tiles can shrink.
- **Still different from the reference, on purpose.** The copy is English and truthful: no "54 + 1 / 148 / 1 mission" strip, no "Más lenguas" card, no scripted "Números / Palabras / Practicar" demo (the four real starters are used instead). The full logo wordmark is not shown (CLAUDE.md brand rule). The page has no hero video, no embedded CRM iframe (the preview is a read-only table plus real links), and the header has more links than the reference (Practice, How it works, theme toggle, Open the tutor). Headings use Andika-based Twins Sans Bold, not Inter 850, so letterforms are rounder. The chat greeting now uses the bold heading style, not the earlier "modest" weight.
- **Verified.** `tsc` (app and spec), `ng test` (11 files, 120 tests), production build. Headless Chrome found no horizontal overflow and exactly one h1 at 500, 768, 1024 and 1280 px, light and dark, on `/`, `/crm` (all views), `/mapa`, `/chat`, `/practice` and `/architecture`. Screenshots were reviewed for the landing (every section), the CRM overview, organizations, dialog and country drawer, the dark theme, 500 px, and the shared pages. **Not verified:** Lighthouse, a screen reader, a keyboard walk-through, real phone widths below 500 px (headless Chrome clamps), and the reduced-motion path in a browser (the CSS has the guards).

## CRM contacts import and contact validation, 2026-11-01

- **No new packages or assets.** Data only: `site/scripts/data/contacts_research.csv` (input) and the generated `site/src/app/crm/seed-contacts.json`.
- **Provenance.** 89 public contact routes from the contact research of 2026-11-01, collected from organizations' own pages, UN/government directories and one press page (source types: 83 official_site, 3 un_or_gov_directory, 2 other, 1 press). No LinkedIn profiles (one organization's LinkedIn company page is mentioned in a `notes` field, as written in the research). Text is copied from the CSV by `scripts/generate-crm-data.mjs` (NFC check, accents kept, nothing retyped).
- **Counts.** 89 contacts in 53 countries: 80 organization-level, 9 named leaders (10 contacts carry a person's name, shown with the role exactly as in the data); confidence 66 high, 21 medium, 2 low. 51 rows matched an existing organization by `org_in_crm_id`, 0 by country + name, and 38 new organizations (`research-<ISO2>-<slug>`) were added, so the seed is now **99 organizations** (61 + 38). The Somalia row of Windle Trust pointed at `public-SS-47` (South Sudan) and was given its own Somalia organization instead. On existing organizations only empty email, phone or website fields were filled from organization-level rows; nothing was overwritten. Three research websites were `http://` and were left out of `web` (their https source link is kept).
- **Storage.** The CRM key moved to `tfc.crm.v3` (`{ version: 3, seedIds, organizations, contacts, countryNotes }`). v2 (`tfc.crm.v2`) and v1 are migrated on read; nothing a visitor saved is overwritten, new seed rows arrive once, and a deleted seed organization or contact does not return. Deleting an organization deletes its contacts. Visitors can add, edit and delete contacts (length limits, email format, https-only links, at least one route).
- **Validate contact info.** Each contact, and each organization's own email/phone, has a status: Unverified (default), Verified, Invalid or Needs update, with the date it was set and an optional note. It is shown as an icon plus text. You can set it in the Contacts view, in the organization dialog and in the contact dialog. The Contacts view filters by country, status, confidence and kind, sorts, searches and exports CSV (formulas neutralised). The Overview "Needs verification" panel counts unverified vs verified contacts.
- **Public exposure.** The CRM bundle is public: every visitor downloads all 89 contacts, including the named people taken from their organizations' own pages. Verification marks live only in each visitor's browser.

### needs_review
- 19 countries still have fewer than 2 contact records: Benin, Burkina Faso, Cape Verde, Comoros (0), Congo - Brazzaville, Côte d'Ivoire, Djibouti, Equatorial Guinea, Eritrea, Gabon, Gambia, Guinea, Guinea-Bissau, Mauritania (0), Niger, Seychelles, Sierra Leone, Togo, Zimbabwe (1 each unless noted).
- A shared, verified CRM (one list of verification marks for the whole team) would need a backend with login and a database. The author decided against that for now.
- Should named people stay in a public bundle? They are listed on their organizations' own public pages, but the author may prefer to keep only organization-level routes.

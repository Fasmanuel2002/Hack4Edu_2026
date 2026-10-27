# QA report: Twins for Change frontend

## QA

**Result (2026-10-27): 61 PASS, 4 FAIL, 6 SKIPPED. Failures: 0 high, 0 medium, 4 low.**

Tested against CLAUDE.md as of 2026-10-27, where §6 Practice is a plain quiz with no gamification and `/ask/rag` returns `sources`.

How it was tested:
- `ng build --configuration production` and `ng test --watch=false`, run from `site/`.
- The production build, served by `node scripts/serve-dist.mjs` on :4300. Its `apiBaseUrl` is the placeholder, so this covered the offline and error paths, routing fallback, requests, and fonts.
- The running dev server on :4200, with a fake backend at `localhost:8000` (DevTools `Fetch` interception). The fake returns real `dataset_rag.csv` rows as `sources` and can return 422, 500, 503 or 504, malformed `sources`, or invalid JSON.
- Headless Google Chrome over the DevTools protocol, with screenshots at 375, 768, 900 (2x DPR) and 1280 px, in light, dark and reduced-motion modes.
- Python checks against `CLAUDE.md`, `dataset_rag.csv` and the built bundles, plus fontTools for the font files.

Both environment files have `useMock: false` on purpose, so mock mode could not be run in the browser without editing `site/` (see the SKIPPED rows; the unit tests cover it). Nothing answers at `http://localhost:8000/health/health`, so there are no real-backend checks.

Scripts, scenarios and screenshots are outside the repository, in `/private/tmp/claude-501/-Users-administrador-Desktop-2026-Hack4Edu-Hack4Edu-2026/c1f9f6a8-8ec4-4f46-a0e1-a7ca52f00908/scratchpad/qa/`, one `out-*` folder per scenario. Each folder has a `log.txt` and a `net.txt` with every request.

| # | Check | Result | Location | Details |
|---|---|---|---|---|
| 1 | Production build | PASS | `site/` | `ng build --configuration production` exits 0. The initial bundle is 439.95 kB raw (120.30 kB transferred). Lazy chunks: `practice-page` 24.31 kB, `architecture-page` 14.73 kB. 1 route is prerendered. |
| 2 | Budget warnings | PASS | `site/angular.json` | None. The initial bundle is 440 kB against a 500 kB warning budget. No component style warnings. |
| 3 | Unit tests | PASS | `site/src/**/*.spec.ts` | `ng test --watch=false`: 8 files, 76 tests, all passing. |
| 4 | Facts: corpus numbers | PASS | `/architecture`, `core/corpus.ts`, error messages | 15,791 rows, 8,318 `yor`, 7,473 `eng`. Per dataset: 8 + 250, 7,473, 25 + 83 + 500, 900, 6,552. Subject counts: 125/125/125/118/115. All match CLAUDE.md, and I counted the same numbers in `dataset_rag.csv`. |
| 5 | Facts: models and settings | PASS | Sidebar status, `/architecture` | "LLM: gemma3:4b (Ollama)" and "Search: Qdrant hybrid (bge-m3 + BM25, RRF)" are shown. Also: `hack4edu_collection`, 1024 dimensions, cosine, `Qdrant/bm25` with IDF, RRF, top 3, "`k=3` is the number of results, not an RRF parameter", `temperature=0.1`, `num_ctx=8192`. All match CLAUDE.md. |
| 6 | Facts: no invented metrics or claims | PASS | `site/src`, built bundles | No "accurate", "hallucination", "100%", "zero", benchmark or score claims. The disclaimer is "Twins for Change can make mistakes. Check the verified sources." |
| 7 | Facts: languages | PASS | `/architecture` footer, composer | Only Yorùbá and English are presented as supported ("This version supports Yorùbá and English. More languages are planned."). The `lang="es"` spans are the hackathon challenge names only. No other language name appears in the bundles. |
| 8 | Name "Twins for Change", no DeepLanguage, no starter leftovers | PASS | All routes, bundles | The name is written exactly. Neither "DeepLanguage" nor the Angular starter content appears in `site/src` or `dist/`. |
| 9 | Yorùbá starters match CLAUDE.md character for character | PASS | `core/starters.ts`, `main-*.js`, rendered DOM | All 4 Yorùbá questions and English translations are in the bundle, byte-identical to CLAUDE.md before and after NFC (51, 4, 30 and 4 combining marks). The DOM text in `.starter .yo` matches, with `lang="yo"`. |
| 10 | Demo data built from real CSV rows | PASS | `core/demo-data.ts` | All 12 demo sources (3 per starter) match a `dataset_rag.csv` row exactly (`source_dataset`, `search_context`, `pedagogical_answer`). |
| 11 | Mock answers labelled "Demo data" in the browser | SKIPPED | `chat/answer.html`, `chat/sources.html` | Both environment files have `useMock: false` (intentional). The code shows the "Demo data" pill when `slot.demo` is true, and `demo-data.spec.ts` and `api.service.spec.ts` cover mock mode. Not observed in a browser. |
| 12 | Quiz bank uses real rows | PASS | `core/quiz-bank.ts` | 25 items, 5 per subject. Each question, all 8 options and the answer letter match their CSV row. Neither AfriMMLU starter question is in the bank. |
| 13 | New chat button | PASS | Sidebar | Returns to the welcome screen and no chat stays active (`out-features`). |
| 14 | Ctrl/Cmd + Shift + O | PASS | `chat-page.ts` | Both Ctrl+Shift+O and Meta+Shift+O (simulated key events) open a new chat and focus the composer. Not tested in headed Chrome, where the browser may reserve the shortcut. |
| 15 | History survives reload, grouped by date | PASS | Sidebar, `localStorage` `tfc.chats.v1` | After a reload, the chat and all 3 turns come back under "Today". |
| 16 | Rename | PASS | Sidebar | Renaming to "Ìdánwò renamed" works and survives a reload. |
| 17 | Delete | PASS | Sidebar | A confirmation asks "Delete this chat?". The chat is removed from the UI and from storage, and stays removed after a reload. |
| 18 | No subject filter in the sidebar | PASS | Sidebar | None, as the author decided. |
| 19 | Status area rows | PASS | Sidebar footer | LLM, Search, API (online/offline) and Backend are shown. "Backend: RunPod (cloud)" appears on the production build. `isLocalApi` gives the local label for localhost. Health is polled every 30 s (`health.service.ts`). |
| 20 | "Demo mode" in the status area (mock mode) | SKIPPED | `chat/sidebar.ts` | The label exists in code (`demo: 'Demo mode'`), but mock mode is off in both builds. |
| 21 | API online/offline | PASS | Sidebar, dock | Shows "API online" with the fake backend. With the production placeholder URL it shows "API offline", plus a dock message ("…may be stopped, or still loading the 15,791 documents…") with a "Check again" button. |
| 22 | Welcome screen | PASS | `/chat` | The mark, the greeting "Báwo ni! How can we learn together today?" (`Báwo ni!` has `lang="yo"`), the composer, and 4 starters (Yorùbá with the English underneath). |
| 23 | Starter card sends right away | PASS | `/chat` | One click creates the chat, shows the question and starts a pending `/ask/rag` with the exact Yorùbá text. |
| 24 | Messages: layouts, avatars, timestamps | PASS | Thread | The user bubble shows an avatar, "You" and a time. The assistant shows an avatar, a label and a `<time>`. |
| 25 | Copy | PASS | Answer footer | With clipboard permission, the clipboard holds the raw answer Markdown, the label changes to "Copied", and "Answer copied." is announced. Without permission (headless default), it announces "Could not copy. Select the answer text and copy it instead." |
| 26 | Regenerate | PASS | Answer footer | Sends the same question again to the same endpoint; one turn, back to pending. |
| 27 | Progressive display and Stop generating | PASS | Thread, composer | The send button turns into "Stop generating". Stopping mid-request aborts the fetch (`net::ERR_ABORTED (canceled)`) and shows "Stopped before an answer arrived." |
| 28 | `prefers-reduced-motion` | PASS | Global | Welcome animations take 1e-05 s, and the answer appears in full at once with no `.revealing` state. |
| 29 | Formatting and answer polish | PASS | Answer | YO and EN language blocks, the final-answer callout for `**Ìdáhùn / Answer:**`, `**Ìdáhùn:**` and `**Answer:**`, including an NFD answer, and tabular arithmetic. |
| 30 | Compare mode: labels and side by side | PASS | Thread | The labels are "Twins for Change (Gemma + RAG)" and "Plain Gemma (no RAG)". Two equal columns at 1280 px (460 and 459 px); stacked at 768 px with the sidebar open and at 375 px. No sources drawer under the plain answer. |
| 31 | Compare mode: separate loading states | PASS | Thread | With delays of rag 4 s and plain 0.8 s, after 1.8 s the RAG answer was still pending (`aria-busy=true`) and the plain answer was done. |
| 32 | Sources drawer with real `sources` | PASS | `chat/sources.*` | "Verified sources (top 3)" expands (`aria-expanded`). It shows ranks 1, 2, 3, the `source_dataset` badges, the subject, the matched `search_context` split into Yorùbá and English, and the full `pedagogical_answer` with styled corpus labels. No "%" anywhere. Caption: "Found by hybrid search over the corpus, best match first." |
| 33 | Sources parsing is robust | PASS | `ApiService.readSources`, `history.ts` | A string, `null`, `[]` or a missing `sources` key gives one quiet line, "No sources came back with this answer." In `[null, valid, {source_dataset: 1,…}, "str", {partial}]` only the valid item is shown, keeping its rank of 2. Nothing crashes and there are no console errors. |
| 34 | Drawer shows at most 3 sources | FAIL (Low) | `api.service.ts` `readSources`, `chat/sources.html` | When the backend sends 5 valid sources, all 5 appear under the heading "Verified sources (top 3)". The backend uses `k=3`, so this cannot happen today, but the heading and the list could disagree if it ever returns more. |
| 35 | Sources drawer labelled "Demo data" (mock mode) | SKIPPED | `chat/sources.html` | The code has the "Demo data" pill and the demo caption, but mock mode is off. |
| 36 | Enter sends, Shift + Enter adds a line | PASS | Composer | Shift+Enter inserted `\n` and nothing was sent; Enter sent the question and cleared the text box. |
| 37 | Text box stops growing at 200 px | PASS | Composer | With 13 lines, the height is 200 px, `scrollHeight` is 344 and `overflow-y` is `auto`. |
| 38 | Tone mark bar: toggle and characters | PASS | Composer | The toggle has `aria-expanded` and `aria-controls`. It holds 19 keys, in CLAUDE.md order: ẹ ẹ́ ẹ̀ ọ ọ́ ọ̀ ṣ ń ǹ á à é è í ì ó ò ú ù. Each key has a descriptive label. |
| 39 | Tone mark inserts at the cursor, mid-word | PASS | Composer | With the caret at 2 in "ababa", ẹ́ gives "abẹ́aba" (U+1EB9 U+0301), caret at 4, focus kept. A real mouse click on ṣ at the caret position 1 gives "aṣbaba", caret at 2. |
| 40 | Attachments | PASS | Composer | Chips show an icon or thumbnail, the name and size, and a remove button. A notice says "Attachments are not sent: the backend cannot receive files yet." `.exe` and an 11 MB file are rejected, with messages in `aria-live="polite"`. Dropping a file on the window shows an overlay and adds a chip. After sending, the turn says "Not sent (no upload endpoint yet): …". |
| 41 | Send button states | PASS | Composer | Disabled when the box is empty; "Send question" with text; a square "Stop generating" while waiting. |
| 42 | "Compare with plain Gemma" toggle label | FAIL (Low) | `chat/composer.html` | The visible text is only "Compare". The full name comes from a visually hidden span and the `title`. CLAUDE.md says: 'a "Compare with plain Gemma" toggle'. The accessible name is correct; only sighted users see the shorter label. |
| 43 | Routes, titles, fallback | PASS | `app.routes.ts`, `serve-dist.mjs` | `/chat`, `/practice` and `/architecture` load on direct visits. `/some/unknown` goes to `/chat`. Titles are "Chat · …", "Practice · …" and "How it works · …". `/architecture` is prerendered: the HTML contains its `h1`. |
| 44 | Header links and theme toggle | PASS | Top bar | Chat, Practice and How it works, with `aria-current`. Icons only below 768 px, same accessible names. |
| 45 | Theme survives a reload | PASS | `localStorage` `tfc.theme` | The dark choice survives a reload of `/chat` and carries over to `/architecture`. |
| 46 | `/architecture` | PASS | `architecture-page.html` | Pipeline question → hybrid search (15,791 rows, bge-m3 + BM25, RRF, top 3) → tutor prompt → gemma3:4b → bilingual answer. Deployment (Vercel → RunPod → Ollama and Qdrant) and local mode. The corpus table matches CLAUDE.md. The API table includes the new `sources` response. |
| 47 | `/practice` plain quiz | PASS | `practice-page.*` | One question at a time, "Question N of 25 · Subject", Yorùbá (`lang="yo"`) with the English below, 4 options. The verdict has an icon and text ("Correct" / "Not quite"). "Verified answer (AfriMMLU)" and "Next question" are there. "Ask Twins for Change to explain" opens a new chat and sends the Yorùbá question. Nothing new is written to `localStorage`. |
| 48 | Gamification removed | PASS | `site/src`, bundles, UI | No XP, levels, streaks, badges, daily challenge, toasts or celebrations in the code, bundles or UI. Matches in the bundles are minified identifiers only. |
| 49 | Gamification leftover: old progress key | FAIL (Low) | Browser `localStorage` | Browsers that ran the previous build keep the `tfc.progress.v1` key: nothing reads it and nothing removes it (build-summary item 19). Harmless, but leftover data from the removed feature. |
| 50 | API contract: endpoints and body | PASS | `core/api.service.ts`, network | `POST {apiBaseUrl}/ask/rag` and `/ask/plain`, `Content-Type: application/json`, body exactly `{"question":"…"}` (checked on the intercepted requests). Sources are read only from `/ask/rag`. Health is `GET /health/health` and accepts `"healty"`. |
| 51 | No chat history in the request body | PASS | Network | Every request carried only `question`, including follow-up turns in the same chat. |
| 52 | Client timeout of at least 120 s | PASS | `api.service.ts` | `REQUEST_TIMEOUT_MS = 300_000` (5 min). The RunPod proxy case (90 s or more, or 504/524) gets its own message. |
| 53 | 422 and 500 show an error with Retry | PASS | Answer | 422: "The API rejected the request as invalid (422)…". 500: "The tutor could not answer (500). Ollama or Qdrant may be unavailable…". Both have Retry, and Retry after the 500 produced an answer with 3 ranked sources. |
| 54 | Other failures | PASS | Answer | 503 gives "backend is not available right now". 504 gives the proxy timeout message. Invalid JSON gives "not valid JSON". A missing `answer` gives "response without an answer". An unreachable host gives "Could not reach the API at …". All have Retry. |
| 55 | Real backend | SKIPPED | n/a | `http://localhost:8000/health/health` does not respond, and the brief says not to run Docker or the Python backend. The fake backend was used instead. |
| 56 | Offline: URL grep of the build | PASS | `site/dist/site/browser` | The only URL strings are: XML namespaces (w3.org), Angular's `http://fake` URL-parser base, the Angular XSS documentation link, marked's GitHub link, marked's bare `http://` autolink prefix, the `apiBaseUrl` placeholder, and URLs in the OFL licence texts. Nothing is fetched from them. |
| 57 | Offline: no requests to other hosts | PASS | `out-*/net.txt` | Every request went to the local server (:4300 or :4200) or the fake `localhost:8000`. No fonts, CDNs or analytics from anywhere else. |
| 58 | Self-hosted fonts and licences | PASS | `site/public/fonts/`, `styles.css`, `index.html` | 3 woff2 files are served from `/fonts/` with `font-display: swap`, and the regular and display faces are preloaded. `OFL-Andika.txt` and `OFL-Literata.txt` are present and copied to `dist/`. The Andika subset is named "Twins Sans" in name IDs 1, 2, 4 and 6; "Andika" appears only in the trademark, description and licence records (7, 10, 13). |
| 59 | Fonts: tone marks in NFC and NFD | PASS | Thread, sidebar, starters | Twins Sans has ẹ ọ ṣ ń ǹ, combining U+0300, U+0301 and U+0323, plus GPOS `mark` and `mkmk`. An NFD question and NFD answer at 2x DPR render with the tone marks centred over the dot-below letters (`out-nfd/r02-nfd-dpr2.png`). The bubble keeps the NFD text unchanged. Literata has no ǹ, but it is used only for English display text (documented). |
| 60 | Layout at 375 px | PASS | `/chat`, `/practice`, `/architecture` | No page-level horizontal scroll (scrollWidth 375). The composer fits (16 to 359 px), including with the tone bar open. The architecture tables scroll inside a focusable `role="region"`, not the page. |
| 61 | Layout at 768 px | PASS | Same | No horizontal scroll. The inline sidebar can be hidden. Compare columns stack while the sidebar is open. |
| 62 | Layout at 1280 px | PASS | Same | No horizontal scroll or overlap. Compare columns sit side by side. |
| 63 | Sidebar is a drawer below 768 px | PASS | `chat-page.*` | At 375 px the sidebar starts off-canvas and `inert`. The menu button opens it, focus moves in and the page behind becomes inert. Escape closes it. |
| 64 | Console errors and failed requests | PASS | All scenarios | No JavaScript exceptions or console errors. The only "Failed to load resource" entries were the 422/500/503/504 responses the tests forced, and the abort from Stop. |
| 65 | Content leaks | FAIL (Low) | Production build, error message | No lorem ipsum, TODO, `needs_review` or placeholder copy in the UI, apart from one case: on the Vercel build, asking a question shows "Could not reach the API at https://<pod-id>-8000.proxy.runpod.net." The `<pod-id>` placeholder is visible to users. This follows from the known needs_review item 10 (missing RunPod URL); resolving that item removes it. |
| 66 | `lang` attributes | PASS | DOM | `<html lang="en">`. `lang="yo"` is set on starters, questions, Yorùbá answer blocks, quiz text, source parts and Yorùbá chat titles. |
| 67 | One `h1` per route | PASS | DOM | `/chat` welcome: the greeting. `/chat` with a conversation: a visually hidden "Chat: …". `/practice`: "Practice". `/architecture`: "How Twins for Change works". |
| 68 | Error state survives a reload | PASS | `history.ts` | A turn still pending at reload becomes an error with Retry ("The page was reloaded before this answer arrived."), per code and `history.spec.ts`. |
| 69 | Health polling interval | PASS | `health.service.ts` | `POLL_MS = 30_000`. Not polled in mock mode. |
| 70 | Mock mode works with no backend | SKIPPED | `api.service.ts` | Covered by the unit tests ("mock mode offline with 3 ranked demo sources"), but not observed in a browser because `useMock` is false. |
| 71 | Lighthouse ≥ 90 | SKIPPED | n/a | Not re-run by QA. The developer reports 91–100 for every route (build-summary). |

### Low-severity failures

1. **#34. The sources list is not capped at 3.** `readSources` keeps every valid item, while the heading says "top 3". Latent, because the backend always returns 3.
2. **#42. The Compare toggle's visible label is "Compare".** CLAUDE.md names it "Compare with plain Gemma". That full text is the accessible name and the tooltip only.
3. **#49. The old `tfc.progress.v1` key is never removed** from browsers that ran the gamified build.
4. **#65. The placeholder URL `https://<pod-id>-8000.proxy.runpod.net` is visible** in the production build's error message. It goes away when needs_review item 10 is resolved.

### Observations (not failures)

- **Partial sources keep their original rank.** If the backend's first source is malformed, the drawer shows a single "Rank 2". This is by design: ranks are positions in the backend's list, as documented.
- **The "Scroll to latest message" button floats over the thread text**, as in ChatGPT.

## Accessibility and design

**Result (2026-10-27): 34 PASS, 0 FAIL, 0 SKIPPED. Failures: 0 high, 0 medium, 0 low. 7 low-severity observations (judgment calls that break no rule).**

Reviewed against CLAUDE.md and the Visual design part of `.claude/agents/developer.md` as of 2026-10-27, including the product feel, typography, colour and motion rules. QA's findings are not repeated here; see the QA section (for example #42, the visible "Compare" label).

These checks show no failures. They are not a claim that the app is WCAG compliant: there was no testing with a real screen reader (VoiceOver or NVDA), and no browser other than Chrome.

How it was reviewed:
- **Production build** (`dist/site/browser`, built 20:03 and newer than every file in `site/src` and `site/public`), served by QA's `serve-dist.mjs` on :4300.
- **Answers on the production build.** Its `apiBaseUrl` is the `<pod-id>` placeholder, so before each page load a test script replaced `window.fetch` for that host only. The fake returns the `/ask/rag` and `/ask/plain` answers QA used, with 3 real `dataset_rag.csv` rows as `sources`, after 1.2 s (rag) and 0.6 s (plain). Everything else is the shipped bundle, and nothing in `site/` was changed.
- **Browser and tools:** Playwright-core 1.64.1 with `channel: "chrome"` (Google Chrome 156, headless, 2x DPR), and Lighthouse 12.8.2 against the same Chrome. Both were installed with npm in the scratchpad, not in `site/`.
- **Other methods:** the Chrome DevTools accessibility tree for names, Python for the contrast maths (WCAG 2.1 relative luminance, alpha composited onto the real surface), and Pillow for the logo files.
- **Where the outputs are:** scripts, screenshots and Lighthouse JSON are in `/private/tmp/claude-501/-Users-administrador-Desktop-2026-Hack4Edu-Hack4Edu-2026/c1f9f6a8-8ec4-4f46-a0e1-a7ca52f00908/scratchpad/a11y/` (`out/*.png`, `lh/*.json`, `contrast.py`, `*.mjs`).

### Contrast of the token pairs

Ratios are computed from the CSS variables in `styles.css`. Each translucent token is composited onto the surface it is used on. "Need" is 4.5 for text and 3 for focus rings, input borders and icons.

| Theme / surface | Pair (foreground / background) | Ratio | Need | Result |
|---|---|---|---|---|
| Light, canvas | navy `#0C2D64` text / white | 13.33 | 4.5 | PASS |
| Light, canvas | muted `#415B86` / white | 6.85 | 4.5 | PASS |
| Light, canvas | navy / bubble (grey-blue 50 %: user bubble, sources inset, badges, code) | 11.50 | 4.5 | PASS |
| Light, canvas | muted / bubble (corpus labels, user avatar icon) | 5.91 | 4.5 | PASS |
| Light, canvas | navy / hover 45 % (current nav link) · muted / hover | 11.68 · 6.00 | 4.5 | PASS |
| Light, canvas | navy / selected 75 % · muted / selected | 10.65 · 5.47 | 4.5 | PASS |
| Light, canvas | navy / callout (pale 35 %, final answer) | 12.25 | 4.5 | PASS |
| Light, canvas | brand blue link / white · / callout · / bubble | 6.49 · 5.96 · 5.59 | 4.5 | PASS |
| Light, canvas | white / brand blue (send, primary buttons) | 6.49 | 4.5 | PASS |
| Light, canvas | white / navy (Stop) | 13.33 | 4.5 | PASS |
| Light, canvas | brand blue / accent-soft (pressed Compare chip) | 5.55 | 4.5 | PASS |
| Light, canvas | sky marks / navy (Twins for Change avatar, icon) | 8.55 | 3 | PASS |
| Light, canvas | focus ring brand blue / white · / bubble · / hover | 6.49 · 5.59 · 5.68 | 3 | PASS |
| Light, canvas | composer border (navy 55 %) / white (input boundary) | 3.43 | 3 | PASS |
| Light, canvas | white text / drop overlay (navy 82 % over white) | 7.75 | 4.5 | PASS |
| Dark, canvas | white / navy · pale `#BCEBFF` / navy | 13.33 · 10.45 | 4.5 | PASS |
| Dark, canvas | white / light navy `#12397A` (bubble, composer, callout) · pale / light navy | 11.10 · 8.70 | 4.5 | PASS |
| Dark, canvas | white / hover · pale / hover | 10.88 · 8.53 | 4.5 | PASS |
| Dark, canvas | sky link / navy · / light navy | 8.55 · 7.12 | 4.5 | PASS |
| Dark, canvas | navy / sky (send, primary, quiz answer letter) | 8.55 | 4.5 | PASS |
| Dark, canvas | navy / white (Stop, avatar on its white disc) | 13.33 | 4.5 | PASS |
| Dark, canvas | sky / accent-soft on light navy (pressed chip) | 5.21 | 4.5 | PASS |
| Dark, canvas | focus ring sky / navy · / light navy | 8.55 · 7.12 | 3 | PASS |
| Dark, canvas | composer border (pale 50 %) / navy | 3.77 | 3 | PASS |
| Sidebar, light theme (navy) | white / navy · pale / navy | 13.33 · 10.45 | 4.5 | PASS |
| Sidebar, light theme | white / light navy (open chat, rename input) · pale / light navy (row icons) | 11.10 · 8.70 | 4.5 | PASS |
| Sidebar, light theme | white / hover · pale / hover | 10.88 · 8.53 | 4.5 | PASS |
| Sidebar, light theme | focus sky / navy · / light navy · sky edge of the open chat / light navy | 8.55 · 7.12 · 7.12 | 3 | PASS |
| Sidebar, light theme | rename input border (pale 50 %) / navy · navy / sky (Save) | 3.77 · 8.55 | 3 · 4.5 | PASS |
| Sidebar, dark theme (`#08214A`) | white · pale · white on hover · pale on hover | 15.83 · 12.41 · 12.97 · 10.17 | 4.5 | PASS |
| Sidebar, dark theme | focus sky / `#08214A` · rename border / `#08214A` | 10.15 · 4.12 | 3 | PASS |
| Not required | grey-blue `#D6DEEA` border / white (chips, option rows) · pale 16 % / navy | 1.36 · 1.53 | n/a | These are buttons whose text or glyph identifies them (6.85:1 or more), so WCAG 1.4.11 does not require a visible boundary. The text input has its own 3.43 / 3.77 border. |
| Forbidden pairs | sky / white 1.56 · brand blue / navy 2.06 | — | — | Not used. See row 2 of the results table. |

### Results

| # | Check | Result | Location | Details / suggested fix |
|---|---|---|---|---|
| 1 | Contrast of every token pair, both themes, including the navy sidebar | PASS | `styles.css` tokens, `.surface-navy` | All pairs in the table above pass. Lowest text pair: muted on the selected tint, 5.47. Lowest focus or border pair: the light composer border, 3.43. |
| 2 | Contrast as rendered, plus forbidden pairs | PASS | `/chat` (welcome; compare answer with sources and status open), `/practice` (answered), `/architecture`; light and dark | 1. Every visible text node was composited with its element's opacity and the backgrounds behind it: none is below 4.5:1 (or 3:1 for large text), in either theme. 2. A second scan checked each element's colour, border, outline, stroke and fill against its background, with every control focused in turn: no sky blue on white and no brand blue on navy. The one hit was the Twins for Change avatar, whose own background is navy, so it is a false positive. |
| 3 | Palette only | PASS | Computed styles on all routes, both themes | The only colours painted are the 8 brand colours and two navy-derived shades. `#415B86` is a 22 % tint of navy toward white. `#08214A` is an approximate shade of navy (about 0.74 × navy). `#000000` appears only as the unpainted default on `<html>` (overridden by `body`) and on an SVG root whose shapes set their own fill. |
| 4 | Flat style: no gradients, patterns, textures or glows | PASS | Computed `background-image` on all routes | No gradients, and no images except the logo. Shadows: the composer, plus the floating "Scroll to latest message" button (`--shadow`). The dark theme has no shadows. |
| 5 | Logo: the mark only, an exact crop, not recoloured | PASS | `site/public/brand/twins-for-change-mark.png` | It is pixel-identical to the original at (6, 4, 558 × 449) and fully opaque. It shows the two figures and the book, with no wordmark (viewed). `assets/brand/twins-for-change-logo.png` has no changes in `git status`. |
| 6 | Logo: alt text, loads from `site/public`, not stretched | PASS | `shared/logo.ts`; sidebar, top bar, welcome | `alt="Twins for Change"` everywhere. It loads from `brand/` (WebP via `<picture>`, PNG fallback). Width is set and height is auto, with `width="558" height="449"`. The 256w WebP has the original aspect ratio; for the 96w file, see observation 7. |
| 7 | Logo sits only on white, both themes | PASS | `.mark-tile` | The mark is always inside a white tile. Light theme: on the white canvas (welcome, top bar) and as a white tile on the navy sidebar. Dark theme: a white rounded tile on navy (welcome, top bar, sidebar, drawer). Seen in the 1280 and 375 screenshots. |
| 8 | Keyboard: tab order on `/chat` | PASS | Whole page | Order: skip link → brand → New chat → history (open, Rename, Delete) → status → Hide sidebar → Chat / Practice / How it works → theme toggle → Copy → Regenerate → Verified sources → "+" → text box → Compare → Tone marks → starter rows (welcome only). This follows the visual reading order. After the last control focus leaves the page, and the next Tab starts again at the skip link, so focus is never trapped. |
| 9 | Focus always visible | PASS | All controls, both themes | Each of the 41 focus stops shows a 2 px outline with a 2 px offset: sky blue on the navy sidebar, brand blue on white, sky blue in the dark theme. The text box turns the composer border into a 2 px ring instead. Hover-only tools (history row icons, earlier answers' Copy and Regenerate) become visible on `:focus-within`. Screenshots: `out/kb-focus-*.png`. |
| 10 | Starter rows by keyboard | PASS | Welcome | Tab reaches each row. Enter sends the Yorùbá question, and an answer with sources follows. |
| 11 | Tone mark bar by keyboard | PASS | Composer | It is a `role="toolbar"` with a roving tabindex: one Tab stop, and the arrow keys, Home and End move between the 19 keys. Each key is named, for example "ẹ̀, e with dot below, low tone". With "ab" in the text box, Enter on the second key gives `a b U+1EB9 U+0301`, and focus returns to the text box. |
| 12 | Compare toggle and sources drawer | PASS | Composer, answer | Compare is a toggle button with `aria-pressed`. The sources button has `aria-expanded` and `aria-controls`, and the panel is `inert` while closed. |
| 13 | Theme toggle | PASS | Top bar | A button named "Dark theme" with `aria-pressed`. |
| 14 | Escape closes the mobile drawer | PASS | 375 px | 1. Opening moves focus into the drawer, and the page behind is `inert`. 2. Tab cycles through the drawer, the browser, and the skip link. 3. Escape closes the drawer and returns focus to "Open sidebar". |
| 15 | Ctrl/Cmd + Shift + O | PASS | `/chat` | Ctrl+Shift+O, sent as a real key press, opens the welcome screen and focuses the text box. QA covered Cmd. |
| 16 | Landmarks | PASS | All routes | 1. `/chat`: banner (top bar), `aside` "Chats and settings" with the history `nav`, `nav` "Main", `main`. The `footer` element holds the sidebar status (see observation 5). 2. `/practice`: banner, nav, main. 3. `/architecture`: banner, nav, main, contentinfo. The answer `<header>` elements sit inside sections, so they are not extra banners. |
| 17 | One h1 per route, heading levels | PASS | All routes | 1. `/chat` welcome: the greeting. 2. `/chat` thread: the hidden "Chat: …", then h2 per answer and h3 "Àlàyé ní Èdè Yorùbá" / "Explanation in English". 3. `/practice`: h1, h2. 4. `/architecture`: h1, h2, h3 with no skipped levels. See observation 2 for the sidebar headings. |
| 18 | Labels on every input and icon button | PASS | Accessibility tree, all routes | None of the buttons, links, text boxes, images, toolbars or regions has an empty accessible name. Examples: "Attach files", "Send question" / "Stop generating", "Copy", "Regenerate", "Rename chat: …", "Remove <file>". The file input is `aria-hidden` and `tabindex="-1"` behind the "+" button. |
| 19 | `lang="yo"` on Yorùbá text | PASS | DOM | Every text node with Yorùbá letters (ẹ ọ ṣ, tone marks, combining marks) is inside `lang="yo"`. This was checked on the welcome screen, a compare thread (including the Yorùbá plain-Gemma answer), the sources drawer and the answered quiz. The only exceptions are English text that names the language, such as "Yorùbá Step-by-Step" and "Ask a question in Yorùbá or English". `<html lang="en">`. |
| 20 | One live announcement per finished answer | PASS | `app.html` live region | A MutationObserver on all live regions during a full word-by-word reveal recorded exactly one change: "Answer ready: Twins for Change." In compare mode there was one per answer ("…Plain Gemma (no RAG).", then "…Twins for Change (Gemma + RAG)."). The answer body is not live, and it has `aria-busy` while pending or revealing. |
| 21 | Yorùbá line height ≥ 1.6 | PASS | Starters, tone bar, answer, sources, NFD thread | The smallest ratio found on text with tone marks is 1.6 (the tone chip glyph). Starters and other Yorùbá text use 1.7, answers 1.75. The only lower value is the ASCII "YO" tag (1.55), which has no diacritics. |
| 22 | Yorùbá is never in a fixed-height, overflow-hidden box | PASS | Same | Only three boxes hide overflow: `.shell` (the app frame; the text scrolls inside `.workspace`), the visually hidden h1, and the closed sources drawer. None of them cuts off visible Yorùbá text. |
| 23 | Tone marks render without clipping or overlap (NFC) | PASS | `out/yo-welcome-*`, `yo-tonebar-*`, `body-compare-*`, `yo-answer-*`, `yo-sources-*` at 375 and 1280, light and dark | Viewed at 2x. Starter rows, the tone bar (19 keys, wrapping to 3 rows at 375), the YO and EN blocks, both answer callouts and the sources drawer were checked. Tone marks sit centred over the dot-below letters (ẹ́, ọ̀, bọ́ọ́lù, kọ̀ọ̀kan), ṣ, ń and ǹ are clean, and nothing touches the line above or is cut off. |
| 24 | Tone marks in NFD | PASS | `out/yo-nfd-1280-light.png` | The NFD question (plus "ẹ́ ọ̀ ṣ ń ǹ") and its NFD answer look the same as NFC. The bubble keeps the NFD code points. |
| 25 | Reduced motion | PASS | Global, `answer.css`, `sources.css`, `chat-page.css` | With `prefers-reduced-motion: reduce`: 1. No running animations on the welcome screen (stagger off). 2. The skeleton shows `animation: none`. 3. The answer is complete (472 characters) in the first frame with no `.revealing` state, so there is no blinking cursor. 4. Message rise, the drawer row and opacity, the send button and the mobile drawer slide all take 1e-05 s. 5. `scroll-behavior` is `auto`. |
| 26 | ChatGPT and Gemini layout without their branding | PASS | `/chat` | Flat navy sidebar, centred thread, the composer centred on the welcome screen and docked once a chat starts, quiet starter rows, round send button, a one-line notice. No ChatGPT or Gemini colours, logos or icons. The type (Twins Sans and Literata) and the adire navy give it its own identity. |
| 27 | Compare mode tells answers apart by label and position | PASS | `out/body-compare-*` | Two equal columns at 1280, stacked at 375. Each has a plain bold label ("Twins for Change (Gemma + RAG)" / "Plain Gemma (no RAG)"), the same typography, and one thin divider, with no coloured panels. The avatars also differ in shape (marks vs a ring). |
| 28 | A plain, readable thread | PASS | Thread | The user bubble is a soft tint and answers sit flat on the canvas. YO and EN blocks have one thin rule and outlined tags. The final-answer callout is a light tint. Body text is 16 px, and Yorùbá has generous line height. |
| 29 | Reflow at 320 px (WCAG 1.4.10, beyond CLAUDE.md's 375) | PASS | `/chat` (compare, tone bar, sources open), `/practice`, `/architecture` | No page or workspace horizontal scroll, and nothing extends past the viewport. Tables scroll inside their own focusable region. |
| 30 | Text spacing (WCAG 1.4.12) | PASS | Same routes at 375 and 1280 | With line-height 1.5, letter-spacing 0.12em, word-spacing 0.16em and paragraph spacing 2em forced: no text spills out of chips, tone keys, buttons, nav links, ranks or option letters, and nothing is clipped (`out/reflow-*-sp-*.png`). |
| 31 | Lighthouse ≥ 90 for performance, accessibility and best practices | PASS | `lh/*.json` | Performance / accessibility / best practices: 1. `/chat` mobile 94 / 100 / 100 (FCP 1.9 s, LCP 2.5 s, TBT 180 ms, CLS 0). 2. `/chat` desktop 100 / 100 / 100. 3. `/architecture` mobile 93 / 100 / 100 (FCP 2.1 s, LCP 2.9 s, TBT 60 ms, CLS 0.001). 4. `/architecture` desktop 100 / 100 / 100. One run each on the production build. Mobile performance is near the threshold (93–94), so new weight should be measured. |
| 32 | Initial bundle size | PASS | `dist/site/browser` | `main` 110,701 B + `chunk-BVBZRTYH` 288,877 B + `chunk-E6TQUTKL` 31,421 B + `styles` 8,949 B = 439,948 B (about 440 kB raw; QA measured 120.30 kB transferred). The budget warning is at 500 kB. Lazy chunks: `/practice` 24.3 kB, `/architecture` 14.7 kB. Fonts on first load: Twins Sans regular 74.8 kB and Literata 41.1 kB, preloaded. Bold (74.3 kB) loads with the first answer. |
| 33 | Images no larger than their display size | PASS | All `<img>` | 1. The logo at 26–28 px uses the 96 px WebP (2.8 KB). At 56 px on the welcome screen it uses the 256 px WebP (8.1 KB). Both are about right for 2x screens. 2. The 154 KB PNG is only a fallback and was never fetched. 3. Lighthouse found no wasted bytes in its responsive-images, image-format or image-size audits. 4. Once, `/architecture` used the 256 px file at 375 px, but that was Chrome reusing an image it had already cached (the prerendered markup has `sizes="26px"`). |
| 34 | No external requests, no console errors | PASS | All scripted sessions | Every request went to localhost, the only exception being the stubbed placeholder host. There were no page errors or console errors. |

### Observations (low severity, no rule broken)

1. **The skip link does nothing while the mobile drawer is open.** At 375 px, with the drawer open, Tab reaches "Skip to main content" (it lives outside the `inert` area). Enter keeps focus on the link, because `#main` is inert, and the drawer stays open. Escape still closes the drawer. Location: `app.ts` `skipToMain`, `chat-page.html`. Suggested fix: when `#main` is inert, close the drawer first and then focus `#main`. Alternatively, make the skip link inert together with the page.
2. **The sidebar headings come before the h1 in the DOM.** On `/chat` the reading order is h2 "Chats", h3 "Today", h2 "System status", then the h1. No level is skipped, and Lighthouse and the accessibility tree accept it; ChatGPT has the same structure. Location: `chat-page.html` (`aside` before `.workspace`). Suggested fix, if wanted: make the sidebar headings non-heading labels with `aria-labelledby` on the `nav` and `footer`. Another option is to move the `aside` after `main` in the DOM and keep it visually first with `order` or the grid.
3. **The `.shell` frame can scroll, though nothing in the app scrolls it.** `.shell` has `overflow: hidden`, but its `scrollHeight` reaches 1,890 px with sources present (at 375 px). The cause is the visually hidden "Rank" spans in `sources.html`, which are `position: absolute` with `.shell` as their containing block. Opening sources, Tab and Shift+Tab, and the skip link all left `scrollTop` at 0. A test script calling `scrollIntoView({block:'start'})` did shift the whole UI up by about 90 px, leaving an empty strip at the bottom. Location: `chat/sources.css` `.rank`. Suggested fix: add `position: relative` to `.rank` (or `.source`), so the hidden text stays inside the drawer.
4. **The dark-theme drawer scrim barely dims the page.** The backdrop is navy at 40 % opacity over a navy canvas, so the chat behind the open drawer stays at almost full contrast (`out/drawer-375-dark.png`). Only the faint drawer edge separates the two. Location: `chat-page.css` `.backdrop`. Suggested fix: use a darker shade of navy for the scrim in the dark theme, for example `#08214A` at about 70 %.
5. **No page-level footer on `/chat` or `/practice`.** CLAUDE.md asks for `footer` among the semantic elements. `/chat` has one only inside the `aside` (the status, so it is not a contentinfo landmark), and `/practice` has none. `/architecture` has a real contentinfo. Nothing is missing for screen-reader users. Suggested fix: none needed. If wanted, `/practice` could reuse the architecture footer line.
6. **On phones, the open tone bar makes the docked composer very tall.** At 375 px, the 19 keys wrap to 3 rows. The docked composer with the bar open then takes about 45 % of an 812 px screen and covers much of the answer (`out/yo-answer-375-dark.png`). It works and clips nothing. Suggested fix, if wanted: one horizontally scrolling row on narrow screens, or close the bar after sending.
7. **The 96 px logo WebP is about 1 % squashed vertically.** `twins-for-change-mark-96.webp` is 96 × 78, but the crop's aspect ratio needs 96 × 77.2. Displayed at 26–28 px with the `558 × 449` box, that is a 0.2 px difference, which cannot be seen. The 256 px file is exact. Location: `site/public/brand/`. Suggested fix: regenerate it at 96 × 77, or leave it as it is.

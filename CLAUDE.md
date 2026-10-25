# Twins for Change: offline-first bilingual AI tutor (Hack4Edu 2026)

## Purpose
- Twins for Change is an offline-first AI tutor for bilingual Yorùbá–English classrooms, built for Hack4Edu 2026: **Reto 06 (La escuela habla tu idioma)** and **Reto 02 (Aprender sin conexión)**.
- The problem: Gemma 3 4B makes things up when it answers in Yorùbá. Twins for Change retrieves verified bilingual examples with hybrid RAG and gives them to Gemma, so it answers from real data. The demo compares plain Gemma with Gemma + RAG on the same question.
- This file specifies the web frontend: a chat workspace in the style of ChatGPT and Gemini, connected to the FastAPI backend in this repository.
- Architecture: the Angular frontend runs on Vercel and calls the FastAPI backend (REST API and RAG logic). The backend runs on a RunPod GPU pod together with Ollama (LLM inference) and Qdrant (vector database). The same backend can also run on one local machine with no internet, which is the offline mode for schools. See Deployment for the stages.
- Future versions will add more languages. This version supports only Yorùbá and English: the UI may say that more languages are coming, but must not present any other language as supported.

## Audience and tone
- Primary audience: Hack4Edu judges, technical evaluators, teachers, and students in bilingual Yorùbá–English classrooms.
- Secondary audience: researchers working on RAG for low-resource languages.
- Tone: clear, pedagogical, modern, and trustworthy. Every technical claim in the UI must match the facts in this file. Do not claim accuracy numbers, benchmark scores, or "zero hallucinations": none have been measured.

## Brand
- Name: **Twins for Change**, written exactly like that.
- Logo: `assets/brand/twins-for-change-logo.png` (1427 × 473 PNG). In the app, show only its mark: the two figures and the open book on the left, without the "twins for change" wordmark. Crop the mark from the original into `site/public/`, and use it in the sidebar, on the welcome screen, and as the favicon, with the alt text "Twins for Change". Do not redraw, recolor, or stretch it, and leave the original file unchanged.
- The mark has an opaque white background and a navy book, so place it only on white surfaces. In the dark theme, put it on a small white tile, never directly on navy.
- Brand colors are defined in `.claude/agents/developer.md`.

## Source of truth

### Corpus: `dataset_rag.csv` (repository root, 15,791 rows)
Built by `notebooks/creation_dataset_rag.ipynb`. Columns:
- `language`: `yor` (8,318 rows) or `eng` (7,473 rows, all GSM8K).
- `source_dataset`: one of the values in the table below.
- `search_context`: the question that search matches against, as `Yorùbá | English`.
- `pedagogical_answer`: the verified content and answer that Gemma reads.

| Subject | `source_dataset` | Rows | Languages | Content |
|---|---|---|---|---|
| Mathematics | `afrimgsm_train`, `afrimgsm_test` | 8 + 250 | Yorùbá + English | Word problems. Train rows have step-by-step solutions; test rows have only the final number. |
| Mathematics | `gsm8k_train` | 7,473 | English only | Worked examples with step-by-step solutions. |
| Sciences and humanities | `afrimmlu_dev`, `afrimmlu_validation`, `afrimmlu_test` | 25 + 83 + 500 | Yorùbá + English | Multiple choice with 4 options. Subjects: elementary mathematics (125), high school geography (125), high school microeconomics (125), international law (118), global facts (115). |
| Reading comprehension | `belebele_test` | 900 | Yorùbá + English | Reading passage, question, and verified answer. |
| Translation | `mafand_train` | 6,552 | Yorùbá → English | News sentences with verified translations. |

Section labels inside `pedagogical_answer` start a line and end with `]:`. Style them in the sources drawer:
- Belebele: `[Reading Passage (Yorùbá)]`, `[Reading Passage (English)]`, `[Verified Answer (Yorùbá)]`, `[Verified Answer (English)]`
- AfriMGSM train: `[Verified Translation]`, `[Yorùbá Step-by-Step]`, `[Math Equation]`, `[Exact Final Answer]`
- AfriMGSM test: `[Verified Parallel Math Problem (Yorùbá -> English)]`, followed by `- Yorùbá Text:`, `- Exact English Meaning:`, `- Verified Numerical Result:` lines
- GSM8K: `[Worked Math Example (English)]`, `[English Step-by-Step]`, `[Exact Final Answer]`
- AfriMMLU: `[Subject: <subject> | Academic Bilingue Reference]`, followed by `- Yorùbá Question:`, `- English Question:`, `- Options (Yorùbá):`, `- Options (English):`, `- Verified Answer (Yorùbá):`, `- Verified Answer (English):` lines
- MAFAND: `[Verified Translation (Yorùbá -> English)]`, followed by `- Yorùbá Sentence:` and `- English Sentence:` lines

### RAG pipeline (backend, `src/modules/rag/`)
- Search: Qdrant collection `hack4edu_collection` in hybrid mode. Dense vectors come from `bge-m3` through Ollama (1024 dimensions, cosine distance). Sparse vectors come from `Qdrant/bm25` through FastEmbed (IDF modifier). The two result lists are combined with Reciprocal Rank Fusion (RRF), and the top 3 documents are returned. `k=3` is the number of results, not an RRF parameter.
- Search matches `search_context`. Gemma reads `pedagogical_answer`.
- Generation: `gemma3:4b` through Ollama, with `temperature=0.1` and `num_ctx=8192`. The tutor prompt asks for the main explanation in Yorùbá, key terms and a summary in English, and step-by-step reasoning. When nothing relevant was retrieved, it asks Gemma to say that the topic is not in the database yet.
- In local mode, everything runs on one machine, and internet is needed only once, to download the Ollama models, the Qdrant Docker image, and the BM25 model. In the cloud setup, the same backend runs on RunPod.

### Backend API (FastAPI, `src/modules/app/`; base URL `http://localhost:8000` locally, the RunPod HTTPS URL in production)
| Method | Path | Request body | Response | Use |
|---|---|---|---|---|
| POST | `/ask/rag` | `{"question": string}` | `{"answer": string}` | Twins for Change: Gemma + RAG |
| POST | `/ask/plain` | `{"question": string}` | `{"answer": string}` | Plain Gemma with no context (A/B baseline) |
| GET | `/health/health` | none | `{"status": "healty"}` | The API process is up (spelling as the backend returns it) |

- `answer` is Markdown written by Gemma (headings, bold, lists, numbered steps). Render it as sanitized Markdown.
- The full answer arrives in one response; there is no streaming. An answer can take a few seconds on a GPU and much longer on a laptop CPU. Do not set a client timeout below 120 seconds.
- Each request is a single question. The backend keeps no conversation memory, so do not send chat history.
- Errors: 422 for an invalid body, 500 when Ollama or Qdrant is unavailable. Show a clear error message with a retry action.
- CORS allows every origin, including the Angular dev server on `localhost:4200`.

### Not supported by the backend yet
For each item below, build the UI with a typed mock, label mock content as "Demo data" in the UI, and list the item in `docs/build-summary.md` under `needs_review`. Frontend agents do not change the backend.
- Token streaming: reveal the received answer progressively on the client.
- Retrieved sources: `/ask/rag` returns only the answer, with no `source_dataset`, `search_context`, `pedagogical_answer`, or scores.
- Subject filter: search always covers all 15,791 rows. The UI has no subject filter (the author removed it); list it under `needs_review` as a possible future feature.
- File uploads: there is no upload endpoint, and user files are not indexed.
- Health of Ollama and Qdrant: `/health/health` only shows that the API process is running.

### Mock mode
- Two environment files in `site/src/environments/` define `apiBaseUrl` and `useMock`:
  - Development (`ng serve` and local testing): `apiBaseUrl` is `http://localhost:8000`.
  - Production (the Vercel build): `apiBaseUrl` is the RunPod URL, `https://<pod-id>-8000.proxy.runpod.net`. Until that URL exists, use a clearly marked placeholder.
  - `useMock` is `true` in both by default, because no backend runs on the development laptop. Switching to a real backend must only require changing these values.
- With `useMock` on, both endpoints return typed mock answers after a short delay, with mock sources copied from real corpus rows. Mock answers are labelled "Demo data".

## Stack
- Angular, latest stable version (Angular CLI 21 is installed), TypeScript in strict mode, standalone components, Signals for state, and plain CSS (custom properties, Grid, Flexbox).
- The project lives in `site/` and is created with the Angular CLI, with routing enabled. Prerender the static route (`/architecture`); the chat runs in the browser. If SSR or prerendering is enabled, access `localStorage` only in the browser (`isPlatformBrowser` or `afterNextRender`).
- Build with `ng build --configuration production`.
- The app must work with no internet: no CDNs, external fonts, analytics, or remote assets.
- No UI component libraries. A small Markdown renderer (such as `marked`) is allowed if it is listed and justified in `docs/build-summary.md`.
- Fonts: a system font stack that renders Yorùbá tone marks correctly (`ẹ́`, `ọ̀`, `ṣ`, `ń`). Never strip or change tone marks in text.
- Interface language: English UI with bilingual Yorùbá + English content. Set `lang="en"` on `<html>` and `lang="yo"` on elements whose text is Yorùbá.

## Features

### 1. Collapsible sidebar (`<aside>` with `<nav>`)
- **New chat** button, with the `Ctrl/Cmd + Shift + O` shortcut.
- **Chat history**: saved in `localStorage`, grouped by date, with rename and delete. History lives only in the UI; the backend never sees earlier messages.
- **System status** at the bottom:
  - `LLM: gemma3:4b (Ollama)`
  - `Search: Qdrant hybrid (bge-m3 + BM25, RRF)`
  - `API: online / offline`, from polling `GET /health/health` every 30 seconds. In mock mode, show "Demo mode".
  - `Backend: local, no internet needed after setup` when `apiBaseUrl` points to localhost, and `Backend: RunPod (cloud)` otherwise.

### 2. Main chat area (`<main>`)
- **Welcome screen** when the chat is empty: Twins for Change branding, the greeting "Báwo ni! How can we learn together today?", and 4 starter cards. Each card shows a Yorùbá question with its English translation underneath, and clicking it sends the Yorùbá question right away. These are real corpus questions. Use the verified answers only in mock data, not on the cards.
  1. Mathematics (AfriMGSM): "Roger ní bọ́ọ́lù aláfajọ̀ 5. Ó ra agolo bọ́ọ́lù aláfajọ̀gbá 2 kún-un. Agolo kọ̀ọ̀kan ní bọ́ọ́lù aláfajọ̀gbá 3. Bọ́ọ́lù aláfajọ̀gbá mélòó ni ó ní báyìí?" (Roger has 5 tennis balls. He buys 2 more cans of tennis balls. Each can has 3 tennis balls. How many tennis balls does he have now?) Verified answer: 11.
  2. Mathematics (AfriMMLU): "Kínni iyì p nínú 24 = 2p?" (What is the value of p in 24 = 2p?) Verified answer: C) p = 12.
  3. Microeconomics (AfriMMLU): "Àyípadà nínú èwo nínú àwọn wọ̀nyìí ni kò ní fa ìyípadà nínú ìbéèrè fún hámúbọgà?" (A change in which of the following will NOT cause a shift in the demand curve for hamburgers?) Verified answer: B) The price of hamburgers.
  4. Reading comprehension (Belebele): "Nibo ni awọn ọmọ ogun Ọgagun Stark wa?" (Where were Colonel Stark's troops situated?) Verified answer: On the north end, along the fence.
- **Messages**: separate user and assistant layouts with avatars, timestamps, and **Copy** and **Regenerate** buttons. Regenerate sends the same question again; with `temperature=0.1` the new answer is usually very similar.
- **Progressive display**: show the answer word by word with a blinking cursor. A **Stop generating** button cancels the request (`AbortController`) or stops the display. Gemma may keep generating on the server after a cancel. With `prefers-reduced-motion`, show the full answer at once.
- **Formatting**: Markdown, numbered math steps, code blocks, and the corpus labels listed above. Keep the Yorùbá and English parts visually distinct.
- **Compare mode**: a "Compare with plain Gemma" toggle. When it is on, each question goes to `/ask/rag` and `/ask/plain` at the same time. The two answers appear side by side as "Twins for Change (Gemma + RAG)" and "Plain Gemma (no RAG)", each with its own loading state. This is the main demo for the judges.
- **Verified sources drawer**: under every Twins for Change answer, an expandable "Verified sources (top 3)" section showing the `source_dataset` badge, the matched `search_context`, and the full `pedagogical_answer`. Until the backend returns sources, use mock sources labelled "Demo data". If scores are added later, show them as a rank, not a confidence percentage: RRF scores are not probabilities.

### 3. Message composer (bottom of the chat)
- **Text box** that grows up to 200px. `Enter` sends, and `Shift + Enter` adds a new line.
- **Yorùbá tone mark bar**: a strip that can be shown or hidden. It inserts characters at the cursor for students without a Yorùbá keyboard: `ẹ ẹ́ ẹ̀ ọ ọ́ ọ̀ ṣ ń ǹ` and the tone-marked vowels `á à é è í ì ó ò ú ù`. Some of these are a letter plus combining marks; insert the whole sequence and place the cursor after it.
- **Attachments**: a "+" button and drag-and-drop anywhere in the window, for `.pdf`, `.csv`, `.txt`, `.md`, `.png`, `.jpg`, and `.webp` files. Show removable preview chips (icon or thumbnail, file name, size). Announce validation messages (wrong type, file too large) through `aria-live`. The backend cannot receive files yet, so show that attachments are not sent, and list this under `needs_review`.
- **Send / Stop button**: disabled when the text box is empty, a send arrow when there is text, and a square Stop button while waiting for an answer.

### 4. Routes
- `/chat` (default): the chat workspace described above.
- `/architecture`: how Twins for Change works, as a diagram: question → hybrid search over the 15,791-row corpus (bge-m3 + BM25, RRF, top 3) → tutor prompt → gemma3:4b → bilingual answer. Also show the deployment: Vercel (Angular frontend) → RunPod (FastAPI, REST API, RAG logic) → Ollama (LLM inference) and Qdrant (vector database), and the local mode where all of it runs on one machine with no internet. Include the corpus table. This route is prerendered.
- The header or sidebar footer links to both routes and has a light/dark theme toggle.

### 5. Theme
- Light and dark themes. Follow `prefers-color-scheme` by default, with a manual toggle saved in `localStorage`.

## Technical requirements

### Semantic HTML
- Use `header`, `nav`, `aside`, `main`, `section`, and `footer`.
- Exactly one `h1` per route, with logical heading order below it.

### Responsive layout
- Works at 375px, 768px, and 1280px widths with no horizontal scrolling.
- Below 768px, the sidebar becomes a drawer.

### Accessibility (WCAG 2.1 AA)
- Text contrast of at least 4.5:1 in both themes.
- Visible focus states and full keyboard use: sidebar, starter cards, tone mark bar, composer, and sources drawers.
- Labels on all form fields and icon buttons.
- Announce a finished answer once through an `aria-live="polite"` region, not word by word.
- Respect `prefers-reduced-motion`.

### Performance
- Lighthouse score of 90 or higher for performance, accessibility, and best practices on the production build.

## Commands
- Backend, from the repository root, with Docker and Ollama running:
  - `docker run -d -p 6333:6333 -v qdrant_storage:/qdrant/storage qdrant/qdrant`
  - `ollama pull gemma3:4b` and `ollama pull bge-m3`
  - `uv sync`, then `uv run uvicorn src.modules.app.main:app --host 0.0.0.0 --port 8000`
  - The first start embeds all 15,791 rows before it accepts requests. Later starts only connect.
- Frontend: `cd site && ng serve` (http://localhost:4200). Production build: `ng build --configuration production`.

## Deployment (Vercel and RunPod)
- Stages:
  1. Now: the frontend only, in mock mode, on the development laptop.
  2. Next, done by the author on a work PC with an RTX 4090: everything local. The backend runs at `http://localhost:8000` with the commands above, and the frontend runs with `ng serve` and `useMock` set to `false`.
  3. Then: the backend (FastAPI + Ollama + Qdrant) runs on a RunPod GPU pod, with port 8000 exposed through RunPod's HTTPS proxy (`https://<pod-id>-8000.proxy.runpod.net`). The frontend runs on Vercel, with the production `apiBaseUrl` set to that URL.
- The author deploys. Agents never run the Vercel or RunPod CLIs, deploy, or change Vercel or RunPod settings. Packaging the backend for RunPod is backend work, outside the frontend agents' scope.
- Never point the Vercel build at an `http://` backend address: browsers block HTTPS pages from calling HTTP addresses (mixed content). The RunPod proxy URL is HTTPS, so it works.
- Until the RunPod URL exists, the production build uses mock mode, with every mock answer labelled "Demo data". List the missing RunPod URL under `needs_review`.
- The backend can be unreachable: the pod may be stopped, or it may still be loading the 15,791 documents after a start. Then show "API: offline" and a clear message instead of a broken chat. RunPod's HTTP proxy also closes requests that take longer than about 100 seconds, so show a clear timeout message if that happens.
- Vercel project settings: root directory `site/`, build command `ng build --configuration production`, output directory set to the browser folder defined in `angular.json` (for example `dist/site/browser`). Base href is `/`.
- Client-rendered routes such as `/chat` must load on a direct visit or reload, which needs a fallback to the app shell (`index.csr.html` in static output mode). Add `site/vercel.json` only if Vercel needs it for that, and justify it in `docs/build-summary.md`.

## Workflow rules
- Only the developer agent edits files in `site/`.
- Frontend agents do not edit the backend (`src/`, `notebooks/`, `dataset_rag.csv`). If the frontend needs a backend change, write it under `needs_review` in `docs/build-summary.md`.
- The reviewers (`qa-engineer` and `a11y-design-reviewer`) report findings. They do not edit site files.
- Do not run `git commit` or `git push`, or change repository settings. The author decides when to commit.
- Ask before deleting any file.

## Agent execution rules
- Order: `developer` builds, `qa-engineer` tests, `a11y-design-reviewer` reviews, then `developer` does one revision pass.
- The developer checks its own output against the requirements above before reporting completion.
- Each reviewer writes its findings to its own section of `docs/qa-report.md`, with a severity for each failure:
  - High: wrong facts, a broken core flow (asking a question, compare mode, starter cards), requests to the internet, a crash, or an accessibility failure that blocks use (for example, a question cannot be sent with the keyboard).
  - Medium: a feature from this file missing or only partly working, any other WCAG failure, or layout broken at one of the three widths.
  - Low: polish and design observations that break no rule.
- After both sections are in, the developer fixes all high and medium issues in one revision pass.
- Any remaining issues go into `docs/build-summary.md` for the author to decide. There are no further automatic revision cycles.

## Deliverables
- `site/`: the Angular project, buildable and runnable locally.
- `docs/build-summary.md`: at the top, every external package or asset with its justification. Then `needs_review` (backend gaps and open decisions). Then what was built, key decisions, how to run it, how to switch from mock mode to the real backend, and the Vercel settings and deploy steps.
- `docs/qa-report.md`: pass, fail, or skipped results for every check, with severity and location.

## Communication
- When finished, report what changed, which files were touched, which checks failed, and which decisions the author still needs to make.
- Keep the chat summary short. Put details in the files under `docs/`.

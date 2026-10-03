# Wytboard

A web app for practising product design whiteboard interviews. The user works on a
FigJam-style canvas while an AI interviewer, speaking aloud, gives the problem,
answers clarifying questions and probes their reasoning.

## Hard constraints

- **Zero running cost.** No paid services, no server, no database, no logins.
  The app is a static site.
- **Bring your own key.** Each user pastes their own LLM API key in Settings. Keys
  are stored only in that user's browser and are sent only to the provider they
  chose. Never commit a key, never log one, never add a shared or default key.
- **Open source.** The repo must run with `npm install` and `npm run dev` and
  nothing else. No step may need a paid account.
- **Laptop and tablet.** Every feature must work with mouse and keyboard and with
  touch and stylus. Test canvas and audio changes on iPad Safari as well as Chrome.

## Stack

- Vite + React + TypeScript, deployed as a static site (GitHub Pages or Cloudflare Pages)
- Tailwind CSS + HeroUI for all UI outside the canvas
- Excalidraw (`@excalidraw/excalidraw`) for the canvas, with a dot-grid background
- IndexedDB for the board library, transcripts and settings
- Browser Web Speech API for speech-to-text and text-to-speech in V1

## Structure

Keep these areas separate so each can be swapped without touching the others:

- `src/pages/`: `Home` (hero input plus board library), `BoardPage`, `SettingsPage`.
  Routing is hash-based (`react-router` `HashRouter`) so static hosts need no rewrites.
- `src/canvas/`: Excalidraw wrapper, autosave, thumbnails, dot grid. Later: board
  snapshot export and change detection for the interviewer.
- `src/llm/`: one OpenAI-compatible chat client plus provider presets (Gemini, Groq,
  OpenRouter, custom URL). No provider-specific code outside this folder.
- `src/interviewer/`: prompts, personalities, the chat panel. Later: session
  state, timer, hint budget.
- `src/library/`: boards, scenes and transcripts in IndexedDB (`idb-keyval`).
- `src/settings/`: provider, per-provider API keys and models, personality and
  mode, in `localStorage`.
- `voice/` (not built yet): a `SpeechInput` and a `SpeechOutput` interface, with the
  browser implementations behind them, so a better engine (e.g. Kokoro) can replace them.

## Layout decisions (made by the user)

- The app opens on the home screen, never straight on a canvas.
- On a board, the drawing toolbar is at the bottom-centre and the interviewer
  panel is at the top-right. Excalidraw has no option for a bottom toolbar, so
  `src/canvas/board.css` repositions it; re-check that file when upgrading Excalidraw.
- Excalidraw's own shape-library button is hidden to avoid confusion with the board library.

## Dependencies

`package.json` has `overrides` that pin patched versions of packages Excalidraw
depends on (nanoid, sass, lodash-es). Keep `npm audit` at zero; when upgrading
Excalidraw, check whether the overrides are still needed.

## Interviewer rules

Prompts live in `interviewer/prompts/`. The system prompt is built from a fixed
core plus swappable blocks: personality, mode (interview or practice), problem
statement and time remaining. Any prompt change must keep these behaviours:

- Replies are spoken: 1–3 short sentences, no lists or formatting, one question at a time.
- The interviewer never proposes solutions, features, user groups, frameworks or
  next steps, and never completes the candidate's work.
- No evaluation during the session. Feedback comes from a separate end-of-session
  prompt that scores the transcript and final board against the rubric.
- Clarifying questions get specific invented facts that stay consistent all session.
- When the candidate is stuck: smallest nudge first, as a question. Naming an area
  to think about is allowed in practice mode only.

The app enforces what the prompt cannot guarantee: a cap on reply length, a
one-line rule reminder sent with every turn, and a hint budget counted in code.

## Quota rules

Free LLM tiers are rate-limited, so every request must be justified:

- The LLM is called only when the user finishes a push-to-talk turn or presses
  "Review my board". Never on a timer, never on every canvas change.
- Attach a board snapshot only if the board changed since the last one sent.
- Downscale and compress the snapshot before sending.
- Keep only the latest snapshot in the conversation history; drop older images.
- Always send typed canvas text as plain text.
- Summarise early turns once the history grows long.
- If the chosen model cannot read images, send text only and tell the user.

## UI style

Soft and calm: generous corner radius, soft low-contrast shadows, a clean
sans-serif typeface, a cool colour palette (blues, teals, slate). Set these once as
theme tokens and use the tokens everywhere; do not hard-code colours, radii or
shadows in components. Support light and dark themes. The canvas is the page; the
rest of the UI floats over it and stays out of the way.

## Workflow

- One commit per build-order step, pushed to GitHub (`origin`, public repo
  `wytboard`) as soon as the step is verified. Do not leave work local only.
- Before committing: `npm run build` and `npm run lint` must pass, and the change
  must be checked in the browser.
- Theme tokens live in `src/theme.css`: teal accent, light by default with a dark toggle.

## Build order

1. Scaffold, theme tokens, app shell
2. Canvas with dot grid, pen, text, shapes
3. Settings: provider, key, model; LLM client; text-chat interviewer
4. Board snapshots following the quota rules
5. Problem statements: user's own, or generated by domain and company type
6. Voice: push-to-talk input, spoken replies, voice and personality choice
7. Library: save, reopen, export and import boards with transcripts
8. Timer, phases, end-of-session feedback scorecard
9. Tablet testing, onboarding for getting a free key, README, deploy

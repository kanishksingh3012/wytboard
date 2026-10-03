# Wytboard

Practise product design whiteboard interviews on a FigJam-style canvas with an AI
interviewer that reads your board and probes your reasoning.

Wytboard is free to run: it is a static web app with no server. Each user brings
their own LLM API key, which stays in their browser, and boards are saved in the
browser too.

**Try it:** https://kanishksingh3012.github.io/wytboard/

**Status:** early development.

- Working: home screen with session options, board library with autosave, canvas,
  settings, an interviewer that reads your board, speaks its replies and can be
  spoken to (in browsers with speech recognition), a session timer with suggested
  phases, practice-mode hints and an end-of-session feedback scorecard.
- Not built yet: tablet testing; export and import of boards.

## Run it locally

```bash
npm install
npm run dev
```

Then open Settings, choose a provider (Google Gemini, Groq, OpenRouter or any
OpenAI-compatible URL), paste your API key and pick a model.

## Add your own challenges

"Suggest a challenge" on the home screen builds problem statements from
[`src/challenges/challenges.json`](src/challenges/challenges.json). Each interview
type has a sentence `template` with `{slot}` placeholders and a list of options for
every slot. To contribute, add options to a list (or a new slot to a template) and
open a pull request. Please write your own wording rather than copying prompts from
books, courses or other sites.

## Licence

MIT

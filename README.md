# Wytboard

Practise product design whiteboard interviews on a FigJam-style canvas with an AI
interviewer that reads your board and probes your reasoning.

Wytboard is free to run: it is a static web app with no server. Each user brings
their own LLM API key, which stays in their browser, and boards are saved in the
browser too.

**Status:** early development.

- Working: home screen with session options, board library with autosave, canvas,
  settings, an interviewer that reads your board, speaks its replies and can be
  spoken to (in browsers with speech recognition).
- Not built yet: timer and phases, end-of-session feedback, hint budget.

## Run it locally

```bash
npm install
npm run dev
```

Then open Settings, choose a provider (Google Gemini, Groq, OpenRouter or any
OpenAI-compatible URL), paste your API key and pick a model.

## Licence

MIT

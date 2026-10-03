# Wytboard

Practise product design whiteboard interviews on a FigJam-style canvas with an AI
interviewer that reads your board and probes your reasoning.

Wytboard is free to run: it is a static web app with no server. Each user brings
their own LLM API key, which stays in their browser, and boards are saved in the
browser too.

**Status:** early development.

- Working: home screen, board library with autosave, canvas, settings, text chat
  with the interviewer.
- Not built yet: the interviewer reading the board, AI-generated problem
  statements, voice, timer and end-of-session feedback.

## Run it locally

```bash
npm install
npm run dev
```

Then open Settings, choose a provider (Google Gemini, Groq, OpenRouter or any
OpenAI-compatible URL), paste your API key and pick a model.

## Licence

MIT

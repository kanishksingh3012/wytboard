# Contributing to Wytboard

Thanks for helping. Wytboard must stay free to run: no server, no accounts, no
paid services, and every user brings their own API key.

## Run it

```bash
npm install
npm run dev
```

Before opening a pull request, make sure these pass:

```bash
npm run lint
npm run build
npm audit
```

## Where things are

`CLAUDE.md` describes the structure, the interviewer's rules and the rules that
keep requests inside free AI limits. Please read it before changing the
interviewer or the request logic.

## Adding challenges

The easiest contribution is a new challenge. Add options to the lists in
`src/challenges/challenges.json`. Write your own wording; do not copy prompts
from books, courses or other sites.

## Ground rules

- Never commit an API key, and never add a shared or default key.
- Keep provider-specific code inside `src/llm/`.
- Use the theme tokens in `src/theme.css`; do not hard-code colours, radii or shadows.
- Check changes on both a laptop and a tablet where you can.

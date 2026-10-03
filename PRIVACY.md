# Privacy

Wytboard is a static web app with no server, no accounts and no analytics.

## Stored only in your browser

- Boards, drawings, interview transcripts and feedback (IndexedDB)
- Settings and your API key (localStorage)

Clearing the site's data in your browser removes all of it. Exported board files
contain the drawing, transcript and feedback, but never your API key.

## Sent to other services

- **Your AI provider.** When you talk to the interviewer or end a session, your
  messages, the text on your board and a compressed image of the board are sent
  to the provider you chose in Settings, using your own key. That provider's
  terms apply. Some free tiers, including Google's, may use your data to improve
  their models.
- **Speech recognition.** The microphone uses your browser's built-in speech
  recognition. Some browsers, including Chrome, send the audio to their own
  servers to transcribe it.
- **Hugging Face.** If you turn on the natural voice, the voice model is
  downloaded from Hugging Face once. Speech is then generated on your device.
- **Font CDN.** The canvas loads its fonts from a public CDN.
- **GitHub Pages.** The hosted version is served by GitHub, which sees ordinary
  web requests such as your IP address.

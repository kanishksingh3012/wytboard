/**
 * Turns the user's speech into text. Kept behind an interface so the browser
 * engine can be replaced (e.g. by Whisper running locally) without touching callers.
 */
export interface SpeechInput {
  readonly supported: boolean
  start(handlers: SpeechInputHandlers): void
  /** Stops listening; `onEnd` then fires with nothing more to add. */
  stop(): void
}

export interface SpeechInputHandlers {
  /** Called with everything heard so far, including words still being recognised. */
  onText: (text: string) => void
  onEnd: () => void
  onError: (message: string) => void
}

// The Web Speech API is not in TypeScript's DOM types.
interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}
interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: RecognitionResultEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
  start(): void
  stop(): void
}
type RecognitionConstructor = new () => Recognition

const Constructor: RecognitionConstructor | undefined =
  typeof window === 'undefined'
    ? undefined
    : ((window as unknown as Record<string, RecognitionConstructor | undefined>).SpeechRecognition ??
      (window as unknown as Record<string, RecognitionConstructor | undefined>).webkitSpeechRecognition)

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone access was blocked. Allow it in the browser to talk.',
  'service-not-allowed': 'Speech recognition is not available in this browser.',
  network: 'Speech recognition needs an internet connection in this browser.',
  'audio-capture': 'No microphone was found.',
}

let active: Recognition | null = null

export const browserRecognition: SpeechInput = {
  supported: Constructor !== undefined,

  start(handlers) {
    if (!Constructor) return
    active?.stop()

    const recognition = new Constructor()
    recognition.lang = navigator.language || 'en-US'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event) => {
      const text = Array.from(event.results, (result) => result[0].transcript).join('')
      handlers.onText(text.trim())
    }
    recognition.onerror = (event) => {
      // Silence and a deliberate stop are not errors worth showing.
      if (event.error === 'no-speech' || event.error === 'aborted') return
      handlers.onError(ERRORS[event.error] ?? `Speech recognition failed (${event.error}).`)
    }
    recognition.onend = () => {
      if (active === recognition) active = null
      handlers.onEnd()
    }
    active = recognition
    recognition.start()
  },

  stop() {
    active?.stop()
  },
}

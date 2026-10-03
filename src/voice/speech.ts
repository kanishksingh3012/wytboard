/**
 * Speaks interviewer replies. Kept behind an interface so engines can be
 * swapped (browser voice, Kokoro) without touching callers.
 */
export interface SpeechOutput {
  readonly supported: boolean
  speak(text: string, options: SpeakOptions): void
  stop(): void
}

export interface SpeakOptions {
  /** Kokoro voice id; ignored by the browser engine. */
  voice: string
  /** Used by the browser engine to choose a matching system voice. */
  gender: 'female' | 'male'
  rate: number
  pitch: number
  onStart: () => void
  onEnd: () => void
}

// Browsers do not say whether a voice is male or female, so this goes by the
// names common systems use. Female is tested first because "female" contains "male".
const FEMALE = /female|samantha|karen|victoria|zira|susan|moira|tessa|fiona|allison|ava|serena|kate|hazel|aria|jenny|woman/i
const MALE = /male|daniel|alex|fred|david|mark|george|james|aaron|arthur|rishi|tom|guy|ryan|man\b/i

function pickVoice(gender: SpeakOptions['gender']): SpeechSynthesisVoice | undefined {
  const english = speechSynthesis.getVoices().filter((voice) => voice.lang.startsWith('en'))
  const isFemale = (voice: SpeechSynthesisVoice) => FEMALE.test(voice.name)
  const matching = english.filter((voice) =>
    gender === 'female' ? isFemale(voice) : !isFemale(voice) && MALE.test(voice.name),
  )
  return matching[0] ?? english.find((voice) => voice.default) ?? english[0]
}

export const browserSpeech: SpeechOutput = {
  supported: typeof window !== 'undefined' && 'speechSynthesis' in window,

  speak(text, options) {
    if (!this.supported) return
    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    const voice = pickVoice(options.gender)
    if (voice) utterance.voice = voice
    utterance.rate = options.rate
    utterance.pitch = options.pitch
    utterance.onstart = options.onStart
    utterance.onend = options.onEnd
    utterance.onerror = options.onEnd
    speechSynthesis.speak(utterance)
  },

  stop() {
    if (this.supported) speechSynthesis.cancel()
  },
}

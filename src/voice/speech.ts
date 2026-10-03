/**
 * Speaks interviewer replies. Kept behind an interface so the browser engine
 * can be replaced by a better one (e.g. Kokoro) without touching callers.
 */
export interface SpeechOutput {
  readonly supported: boolean
  speak(text: string, options: SpeakOptions): void
  stop(): void
}

export interface SpeakOptions {
  rate: number
  pitch: number
  onStart: () => void
  onEnd: () => void
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const english = speechSynthesis.getVoices().filter((voice) => voice.lang.startsWith('en'))
  return english.find((voice) => voice.default) ?? english[0]
}

export const browserSpeech: SpeechOutput = {
  supported: typeof window !== 'undefined' && 'speechSynthesis' in window,

  speak(text, options) {
    if (!this.supported) return
    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    const voice = pickVoice()
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

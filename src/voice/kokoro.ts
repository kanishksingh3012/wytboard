import type { WorkerRequest, WorkerResponse } from './kokoro.worker'
import { browserSpeech, type SpeakOptions, type SpeechOutput } from './speech'

/**
 * Natural-sounding speech from the open-source Kokoro model, running in the
 * browser. The model (about 90 MB) is downloaded once and cached by the browser.
 */
let worker: Worker | null = null
let nextId = 1
let context: AudioContext | null = null
let source: AudioBufferSourceNode | null = null
/** The request whose audio may play; anything older has been superseded or stopped. */
let currentId = 0
const waiting = new Map<number, (response: WorkerResponse) => void>()
let onProgress: ((percent: number) => void) | null = null

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./kokoro.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data
      if (response.type === 'progress') {
        onProgress?.(response.percent)
        return
      }
      waiting.get(response.id)?.(response)
      waiting.delete(response.id)
    }
  }
  return worker
}

function ask(request: WorkerRequest): Promise<WorkerResponse> {
  return new Promise((resolve) => {
    waiting.set(request.id, resolve)
    getWorker().postMessage(request)
  })
}

/** Downloads and loads the model. Rejects with a readable message on failure. */
export async function preloadKokoro(progress: (percent: number) => void): Promise<void> {
  onProgress = progress
  const response = await ask({ id: nextId++, preload: true })
  onProgress = null
  if (response.type === 'error') throw new Error(response.message)
}

function stopPlayback() {
  if (source) {
    source.onended = null
    source.stop()
    source = null
  }
}

export const kokoroSpeech: SpeechOutput = {
  supported: typeof Worker !== 'undefined' && typeof AudioContext !== 'undefined',

  speak(text, options: SpeakOptions) {
    stopPlayback()
    const id = nextId++
    currentId = id
    // Created during the user's click or key press, so the browser allows audio.
    context ??= new AudioContext()
    void context.resume()

    void ask({ id, text, voice: options.voice, speed: options.rate }).then((response) => {
      if (currentId !== id) return
      if (response.type !== 'audio' || !context) {
        // Never leave the interviewer silent: fall back to the browser's voice.
        browserSpeech.speak(text, options)
        return
      }
      const buffer = context.createBuffer(1, response.samples.length, response.sampleRate)
      buffer.copyToChannel(response.samples as Float32Array<ArrayBuffer>, 0)
      source = context.createBufferSource()
      source.buffer = buffer
      source.connect(context.destination)
      source.onended = () => {
        source = null
        options.onEnd()
      }
      options.onStart()
      source.start()
    })
  },

  stop() {
    currentId = 0
    stopPlayback()
    browserSpeech.stop()
  },
}

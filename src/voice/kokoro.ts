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

let analyser: AnalyserNode | null = null
let levels: Uint8Array<ArrayBuffer> | null = null

/** Loudness of the speech playing right now, 0 to 1; null when nothing is playing. */
export function getSpeechLevel(): number | null {
  if (!source || !analyser || !levels) return null
  analyser.getByteTimeDomainData(levels)
  let sum = 0
  for (const sample of levels) sum += ((sample - 128) / 128) ** 2
  return Math.min(1, Math.sqrt(sum / levels.length) * 4)
}

function stopPlayback() {
  if (source) {
    source.onended = null
    source.stop()
    source = null
  }
}

function playSamples(samples: Float32Array, sampleRate: number): Promise<void> {
  return new Promise((resolve) => {
    if (!context) return resolve()
    if (!analyser) {
      analyser = context.createAnalyser()
      analyser.fftSize = 256
      levels = new Uint8Array(analyser.fftSize)
      analyser.connect(context.destination)
    }
    const buffer = context.createBuffer(1, samples.length, sampleRate)
    buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0)
    source = context.createBufferSource()
    source.buffer = buffer
    source.connect(analyser)
    source.onended = () => {
      source = null
      resolve()
    }
    source.start()
  })
}

export const kokoroSpeech: SpeechOutput = {
  supported: typeof Worker !== 'undefined' && typeof AudioContext !== 'undefined',

  speak(text, options: SpeakOptions) {
    stopPlayback()
    const run = nextId++
    currentId = run
    // Created during the user's click or key press, so the browser allows audio.
    context ??= new AudioContext()
    void context.resume()

    // Sentences are generated one by one, so speech starts after the first
    // sentence is ready instead of after the whole reply.
    const sentences = text.match(/[^.!?]+[.!?]*\s*/g)?.map((part) => part.trim()).filter(Boolean) ?? [text]
    const pending = sentences.map((sentence) =>
      ask({ id: nextId++, text: sentence, voice: options.voice, speed: options.rate }),
    )

    void (async () => {
      let started = false
      for (const [index, request] of pending.entries()) {
        const response = await request
        if (currentId !== run) return
        if (response.type !== 'audio') {
          // Never leave the interviewer silent: the browser voice says the rest.
          browserSpeech.speak(sentences.slice(index).join(' '), options)
          return
        }
        if (!started) {
          started = true
          options.onStart()
        }
        await playSamples(response.samples, response.sampleRate)
        if (currentId !== run) return
      }
      options.onEnd()
    })()
  },

  stop() {
    currentId = 0
    stopPlayback()
    browserSpeech.stop()
  },
}

/// <reference lib="webworker" />
import { KokoroTTS } from 'kokoro-js'

// Speech is generated off the main thread so drawing stays smooth.
const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX'

export type WorkerRequest = { id: number; text: string; voice: string; speed: number } | { id: number; preload: true }

export type WorkerResponse =
  | { type: 'progress'; percent: number }
  | { type: 'ready'; id: number }
  | { type: 'audio'; id: number; samples: Float32Array; sampleRate: number }
  | { type: 'error'; id: number; message: string }

const post = (message: WorkerResponse, transfer: Transferable[] = []) =>
  (self as DedicatedWorkerGlobalScope).postMessage(message, transfer)

let model: Promise<KokoroTTS> | null = null

function loadModel(): Promise<KokoroTTS> {
  model ??= KokoroTTS.from_pretrained(MODEL_ID, {
    dtype: 'q8',
    device: 'wasm',
    progress_callback: (info: { status: string; file?: string; progress?: number }) => {
      // The model weights are the only large file; report their progress.
      if (info.status === 'progress' && info.file?.endsWith('.onnx')) {
        post({ type: 'progress', percent: Math.round(info.progress ?? 0) })
      }
    },
  })
  return model
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data
  try {
    const tts = await loadModel()
    if ('preload' in request) {
      post({ type: 'ready', id: request.id })
      return
    }
    const audio = await tts.generate(request.text, {
      voice: request.voice as NonNullable<Parameters<KokoroTTS['generate']>[1]>['voice'],
      speed: request.speed,
    })
    const samples = audio.audio as Float32Array
    post({ type: 'audio', id: request.id, samples, sampleRate: audio.sampling_rate }, [samples.buffer])
  } catch (cause) {
    model = null
    post({
      type: 'error',
      id: request.id,
      message: cause instanceof Error ? cause.message : 'The voice model failed.',
    })
  }
}

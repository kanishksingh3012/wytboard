/** Everything needed to reach one OpenAI-compatible chat endpoint. */
export interface LlmConfig {
  baseUrl: string
  apiKey: string
  model: string
  /** Tried in order when `model` is overloaded. */
  fallbackModels?: string[]
  /** Provider-specific request fields, merged into the chat request body. */
  extraBody?: Record<string, unknown>
}

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ContentPart[]
}

export class LlmError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'LlmError'
    this.status = status
  }
}

function endpoint(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${path}`
}

function headers(apiKey: string): HeadersInit {
  // Local servers such as Ollama take no key.
  return {
    'Content-Type': 'application/json',
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  }
}

/** The provider is up but has no capacity; a retry or another model often works. */
function isOverloaded(status: number | undefined): boolean {
  return status === 503 || status === 529
}

async function readError(response: Response): Promise<LlmError> {
  let detail = ''
  try {
    const body = await response.json()
    const error = Array.isArray(body) ? body[0]?.error : body?.error
    detail = typeof error === 'string' ? error : (error?.message ?? '')
  } catch {
    // Not JSON; fall back to the status alone.
  }

  const prefix =
    response.status === 401 || response.status === 403
      ? 'The provider rejected the API key.'
      : response.status === 429
        ? 'Rate limit reached. Wait a moment and try again.'
        : isOverloaded(response.status)
          ? 'The AI model is busy right now. Try again in a moment.'
        : `The provider returned an error (${response.status}).`

  return new LlmError(detail ? `${prefix} ${detail}` : prefix, response.status)
}

async function request(url: string, init: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new LlmError('Could not reach the provider. Check the URL and your connection.')
  }
  if (!response.ok) throw await readError(response)
  return response
}

/** Waits before the second try on an overloaded model. */
const RETRY_DELAY_MS = 1500

export async function chat(
  config: LlmConfig,
  messages: ChatMessage[],
  options: { maxTokens?: number; signal?: AbortSignal } = {},
): Promise<string> {
  // An overloaded model gets one retry; after that the backup models are tried.
  const attempts = [config.model, config.model, ...(config.fallbackModels ?? [])]
  let lastError: unknown

  for (const [index, model] of attempts.entries()) {
    if (index === 1) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
    try {
      return await chatOnce({ ...config, model }, messages, options)
    } catch (cause) {
      lastError = cause
      if (!(cause instanceof LlmError && isOverloaded(cause.status))) throw cause
    }
  }
  throw lastError
}

async function chatOnce(
  config: LlmConfig,
  messages: ChatMessage[],
  options: { maxTokens?: number; signal?: AbortSignal },
): Promise<string> {
  const response = await request(endpoint(config.baseUrl, '/chat/completions'), {
    method: 'POST',
    headers: headers(config.apiKey),
    signal: options.signal,
    body: JSON.stringify({
      model: config.model,
      messages,
      ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
      ...config.extraBody,
    }),
  })

  const body = await response.json()
  const content = body?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new LlmError('The model returned an empty reply.')
  }
  const reply = content.trim()
  // A reply that hit the token cap ends mid-sentence; keep only the complete sentences.
  if (body.choices[0].finish_reason === 'length') {
    const complete = reply.match(/^[\s\S]*[.?!]/)?.[0]
    if (complete) return complete
  }
  return reply
}

export async function listModels(config: Omit<LlmConfig, 'model'>): Promise<string[]> {
  const response = await request(endpoint(config.baseUrl, '/models'), {
    headers: headers(config.apiKey),
  })
  const body = await response.json()
  const models: unknown[] = Array.isArray(body?.data) ? body.data : []
  return models
    .map((m) => (m as { id?: unknown }).id)
    .filter((id): id is string => typeof id === 'string')
    .sort()
}

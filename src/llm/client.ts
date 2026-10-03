/** Everything needed to reach one OpenAI-compatible chat endpoint. */
export interface LlmConfig {
  baseUrl: string
  apiKey: string
  model: string
  /** Provider-specific request fields, merged into the chat request body. */
  extraBody?: Record<string, unknown>
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
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

export async function chat(
  config: LlmConfig,
  messages: ChatMessage[],
  options: { maxTokens?: number; signal?: AbortSignal } = {},
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

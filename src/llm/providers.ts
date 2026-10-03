export type ProviderId = 'gemini' | 'groq' | 'openrouter' | 'custom'

export interface Provider {
  id: ProviderId
  label: string
  /** OpenAI-compatible base URL; empty for custom, where the user supplies it. */
  baseUrl: string
  /** Page where the user can create an API key. */
  keyUrl?: string
}

export const PROVIDERS: Provider[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    keyUrl: 'https://aistudio.google.com/apikey',
  },
  {
    id: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    keyUrl: 'https://console.groq.com/keys',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyUrl: 'https://openrouter.ai/keys',
  },
  { id: 'custom', label: 'Custom (OpenAI-compatible URL)', baseUrl: '' },
]

export function getProvider(id: ProviderId): Provider {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0]
}

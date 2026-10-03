import { useSyncExternalStore } from 'react'
import type { PersonalityId } from '../interviewer/personalities'
import type { InterviewTypeId, SessionMode, SessionOptions } from '../interviewer/session'
import type { LlmConfig } from '../llm/client'
import { getProvider, type ProviderId } from '../llm/providers'

export interface Settings {
  provider: ProviderId
  /** Kept per provider so one provider's key is never sent to another. */
  apiKeys: Partial<Record<ProviderId, string>>
  models: Partial<Record<ProviderId, string>>
  customBaseUrl: string
  /** Defaults for the options on the home screen; each board keeps its own. */
  personality: PersonalityId
  mode: SessionMode
  interviewType: InterviewTypeId
  durationMin: number
  /** Whether the interviewer speaks its replies aloud. */
  voiceEnabled: boolean
  /** 'kokoro' is the natural voice model; it needs a one-time download. */
  voiceEngine: 'browser' | 'kokoro'
}

const STORAGE_KEY = 'wytboard-settings'

const DEFAULTS: Settings = {
  provider: 'gemini',
  apiKeys: {},
  models: {},
  customBaseUrl: '',
  personality: 'friendly',
  mode: 'interview',
  interviewType: 'new-product',
  durationMin: 45,
  voiceEnabled: true,
  voiceEngine: 'browser',
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

let current = load()
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Storage can be blocked (private mode); settings then last for this visit only.
  }
  listeners.forEach((listener) => listener())
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, () => current)
}

export function baseUrlFor(settings: Settings): string {
  return settings.provider === 'custom'
    ? settings.customBaseUrl.trim()
    : getProvider(settings.provider).baseUrl
}

/** The LLM connection to use, or null when it is not fully configured yet. */
export function llmConfigFrom(settings: Settings): LlmConfig | null {
  const baseUrl = baseUrlFor(settings)
  const apiKey = settings.apiKeys[settings.provider]?.trim() ?? ''
  const model = settings.models[settings.provider]?.trim() ?? ''
  // A custom URL may be a local server that takes no key.
  const keyOk = settings.provider === 'custom' || apiKey !== ''
  const { extraBody } = getProvider(settings.provider)
  return baseUrl && model && keyOk ? { baseUrl, apiKey, model, extraBody } : null
}

export function sessionDefaultsFrom(settings: Settings): SessionOptions {
  const { interviewType, personality, mode, durationMin } = settings
  return { interviewType, personality, mode, durationMin }
}

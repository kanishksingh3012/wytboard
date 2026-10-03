import { createAvatar } from '@dicebear/core'
import * as lorelei from '@dicebear/lorelei'

export type PersonalityId = 'friendly' | 'sceptical' | 'quiet'

export interface Personality {
  id: PersonalityId
  /** The interviewer's name, also the seed for their illustrated avatar. */
  name: string
  label: string
  description: string
  /** Inserted into the system prompt. */
  prompt: string
  /** Speech tuning so each interviewer sounds a little different. */
  voice: { rate: number; pitch: number }
  /** Fixed avatar features, so the picture matches the character. */
  avatar: { hair: string; beard: boolean }
}

export const PERSONALITIES: Personality[] = [
  {
    id: 'friendly',
    name: 'Maya',
    label: 'Friendly',
    description: 'Warm and encouraging in tone, still neutral about your ideas.',
    prompt:
      'Personality: warm and relaxed. Put the candidate at ease with your tone, ' +
      'but stay neutral about the quality of their ideas.',
    voice: { rate: 1, pitch: 1.1 },
    avatar: { hair: 'variant35', beard: false },
  },
  {
    id: 'sceptical',
    name: 'Arjun',
    label: 'Sceptical',
    description: 'Pushes back on assumptions and asks for evidence.',
    prompt:
      'Personality: sceptical and direct. Question assumptions, ask for evidence ' +
      'and for the trade-offs behind each decision. Never be rude.',
    voice: { rate: 1.05, pitch: 0.9 },
    avatar: { hair: 'variant08', beard: true },
  },
  {
    id: 'quiet',
    name: 'Lena',
    label: 'Quiet',
    description: 'Says very little and leaves long silences for you to fill.',
    prompt:
      'Personality: quiet. Use the fewest words possible, often a single short ' +
      'sentence, and ask follow-up questions only when something important is unclear.',
    voice: { rate: 0.92, pitch: 1 },
    avatar: { hair: 'variant15', beard: false },
  },
]

export function getPersonality(id: PersonalityId): Personality {
  return PERSONALITIES.find((p) => p.id === id) ?? PERSONALITIES[0]
}

const avatarCache = new Map<PersonalityId, string>()

/** Illustrated avatar as a data URI, generated locally from the interviewer's name. */
export function avatarFor(id: PersonalityId): string {
  let uri = avatarCache.get(id)
  if (!uri) {
    const { name, avatar } = getPersonality(id)
    uri = createAvatar(lorelei, {
      seed: name,
      hair: [avatar.hair as NonNullable<lorelei.Options['hair']>[number]],
      beardProbability: avatar.beard ? 100 : 0,
    }).toDataUri()
    avatarCache.set(id, uri)
  }
  return uri
}

export type PersonalityId = 'friendly' | 'sceptical' | 'quiet'

export interface Personality {
  id: PersonalityId
  label: string
  description: string
  /** Inserted into the system prompt. */
  prompt: string
}

export const PERSONALITIES: Personality[] = [
  {
    id: 'friendly',
    label: 'Friendly',
    description: 'Warm and encouraging in tone, still neutral about your ideas.',
    prompt:
      'Personality: warm and relaxed. Put the candidate at ease with your tone, ' +
      'but stay neutral about the quality of their ideas.',
  },
  {
    id: 'sceptical',
    label: 'Sceptical',
    description: 'Pushes back on assumptions and asks for evidence.',
    prompt:
      'Personality: sceptical and direct. Question assumptions, ask for evidence ' +
      'and for the trade-offs behind each decision. Never be rude.',
  },
  {
    id: 'quiet',
    label: 'Quiet',
    description: 'Says very little and leaves long silences for you to fill.',
    prompt:
      'Personality: quiet. Use the fewest words possible, often a single short ' +
      'sentence, and ask follow-up questions only when something important is unclear.',
  },
]

export function getPersonality(id: PersonalityId): Personality {
  return PERSONALITIES.find((p) => p.id === id) ?? PERSONALITIES[0]
}

import type { InterviewTypeId } from '../interviewer/session'
import data from './challenges.json'

/** A sentence template with `{slot}` placeholders, plus the options for each slot. */
type ChallengeSet = { template: string } & Record<string, string | string[]>

const SETS: Record<InterviewTypeId, ChallengeSet> = data

function pick(options: string[]): string {
  return options[Math.floor(Math.random() * options.length)]
}

/** Builds a random problem statement of the given type. Uses no AI quota. */
export function suggestChallenge(type: InterviewTypeId): string {
  const set = SETS[type]
  return set.template.replace(/\{(\w+)\}/g, (placeholder, slot: string) => {
    const options = set[slot]
    return Array.isArray(options) && options.length > 0 ? pick(options) : placeholder
  })
}

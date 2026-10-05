export interface Phase {
  label: string
  /** Fraction of the session this phase should take. */
  share: number
}

/** Suggested pacing, matching the five steps taught in the Learn section. A rough guide only. */
export const PHASES: Phase[] = [
  { label: 'Understand', share: 0.18 },
  { label: 'Scope', share: 0.1 },
  { label: 'Explore', share: 0.27 },
  { label: 'Solve', share: 0.35 },
  { label: 'Validate', share: 0.1 },
]

/** Hints the candidate may ask for in one practice-mode session. */
export const HINT_BUDGET = 5

/** Index of the phase the candidate should be in; the last one once time is up. */
export function phaseIndexAt(elapsedMs: number, durationMin: number): number {
  const progress = elapsedMs / (durationMin * 60_000)
  let end = 0
  for (let index = 0; index < PHASES.length; index++) {
    end += PHASES[index].share
    if (progress < end) return index
  }
  return PHASES.length - 1
}

/** One line for the system prompt, so the interviewer can nudge on pacing. */
export function timeContext(startedAt: number, durationMin: number): string {
  const elapsedMs = Date.now() - startedAt
  const elapsedMin = Math.floor(elapsedMs / 60_000)
  const index = phaseIndexAt(elapsedMs, durationMin)
  const phase = PHASES[index].label
  const over = elapsedMin >= durationMin
  const closing = index === PHASES.length - 1

  return (
    `TIME\n${elapsedMin} of ${durationMin} minutes have passed` +
    (over ? ' and the session is over time. Ask the candidate to wrap up.' : '.') +
    ` By now they should be in the "${phase}" phase (order: ${PHASES.map((p) => p.label).join(', ')}).` +
    ` If their work is clearly behind that, mention the time in one short sentence; otherwise do not bring it up.` +
    (closing
      ? ` The session is closing: if you have not already, ask them to summarise their solution, then ask` +
        ` what they would do next with more time. One question per turn.`
      : '')
  )
}

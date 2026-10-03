import { CRITERIA } from '../interviewer/feedback'
import type { BoardMeta } from '../library/boards'

/** How many recent sessions the trend shows. */
const TREND_LENGTH = 12

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/** Scores across all finished sessions, shown on the home screen once one exists. */
export function ProgressSummary({ boards }: { boards: BoardMeta[] }) {
  const scored = boards
    .filter((board) => board.feedback && board.feedback.scores.length > 0)
    .sort((a, b) => (a.endedAt ?? a.updatedAt) - (b.endedAt ?? b.updatedAt))
  if (scored.length === 0) return null

  const sessions = scored.map((board) => ({
    id: board.id,
    title: board.title,
    score: average(board.feedback!.scores.map((entry) => entry.score)),
  }))
  const byCriterion = CRITERIA.map((criterion) => {
    const scores = scored.flatMap((board) =>
      board.feedback!.scores.filter((entry) => entry.criterion === criterion).map((entry) => entry.score),
    )
    return { criterion, score: scores.length > 0 ? average(scores) : null }
  })
  const recent = sessions.slice(-TREND_LENGTH)

  return (
    <section aria-labelledby="progress-heading" className="bg-surface shadow-float mb-10 rounded-3xl p-6">
      <div className="flex items-baseline justify-between">
        <h2 id="progress-heading" className="text-lg font-semibold tracking-tight">
          Your progress
        </h2>
        <span className="text-muted text-sm">
          {scored.length} scored {scored.length === 1 ? 'session' : 'sessions'} · average{' '}
          {average(sessions.map((session) => session.score)).toFixed(1)} / 5
        </span>
      </div>

      <div className="mt-5 grid gap-8 sm:grid-cols-2">
        <div>
          <h3 className="text-muted text-xs font-medium">Average by skill</h3>
          <ul className="mt-3 flex flex-col gap-2.5">
            {byCriterion.map(({ criterion, score }) => (
              <li key={criterion}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{criterion}</span>
                  <span className="font-medium tabular-nums">
                    {score === null ? '–' : score.toFixed(1)}
                  </span>
                </div>
                <div className="bg-default mt-1 h-1.5 overflow-hidden rounded-full">
                  <div
                    className="bg-accent h-full rounded-full"
                    style={{ width: `${((score ?? 0) / 5) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-muted text-xs font-medium">
            Overall score by session, oldest to newest
          </h3>
          <ol className="mt-3 flex h-28 items-end gap-1.5" aria-label="Overall score per session">
            {recent.map((session) => (
              <li
                key={session.id}
                title={`${session.title}: ${session.score.toFixed(1)} / 5`}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
              >
                <span className="text-muted text-xs tabular-nums">{session.score.toFixed(1)}</span>
                <span
                  className="bg-accent w-full max-w-10 rounded-t-md"
                  style={{ height: `${(session.score / 5) * 75}%` }}
                />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

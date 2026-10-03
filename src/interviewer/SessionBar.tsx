import { Button } from '@heroui/react'
import { useEffect, useState } from 'react'
import { PHASES, phaseIndexAt } from './phases'

interface SessionBarProps {
  startedAt: number
  endedAt?: number
  durationMin: number
  hasFeedback: boolean
  ending: boolean
  onEnd: () => void
  onShowFeedback: () => void
}

function clock(ms: number): string {
  const total = Math.floor(Math.abs(ms) / 1000)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Countdown, suggested phases and the end-session control, at the top of the board. */
export function SessionBar(props: SessionBarProps) {
  const [now, setNow] = useState(Date.now)
  const running = props.endedAt === undefined

  useEffect(() => {
    if (!running) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [running])

  const elapsed = (props.endedAt ?? now) - props.startedAt
  const remaining = props.durationMin * 60_000 - elapsed
  const overtime = remaining < 0
  const current = phaseIndexAt(elapsed, props.durationMin)

  return (
    <div className="bg-surface shadow-float absolute top-16 left-4 z-10 flex h-11 items-center gap-3 rounded-xl pr-1.5 pl-3 lg:top-4 lg:left-1/2 lg:-translate-x-1/2">
      <span
        role="timer"
        aria-label={overtime ? 'Time over by' : 'Time remaining'}
        className={`text-sm font-semibold tabular-nums ${overtime ? 'text-danger' : ''}`}
      >
        {overtime ? '+' : ''}
        {clock(remaining)}
      </span>

      {running ? (
        <>
          <div className="flex flex-col gap-1">
            <span className="text-muted text-xs leading-none">
              {overtime ? 'Over time' : PHASES[current].label}
            </span>
            <div className="flex gap-0.5" aria-hidden="true">
              {PHASES.map((phase, index) => (
                <span
                  key={phase.label}
                  title={phase.label}
                  style={{ width: `${phase.share * 6}rem` }}
                  className={`h-1 rounded-full ${index < current ? 'bg-accent/40' : index === current ? 'bg-accent' : 'bg-default'}`}
                />
              ))}
            </div>
          </div>
          <Button size="sm" variant="tertiary" isPending={props.ending} onPress={props.onEnd}>
            {props.ending ? 'Scoring…' : 'End session'}
          </Button>
        </>
      ) : (
        <>
          <span className="text-muted text-xs">Session ended</span>
          <Button size="sm" variant="tertiary" isPending={props.ending} onPress={props.hasFeedback ? props.onShowFeedback : props.onEnd}>
            {props.ending ? 'Scoring…' : props.hasFeedback ? 'View feedback' : 'Get feedback'}
          </Button>
        </>
      )}
    </div>
  )
}

import './voice-wave.css'

const BARS = 5

/** Moves while the interviewer is speaking; rests as a flat row of dots otherwise. */
export function VoiceWave({ active }: { active: boolean }) {
  return (
    <span className="voice-wave" data-active={active} aria-hidden="true">
      {Array.from({ length: BARS }, (_, index) => (
        <span key={index} />
      ))}
    </span>
  )
}

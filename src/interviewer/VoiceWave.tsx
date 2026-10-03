import { useEffect, useRef } from 'react'
import { getSpeechLevel } from '../voice/kokoro'
import './voice-wave.css'

/** Relative height of each bar, so the row looks like a wave rather than a block. */
const BAR_SHAPE = [0.55, 0.85, 1, 0.75, 0.5]

/**
 * Moves while the interviewer is speaking. With the natural voice it follows
 * the real loudness of the audio; with the browser voice, which exposes no
 * audio levels, it falls back to a looping animation.
 */
export function VoiceWave({ active }: { active: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const wave = ref.current
    if (!active || !wave) return
    const bars = Array.from(wave.children) as HTMLElement[]
    let frame = 0

    const draw = () => {
      const level = getSpeechLevel()
      wave.dataset.live = String(level !== null)
      if (level !== null) {
        bars.forEach((bar, index) => {
          bar.style.height = `${Math.max(15, level * BAR_SHAPE[index] * 100)}%`
        })
      }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frame)
      wave.dataset.live = 'false'
      bars.forEach((bar) => bar.style.removeProperty('height'))
    }
  }, [active])

  return (
    <span ref={ref} className="voice-wave" data-active={active} aria-hidden="true">
      {BAR_SHAPE.map((_, index) => (
        <span key={index} />
      ))}
    </span>
  )
}

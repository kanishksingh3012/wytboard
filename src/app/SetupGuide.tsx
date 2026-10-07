import { Button } from '@heroui/react'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router'
import { getProvider } from '../llm/providers'

const STEPS = [
  {
    title: 'Get a free API key',
    body: 'Create one in Google AI Studio with your Google account.',
  },
  {
    title: 'Paste it in Settings',
    body: 'The key stays in this browser and is sent only to the provider you choose.',
  },
  {
    title: 'Test the connection',
    body: 'A recommended model is already filled in. Press "Test connection" to check it works.',
  },
]

/** Shown on the home screen until an AI provider is fully set up. */
export function SetupGuide() {
  const navigate = useNavigate()
  const keyUrl = getProvider('gemini').keyUrl

  return (
    <section
      aria-labelledby="setup-heading"
      className="border-accent/30 bg-accent/5 mb-10 rounded-3xl border p-6"
    >
      <h2 id="setup-heading" className="text-base font-semibold tracking-tight">
        Set up your interviewer
      </h2>
      <p className="text-muted mt-1 text-sm">
        Wytboard is free because it uses your own AI key. You can draw without one, but the
        interviewer needs it to talk.
      </p>

      <ol className="mt-5 grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="bg-accent text-accent-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-medium">{step.title}</p>
              <p className="text-muted mt-0.5 text-sm">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button variant="primary" onPress={() => void navigate('/settings')}>
          Open settings
          <ArrowRight className="size-4" />
        </Button>
        <a
          href={keyUrl}
          target="_blank"
          rel="noreferrer"
          className="text-accent px-3 text-sm font-medium underline-offset-4 hover:underline"
        >
          Get a Gemini key
        </a>
      </div>
    </section>
  )
}
